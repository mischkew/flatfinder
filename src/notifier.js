const TelegramBot = require("./telegram");

class Notifier {
  constructor(telegramConfig) {
    this.token = telegramConfig.token;
    this.chatId = telegramConfig.chatId;

    this.bot = new TelegramBot(this.token);
  }

  async sendUpdateTitle(listings) {
    let message;
    if (listings.length > 1) {
      message = `*Found ${listings.length} new listing, yay* ` + "\u{1F389}";
    } else {
      message = "*Found a new listing, yay* \u{1F389}";
    }
    return this.bot.sendMessage(this.chatId, message);
  }

  async sendListing(listing) {
    const title = `<a href="${listing.url}"><b>${listing.title}</b></a>\n`;
    const rooms = `Rooms: <code>${listing.rooms}</code>\n`;
    const size = `Size: <code>${listing.size}m²</code>\n`;
    const price = `Price: <code>${listing.price}€</code>\n`;
    const message = title + rooms + size + price;
    return this.bot.sendMessage(this.chatId, message, { parse_mode: "HTML" });
  }
}

module.exports = Notifier;
