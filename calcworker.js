
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
  "totalChunks": null,
  "workersCount": null,
  "workers": null,
  "minWorkersCount": null,
  "maxWorkersCount": null
};

self.onmessage = function(e) {
  if (e.data.t == "worker-calc") {
    runCalc(e.data.v);
  } else if (e.data.t == "workers-count") {
    updateWorkerCount(e.data.v);
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
  // for the future, when caching is re-implemented:
  //if (isImageComplete()) {
  //  cleanUpWindowCache();
  //}
};

// give next chunk, if any, to the worker
var assignChunkToWorker = function(worker) {
  if (windowCalc.xPixelChunks === null || windowCalc.xPixelChunks.length === 0) {
    return;
  }
  var nextChunk = windowCalc.xPixelChunks.shift();
  var subWorkerMsg = {
    "chunk": nextChunk
  };
  
  worker.postMessage(subWorkerMsg);
};

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

  // pass results up to main thread, then give next chunk to the worker
  // add status to the data passed up
  const status = {
    "chunks": windowCalc.totalChunks,
    "chunksComplete": windowCalc.chunksComplete,
    "pixelWidth": windowCalc.lineWidth,
    "running": !isImageComplete(),
    "workersCount": workersCountToReport,
    "workersNow": windowCalc.workers.length
  };
  msg.data["calcStatus"] = status;
  // convert InfNum objects to strings
  msg.data.chunkPos.x = infNumExpString(msg.data.chunkPos.x);
  msg.data.chunkPos.y = infNumExpString(msg.data.chunkPos.y);
  msg.data.chunkInc.x = infNumExpString(msg.data.chunkInc.x);
  msg.data.chunkInc.y = infNumExpString(msg.data.chunkInc.y);
  self.postMessage(msg.data);

  //console.log("subworker is done, now [" + windowCalc.chunksComplete + "] of [" + windowCalc.totalChunks + "] are done");
  if (windowCalc.chunksComplete >= windowCalc.totalChunks) {
    // start next pass, if there is a next one
    calculatePass();
  } else if (!wasWorkerRemoved) {
    assignChunkToWorker(worker);
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
  windowCalc.chunksComplete = 0;
  windowCalc.xPixelChunks = [];
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


  const yPointsPerChunk = Math.ceil(windowCalc.canvasHeight / pixelSize);
  
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
  let cachedPointsKept = 0;
  let cachedPointsToDelete = [];
  for (let name in windowCalc.pointsCache) {
    if (infNumLt(windowCalc.pointsCache[name].pt.x, windowCalc.leftEdge) ||
        infNumGt(windowCalc.pointsCache[name].pt.x, windowCalc.rightEdge) ||
        infNumLt(windowCalc.pointsCache[name].pt.y, windowCalc.bottomEdge) ||
        infNumGt(windowCalc.pointsCache[name].pt.y, windowCalc.topEdge)) {
      cachedPointsToDelete.push(name);
    } else {
      cachedPointsKept++;
    }
  }
  for (let i = 0; i < cachedPointsToDelete.length; i++) {
    delete windowCalc.pointsCache[name];
  }
  const deletedPct = Math.round(cachedPointsToDelete.length * 10000.0 / (cachedPointsToDelete.length + cachedPointsKept)) / 100.0;
  console.log("deleted [" + cachedPointsToDelete.length + "] points from the cache (" + deletedPct + "%)");
}

