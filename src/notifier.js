const TelegramBot = require("./telegram");

class Notifier {
  constructor(telegramConfig) {
    this.token = telegramConfig.token;
    this.chatId = telegramConfig.chatId;

    this.bot = new TelegramBot(this.token);
  }

  async sendUpdateTitle(listings, dryRun) {
    let message;
    if (listings.length > 1) {
      message = `*Found ${listings.length} new listings, yay* ` + "\u{1F389}";
    } else {
      message = "*Found a new listing, yay* \u{1F389}";
    }

    if (dryRun) {
      console.debug(`DRY-RUN - message to ${this.chatId} - ${message}`);
    } else {
      return this.bot.sendMessage(this.chatId, message);
    }
  }

  async sendListing(listing, dryRun) {
    const title = `<a href="${listing.url}"><b>${listing.title}</b></a>\n`;
    const rooms = `Rooms: <code>${listing.rooms}</code>\n`;
    const size = `Size: <code>${listing.size}m²</code>\n`;
    const price = `Price: <code>${listing.price}€</code>\n`;
    const message = title + rooms + size + price;

    if (dryRun) {
      console.debug(`DRY-RUN - message to ${this.chatId} - ${message}`);
    } else {
      return this.bot.sendMessage(this.chatId, message, { parse_mode: "HTML" });
    }
  }
}

module.exports = Notifier;
