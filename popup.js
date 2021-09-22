const contentEl = document.getElementById("grid");

const state = {
  levelBuckets: [],
  levelSizes: [],
  totalSize: 0,
  unit: "imperial",
};

const runIt = async () => {
  try {
    const tab = await getCurrentTab();
    state.unit = await promiseExecute({
      target: { tabId: tab.id },
      function: readUnit,
    });
    state.levelBuckets = await promiseExecute({
      target: { tabId: tab.id },
      function: readRooms,
      args: [state.unit],
    });
    const { total, levels } = await promiseExecute({
      target: { tabId: tab.id },
      function: addSizes,
      args: [state.levelBuckets],
    });
    state.levelSizes = levels;
    state.totalSize = total;
    renderElement();
  } catch (err) {
    document.getElementById("problem").style.display = "block";
    throw err;
  } finally {
    document.getElementById("loading").style.display = "none";
  }
};

const renderElement = () => {
  const baseUnit = state.unit === "imperial" ? "ft" : "m";
  const rows = [...state.levelSizes, { name: "TOTAL", size: state.totalSize }];
  for ([idx, level] of rows.entries()) {
    if (idx !== 0) {
      const lineEl = document.createElement("div");
      lineEl.className = "level-separator";
      contentEl.appendChild(lineEl);
    }
    const levelEl = document.createElement("a");
    levelEl.className = "level-name";
    levelEl.innerText = level.name;
    contentEl.appendChild(levelEl);
    const sizeEl = document.createElement("a");
    sizeEl.className = "level-size";
    sizeEl.innerHTML = `${Math.round(level.size)}&nbsp;`;
    const unitEl = document.createElement("a");
    unitEl.className = "level-unit";
    unitEl.innerHTML = `${baseUnit}&sup2;`;
    sizeEl.appendChild(unitEl);
    contentEl.appendChild(sizeEl);
  }
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

const readUnit = () =>
  document.getElementById("chkMeasurements").checked ? "imperial" : "metric";

const readRooms = (unit) => {
  const buckets = [];
  const section = document.getElementById("propertyDetailsRoomsSection");
  const content = section.querySelector(".propertyDetailsRoomContent");
  const unitQuery = `.${unit[0].toUpperCase()}${unit.slice(1)}`;
  for (child of content.children) {
    const level = child.querySelector(".listingDetailsRoomDetails_Floor");
    if (level?.innerText.length > 3) {
      buckets.push({ level: level.innerText, rooms: [] });
    }
    const text = child.querySelector(unitQuery).innerText;
    buckets[buckets.length - 1].rooms.push({
      name: child.querySelector(".listingDetailsRoomDetails_Room").innerText,
      size:
        text.match(/x/) !== null
          ? text.split("x").map((num) => parseFloat(num))
          : [0, 0],
    });
  }
  return buckets;
};

const addSizes = (buckets) =>
  buckets.reduce(
    (acc, bucket) => {
      const size = bucket.rooms.reduce(
        (acc, { size: [x, y] }) => x * y + acc,
        0
      );
      return {
        total: acc.total + size,
        levels: [...acc.levels, { name: bucket.level, size }],
      };
    },
    { total: 0, levels: [] }
  );

runIt();
