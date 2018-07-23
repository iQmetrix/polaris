/* eslint-disable no-console */
const puppeteer = require('puppeteer');
const {Percy, FileSystemAssetLoader} = require('@percy/puppeteer');

(async () => {
  const percy = new Percy({
    loaders: [
      new FileSystemAssetLoader({
        buildDir: './tophat/assets',
        mountPath: '/assets',
      }),
    ],
  });

  const browsers = [
    {
      browser: await puppeteer.launch(),
      taken: new Promise((resolve) => {
        resolve();
      }),
    },
    {
      browser: await puppeteer.launch(),
      taken: new Promise((resolve) => {
        resolve();
      }),
    },
  ];

  await browsers.forEach(async (instance) => {
    instance.page = await instance.browser.newPage();
  });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let browserIndex = 0;

  try {
    await percy.startBuild();
    await page.goto('http://localhost:3000');
    const urls = await page.evaluate(() =>
      [...document.querySelectorAll('a')].map((element) =>
        element.getAttribute('href'),
      ),
    );

    urls.map((path) => {
      const currentBrowser = browsers[browserIndex % 2];
      browserIndex++;
      currentBrowser.taken = currentBrowser.taken.then(async () => {
        console.log('Snapshotting ', path);
        await currentBrowser.page.goto(`http://localhost:3000${path}`);
        return percy.snapshot(`Snapshot of ${path}`, currentBrowser.page);
      });
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  } finally {
    await Promise.all(browsers.map((instance) => instance.taken));
    await percy.finalizeBuild();
    await browser.close();
    await Promise.all(browsers.map((instance) => instance.browser.close()));
  }
})();
