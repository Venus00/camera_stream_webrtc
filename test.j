const puppeteer = require('puppeteer')
async function main () {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless:false,
    args: [
        `--no-sandbox`,
       '--use-fake-ui-for-media-stream'
      ],
})
  const page = await browser.newPage();

  // Navigate the page to a URL
   result = await page.goto('file:///D:/mediot/doctor-test/receiver/index.html');
   console.log(result);
  // Print the full title

  //await browser.close();
}

main();