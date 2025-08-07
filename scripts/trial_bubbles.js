import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

// Получаем __dirname как в CommonJS
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Пути
const SCENARIO_PATH = path.join(__dirname, '../data/scenario.json');
const STATIC_IMAGE = path.join(__dirname, '../static/blank_1024.png');
const HTML_PATH = path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUTPUT_PATH = path.join(__dirname, '../trial/experiment.png');


const run = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('[BROWSER]', msg.text()));

  // ИНИЦИАЛИЗИРУЕМ window.trialScenario ДО загрузки index.html!
  // Читаем сценарий
  const scenario = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf-8'));
  const scenarioString = JSON.stringify(scenario);

  await page.evaluateOnNewDocument((scenarioJson, staticImage) => {
    window.trialScenario = JSON.parse(scenarioJson); // обязательно parse!
    window.trialBg = staticImage;
    window.trialMode = 'trial';
  }, scenarioString, STATIC_IMAGE);



  // Теперь открываем страницу
  const htmlUrl = `file://${HTML_PATH}?mode=trial&bg=${encodeURIComponent(STATIC_IMAGE)}&scenario=${encodeURIComponent(SCENARIO_PATH)}`;
  await page.goto(htmlUrl, { waitUntil: 'networkidle0' });

  await page.evaluate((scenarioJson) => {
    window.renderBubbles(JSON.parse(scenarioJson));
  }, scenarioString);


  try {
    await page.waitForFunction('window.renderReady === true', { timeout: 30000 });
    // ... (делаем скриншот контейнера)
  } catch (err) {
    await page.screenshot({ path: 'trial_error.png', fullPage: true });
    throw err;
  }

  await new Promise(res => setTimeout(res, 300));

  const container = await page.$('#container');
  await container.screenshot({ path: OUTPUT_PATH });

  await browser.close();
  console.log('Экспериментальный скриншот сохранён:', OUTPUT_PATH);
};

run();
