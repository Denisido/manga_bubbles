const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const bubbles = JSON.parse(fs.readFileSync(path.join(__dirname, 'point.json'), 'utf-8'));

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    await page.goto('file://' + path.join(__dirname, 'template.html'));

    // Ждем появления картинки
    await page.waitForSelector('#background');

    // Передаем данные для рендера
    await page.evaluate((bubbles) => {
        window.addBubbles(bubbles);
    }, bubbles);

    // Ждем отрисовку
    await page.waitForFunction(() => window.renderReady === true);

    await new Promise(resolve => setTimeout(resolve, 300));
    await page.screenshot({ path: 'result.png' });

    await browser.close();
    console.log('✅ Рендер готов: result.png');
})();
