/* This module implements a simple Telegram bot which speaks via the HTTP-GET
interface with the Telegram API. */

const axios = require("axios").default;

class TelegramBot {
  constructor(token) {
    this.token = token;
  }

  buildUrl(methodName) {
    return "https://api.telegram.org/bot" + this.token + "/" + methodName;
  }

  async makeRequest(method, params) {
    const response = await axios.request({
      url: this.buildUrl(method),
      method: "get",
      data: params,
    });
    return response.data;
  }

  /** Convenience method for sending messages in markdown notation. Additional
   * parameters for the sendMessage API method can be set as well. `MarkdownV2`
   * parse style is used by default. See here for more info:
   * https://core.telegram.org/bots/api#sendmessage */
  async sendMessage(chatId, text, params) {
    return this.makeRequest("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      ...params,
    });
  }
}

module.exports = TelegramBot;
