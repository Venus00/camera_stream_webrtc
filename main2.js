puppeteer = require('puppeteer-core');
// console.log('TRYING TO FETCH BROWSER')
const browserFetcher = puppeteer.createBrowserFetcher();

async function main () {
    let revisionInfo = await browserFetcher.download('884014');

    browser = await puppeteer.launch(
        {
          executablePath: revisionInfo.executablePath,
          args: [
              `--no-sandbox`,
             '--use-fake-ui-for-media-stream'
          ],
        }
      )
      
  const page = await browser.newPage();

  // Navigate the page to a URL
   result = await page.goto('http://localhost:3000/');
   console.log(result);
  // Print the full title

  //await browser.close();
}

main();