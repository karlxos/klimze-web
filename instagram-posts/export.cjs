const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const slides = [
  'c1-s1', 'c1-s2', 'c1-s3', 'c1-s4', 'c1-s5',
  'c2-s1', 'c2-s2', 'c2-s3', 'c2-s4', 'c2-s5',
  'c3-s1', 'c3-s2', 'c3-s3', 'c3-s4', 'c3-s5',
];

const outputDir = path.join(__dirname, 'exported');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });

  for (const slide of slides) {
    const filePath = 'file:///' + path.join(__dirname, `${slide}.html`).replace(/\\/g, '/');
    console.log(`📸 Exportando ${slide}...`);
    await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(outputDir, `${slide}.png`),
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1080 },
    });
    console.log(`   ✅ ${slide}.png guardado`);
  }

  await browser.close();
  console.log('\n🎉 Todos los slides exportados en: instagram-posts/exported/');
})();
