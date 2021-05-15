const DataStore = require("nedb");

const { config } = require("./config");
const db = new DataStore({ filename: config.dbPath, autoload: true });

// Create database indices for efficient lookups and uniqueness constraints.
db.ensureIndex({ fieldName: "chatId", unique: true, sparse: true }, (err) => {
  if (err) {
    console.error(err);
    throw new Error("Could not ensure chatId unique index.");
  }
});
db.ensureIndex({ fieldName: "listingChatId", sparse: true }, (err) => {
  if (err) {
    console.error(err);
    throw new Error("Could not ensure listingChatId index.");
  }
});
db.ensureIndex({ fieldName: "updateId", unique: true, sparse: true }, (err) => {
  if (err) {
    console.error(err);
    throw new Error("Could not ensure updateId unique index.");
  }
});

//
// Listings
//

/**
 * @typedef SourceType
 * @type {("IMMOSCOUT")}
 */
const SourceType = {
  IMMOSCOUT: "IMMOSCOUT",
};

/**
 * @typedef Listing
 * @type {object}
 * @property {number} listingChatId The chat this listing belongs to
 * @property {string} id The unique listing id
 * @property {SourceType} sourceType The listing type
 * @property {number} size Size of the listing in sqm
 * @property {number} rooms Number of rooms of the listing
 * @property {number} price Monthly rent in Euro
 * @property {string} title The title of the listing
 * @property {string} url The url of the listing on the immoscout webpage
 * @property {object} data The full raw, crawled data
 *
 * Creates a listing object. Serves as an interface definition for database
 * entries. Avoids typos etc.
 * @param {number} chatId The chat this listing belongs to.
 * @param {object} details Listing details
 * @param {string} details.id The unique listing id
 * @param {SourceType} details.sourceType The listing type
 * @param {number|string} details.size Size of the listing in sqm. Will be parsed to float.
 * @param {number|string} details.rooms Number of rooms of the listing. Will be parsed to int.
 * @param {number|string} details.price Monthly rent in Euro. Will be parsed to int.
 * @param {string} details.title The title of the listing
 * @param {string} details.url The url of the listing on the immoscout webpage.
 * @param {object} data The full raw, crawled data. For later reference.
 * @returns Listing
 */
function makeListing(chatId, details, data) {
  const { id, sourceType, size, rooms, price, title, url } = details;
  const floatSize = parseFloat(size);
  const intRooms = parseInt(rooms);
  const intPrice = parseInt(price);

  if (!id) {
    throw new Error(`Id not provided: ${id}`);
  }

  if (!(sourceType in SourceType)) {
    throw new Error(
      `The sourceType ${sourceType} for id ${id} is not a valid SourceType!`
    );
  }

  if (floatSize == NaN) {
    throw new Error(`The size ${size} for id ${id} cannot be parsed to float!`);
  }

  if (intRooms == NaN) {
    throw new Error(`The rooms ${rooms} for id ${id} cannot be parsed to int!`);
  }

  if (intPrice == NaN) {
    throw new Error(`The price ${price} for id ${id} cannot be parsed to int!`);
  }

  if (!title) {
    throw new Error(`The title ${title} for id ${id} is not provided!`);
  }

  if (!url) {
    throw new Error(`The url ${url} for id ${id} is not provided!`);
  }

  if (!data) {
    throw new Error(`The full metadata ${data} for id ${id} is not provided!`);
  }

  return {
    listingChatId: chatId,
    id,
    sourceType,
    size: floatSize,
    rooms: intRooms,
    price: intPrice,
    title,
    url,
    data,
  };
}

/**
 * This helper methods recursively traverses an object hierarchy and replace all
 * occurrences of a dot (.) in the key name with an underscore (_). This is
 * required as the database implementation `nedb` does not support dots in its
 * documents. Creates a shallow copy of the each nested object, but does
 * reference the values.
 */
function escapeDotsInNestedKeys(object) {
  function escapeKey(key) {
    return key.replace(/\./g, "_");
  }

  function isObject(object) {
    return typeof object === "object" && object !== null;
  }

  if (!isObject(object)) {
    return object;
  }

  const escapedObject = {};
  for (let key of Object.keys(object)) {
    const escapedKey = escapeKey(key);
    const value = object[key];
    escapedObject[escapedKey] = escapeDotsInNestedKeys(value);
  }

  return escapedObject;
}

/** Insert one or more listings into the data store. */
async function insertListing(listing) {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(listing)) {
        listing = [listing];
      }
      listing = listing.map(escapeDotsInNestedKeys);
    } catch (error) {
      return reject(error);
    }

    db.insert(listing, (err, newListing) => {
      if (err) {
        reject(err);
      } else {
        resolve(newListing);
      }
    });
  });
}

/**
 * Only keep those of the given listings which are not yet found in the
 * database (i.e. diff against db). Useful for only notifiying users about new
 * listings.
 */
async function keepNewListings(chatId, listings) {
  return new Promise((resolve, reject) => {
    const ids = listings.map((listing) => listing.id);
    // This finds all listings of the given listings which are already in the
    // database belonging to the given chatId and it only returns their ids.
    db.find(
      { listingChatId: chatId, id: { $in: ids } },
      { id: 1 },
      (err, existing) => {
        if (err) {
          reject(err);
        } else {
          const existingIds = existing.map((obj) => obj.id);
          const newListings = listings.filter(
            (listing) => existingIds.indexOf(listing.id) === -1
          );
          resolve(newListings);
        }
      }
    );
  });
}

//
// Chats
//

/**
 * @typedef Chat
 * @type {object}
 * @property {number} chatId The unique telegram chat id
 * @property {string} firstName The first name of the user the private chat belongs to
 * @property {boolean} running If true, will notify the user about new listings
 * @property {?string} searchUrl The url to crawl on immoscout. Can be null if not set by the user
 *
 * Creates a chat object. Serves as an interface definition for database
 * entries. Avoids typos etc.
 * @param {number} chatId The unique telegram chat id
 * @param {string} firstName The first name of the user the private chat belongs to
 * @returns Chat
 */
function makeChat(chatId, firstName) {
  return {
    chatId,
    firstName,
    running: false,
    searchUrl: null,
  };
}

async function insertChat(chat) {
  return new Promise((resolve, reject) => {
    db.insert(chat, (error, document) => {
      if (error) {
        reject(error);
      } else {
        resolve(document);
      }
    });
  });
}

async function findChat(chatId) {
  return new Promise((resolve, reject) => {
    db.findOne({ chatId }, (error, doc) => {
      if (error) {
        reject(error);
      } else {
        resolve(doc);
      }
    });
  });
}

async function findChats() {
  return new Promise((resolve, reject) => {
    db.find({ chatId: { $exists: true } }, (error, documents) => {
      if (error) {
        reject(error);
      } else {
        resolve(documents);
      }
    });
  });
}

async function findUpdate(updateId) {
  return new Promise((resolve, reject) => {
    db.findOne({ updateId }, (error, doc) => {
      if (error) {
        reject(error);
      } else {
        resolve(doc);
      }
    });
  });
}

async function findLatestUpdate() {
  return new Promise((resolve, reject) => {
    db.find({ updateId: { $exists: true } })
      .sort({ updateId: -1 })
      .limit(1)
      .exec(function (error, doc) {
        if (error) {
          reject(error);
        } else {
          resolve(doc[0] ? doc[0].updateId : null);
        }
      });
  });
}

async function insertUpdate(updateId) {
  return new Promise((resolve, reject) => {
    db.insert({ updateId }, (error, doc) => {
      if (error) {
        reject(error);
      } else {
        resolve(doc);
      }
    });
  });
}

async function isAuthenticated(chatId) {
  const chat = await findChat(chatId);
  return !!chat;
}

/**
 * Adds or updates the search url for the given chat. Will overwrite an existing
 * url or create a new empty if the chat does not yet exist.
 * @param {number} chatId The id of the telegram chat the bot is used in.
 * @param {string} searchUrl An immoscout weburl to crawl for the given chatId.
 */
async function setSearchUrl(chatId, searchUrl) {
  return new Promise((resolve, reject) => {
    db.update(
      { chatId },
      { $set: { searchUrl, running: true } },
      {},
      (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Check whether listings should be queried for the given chat.
 * @param {number} chatId The id of the telegram chat the bot is used in.
 * @returns {boolean}
 */
async function isRunning(chatId) {
  return new Promise((resolve, reject) => {
    db.findOne({ chatId }, { running: 1 }, (error, document) => {
      if (error) {
        reject(error);
      } else if (!document) {
        reject(new Error(`The chatId ${chatId} is not register.`));
      } else {
        resolve(document.running);
      }
    });
  });
}

/**
 * Set the running status of the given chat. If true, listings will be queries.
 * Otherwise, no messages will be sent to that chat.
 * @param {number} chatId
 * @param {boolean} isRunning
 */
async function setRunning(chatId, isRunning) {
  return new Promise((resolve, reject) => {
    db.update({ chatId }, { $set: { running: isRunning } }, {}, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  SourceType,
  makeListing,
  insertListing,
  keepNewListings,
  makeChat,
  insertChat,
  findChat,
  findChats,
  isAuthenticated,
  insertUpdate,
  findUpdate,
  findLatestUpdate,
  setSearchUrl,
  isRunning,
  setRunning,
};
