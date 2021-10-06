/**
 * @typedef {'imperial' | 'metric'} Unit
 * @typedef {{ id: string, dimensions: number[], size: number }} Room
 * @typedef {{ id: string, size: number, rooms: Room[] }} Bucket
 */

/**
 * @type {{ buckets: BucketMap, total: number, unit: Unit }}
 */
const state = {
  buckets: [],
  total: 0,
  unit: "imperial",
};

const runIt = async () => {
  try {
    const tab = await getCurrentTab();
    const isInvalidSite = await promiseExecute({
      target: { tabId: tab.id },
      function: getInvalidSite,
    });
    if (isInvalidSite) {
      document.getElementById("invalid-site").style.display = "block";
      return;
    }
    const isInvalidListing = await promiseExecute({
      target: { tabId: tab.id },
      function: getInvalidListing,
    });
    if (isInvalidListing) {
      document.getElementById("invalid-listing").style.display = "block";
      return;
    }
    state.unit = await promiseExecute({
      target: { tabId: tab.id },
      function: getSiteUnit,
    });
    const { total, buckets } = await promiseExecute({
      target: { tabId: tab.id },
      function: getSiteData,
      args: [state.unit],
    });
    if (buckets.length < 1) {
      document.getElementById("empty").style.display = "block";
      return;
    }
    state.buckets = buckets;
    state.total = total;
    console.log("state before render:", state);
    renderPopup(state.unit, state.buckets, state.total);
  } catch (err) {
    document.getElementById("problem").style.display = "block";
    throw err;
  } finally {
    document.getElementById("loading").style.display = "none";
  }
};

/**
 * @param {Unit} unit
 * @param {Bucket[]} buckets
 */
const renderPopup = (unit, buckets, total) => {
  const contentEl = document.getElementById("grid");
  const baseUnit = unit === "imperial" ? "ft" : "m";
  const rows = [...buckets, { id: "Total", size: total }];
  for ([idx, level] of rows.entries()) {
    if (idx !== 0) {
      const lineEl = document.createElement("div");
      lineEl.className = "level-separator";
      contentEl.appendChild(lineEl);
    }
    renderLevelElement(baseUnit, level, contentEl, level.id === "Total");
    if (level.id !== "Total") {
      for ([jdx, room] of level.rooms.entries()) {
        if (jdx !== 0) {
          const lineEl = document.createElement("div");
          lineEl.className = "room-separator";
          contentEl.appendChild(lineEl);
        }
        renderRoomElement(baseUnit, room, contentEl);
      }
    }
  }
};

/**
 * @param {string} unit
 * @param {Bucket} level
 * @param {Element} contentElement
 * @param {boolean} isTotal
 */
const renderLevelElement = (unit, level, contentElement, isTotal) => {
  const imageEl = document.createElement("img");
  imageEl.className = "level-symbol";
  imageEl.src = isTotal ? "images/home.svg" : "images/layers.svg";
  const nameEl = document.createElement("span");
  nameEl.className = "level-name";
  nameEl.innerText = level.id;
  const levelEl = document.createElement("div");
  levelEl.className = "level-title";

  levelEl.appendChild(imageEl);
  levelEl.appendChild(nameEl);

  const sizeEl = document.createElement("span");
  sizeEl.className = "level-size";
  sizeEl.innerHTML = `${Math.round(level.size)}&nbsp;`;
  const unitEl = document.createElement("span");
  unitEl.className = "level-unit";
  unitEl.innerHTML = `${unit}&sup2;`;
  const infoEl = document.createElement("div");
  infoEl.className = "level-info";

  infoEl.appendChild(sizeEl);
  infoEl.appendChild(unitEl);

  contentElement.appendChild(levelEl);
  contentElement.appendChild(infoEl);
};

/**
 * @param {string} unit
 * @param {Room} room
 * @param {Element} contentElement
 */
const renderRoomElement = (unit, room, contentElement) => {
  const imageEl = document.createElement("img");
  imageEl.className = "room-symbol";
  if (room.id.match(/dine|dining/i) !== null) {
    imageEl.src = "images/coffee.svg";
  } else if (room.id.match(/kitchen/i) !== null) {
    imageEl.src = "images/shopping-cart.svg";
  } else if (room.id.match(/rec|play/i) !== null) {
    imageEl.src = "images/play.svg";
  } else if (room.id.match(/bath|wash/i) !== null) {
    imageEl.src = "images/droplet.svg";
  } else if (room.id.match(/living/i) !== null) {
    imageEl.src = "images/tv.svg";
  } else if (room.id.match(/bed/i) !== null) {
    imageEl.src = "images/user.svg";
  } else if (room.id.match(/store|closet|storage/i) !== null) {
    imageEl.src = "images/package.svg";
  } else {
    imageEl.src = "images/square.svg";
  }
  const nameEl = document.createElement("span");
  nameEl.className = "room-name";
  nameEl.innerText = room.id;
  const roomEl = document.createElement("div");
  roomEl.className = "room-title";

  roomEl.appendChild(imageEl);
  roomEl.appendChild(nameEl);

  const dimEl = document.createElement("span");
  dimEl.className = "room-dim";
  dimEl.innerHTML = !room.size
    ? ""
    : `&nbsp;(${room.dimensions[0]} x ${room.dimensions[1]})`;
  const sizeEl = document.createElement("span");
  sizeEl.className = "room-size";
  sizeEl.innerHTML = !room.size ? "n/a" : `${Math.round(room.size)}`;
  const unitEl = document.createElement("span");
  unitEl.className = "room-unit";
  unitEl.innerHTML = !room.size ? "" : `&nbsp;${unit}&sup2;`;
  const infoEl = document.createElement("div");
  infoEl.className = "room-info";

  infoEl.appendChild(dimEl);
  infoEl.appendChild(sizeEl);
  infoEl.appendChild(unitEl);

  contentElement.appendChild(roomEl);
  contentElement.appendChild(infoEl);
};

const promiseExecute = (options) =>
  new Promise((resolve) => {
    chrome.scripting.executeScript(options, ([{ result }]) => resolve(result));
  });

const getCurrentTab = async () => {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
};

const getInvalidSite = () => window.location.host.match("realtor.ca") === null;

const getInvalidListing = () =>
  window.location.host.match(/realtor.ca/) !== null &&
  window.location.pathname.match(/\/real-estate\//) === null;

/**
 * find toggle and set current unit type
 * @returns {Unit} unit
 */
const getSiteUnit = () =>
  document.getElementById("chkMeasurements")?.checked ?? true
    ? "imperial"
    : "metric";

/**
 * crawl through dom, read room content, split into buckets and get sizes
 * @param {Unit} unit
 * @returns {{ total: number, buckets: BucketMap }} buckets
 */
const getSiteData = (unit) => {
  let total = 0;
  const buckets = [];
  const section = document.getElementById("propertyDetailsRoomsSection");
  const content = section?.querySelector(".propertyDetailsRoomContent");
  if (!content) {
    return { total: 0, buckets: {} };
  }
  const unitQuery = `.${unit[0].toUpperCase()}${unit.slice(1)}`;
  for (child of content.children) {
    const level = child.querySelector(".listingDetailsRoomDetails_Floor");
    if (level?.innerText.length > 3) {
      buckets.push({ id: level.innerText, rooms: [] });
    }
    const text = child.querySelector(unitQuery).innerText;
    const [x, y] =
      text.match(/x/) !== null
        ? text.split("x").map((num) => parseFloat(num))
        : [0, 0];
    buckets[buckets.length - 1].rooms.push({
      id: child.querySelector(".listingDetailsRoomDetails_Room").innerText,
      dimensions: [x, y],
      size: x * y,
    });
  }
  const bucketsWithSize = buckets.map((bucket) => {
    const bucketSize = bucket.rooms.reduce((bcc, { size }) => size + bcc, 0);
    total = total + bucketSize;
    return { ...bucket, size: bucketSize };
  });
  return { total, buckets: bucketsWithSize };
};

runIt();
