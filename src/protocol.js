/* This module implements the chat bot protocol parsing commands and pushing
 answers back to the chat. */

const { config } = require("./config");
const { ChatProtocol, TelegramBot, Event } = require("./telegram");
const {
  makeChat,
  insertChat,
  isAuthenticated,
  setSearchUrl,
  isRunning,
  setRunning,
  findChat,
} = require("./store");
const { crawlFlatsAndNotify } = require("./flatfinder");

/**
 * Handles the /start command.
 * @param {Context} context
 * @param {TelegramBot} bot
 */
async function startCommand(context, bot) {
  const message = `
Welcome ${context.firstName}!

I am the flatfinder bot. I will send you notifications about new listings on <a href="https://www.immobilienscout24.de/">immoscout24</a>.

First authentication by sending the /auth <code>PASSWORD</code> command.
Then try to setup a search with /search <code>URL</code>.

Commands
/start - Shows this help.
/auth <code>PASSWORD</code> - Authenticate for bot usage
/search <code>URL</code> - Set a new immoscout search url. Overwrites any existing search.
/pause - Pauses an existing search. No more messages will be sent.
/continue - Continues an existing search. More messages will come.
`;
  await bot.sendMessage(context.chatId, message, { parse_mode: "html" });
}

async function authCommand(context, bot) {
  const hasAuth = await isAuthenticated(context.chatId);
  let message;
  if (hasAuth) {
    message = "You are already authenticated.";
  } else if (context.commandArgument !== config.password) {
    message = "Wrong password. Try again.";
  } else {
    message = "Nice, you can now use the other commands.";
    await insertChat(makeChat(context.chatId, context.firstName));
  }
  await bot.sendMessage(context.chatId, message, { parse_mode: "html" });
}

/**
 * Tests whether a given url is an immoscout search query.
 * @param {string} url A url to the immobilienscout24 search query.
 */
function isUrl(url) {
  try {
    const { protocol, host, pathname, search } = new URL(url);
    console.debug("Processing url:", url);
    console.debug("Protocol: ", protocol);
    console.debug("Host: ", host);
    console.debug("Pathname: ", pathname);
    console.debug("Search: ", search);
    return (
      protocol === "https:" &&
      host === "www.immobilienscout24.de" &&
      pathname.startsWith("/Suche") &&
      pathname.includes("wohnung") &&
      search.length > 0
    );
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function newSearchCommand(context, bot) {
  const hasAuth = await isAuthenticated(context.chatId);
  let message;
  if (!hasAuth) {
    message = "You are not authenticated. Try /auth <code>PASSWORD</code>.";
  } else if (!isUrl(context.commandArgument)) {
    message =
      "Please provide a valid immoscout url (copy from the search url from the browser url bar)." +
      ' <a href="https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten?enteredFrom=one_step_search">Try here.</a>';
  } else {
    message = "New search url is set. Will query the search every 15min.";
    await setSearchUrl(context.chatId, context.commandArgument);
    const chat = await findChat(context.chatId);
    crawlFlatsAndNotify(bot, chat);
  }
  await bot.sendMessage(context.chatId, message, { parse_mode: "html" });
}

async function continueCommand(context, bot) {
  const hasAuth = await isAuthenticated(context.chatId);
  let message;
  if (!hasAuth) {
    message = "You are not authenticated. Try /auth <code>PASSWORD</code>.";
  } else {
    const running = await isRunning(context.chatId);
    if (running) {
      // muscle emoji
      message = "Already looking for listings for you \u{1F4AA}";
    } else {
      // play button emoji
      message = "Will continue to look for listings \u{25B6}";
      setRunning(context.chatId, true);
      const chat = await findChat(context.chatId);
      crawlFlatsAndNotify(bot, chat);
    }
  }
  await bot.sendMessage(context.chatId, message, { parse_mode: "html" });
}

async function pauseCommand(context, bot) {
  const hasAuth = await isAuthenticated(context.chatId);
  let message;
  if (!hasAuth) {
    message = "You are not authenticated. Try /auth <code>PASSWORD</code>.";
  } else {
    const running = await isRunning(context.chatId);
    if (!running) {
      message = "Already paused";
    } else {
      // pause button emoji
      message = "Will pause for now \u{23F8}";
      setRunning(context.chatId, false);
    }
  }
  await bot.sendMessage(context.chatId, message, { parse_mode: "html" });
}

async function handleUnexpectedMessage(context, bot) {
  const message = "Don't know what you mean. Try /start for help.";
  await bot.sendMessage(context.chatId, message, { parse_mode: "html" });
}

function makeProtocol() {
  const protocol = new ChatProtocol(config.telegramApiToken);
  protocol.on(Event.START, startCommand);
  protocol.onCommand("/auth", authCommand);
  protocol.onCommand("/search", newSearchCommand);
  protocol.onCommand("/continue", continueCommand);
  protocol.onCommand("/pause", pauseCommand);
  protocol.on(Event.MESSAGE, handleUnexpectedMessage);
  protocol.bot.makeRequest("setMyCommands", {
    commands: [
      { command: "start", description: "Show help" },
      {
        command: "auth",
        description:
          "Authenticate for bot usage. Use like this: /auth PASSWORD",
      },
      {
        command: "search",
        description:
          "Set a new immoscout search url. Overwrites any existing search. Use like this: /search URL",
      },
      {
        command: "pause",
        description:
          "Pauses an existing search. No more messages will be sent.",
      },
      {
        command: "continue",
        description: "Continues an existing search. More messages will come.",
      },
    ],
  });
  return protocol;
}

module.exports = makeProtocol;
