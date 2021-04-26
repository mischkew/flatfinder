/* This module executes all crawlers for all defined queries, diffs the results
against the database and sents notifications for new "listings". */

const { config } = require("./config");
const store = require("./store");
const Notifier = require("./notifier");
const CRAWLERS = {
  immoscout: require("./crawlers/immoscout"),
};

/**
 * Executes the flat-notification job. This launches all url-queries for all
 * crawlers and sends a Telegram notification for each uniquely new listing.
 */
async function findFlatsAndNotify() {
  const notifier = new Notifier(config.telegram);

  for (let crawlerName in CRAWLERS) {
    console.log(`Crawling listings for ${crawlerName}.`);

    const crawler = CRAWLERS[crawlerName];
    const urls = config[crawlerName].urls;
    for (let index in urls) {
      const url = urls[index];
      console.log(`${crawlerName} ${parseInt(index) + 1}/${urls.length}`);
      console.debug(`Crawl URL: ${url}`);

      const listings = await crawler(url);
      console.log(` - Found ${listings.length} listings`);

      const newListings = await store.keepNewListings(listings);
      console.log(` - Found ${newListings.length} new listings`);

      for (let listing of newListings) {
        console.debug(
          `  - Add listing ${listing.id}: ${listing.title} | ${listing.url}`
        );
        await notifier.sendMessage(listing);
      }

      await store.insertListing(newListings);
    }
  }
}

module.exports = findFlatsAndNotify;
