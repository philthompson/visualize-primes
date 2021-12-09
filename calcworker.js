
const forceWorkerReloadUrlParam = "force-worker-reload=true";
const forceWorkerReload = self.location.toString().includes(forceWorkerReloadUrlParam);

if (forceWorkerReload) {
  importScripts("infnum.js?" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
} else {
  importScripts("infnum.js");
}

// create subworkers
// for each pass:
//   - calculate chunks
//   - give a chunk to each subworker
//   - when subworker completes chunk:
//       - pass it up to main thread
//       - give that subworker another chunk
//   - when pass is complete, repeat if there's another pass

const windowCalc = {
  "plot": null,
  "pointCalcFunction": null,
  "eachPixUnits": null,
  "leftEdge": null,
  "rightEdge": null,
  "topEdge": null,
  "bottomEdge": null,
  "n": null,
  "precision": null,
  "mandelbrotFloat": null,
  "lineWidth": null,
  "finalWidth": null,
  "chunksComplete": null,
  "canvasWidth": null,
  "canvasHeight": null,
  "xPixelChunks": null,
  "pointsCache": null,
  "cacheScannedChunks": null,
  "cacheScannedChunksCursor": null,
  "passTotalPoints": null,
  "passCachedPoints": null,
  "totalChunks": null,
  "workersCount": null,
  "workers": null,
  "minWorkersCount": null,
  "maxWorkersCount": null
};

self.onmessage = function(e) {
  console.log("got mesage [" + e.data.t + "]");
  if (e.data.t == "worker-calc") {
    runCalc(e.data.v);
  } else if (e.data.t == "workers-count") {
    updateWorkerCount(e.data.v);
  } else if (e.data.t == "cancel-calc") {
    for (let i = 0; i < windowCalc.workers.length; i++) {
      windowCalc.workers[i].terminate();
    }
    windowCalc.workers = [];
  } else if (e.data.t == "wipe-cache") {
    windowCalc.pointsCache = new Map();
  }
};

// for now, the main thread will not pass a "worker-calc" message to this
//   worker once a calculation is already running
function runCalc(msg) {
  windowCalc.plot = msg.plot;
  windowCalc.eachPixUnits = createInfNumFromExpStr(msg.eachPixUnits);
  windowCalc.leftEdge = createInfNumFromExpStr(msg.leftEdge);
  windowCalc.rightEdge = createInfNumFromExpStr(msg.rightEdge);
  windowCalc.topEdge = createInfNumFromExpStr(msg.topEdge);
  windowCalc.bottomEdge = createInfNumFromExpStr(msg.bottomEdge);
  windowCalc.n = msg.n;
  windowCalc.precision = msg.precision;
  windowCalc.mandelbrotFloat = msg.mandelbrotFloat;
  // the main thread does its own 64-wide pixels synchronously,
  //   so the worker threads should start at 32-wide (set to 64
  //   here so that after dividing by two initially we are at 32)
  windowCalc.lineWidth = 64;
  windowCalc.finalWidth = msg.finalWidth;
  windowCalc.chunksComplete = 0;
  windowCalc.canvasWidth = msg.canvasWidth;
  windowCalc.canvasHeight = msg.canvasHeight;
  if (windowCalc.pointsCache === null) {
    windowCalc.pointsCache = new Map();
  }
  windowCalc.totalChunks = null;
  windowCalc.workersCount = msg.workers;
  windowCalc.workers = [];
  windowCalc.minWorkersCount = windowCalc.workersCount;
  windowCalc.maxWorkersCount = windowCalc.workersCount;
  for (let i = 0; i < windowCalc.workersCount; i++) {
    if (forceWorkerReload) {
      windowCalc.workers.push(new Worker("calcsubworker.js?" + forceWorkerReloadUrlParam + "&t=" + (Date.now())));
    } else {
      windowCalc.workers.push(new Worker("calcsubworker.js"));
    }
    windowCalc.workers[i].onmessage = onSubWorkerMessage;
  }
  calculatePass();
};

function updateWorkerCount(msg) {
  windowCalc.workersCount = msg;
  if (windowCalc.workers === null) {
    return;
  }
  if (windowCalc.minWorkersCount > windowCalc.workersCount) {
    windowCalc.minWorkersCount = windowCalc.workersCount;
  }
  if (windowCalc.maxWorkersCount < windowCalc.workersCount) {
    windowCalc.maxWorkersCount = windowCalc.workersCount;
  }
  // if the worker count has been decreased, as workers finish their chunks they
  //   will be terminated
  // if the worker count has been increased, create workers and give them chunks
  for (let i = windowCalc.workers.length + 1; i <= windowCalc.workersCount; i++) {
    let newWorker = null;
    if (forceWorkerReload) {
      newWorker = new Worker("calcsubworker.js?" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
    } else {
      newWorker = new Worker("calcsubworker.js");
    }
    windowCalc.workers.push(newWorker);
    newWorker.onmessage = onSubWorkerMessage;
    assignChunkToWorker(newWorker);
  }
}

function removeWorkerIfNecessary(worker) {
  if (windowCalc.workers.length <= windowCalc.workersCount) {
    return false;
  }
  const index = windowCalc.workers.indexOf(worker);
  if (index < 0) {
    return false;
  }
  windowCalc.workers.splice(index, 1);
  return true;
}

var calculatePass = function() {
  calculateWindowPassChunks();
  for (const worker of windowCalc.workers) {
    assignChunkToWorker(worker);
  }
  //if (isImageComplete()) {
  //  cleanUpWindowCache();
  //}
};

function buildChunkId(chunkPos) {
  return infNumFastStr(chunkPos.x) + "," + infNumFastStr(chunkPos.y);
}

// give next chunk, if any, to the worker
var assignChunkToWorker = function(worker) {
  if (windowCalc.xPixelChunks === null || windowCalc.xPixelChunks.length === 0) {
    return;
  }

  // take the first chunk in the array, and decrement the cursor
  let nextChunk = windowCalc.xPixelChunks.shift();
  windowCalc.cacheScannedChunksCursor--;

  const chunkId = buildChunkId(nextChunk.chunkPos);
  let cacheScan = windowCalc.cacheScannedChunks.get(chunkId);
  if (cacheScan === undefined) {
    scanCacheForChunk(nextChunk);
    cacheScan = windowCalc.cacheScannedChunks.get(chunkId);
  }

  let subWorkerMsg = {
    "chunk": nextChunk,
    "cachedIndices": Array.from(cacheScan.keys()).sort((a, b) => a-b)
  };

  worker.postMessage(subWorkerMsg);

  scanCacheForChunkBeyondCursor();
  scanCacheForChunkBeyondCursor();
};

function scanCacheForChunkBeyondCursor() {
  if (windowCalc.cacheScannedChunksCursor >= windowCalc.xPixelChunks.length - 1 ||
      windowCalc.xPixelChunks.length === 0) {
    return;
  }
  windowCalc.cacheScannedChunksCursor++;
  // this shouldn't happen but if after incrementing it's still <0,
  //   ensure we are pointing at the first element in the array
  if (windowCalc.cacheScannedChunksCursor < 0) {
    windowCalc.cacheScannedChunksCursor = 0;
  }
  scanCacheForChunk(windowCalc.xPixelChunks[windowCalc.cacheScannedChunksCursor]);
}

// this assumes all chunks move along the y axis, only
function scanCacheForChunk(chunk) {
  const pxStr = infNumFastStr(chunk.chunkPos.x);
  const pyStr = infNumFastStr(chunk.chunkPos.y);
  const id = pxStr + "," + pyStr;

  let py = chunk.chunkPos.y;
  let incY = chunk.chunkInc.y;
  let norm = normInfNum(py, incY);
  py = norm[0];
  incY = norm[1];

  const cachedValues = new Map();
  let cachedValue = null;
  const xCache = windowCalc.pointsCache.get(pxStr);
  if (xCache !== undefined) {
    for (let i = 0; i < chunk.chunkLen; i++) {
      // look up the cached value at that point along the y axis
      cachedValue = xCache.get(infNumFastStr(py));
      // if that point was previously cached, grab that value and
      //   associate it with it's index along the chunk
      if (cachedValue !== undefined) {
        cachedValues.set(i, cachedValue);
      }

      // since we want to start at the given starting position, increment
      //   the position AFTER checking each py value
      py = infNumAddNorm(py, incY);
    }
  }
  // store both the cached indices for the chunk, and the cached values at those indicdes
  windowCalc.cacheScannedChunks.set(id, cachedValues);
}

// this assumes all chunks move along the y axis, only
function cacheComputedPointsInChunk(chunk) {
  let count = 0;
  const pxStr = infNumFastStr(chunk.chunkPos.x);

  let xCache = windowCalc.pointsCache.get(pxStr);
  if (xCache === undefined) {
    windowCalc.pointsCache.set(pxStr, new Map());
    xCache = windowCalc.pointsCache.get(pxStr);
  }

  let py = chunk.chunkPos.y;
  let incY = chunk.chunkInc.y;
  let norm = normInfNum(py, incY);
  py = norm[0];
  incY = norm[1];

  let calculatedValue = null;
  for (let i = 0; i < chunk.chunkLen; i++) {
    calculatedValue = chunk.results[i];
    if (calculatedValue !== undefined) {
      count++;
      // set the cached value at that point
      xCache.set(infNumFastStr(py), calculatedValue);
    }

    // since we want to start at the given starting position, increment
    //   the position AFTER checking each py value
    py = infNumAddNorm(py, incY);
  }
  return count;
}

var onSubWorkerMessage = function(msg) {
  //console.log("subworker called back to worker with msg:");
  //console.log(msg);
  windowCalc.chunksComplete++;

  const worker = msg.target;

  let workersCountToReport = windowCalc.minWorkersCount.toString();
  if (windowCalc.maxWorkersCount > windowCalc.minWorkersCount) {
    workersCountToReport += "-" + windowCalc.maxWorkersCount;
  }

  // remove this worker if the number of workers has now been reduced
  const wasWorkerRemoved = removeWorkerIfNecessary(worker);

  // let the subworker start working on next chunk while we combine
  //   its results with the cached values
  if (!wasWorkerRemoved && windowCalc.chunksComplete < windowCalc.totalChunks) {
    assignChunkToWorker(worker);
  }

  // insert any newly-calculated points along the chunk into the cache
  const computedPoints = cacheComputedPointsInChunk(msg.data);
  const prevCachedCount = windowCalc.passCachedPoints;
  windowCalc.passTotalPoints += computedPoints;

  // insert any cached values into the subworker's results array
  const chunkId = buildChunkId(msg.data.chunkPos);
  let cacheScan = windowCalc.cacheScannedChunks.get(chunkId);
  if (cacheScan !== undefined) {
    // the key values in the "cachedByIndex" object are the same
    //   index position along the chunk that the subworker uses,
    //   so we just insert the cached values directly into the
    //   results array at those index positions
    for (const entry of cacheScan) {
      msg.data.results[entry[0]] = entry[1];
    }
    windowCalc.passCachedPoints += cacheScan.size;
    windowCalc.cacheScannedChunks.delete(chunkId);
  }
  const newlySeenCachedPoints = windowCalc.passCachedPoints - prevCachedCount;
  windowCalc.passTotalPoints += newlySeenCachedPoints;
  //console.log("chunk cached points [" + newlySeenCachedPoints + "]");

  // pass results up to main thread, then give next chunk to the worker
  // add status to the data passed up
  const status = {
    "chunks": windowCalc.totalChunks,
    "chunksComplete": windowCalc.chunksComplete,
    "pixelWidth": windowCalc.lineWidth,
    "running": !isImageComplete(),
    "workersCount": workersCountToReport,
    "workersNow": windowCalc.workers.length,
    "passPoints": windowCalc.passTotalPoints,
    "passCachedPoints": windowCalc.passCachedPoints
  };
  msg.data["calcStatus"] = status;
  // convert InfNum objects to strings
  msg.data.chunkPos.x = infNumExpString(msg.data.chunkPos.x);
  msg.data.chunkPos.y = infNumExpString(msg.data.chunkPos.y);
  msg.data.chunkInc.x = infNumExpString(msg.data.chunkInc.x);
  msg.data.chunkInc.y = infNumExpString(msg.data.chunkInc.y);
  self.postMessage(msg.data);

  // start next pass, if there is a next one
  if (windowCalc.chunksComplete >= windowCalc.totalChunks) {
    if (isImageComplete()) {
      cleanUpWindowCache();
    } else {
      calculatePass();
    }
  }
};

function isImageComplete() {
  return windowCalc.chunksComplete === windowCalc.totalChunks && windowCalc.lineWidth === windowCalc.finalWidth;
}

// thanks to https://stackoverflow.com/a/12646864/259456
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// call the plot's computeBoundPoints function in chunks, to better
//   allow interuptions for long-running calculations
var calculateWindowPassChunks = function() {
  windowCalc.passTotalPoints = 0;
  windowCalc.passCachedPoints = 0;
  windowCalc.chunksComplete = 0;
  windowCalc.xPixelChunks = [];
  windowCalc.cacheScannedChunks = new Map();
  windowCalc.cacheScannedChunksCursor = -1;
  if (windowCalc.lineWidth === windowCalc.finalWidth) {
    return;
  }
  // use lineWidth to determine how large to make the calculated/displayed
  //   pixels, so round to integer
  // use Math.round(), not Math.trunc(), because we want the minimum
  //   lineWidth of 0.5 to result in a pixel size of 1
  const potentialTempLineWidth = Math.round(windowCalc.lineWidth / 2);
  if (potentialTempLineWidth <= windowCalc.finalWidth) {
    windowCalc.lineWidth = windowCalc.finalWidth;
  } else {
    windowCalc.lineWidth = potentialTempLineWidth;
  }
  //console.log("worker is calculating chunks for the [" + windowCalc.lineWidth + "]-wide pixels pass");

  const pixelSize = windowCalc.lineWidth;

  // chunk computation does not block the UI thread anymore, so... 
  // "chunks" are CHANGING completely
  // previously, they were a set of X values
  // now, to start with, it is an x,y coordinate with an increment
  //   in ONE dimension
  // it's no longer possible to have a 2-dimensional chunk
  //
  // in the future, we may want to use center-out calculation in a square
  //   shape, where successively bigger squares of pixels are
  //   computed, each made up of 4 chunks (2 vertical, 2 horizontal) 

  // !! T O D O !!
  // use modulo to effectively "cache" points?
  // since we are drawing on top of the existing N-wide pixels,
  //   we might be able to skip every other pixel in every other
  //     row or something, and the skipped pixels will remain...


  const yPointsPerChunk = Math.ceil(windowCalc.canvasHeight / pixelSize) + 1;
  
  var incX = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(pixelSize), 0n));
  var cursorX = infNumSub(windowCalc.leftEdge, incX);
  for (var x = 0; x < windowCalc.canvasWidth; x+=pixelSize) {
    cursorX = infNumAdd(cursorX, incX);
    let chunk = {
      "plot": windowCalc.plot,
      "chunkPix": {"x": x, "y": windowCalc.canvasHeight},
      // since we start at bottom edge, we increment pixels by subtracting Y value 
      //   (because javascript canvas Y coordinate is backwards)
      "chunkPixInc": {"x": 0, "y": -1 * pixelSize},
      "chunkPos": {"x": copyInfNum(cursorX), "y": copyInfNum(windowCalc.bottomEdge)},
      // within the chunk inself, each position along the chunk is incremented in the
      //   Y dimension, and since chunk pixels are square, the amount incremented in
      //   the Y dimension is the same as incX
      "chunkInc": {"x": infNum(0n, 0n), "y": copyInfNum(incX)},
      "chunkLen": yPointsPerChunk,
      "chunkN": windowCalc.n,
      "chunkPrecision": windowCalc.precision,
      "useFloat": windowCalc.mandelbrotFloat
    };
    windowCalc.xPixelChunks.push(chunk);
  }

  // it's a fun effect to see the image materialize in a random
  //   way, as opposed to strictly left-to-right, plus it allows
  //   the user to get a sense for the final image much sooner,
  //   allowing the user to decide whether to continue panning or
  //   zooming
  shuffleArray(windowCalc.xPixelChunks);

  windowCalc.totalChunks = windowCalc.xPixelChunks.length;
};

function cleanUpWindowCache() {
  // now that the image has been completed, delete any cached
  //   points outside of the window
  let cachedPointsDeleted = 0;
  let cachedPointsKept = 0;

  let cachedPxToDelete = [];
  let px = null;
  let py = null;
  for (const pxEntry of windowCalc.pointsCache) {
    px = createInfNumFromFastStr(pxEntry[0]);
    if (infNumLt(px, windowCalc.leftEdge) || infNumGt(px, windowCalc.rightEdge)) {
      cachedPxToDelete.push(pxEntry[0]);
      cachedPointsDeleted += pxEntry[1].size;
    } else {
      let cachedPyToDelete = [];
      for (const pyStr of pxEntry[1].keys()) {
        py = createInfNumFromFastStr(pyStr);
        if (infNumLt(py, windowCalc.bottomEdge) || infNumGt(py, windowCalc.topEdge)) {
          cachedPyToDelete.push(pyStr);
        } else {
          cachedPointsKept++;
        }
      }
      for (const pyStr of cachedPyToDelete) {
        pxEntry[1].delete(pyStr);
      }
      cachedPointsDeleted += cachedPyToDelete.length;
    }
  }
  for (const px of cachedPxToDelete) {
    windowCalc.pointsCache.delete(px);
  }
  const deletedPct = Math.round(cachedPointsDeleted * 10000.0 / (cachedPointsDeleted + cachedPointsKept)) / 100.0;
  console.log("deleted [" + cachedPointsDeleted + "] points from the cache (" + deletedPct + "%)");
}

