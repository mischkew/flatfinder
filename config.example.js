const config = {};

// The path to the database file. Will be created if not existing.
config.dbPath = "./dev.db";

config.telegram = {};

// The telegram bot API token in order to send messages. Chat to @BotFather to
// obtain one.
config.telegram.token = "1234567890:SomeLongTokenWhichYouShouldNeverShare";
// The chat id in which to send messages via the bot. You need to manually
// figure out the chat id by sending a message to the bot and quering the
// getUpdates API method once.
config.telegram.chatId = "12345678";

config.immoscout = {};

// One or more search queries on immobilienscout24.de. Perform a search and copy
// paste the url into the urls field. You may provide multiple urls, i.e. if you
// want to search in multiple cities/ regions at the same time.
config.immoscout.urls = [
  "https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten?enteredFrom=one_step_search",
];

module.exports = config;
