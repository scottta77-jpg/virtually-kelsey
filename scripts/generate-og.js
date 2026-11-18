const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function resolveChromeExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

async function generateOgImage() {
  const rootDir = path.resolve(__dirname, '..');
  const templatePath = path.join(rootDir, 'og-template', 'index.html');
  const outputPath = path.join(rootDir, 'assets', 'og-preview.png');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`OG template not found at ${templatePath}`);
  }

  const executablePath = resolveChromeExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 1,
    });

    const fileUrl = `file://${encodeURI(templatePath)}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? img.decode().catch(() => {})
            : new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
              })
        )
      );
    });

    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });

    const stats = fs.statSync(outputPath);
    console.log(
      `Generated ${path.relative(rootDir, outputPath)} (${Math.round(stats.size / 1024)} KB)`
    );
  } finally {
    await browser.close();
  }
}

generateOgImage().catch((err) => {
  console.error(err);
  process.exit(1);
});
