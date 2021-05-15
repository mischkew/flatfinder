/* This module implements a simple Telegram bot and command api which speaks via
the HTTP-GET interface with the Telegram API. */

const axios = require("axios").default;
const { findUpdate, insertUpdate, findLatestUpdate } = require("./store");

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

function isUpperCase(str) {
  return str === str.toUpperCase();
}

function makeEnum() {
  if (arguments.length === 0) {
    throw new Error(
      "Cannot make empty enum object. Provide at least one argument."
    );
  }

  const enumObject = {};
  for (arg of arguments) {
    if (!isUpperCase(arg)) {
      throw new Error(
        `Enum member "${arg}" must consist only of uppercase letters.`
      );
    }
    enumObject[arg] = arg;
  }
  return enumObject;
}

const Event = makeEnum("START", "COMMAND", "MESSAGE");

/**
 * This object represents one special entity in a text message. For example,
 * hashtags, usernames, URLs, etc, see:
 * https://core.telegram.org/bots/api#messageentity
 * @typedef TelegramMessageEntity
 * @type {object}
 * @property {("bot_command")} type Type of the entity.
 * @property {number} offset Offset in UTF-16 code units to the start of the entity
 * @property {number} length Length of the entity in UTF-16 code units
 */

/**
 * This object represents a Telegram user or bot, see: https://core.telegram.org/bots/api#user
 * @typedef TelegramUser
 * @type {object}
 * @property {number} id Unique identifier for this user or bot
 * @property {boolean} is_bot True, if this user is a bot
 * @property {string} first_name User's or bot's first name
 */

/**
 * This object represents a chat, see: https://core.telegram.org/bots/api#chat
 * @typedef TelegramChat
 * @type {object}
 * @property {number} id Unique identifier for this chat
 * @property {("private")} type Type of chat
 */

/**
 * A message sent by a user to the Telegram bot, see: https://core.telegram.org/bots/api#message
 * @typedef TelegramMessage
 * @type {object}
 * @property {number} message_id Unique message identifier inside this chat
 * @property {TelegramUser} from Optional. Sender, empty for messages sent to channels
 * @property {TelegramChat} chat Conversation the message belongs to
 * @property {string} text 	Optional. For text messages, the actual UTF-8 text of the message, 0-4096 characters
 * @property {TelegramMessageEntity[]} entities Optional. For text messages, special entities like usernames, URLs, bot commands, etc. that appear in the text
 */

/**
 * An update object describes an incoming message from a user to the Telegram
 * bot, see: https://core.telegram.org/bots/api#update
 * @typedef TelegramUpdate
 * @type {object}
 * @property {number} update_id A unique id for the update. Avoids processing it twice.
 * @property {TelegramMessage} message A message sent by a user
 */

/**
 * An object containing a condensed subset of the TelegramUpdate for processing in event handlers.
 * @typedef Context
 * @type {object}
 * @property {number} chatId The unique id of the chat
 * @property {string} firstName The first name of the user writing the message
 * @property {string} text The text message of the user
 * @property {?string} commandName If a command is given, the name of the
 * command with leading slash.
 * @property {?string} commandArgument If a command has an argument behind it's
 * name, the full string to that argument.
 * @property {TelegramMessage} message The full telegram message.
 */

/**
 * @callback EventHandler
 * @param {Context} context
 * @param {TelegramBot} bot
 */

class ChatProtocol {
  constructor(token) {
    this.bot = new TelegramBot(token);
    this.events = {
      [Event.START]: [],
      [Event.COMMAND]: [],
      [Event.MESSAGE]: [],
    };
  }

  /**
   * Register an event handler for an event type. Get's called appropriately
   * when consuming Webhook updates.
   * @param {Event} event The event type to listen to.
   * @param {EventHandler} eventHandler
   */
  on(event, eventHandler) {
    if (!(event in Event)) {
      throw new Error(`Unknown event ${event}`);
    } else if (typeof eventHandler !== "function") {
      throw new Error("The eventHandler must be a function.");
    }

    this.events[event].push(eventHandler);
  }

  /**
   * Short-hand for registering a Event.COMMAND event handler.
   * @param {string} commandName The name of the commad to listen for. Must start with forward-slash.
   * @param {EventHandler} eventHandler The callback function to handle the command.
   */
  onCommand(commandName, eventHandler) {
    if (typeof commandName !== "string" || commandName[0] !== "/") {
      throw new Error(
        `Unexpected commandName. Should be a string starting with / but is ${commandName}`
      );
    }

    this.on(Event.COMMAND, (context, bot) => {
      if (context.commandName === commandName) {
        return eventHandler(context, bot);
      }
    });
  }

  /**
   * Process an update from the Telegram API incoming webhook and dispatch
   * events. This should be called by the webserver.
   * @param {TelegramUpdate} update
   */
  async handleUpdate(update) {
    const { update_id, message } = update;

    const foundUpdate = await findUpdate(update_id);
    if (foundUpdate) {
      console.debug(
        `The update (id: ${update_id}) has already been processed. Skipping.`,
        update
      );
      return;
    }

    if (!message) {
      console.info(
        "We can only handle messages for now. Ignoring this update:",
        update
      );
      await insertUpdate(update_id);
      return;
    }

    const { text, chat, from, entities } = message;
    if (!text || !chat || !from) {
      console.info(
        "We can only handle text messages sent from a direct user in a chat.",
        "Ignoring this update:",
        update
      );
      await insertUpdate(update_id);
      return;
    }

    if (chat.type !== "private") {
      console.info(
        "We can only handle private messages, ignoring this update:",
        update
      );
      await insertUpdate(update_id);
      return;
    }

    /** @type {Context} */
    const context = {
      chatId: chat.id,
      firstName: from.first_name,
      text,
      commandName: null,
      commandArgument: null,
      message,
    };

    if (entities) {
      for (let entity of entities) {
        if (entity.type !== "bot_command") {
          console.info(
            "We can only handle bot command entitites. Ignoring this entity for this update:",
            entity,
            update
          );
        } else {
          context.commandName = text.slice(
            entity.offset,
            entity.offset + entity.length
          );
          const commandArgument = text.slice(entity.offset + entity.length + 1);
          if (commandArgument) {
            context.commandArgument = commandArgument;
          }
        }
      }
    }

    await this.dispatchEvent(context);
    await insertUpdate(update_id);
  }

  /**
   * Calls the correct event handlers based on the context.
   * @param {Context} context A message context
   */
  async dispatchEvent(context) {
    const callAll = (events) => {
      return Promise.all(
        events.map((eventHandler) => eventHandler(context, this.bot))
      );
    };

    if (context.commandName) {
      if (context.commandName === "/start") {
        return callAll(this.events[Event.START]);
      } else {
        return callAll(this.events[Event.COMMAND]);
      }
    } else {
      return callAll(this.events[Event.MESSAGE]);
    }
  }

  /**
   * Polls all currently queued updates once from the Telegram API server.
   * @param {number} timeout The long polling timeout
   */
  async poll(timeout) {
    console.debug("Polling updates.");
    const updateId = (await findLatestUpdate()) || -1;
    let updates;
    try {
      updates = await this.bot.makeRequest("getUpdates", {
        offset: updateId + 1,
        timeout,
      });
    } catch (error) {
      console.error("Failed to poll updates.");
      console.error(error);
      return;
    }

    console.debug(`Found ${updates.result.length} updates to process.`);
    for (let update of updates.result) {
      console.debug(update);
      await this.handleUpdate(update);
    }
  }
}

module.exports = { TelegramBot, ChatProtocol, Event };
