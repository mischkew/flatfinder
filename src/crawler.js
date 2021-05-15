/* This module provides a crawler for the website immobilienscout24.de. A
crawler returns an array of "listings" as defined by the `store.js` module. The
crawler is used by the flat finder to prepare notifications for new listings. */

const assert = require("assert");
const axios = require("axios").default;

const { makeListing, SourceType } = require("./store");

function makeLink(id) {
  return `https://www.immobilienscout24.de/expose/${id}`;
}

function makeImmoscoutListing(chatId, resultEntry) {
  assert("resultlist.realEstate" in resultEntry);

  const realEstate = resultEntry["resultlist.realEstate"];
  assert("@id" in realEstate);
  assert("numberOfRooms" in realEstate);
  assert("price" in realEstate);
  assert("value" in realEstate.price);
  assert("livingSpace" in realEstate);
  assert("title" in realEstate);

  return makeListing(
    chatId,
    {
      id: realEstate["@id"],
      sourceType: SourceType.IMMOSCOUT,
      size: realEstate.livingSpace,
      rooms: realEstate.numberOfRooms,
      price: realEstate.price.value,
      title: realEstate.title,
      url: makeLink(realEstate["@id"]),
    },
    resultEntry
  );
}

async function immoscoutRequest(url) {
  return await axios.request({
    url,
    method: "post",
    transformRequest: (data, headers) => {
      delete headers.common["Accept"];
      delete headers.post["Content-Type"];
    },
  });
}

async function queryImmoscout(url) {
  const res = await immoscoutRequest(url);
  const data = res.data;
  const results = data.searchResponseModel["resultlist.resultlist"];

  if (!results) {
    throw new Error(
      "Unknown response format. Expected searchResponseModel['resultlist.resultlist'] key."
    );
  }

  if (results.resultlistEntries.length > 1) {
    throw new Error(
      `Unexpected resultlistEntries length (expected 1 but is ${results.resultlistEntries.length})` +
        ` for query ${url}`
    );
  }

  let entries = results.resultlistEntries[0].resultlistEntry || [];
  // The API might only return a single result, we always want to wrap the
  // results in a list.
  if (!Array.isArray(entries)) {
    entries = [entries];
  }

  // If the results are paginated, query the next pages as well.
  if (!results.paging) {
    throw new Error(`Key 'paging' is missing for query ${url}`);
  }
  if (results.paging.next && results.paging.next["@xlink.href"]) {
    const host = res.request.protocol + "//" + res.request.host;
    const nextEntries = await queryImmoscout(
      host + results.paging.next["@xlink.href"]
    );
    entries.concat(nextEntries);
  }

  return entries;
}

async function queryListings(chatId, url) {
  const entries = await queryImmoscout(url);
  return entries.map((entry) => makeImmoscoutListing(chatId, entry));
}

module.exports = queryListings;
