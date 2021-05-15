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

  // The interval in ms in which to poll updates from the Telgram API. The
  // higher the interval, the longer the bot needs to respond to user commands.
  // Does not require a webserver, SSL certificates and a domain name. Easier to
  // run than a webhook-based bot, but less performant. Useful for dev
  // environments but recommend webhooks for production. Set the interval to 0
  // to disable it and use the webhook.
  pollingInterval: 1000,

  webhook: {
    // The url the Telegram API should call to send updates
    url: "https://mywebhookurl.com",
    // The port that should be used to open the webserver
    port: 8000,
    // A secret
    secret: "123456789",
  },
};
