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

   result = await page.goto('file:///F:/camera/camera_stream_webrtc/doctor-test/index.html');
   console.log(result);
}

main();