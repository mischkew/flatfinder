/* This module executes all crawlers for all defined queries, diffs the results
against the database and sents notifications for new "listings". */

const { keepNewListings, insertListing, findChats } = require("./store");
const crawler = require("./crawler");
const { TelegramBot } = require("./telegram");

async function crawlFlats(chatId, url) {
  console.debug(`- Crawl URL: ${url}`);

  const listings = await crawler(chatId, url);
  console.log(`- Found ${listings.length} listings`);

  const newListings = await keepNewListings(chatId, listings);
  console.log(`- Found ${newListings.length} new listings`);

  return newListings;
}

async function sendUpdateTitle(bot, chatId, listings) {
  let message;
  if (listings.length > 1) {
    message = `*Found ${listings.length} new listings, yay* ` + "\u{1F389}";
  } else {
    message = "*Found a new listing, yay* \u{1F389}";
  }

  return bot.sendMessage(chatId, message);
}

async function sendListing(bot, chatId, listing) {
  const title = `<a href="${listing.url}"><b>${listing.title}</b></a>\n`;
  const rooms = `Rooms: <code>${listing.rooms}</code>\n`;
  const size = `Size: <code>${listing.size}m²</code>\n`;
  const price = `Price: <code>${listing.price}€</code>\n`;
  const message = title + rooms + size + price;

  return bot.sendMessage(chatId, message, { parse_mode: "HTML" });
}

async function notify(bot, chatId, listings) {
  if (listings.length === 0) {
    return;
  }

  console.debug(`Notifying about a total of ${listings.length} listings.`);
  await sendUpdateTitle(bot, chatId, listings);
  for (let listing of listings) {
    console.debug(
      `  - Add listing ${listing.id}: ${listing.title} | ${listing.url}`
    );
    await sendListing(bot, chatId, listing);
  }
  await insertListing(listings);
}

/**
 * @param {TelegramBot} bot
 * @param {Chat} chat
 */
async function crawlFlatsAndNotify(bot, chat) {
  if (chat.running && chat.searchUrl) {
    console.log(`Crawl chat ${chat.chatId} (${chat.firstName})`);
    const listings = await crawlFlats(chat.chatId, chat.searchUrl);
    await notify(bot, chat.chatId, listings);
  } else if (!chat.running) {
    console.log(
      `Chat ${chat.chatId} (${chat.firstName}) is paused. Skip crawling.`
    );
  } else {
    console.log(
      `Chat ${chat.chatId} (${chat.firstName}) has no url set. Skip crawling.`
    );
  }
}

/**
 * Executes the flat-notification job. This launches all url-queries for all
 * crawlers and sends a Telegram notification for each uniquely new listing.
 * @param {TelegramBot} bot
 */
async function crawlFlatsAndNotifyAll(bot) {
  const chats = await findChats();
  console.log(`Found ${chats.length} registered chats.`);
  for (let chat of chats) {
    await crawlFlatsAndNotify(bot, chat);
  }
}

module.exports = {
  crawlFlatsAndNotify,
  crawlFlatsAndNotifyAll,
};
