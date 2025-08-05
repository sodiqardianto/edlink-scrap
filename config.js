export default {
  puppeteer: {
    headless: process.env.NODE_ENV === 'production',
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  },
  scraping: {
    timeout: 30000,
    waitForNetworkIdle: 'networkidle2',
    outputPath: './output'
  }
};