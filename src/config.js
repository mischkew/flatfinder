/* This module loads either `config.dev.js` or the `config.prod.js` file and
makes it available as a JavaScript object. */

const path = require("path");
const fs = require("fs");

const environment = process.env.NODE_ENV || "development";
const configPath = path.resolve(
  process.env.CONFIG_PATH ||
    (environment === "development" ? "./config.dev.js" : "./config.prod.js")
);

if (!fs.existsSync(configPath)) {
  throw new Error(
    `Config file not found at ${configPath}. Did you create a copy of config.example.js` +
      ` and placed it at ${configPath}?`
  );
} else {
  console.debug(`Using config ${configPath} in ${environment} environment.`);
}

const config = require(configPath);
module.exports = { environment, config };
