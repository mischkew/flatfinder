const DataStore = require("nedb");

const { config } = require("./config");
const db = new DataStore({ filename: config.dbPath, autoload: true });

const SourceType = {
  IMMOSCOUT: "IMMOSCOUT",
};

function makeListing({ id, sourceType, size, rooms, price, title, url }, data) {
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

async function keepNewListings(listings) {
  return new Promise((resolve, reject) => {
    const ids = listings.map((listing) => listing.id);
    // This finds all listings of the given listings which are already in the
    // database and it only returns their ids.
    db.find({ id: { $in: ids } }, { id: 1 }, (err, existing) => {
      if (err) {
        reject(err);
      } else {
        const existingIds = existing.map((obj) => obj.id);
        const newListings = listings.filter(
          (listing) => existingIds.indexOf(listing.id) === -1
        );
        resolve(newListings);
      }
    });
  });
}

module.exports = { SourceType, makeListing, insertListing, keepNewListings };
