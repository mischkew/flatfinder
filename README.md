# FlatFinder

This project provides a simple Telegram bot and worker job which queries [immobilienscout24.de](immobilienscout24.de) and posts the findings of that query into a Telegram chat. Only new listings, which have not been posted to that chat before are posted.

## Installation

```bash
git clone https://github.com/mischkew/flatfinde
cd flatfinder
yarn install --dev
```

## Usage

```bash
# Launch the worker in the development environment (using ./config.dev.js)
yarn start

# Launch the worker in the production environment (using ./config.prod.js)
NODE_ENV=production yarn start

# Launch the worker with a custom path to the config file in the development environment
CONFIG_PATH="/path/to/my/config.js" yarn start

# Set a custom loglevel to make the bot more/ less verbose
LOG_LEVEL="DEBUG" yarn start
LOG_LEVEL="ERROR" yarn start
LOG_LEVEL="LOG" yarn start # same as `yarn start`
```

This will launch the bot and worker query/ notifications in an interval. You can configure a webhook in the config files for deployment or use the bot in long polling-mode.

### Testing Webhooks

You may use a service like `ngrok` to test your development server with a webhook without the need for deployment. Copy-paste the `https` url into you `config.dev.js` file as webhook url and start the server.

```bash
yarn run ngrok
# copy paste url to config.dev.js
yarn start
```

## Configuration

Copy the `config.example.js` file and create a `config.dev.js` or a `config.prod.js` file in the root of this repository.

```js
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
```

## Credits

Inspired by https://github.com/adriankumpf/findmeaflat (Thanks [adriankumpf](https://github.com/adriankumpf), you found me my last flat!). Unfortunately, the [immoscout webpage uses captchas now](https://github.com/adriankumpf/findmeaflat/issues/23) and I had to come up with my own solution.
