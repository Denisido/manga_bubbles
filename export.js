import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1024, height: 1024 }
  });

  const page = await browser.newPage();
  await page.goto(`file://${path.join(__dirname, 'index.html')}`);

  const points = JSON.parse(fs.readFileSync(path.join(__dirname, 'point.json'), 'utf-8'));

  await page.evaluate(points => {
    window.renderBubbles(points);
  }, points);

  await page.waitForFunction(() => window.renderReady === true);
  await new Promise(resolve => setTimeout(resolve, 300));

  await page.screenshot({ path: 'bubbles.png' });

  await browser.close();
  console.log('✅ Изображение сохранено: bubbles.png');
})();
