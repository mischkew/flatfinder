require("./patches")();

const http = require("http");
const { config } = require("./config");
const { crawlFlatsAndNotifyAll } = require("./flatfinder");
const makeProtocol = require("./protocol");

function writeResponse(response, statusCode, contentType = null, body = null) {
  const headers = contentType ? { "Content-Type": contentType } : null;
  response.writeHead(statusCode, headers);
  response.write(body);
  response.end();
}

function errorResponse(response, statusCode, errorMessage) {
  console.error(`Status Code: ${statusCode}, Error:`, errorMessage);
  writeResponse(response, statusCode, "text/plain", errorMessage);
}

function handleRequest(dataCallback) {
  return (req, res) => {
    const { url, method, headers } = req;
    const contentType = headers["content-type"];

    if (url !== `/${config.webhook.secret}`) {
      errorResponse(res, 400, `Unknown url "${url}". Secret not matched.`);
    } else if (method !== "POST") {
      errorResponse(
        res,
        400,
        `Method ${method} not supported. Only POST requests are allowed.`
      );
    } else if (contentType !== "application/json") {
      errorResponse(
        res,
        400,
        `Content-Type ${contentType} not supported. Only application/json is allowed.`
      );
    } else {
      console.debug("Incoming Webhook");
      let chunks = [];
      req.on("data", (chunk) => {
        chunks.push(chunk);
      });
      req.on("end", () => {
        const data = JSON.parse(chunks.join());
        console.debug(data);
        dataCallback(data);
        res.end();
      });
    }
  };
}

async function main() {
  const protocol = makeProtocol();
  console.debug("Crawl listings");
  await crawlFlatsAndNotifyAll(protocol.bot);
  setInterval(crawlFlatsAndNotifyAll, config.updateInterval, protocol.bot);

  if (config.pollingInterval > 0) {
    console.debug("Using polling mode");
    await protocol.bot.makeRequest("deleteWebhook");
    while (true) {
      await protocol.poll(config.pollingInterval);
    }
  } else {
    console.debug("Starting webserver for incoming webhooks");

    let url = config.webhook.url;
    if (!url.endsWith("/")) {
      url += "/";
    }
    url += config.webhook.secret;

    try {
      new URL(url);
    } catch {
      throw new Error(`Webhook url is not set or invalid: ${url}`);
    }

    await protocol.bot.makeRequest("setWebhook", { url });
    const server = http.createServer(
      handleRequest(protocol.handleUpdate.bind(protocol))
    );
    server.listen(config.webhook.port);
  }
}

main();
