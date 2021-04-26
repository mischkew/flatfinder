# FlatFinder

This project provides a simple worker job which queries [immobilienscout24.de](immobilienscout24.de) and posts the findings of that query into a Telegram chat. Only new listings, which have not been posted to that chat before are posted.

## Installation

This service is not deployed. You need to install and deploy it manually.

```bash
yarn install
```

### Usage

```bash
# Launch the worker in the development environment (using ./config.dev.js)
yarn start

# Launch the worker in the production environment (using ./config.prod.js)
NODE_ENV=production yarn start

# Launch the worker with a custom path to the config file in the development environment
CONFIG_PATH="/path/to/my/config.js" yarn start
```

This will call the worker and perform the query/ notifications once. Then you can register a cronjob or something similar to call the worker once an hour etc.

### Configuration

Copy the `config.example.js` file and create a `config.dev.js` or a `config.prod.js` file in the root of this repository.

```js
// config.example.js
const config = {};

config.dbPath = "./dev.db";

config.telegram = {};
config.telegram.token = "1540691375:AAEQXpNVyYFBeVzAXU8nLA4BGWuddNIWGb8";
config.telegram.chatId = "126066384";

config.immoscout = {};
config.immoscout.urls = [
  // Berlin, south-west
  "https://www.immobilienscout24.de/Suche/shape/wohnung-mieten?shape=bWFsX0ljaF9wQW56QXdYdH1AZ25AdHJBZ3NEcmVBeXRBc0FzY0F1cEBxcEFrZENhZENfX0NvckB7ZEJzcUdzcEByZUBpb0J2ZkZ7YEBse0JzQXxuRHJOZFBiaEFieUFiWXBuQmB7QG5yQGJoQWRQ&haspromotion=false&numberofrooms=3.0-&price=-900.0&livingspace=65.0-&pricetype=rentpermonth&enteredFrom=result_list#/map/PriceMapFeature",
  // Potsdam
];

// config.immoscout.url =
//   "https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten?enteredFrom=one_step_search";

module.exports = config;
```
