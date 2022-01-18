
var useWorkers = true;

if (!self.Worker) {
  useWorkers = false;
  self.postMessage({subworkerNoWorky: true});
  self.close();
}

const forceWorkerReloadUrlParam = "force-worker-reload=true";
const forceWorkerReload = self.location.toString().includes(forceWorkerReloadUrlParam);

const urlParams = new URLSearchParams(self.location.search);
const appVersion = urlParams.has("v") ? urlParams.get('v') : "unk";

if (forceWorkerReload) {
  importScripts("infnum.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
  importScripts("plots.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
} else {
  importScripts("infnum.js?v=" + appVersion);
  importScripts("plots.js?v=" + appVersion);
}

const plotsByName = {};
for (let i = 0; i < plots.length; i++) {
  plotsByName[plots[i].name] = plots[i];
}

const allCachedIndicesArray = [-1];
const startPassNumber = 0;

// create subworkers
// for each pass:
//   - calculate chunks
//   - give a chunk to each subworker
//   - when subworker completes chunk:
//       - pass it up to main thread
//       - give that subworker another chunk
//   - when pass is complete, repeat if there's another pass

const windowCalc = {
  "timeout": null,
  "plot": null,
  "pointCalcFunction": null,
  "eachPixUnits": null,
  "edges": null,
  "n": null,
  "precision": null,
  "algorithm": null,
  "passNumber": null,
  "lineWidth": null,
  "finalWidth": null,
  "chunksComplete": null,
  "canvasWidth": null,
  "canvasHeight": null,
  "xPixelChunks": null,
  "pointsCache": null,
  "pointsCacheAlgorithm": null,
  "cacheScannedChunks": null,
  "cacheScannedChunksCursor": null,
  "passTotalPoints": null,
  "passCachedPoints": null,
  "totalChunks": null,
  "workersCount": null,
  "workers": null,
  "minWorkersCount": null,
  "maxWorkersCount": null,
  "plotId": null,
  "stopped": true,
  "referencePx": null,
  "referencePy": null,
  "referencePeriod": null,
  "referenceOrbit": null,
  "referenceOrbitPrecision": null,
  "referenceOrbitN": null,
  "referenceBlaTables": null,
  "referenceBlaN": null,
  "saCoefficients": null,
  "saCoefficientsN": null,
  "saCoefficientsEdges": null,
  "saCoefficientsParams": null,
  "passBlaPixels": null,
  "passBlaIterationsSkipped": null,
  "passBlaSkips": null,
  "setupStage": null,
  "setupStageState": null,
  "setupStageIsStarted": null,
  "setupStageIsFinished": null,
  "caching" : null
};

// long-running setup tasks are split in chunks, and we use the state
//   to, after a setTimeout() callback, resume the current task or
//   move to and begin the next task
const setupStages = {
  checkRefOrbit: 0,
  calcRefOrbit: 1,
  checkBlaCoeff: 2,
  calcBlaCoeff: 3,
  checkSaCoeff: 4,
  calcSaCoeff: 5,
  done: 6
};

self.onmessage = function(e) {
  if (!useWorkers) {
    self.postMessage({subworkerNoWorky: true});
    return;
  }
  console.log("got mesage [" + e.data.t + "]");
  if (e.data.t == "worker-calc") {
    runCalc(e.data.v);
  } else if (e.data.t == "workers-count") {
    updateWorkerCount(e.data.v);
  } else if (e.data.t == "wipe-cache") {
    windowCalc.pointsCache = new Map();
  } else if (e.data.t == "wipe-ref-orbit") {
    wipeReferenceOrbitStuff();
  } else if (e.data.t == "stop") {
    windowCalc.stopped = true;
    stopAndRemoveAllWorkers();
  }
};

// for now, the main thread will not pass a "worker-calc" message to this
//   worker once a calculation is already running
function runCalc(msg) {
  windowCalc.plotId = msg.plotId;
  windowCalc.plot = msg.plot;
  windowCalc.stopped = false;
  windowCalc.eachPixUnits = msg.eachPixUnits;
  windowCalc.edges = {
    left: msg.leftEdge,
    right:  msg.rightEdge,
    top: msg.topEdge,
    bottom: msg.bottomEdge
  };
  windowCalc.n = msg.n;
  windowCalc.precision = msg.precision;
  windowCalc.algorithm = msg.algorithm;
  windowCalc.passNumber = startPassNumber - 1;
  // the main thread does its own 64-wide pixels synchronously,
  //   so the worker threads should start at 32-wide (set to 64
  //   here so that after dividing by two initially we are at 32)
  windowCalc.lineWidth = msg.startWidth * 2;
  windowCalc.finalWidth = msg.finalWidth;
  windowCalc.chunksComplete = 0;
  windowCalc.canvasWidth = msg.canvasWidth;
  windowCalc.canvasHeight = msg.canvasHeight;
  // include "nocache" in algorithm name to turn off caching
  windowCalc.caching = !windowCalc.algorithm.includes("nocache");
  if (windowCalc.pointsCache === null || !windowCalc.caching ||
      (windowCalc.pointsCacheAlgorithm !== null &&
        windowCalc.pointsCacheAlgorithm != windowCalc.algorithm)) {
    windowCalc.pointsCache = new Map();
  }
  windowCalc.pointsCacheAlgorithm = windowCalc.algorithm;
  windowCalc.totalChunks = null;
  windowCalc.workersCount = msg.workers;
  windowCalc.workers = [];
  windowCalc.minWorkersCount = windowCalc.workersCount;
  windowCalc.maxWorkersCount = windowCalc.workersCount;
  for (let i = 0; i < windowCalc.workersCount; i++) {
    if (forceWorkerReload) {
      windowCalc.workers.push(new Worker("calcsubworker.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now())));
    } else {
      windowCalc.workers.push(new Worker("calcsubworker.js?v=" + appVersion));
    }
    windowCalc.workers[i].onmessage = onSubWorkerMessage;
  }

  if (windowCalc.algorithm.includes("basic-")) {
    // do these really need to be cleared?  what if the user stays at the same
    //   center+scale and toggles the algorithm a few times?  shouldn't these
    //   computation-heavy items just sit untouched if not actually required to change?
    windowCalc.referencePx = null;
    windowCalc.referencePy = null;
    windowCalc.referenceOrbit = null;
    windowCalc.referenceBlaTables = null;
    windowCalc.saCoefficients = null;

    // since the basic algorithm has no setup tasks, we just start here
    calculatePass();

  // if we are using perturbation theory, we'll now calculate the
  //   reference point and its full orbit (which will be used for
  //   all chunks in all passes)
  } else {
    if (windowCalc.timeout != null) {
      clearTimeout(windowCalc.timeout);
    }
    windowCalc.timeout = setTimeout(kickoffSetupTasks, 250);
  }
};

function wipeReferenceOrbitStuff() {
  windowCalc.referenceOrbit = null;
  // since SA and BLA computed coefficients/terms are dependent on
  //   the ref orbit, wipe those when we calculate a new ref orbit
  windowCalc.saCoefficients = null;
  windowCalc.referenceBlaTables = null;
}

function setupCheckReferenceOrbit() {
  sendStatusMessage("Finding reference point");

  // start with middle of window for reference point (doesn't have to
  //   exactly align with a pixel)
  let newReferencePx = infNumAdd(windowCalc.edges.left, infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(windowCalc.canvasWidth/2)), 0n)));
  let newReferencePy = infNumAdd(windowCalc.edges.bottom, infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(windowCalc.canvasHeight/2)), 0n)));

  let refPointHasMoved = false;
  if (windowCalc.referencePx === null || windowCalc.referencePy === null) {
    refPointHasMoved = true;
  } else {
    // check difference between this and previous x position
    let xDiff = infNumSub(windowCalc.referencePx, newReferencePx);
    let yDiff = infNumSub(windowCalc.referencePy, newReferencePy);
    let squaredDiff = infNumAdd(infNumMul(xDiff, xDiff), infNumMul(yDiff, yDiff));

    // 5% of pixel width move (radius) is allowable
    let maxAllowablePixelsMove = Math.ceil(windowCalc.canvasWidth * 0.05);
    let maxAllowableMove = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(maxAllowablePixelsMove), 0n));
    // square this as well
    maxAllowableMove = infNumMul(maxAllowableMove, maxAllowableMove);

    if (infNumGt(squaredDiff, maxAllowableMove)) {
      refPointHasMoved = true;
      console.log("the previous ref orbit is NOT within [" + maxAllowablePixelsMove + "] pixels, so we need a new ref orbit");
    } else {
      console.log("the previous ref orbit is within [" + maxAllowablePixelsMove + "] pixels, so it's still valid");
    }
  }

  if (windowCalc.referenceOrbitN === null || windowCalc.referenceOrbitN < windowCalc.n ||
      windowCalc.referenceOrbitPrecision === null || windowCalc.referenceOrbitPrecision / windowCalc.precision < 0.98 ||
      windowCalc.referenceOrbit === null || refPointHasMoved) {
    windowCalc.referencePx = newReferencePx;
    windowCalc.referencePy = newReferencePy;
    // wipe this to signal to next stage that the reference orbit
    //   needs to be calculated
    wipeReferenceOrbitStuff();
  } else {
    console.log("re-using previously-calculated reference orbit, with [" + windowCalc.referenceOrbit.length + "] iterations, for point:");
    console.log("referencePx: " + infNumToString(windowCalc.referencePx));
    console.log("referencePy: " + infNumToString(windowCalc.referencePy));
    // no need to calculate a new reference orbit
    return false;
  }
  // we need to calculate a new reference orbit
  return true;
}

function setupReferenceOrbit(state) {
  if (state === null || !state.done) {

    // temporary, try to find period (turned off for now)
    const findPeriod = false;
    if (!findPeriod) {
      windowCalc.referencePeriod = -1;
    } else if (state === null) {
      let refPeriodState = null;
      // to create square 10% of screen width (larger dimension) we
      //   need to move 5% right/left/up/down from the center point
      let pixelsPercent = Math.floor(0.05 * Math.max(windowCalc.canvasHeight, windowCalc.canvasWidth));
      let boxDelta = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(pixelsPercent), 0n));
      while (refPeriodState === null || !refPeriodState.done) {
        refPeriodState = plotsByName[windowCalc.plot].computeReferencePeriod(windowCalc.n, windowCalc.precision, windowCalc.algorithm, windowCalc.referencePx, windowCalc.referencePy, boxDelta, refPeriodState);
        sendStatusMessage(refPeriodState.status);
      }
      console.log("computed ref PERIOD to be " + refPeriodState.period);
      windowCalc.referencePeriod = refPeriodState.period;
    }

    state = plotsByName[windowCalc.plot].computeReferenceOrbit(windowCalc.n, windowCalc.precision, windowCalc.algorithm, windowCalc.referencePx, windowCalc.referencePy, windowCalc.referencePeriod, state);
    sendStatusMessage(state.status);
  }
  if (state.done) {
    windowCalc.referenceOrbit = state.orbit;
    windowCalc.referenceOrbitN = windowCalc.n;
    windowCalc.referenceOrbitPrecision = windowCalc.precision;
    console.log("calculated new middle reference orbit, with [" + windowCalc.referenceOrbit.length + "] iterations, for point:");
    console.log("referencePx: " + infNumToString(windowCalc.referencePx));
    console.log("referencePy: " + infNumToString(windowCalc.referencePy));
  }
  return state;
}

function setupCheckBlaCoefficients() {
  // if we are using bivariate linear approximation, and we haven't already
  //   calculated them based on the ref orbit, calculate the coefficients
  if (windowCalc.algorithm.includes("bla-")) {
    if (windowCalc.referenceBlaTables === null ||
        // not sure how changing N (max iterations) affects BLA coefficients,
        //   so just require a full re-compute for now if it has changed
        windowCalc.n !== windowCalc.referenceBlaN) {
      return true;
    } else {
      console.log("re-using previously-calculated BLA coefficient tables");
    }
  }
  // no need to calculate BLA coefficients
  return false;
}

function setupBlaCoefficients(state) {
  if (state === null || !state.done) {
    if (state === null) {
      windowCalc.referenceBlaTables === null;
      sendStatusMessage("Calculating BLA coefficient tables");
    }
    state = plotsByName[windowCalc.plot].computeBlaTables(windowCalc.algorithm, windowCalc.referenceOrbit, state);
    sendStatusMessage(state.status);
  }
  if (state.done) {
    windowCalc.referenceBlaN = windowCalc.n;
    windowCalc.referenceBlaTables = state.blaTables;
  }
  return state;
}

function setupCheckSaCoefficients() {
  if (windowCalc.algorithm.includes("sapx")) {
    let sapxParams = windowCalc.algorithm.split("-").find(e => e.startsWith("sapx"));
    // regardless of whether we re-use the reference orbit, we have to re-calculate
    //   series approximation coefficients if any window edge has moved (it's probably
    //   true that if the edges have only slightly moved, the test points in the
    //   window would only be slightly different, and may still be valid, but that
    //   would require some testing)
    if (windowCalc.saCoefficients === null || windowCalc.saCoefficientsEdges === null ||
        // not sure how changing N (max iterations) affects SA coefficients,
        //   so just require a full re-compute for now if it has changed
        windowCalc.n !== windowCalc.saCoefficientsN ||
        windowCalc.saCoefficientsParams === null || windowCalc.saCoefficientsParams != sapxParams ||
        !infNumEq(windowCalc.edges.left, windowCalc.saCoefficientsEdges.left) ||
        !infNumEq(windowCalc.edges.right, windowCalc.saCoefficientsEdges.right) ||
        !infNumEq(windowCalc.edges.top, windowCalc.saCoefficientsEdges.top) ||
        !infNumEq(windowCalc.edges.bottom, windowCalc.saCoefficientsEdges.bottom)) {
      return true;
    } else {
      console.log("re-using previously-calculated SA coefficients");
    }
  } else {
    // no need to wipe these... in the future, if SA can be easily toggled on/off by
    //   the user, we'd want to re-use these if the window hasn't moved since when
    //   these were calculated
    //windowCalc.saCoefficients = null;
  }
  // no need to calculate SA coefficients
  return false;
}

function setupSaCoefficients(state) {
  if (state === null || !state.done) {
    if (state === null) {
      windowCalc.saCoefficients === null;
      sendStatusMessage("Calculating and testing SA coefficients");
    }
    state = plotsByName[windowCalc.plot].computeSaCoefficients(windowCalc.precision, windowCalc.algorithm, windowCalc.referencePx, windowCalc.referencePy, windowCalc.referenceOrbit, windowCalc.edges, state);
    sendStatusMessage(state.status);
  }
  if (state.done) {
    windowCalc.saCoefficientsN = windowCalc.n;
    windowCalc.saCoefficientsEdges = structuredClone(windowCalc.edges);
    windowCalc.saCoefficients = state.saCoefficients;
    windowCalc.saCoefficientsParams = windowCalc.algorithm.split("-").find(e => e.startsWith("sapx"));
  }
  return state;
}

function kickoffSetupTasks() {
  if (windowCalc.timeout != null) {
    clearTimeout(windowCalc.timeout);
  }
  windowCalc.setupStage = 0;
  windowCalc.timeout = setInterval(runSetupTasks, 5);
}

function runSetupTasks() {
  if (windowCalc.stopped || windowCalc.setupStage >= setupStages.done) {
    if (windowCalc.timeout != null) {
      clearTimeout(windowCalc.timeout);
    }
    if (!windowCalc.stopped) {
      calculatePass();
    }
    return;

  // =============================================================
  } else if (windowCalc.setupStage === setupStages.checkRefOrbit) {
    if (!setupCheckReferenceOrbit()) {
      // increment an extra time here to skip the next stage, since
      //   we don't need to run it
      windowCalc.setupStage++;
    }
    windowCalc.setupStageIsFinished = true;

  // =============================================================
  } else if (windowCalc.setupStage === setupStages.calcRefOrbit) {
    if (!windowCalc.setupStageIsStarted) {
      windowCalc.setupStageState = null;
      windowCalc.setupStageIsStarted = true;
    }
    if (!windowCalc.setupStageIsFinished) {
      windowCalc.setupStageState = setupReferenceOrbit(windowCalc.setupStageState);
    }
    if (windowCalc.setupStageState.done) {
      windowCalc.setupStageIsFinished = true;
    }

  // ==============================================================    
  } else if (windowCalc.setupStage === setupStages.checkBlaCoeff) {
    if (!setupCheckBlaCoefficients()) {
      // increment an extra time here to skip the next stage, since
      //   we don't need to run it
      windowCalc.setupStage++;
    }
    windowCalc.setupStageIsFinished = true;

  // =============================================================
  } else if (windowCalc.setupStage === setupStages.calcBlaCoeff) {
    if (!windowCalc.setupStageIsStarted) {
      windowCalc.setupStageState = null;
      windowCalc.setupStageIsStarted = true;
    }
    if (!windowCalc.setupStageIsFinished) {
      windowCalc.setupStageState = setupBlaCoefficients(windowCalc.setupStageState);
    }
    if (windowCalc.setupStageState.done) {
      windowCalc.setupStageIsFinished = true;
    }

  // =============================================================
  } else if (windowCalc.setupStage === setupStages.checkSaCoeff) {
    if (!setupCheckSaCoefficients()) {
      // increment an extra time here to skip the next stage, since
      //   we don't need to run it
      windowCalc.setupStage++;
    }
    windowCalc.setupStageIsFinished = true;

  // ============================================================
  } else if (windowCalc.setupStage === setupStages.calcSaCoeff) {
    if (!windowCalc.setupStageIsStarted) {
      windowCalc.setupStageState = null;
      windowCalc.setupStageIsStarted = true;
    }
    if (!windowCalc.setupStageIsFinished) {
      windowCalc.setupStageState = setupSaCoefficients(windowCalc.setupStageState);
    }
    if (windowCalc.setupStageState.done) {
      windowCalc.setupStageIsFinished = true;
    }

  } else {
    console.log("unexpected calcworker setup stage [" + windowCalc.setupStage + "]... stopping setup");
    windowCalc.setupStage = setupStages.done;
  }
  // move to the next stage if this stage has been marked as finished
  if (windowCalc.setupStageIsFinished) {
    windowCalc.setupStageIsStarted = false;
    windowCalc.setupStageIsFinished = false;
    windowCalc.setupStage++;
  }
}

function stopAndRemoveAllWorkers() {
  if (windowCalc.timeout != null) {
    clearTimeout(windowCalc.timeout);
  }
  if (windowCalc.workers === null) {
    return;
  }
  for (let i = 0; i < windowCalc.workers.length; i++) {
    windowCalc.workers[i].terminate();
  }
  windowCalc.workers = null;
}

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
      newWorker = new Worker("calcsubworker.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
    } else {
      newWorker = new Worker("calcsubworker.js?v=" + appVersion);
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
  if (windowCalc.stopped) {
    return;
  }
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
  if (windowCalc.stopped || windowCalc.xPixelChunks === null || windowCalc.xPixelChunks.length === 0) {
    return;
  }

  if (!windowCalc.caching) {
    let nextChunk = windowCalc.xPixelChunks.shift();
    let subWorkerMsg = {
      "plotId": windowCalc.plotId,
      "chunk": nextChunk,
      "cachedIndices": []
    };

    worker.postMessage({
      t: "compute-chunk",
      v: subWorkerMsg
    });

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

  // if the entire chunk is cached, don't bother sending all
  //   point indices to the worker -- send one -1 index
  let subWorkerMsg = {
    "plotId": windowCalc.plotId,
    "chunk": nextChunk,
    "cachedIndices": cacheScan.size === nextChunk.chunkLen ? allCachedIndicesArray : Array.from(cacheScan.keys()).sort((a, b) => a-b)
  };

  worker.postMessage({
    t: "compute-chunk",
    v: subWorkerMsg
  });

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
  // when all points are cached, the subworker doesn't bother
  //   allocating the entire array (and there's nothing to
  //   add to the cache)
  if (chunk.results.length === 0) {
    return 0;
  }
  if (!windowCalc.caching) {
    return chunk.results.length;
  }
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
  if (msg.data.t == "completed-chunk") {
    handleSubworkerCompletedChunk(msg);
  } else if (msg.data.t == "send-reference-orbit") {
    handleReferenceOrbitRequest(msg);
  } else if (msg.data.t == "send-bla-tables") {
    handleBlaTablesRequest(msg);
  } else if (msg.data.t == "send-sa-coefficients") {
    handleSaCoefficientsRequest(msg);
  } else {
    console.log("worker received unknown message from subworker:", e);
  }
}

function handleReferenceOrbitRequest(msg) {
  const worker = msg.target;
  worker.postMessage({
    t: "reference-orbit",
    v: {
      referencePx: windowCalc.referencePx,
      referencePy: windowCalc.referencePy,
      referenceOrbit: windowCalc.referenceOrbit,
      referencePlotId: windowCalc.plotId
    }
  });
}

function handleBlaTablesRequest(msg) {
  const worker = msg.target;
  worker.postMessage({
    t: "bla-tables",
    v: {
      referencePx: windowCalc.referencePx,
      referencePy: windowCalc.referencePy,
      referenceBlaTables: windowCalc.referenceBlaTables,
      referencePlotId: windowCalc.plotId
    }
  });
}

function handleSaCoefficientsRequest(msg) {
  const worker = msg.target;
  worker.postMessage({
    t: "sa-coefficients",
    v: {
      referencePx: windowCalc.referencePx,
      referencePy: windowCalc.referencePy,
      saCoefficients: windowCalc.saCoefficients,
      referencePlotId: windowCalc.plotId
    }
  });
}

function handleSubworkerCompletedChunk(msg) {
  // if the worker was working on an old plot, note this...
  const isOutdatedWorker = msg.data.v.plotId !== windowCalc.plotId;

  //console.log("subworker called back to worker with msg:");
  //console.log(msg);
  if (!isOutdatedWorker) {
    windowCalc.chunksComplete++;
  }

  const worker = msg.target;

  // remove this worker if the number of workers has now been reduced
  const wasWorkerRemoved = removeWorkerIfNecessary(worker);

  // after removing worker, stop if we've been asked to stop
  if (windowCalc.stopped) {
    return;
  }

  // let the subworker start working on next chunk while we combine
  //   its results with the cached values
  if (!wasWorkerRemoved && windowCalc.chunksComplete < windowCalc.totalChunks) {
    assignChunkToWorker(worker);
  }

  // for an outdated worker, just throw away its data and don't
  //   do anything with the cache for it
  if (!isOutdatedWorker) {
    settleChunkWithCacheAndPublish({data: msg.data.v});
  }

  // start next pass, if there is a next one
  if (windowCalc.chunksComplete >= windowCalc.totalChunks) {
    if (windowCalc.passBlaPixels > 0) {
      if (windowCalc.passBlaIterationsSkipped > 0) {
        console.log("for entire pass, [" + (windowCalc.passBlaPixels).toLocaleString() + "] pixels skipped [" + (windowCalc.passBlaIterationsSkipped).toLocaleString() + "] iters with BLA, avgs: [" + Math.floor(windowCalc.passBlaIterationsSkipped / windowCalc.passBlaPixels) + "] per pixel, [" + Math.floor(windowCalc.passBlaIterationsSkipped / windowCalc.passBlaSkips) + "] per skip");
      } else {
        console.log("for entire pass, no pixels had BLA iteration skips");
      }
    }
    if (isImageComplete()) {
      cleanUpWindowCache();
    } else {
      calculatePass();
    }
  }
};

function settleChunkWithCacheAndPublish(msg) {
  let workersCountToReport = windowCalc.minWorkersCount.toString();
  if (windowCalc.maxWorkersCount > windowCalc.minWorkersCount) {
    workersCountToReport += "-" + windowCalc.maxWorkersCount;
  }

  // insert any newly-calculated points along the chunk into the cache
  const computedPoints = cacheComputedPointsInChunk(msg.data);
  const prevCachedCount = windowCalc.passCachedPoints;
  windowCalc.passTotalPoints += computedPoints;

  // insert any cached values into the subworker's results array
if (windowCalc.caching) {
  const chunkId = buildChunkId(msg.data.chunkPos);
  let cacheScan = windowCalc.cacheScannedChunks.get(chunkId);
  if (cacheScan !== undefined) {
    // for the case when all chunk indices are cached, the subworker
    //   doesn't pre-allocate the entire array
    if (msg.data.results.length === 0) {
      msg.data.results = new Array(msg.data.chunkLen);
    }
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
}

  if ("blaPixelsCount" in msg.data) {
    windowCalc.passBlaPixels += msg.data.blaPixelsCount;
    windowCalc.passBlaIterationsSkipped += msg.data.blaIterationsSkipped;
    windowCalc.passBlaSkips += msg.data.blaSkips;
  }

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
  if (windowCalc.saCoefficients !== null) {
    status["saItersSkipped"] = windowCalc.saCoefficients.itersToSkip;
  }
  msg.data["calcStatus"] = status;
  // convert InfNum objects to strings
  msg.data.chunkPos.x = infNumExpString(msg.data.chunkPos.x);
  msg.data.chunkPos.y = infNumExpString(msg.data.chunkPos.y);
  msg.data.chunkInc.x = infNumExpString(msg.data.chunkInc.x);
  msg.data.chunkInc.y = infNumExpString(msg.data.chunkInc.y);
  self.postMessage(msg.data);
}

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
  windowCalc.passNumber++;
  windowCalc.passBlaPixels = 0;
  windowCalc.passBlaIterationsSkipped = 0;
  windowCalc.passBlaSkips = 0;
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
  sendStatusMessage("Calculating pixels for " + windowCalc.lineWidth + "-wide pass");
  //console.log("worker is calculating chunks for the [" + windowCalc.lineWidth + "]-wide pixels pass");

  const pixelSize = windowCalc.lineWidth;

  // when NOT caching:
  // for the first pass, we don't skip any previously-calculated
  //   pixels.  otherwise, we skip every other pixel in every
  //   other (even-numbered 0th, 2nd, 4th, ...) chunk
  const skipPrevPixels = !windowCalc.caching && windowCalc.passNumber > startPassNumber;

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

  const yPointsPerChunk = Math.ceil(windowCalc.canvasHeight / pixelSize) + 1;
  const yPointsPerChunkHalf = Math.ceil(yPointsPerChunk / 2);
  
  const incX = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(pixelSize), 0n));
  const incXTwice = infNumMul(incX, infNum(2n, 0n));
  let cursorX = copyInfNum(windowCalc.edges.left);
  let chunkNum = 0;
  for (let x = 0; x < windowCalc.canvasWidth; x+=pixelSize) {
    let chunk = {
      "plot": windowCalc.plot,
      "chunkN": windowCalc.n,
      "chunkPrecision": windowCalc.precision,
      "algorithm": windowCalc.algorithm
    };
    if (skipPrevPixels && chunkNum % 2 == 0) {
      Object.assign(chunk, {
        "chunkPix": {"x": x, "y": windowCalc.canvasHeight - pixelSize},
        // since we start at bottom edge, we increment pixels by subtracting Y value
        //   (because javascript canvas Y coordinate is backwards)
        "chunkPixInc": {"x": 0, "y": -2 * pixelSize},
        "chunkPos": {"x": copyInfNum(cursorX), "y": infNumAdd(windowCalc.edges.bottom, incX)},
        // within the chunk inself, each position along the chunk is incremented in the
        //   Y dimension, and since chunk pixels are square, the amount incremented in
        //   the Y dimension is the same as incX
        "chunkInc": {"x": infNum(0n, 0n), "y": copyInfNum(incXTwice)},
        "chunkLen": yPointsPerChunkHalf
      });
    } else {
      Object.assign(chunk, {
        "chunkPix": {"x": x, "y": windowCalc.canvasHeight},
        // since we start at bottom edge, we increment pixels by subtracting Y value
        //   (because javascript canvas Y coordinate is backwards)
        "chunkPixInc": {"x": 0, "y": -1 * pixelSize},
        "chunkPos": {"x": copyInfNum(cursorX), "y": copyInfNum(windowCalc.edges.bottom)},
        // within the chunk inself, each position along the chunk is incremented in the
        //   Y dimension, and since chunk pixels are square, the amount incremented in
        //   the Y dimension is the same as incX
        "chunkInc": {"x": infNum(0n, 0n), "y": copyInfNum(incX)},
        "chunkLen": yPointsPerChunk
      });
    }
    windowCalc.xPixelChunks.push(chunk);
    cursorX = infNumAdd(cursorX, incX);
    chunkNum++;
  }

  // it's a fun effect to see the image materialize in a random
  //   way, as opposed to strictly left-to-right, plus it allows
  //   the user to get a sense for the final image much sooner,
  //   allowing the user to decide whether to continue panning or
  //   zooming
  shuffleArray(windowCalc.xPixelChunks);

  windowCalc.totalChunks = windowCalc.xPixelChunks.length;
};

function sendStatusMessage(message) {
  self.postMessage({
    plotId: windowCalc.plotId,
    statusMessage: message
  });
}

function cleanUpWindowCache() {
  if (!windowCalc.caching) {
    return;
  }
  // now that the image has been completed, delete any cached
  //   points outside of the window
  let cachedPointsDeleted = 0;
  let cachedPointsKept = 0;

  let cachedPxToDelete = [];
  let px = null;
  let py = null;
  for (const pxEntry of windowCalc.pointsCache) {
    px = createInfNumFromFastStr(pxEntry[0]);
    if (infNumLt(px, windowCalc.edges.left) || infNumGt(px,windowCalc.edges.right)) {
      cachedPxToDelete.push(pxEntry[0]);
      cachedPointsDeleted += pxEntry[1].size;
    } else {
      let cachedPyToDelete = [];
      for (const pyStr of pxEntry[1].keys()) {
        py = createInfNumFromFastStr(pyStr);
        if (infNumLt(py, windowCalc.edges.bottom) || infNumGt(py, windowCalc.edges.top)) {
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

