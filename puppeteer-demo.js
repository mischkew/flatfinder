// This file is not used right now. Leaving it here as an example, in case we
// want to automate the contact forms in the future.

const puppeteer = require("puppeteer");

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36";

async function getContent(browser, url) {
  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  page.setUserAgent(USER_AGENT);

  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForNavigation({ timeout: 0, waitUntil: "networkidle2" });
  return page.evaluate(() => window.IS24);
}

async function main() {
  const browser = await puppeteer.launch({ headless: false });

  const url =
    "https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten?enteredFrom=one_step_search";

  const content = await getContent(browser, url);
  console.log(content);
  await browser.close();
}

main();
