import { KeyValueStore, PlaywrightCrawler } from 'crawlee';
import { firefox } from 'playwright';

import { router } from './routes.js';

const input = await KeyValueStore.getInput();

// const proxyConfiguration = new ProxyConfiguration({
//   useApifyProxy: true,
// })

const crawler = new PlaywrightCrawler({
  // proxyConfiguration,
  maxRequestsPerCrawl: 5,
  requestHandler: router,
  launchContext: {
    launcher: firefox,
    // launchOptions: await camoufoxLaunchOptions({
    //   headless: true,
    //   proxy: await proxyConfiguration?.newUrl(),
    //   geoip: true,
    //   // fonts: ['Times New Roman'] // <- custom Camoufox options
    // }),
  },
});

await crawler.run([]);

process.exit(0);
