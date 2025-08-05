import fs from 'fs';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

// Загружаем HTML с Konva.js
await page.goto(`file://${process.cwd()}/template.html`, { waitUntil: 'load' });

// Читаем point.json
const points = JSON.parse(fs.readFileSync('point.json', 'utf8'));

// Передаём данные в браузер
await page.evaluate((bubbles) => window.addBubbles(bubbles), points);

// Ждём, пока Konva отрисует слой
await page.waitForFunction(() => window.renderReady === true);

// Небольшая дополнительная задержка для завершения рендера
await new Promise(resolve => setTimeout(resolve, 300));

// Делаем скриншот контейнера
const container = await page.$('#container');
await container.screenshot({ path: 'result.png' });

await browser.close();
