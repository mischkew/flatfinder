module.exports = {
  // The path to the database file. Will be created if not existing.
  dbPath: "./dev.db",

  // The telegram bot API token in order to send messages. Chat to @BotFather to
  // obtain one.
  telegramApiToken: "1234567890:SomeLongTokenWhichYouShouldNeverShare",

  // A simple password the user has to enter in order to use the bot (via the
  // /auth command)
  password: "mypass123",

  // Interval in ms in which the immoscout website is queried for new updates
  updateInterval: 1000 * 60 * 15,

  // The interval in seconds on how long to keep a connection to the
  // Telegram server open for long-polling
  // (https://en.wikipedia.org/wiki/Push_technology#Long_polling).
  // Does not require a webserver, SSL certificates and a domain
  // name. Easier to run than a webhook-based bot. Useful for dev
  // environments but recommend webhooks for production. Set the
  // interval to 0 to disable it and use the webhook.
  pollingInterval: 60,

  webhook: {
    // The url the Telegram API should call to send updates
    url: "https://mywebhookurl.com",
    // The port that should be used to open the webserver
    port: 8000,
    // A secret
    secret: "123456789",
  },
};
