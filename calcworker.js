
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
  "totalChunks": null,
  "workers": null,
  "scriptsParentUri": null
};

self.onmessage = function(e) {
  windowCalc.plot = e.data.plot;
  windowCalc.eachPixUnits = createInfNumFromExpStr(e.data.eachPixUnits);
  windowCalc.leftEdge = createInfNumFromExpStr(e.data.leftEdge);
  windowCalc.bottomEdge = createInfNumFromExpStr(e.data.bottomEdge);
  windowCalc.n = e.data.n;
  windowCalc.precision = e.data.precision;
  windowCalc.mandelbrotFloat = e.data.mandelbrotFloat;
  // the main thread does its own 64-wide pixels synchronously,
  //   so the worker threads should start at 32-wide (set to 64
  //   here so that after dividing by two initially we are at 32)
  windowCalc.lineWidth = 64;
  windowCalc.finalWidth = e.data.finalWidth;
  windowCalc.chunksComplete = 0;
  windowCalc.canvasWidth = e.data.canvasWidth;
  windowCalc.canvasHeight = e.data.canvasHeight;
  windowCalc.totalChunks = null;
  windowCalc.workers = [];
  for (let i = 0; i < e.data.workers; i++) {
    if (forceWorkerReload) {
      windowCalc.workers.push(new Worker("calcsubworker.js?" + forceWorkerReloadUrlParam + "&t=" + (Date.now())));
    } else {
      windowCalc.workers.push(new Worker("calcsubworker.js"));
    }
    windowCalc.workers[i].onmessage = onSubWorkerMessage;
  }
  calculatePass();
};

var calculatePass = function() {
  calculateWindowPassChunks();
  for (const worker of windowCalc.workers) {
    assignChunkToWorker(worker);
  }
};

// give next chunk, if any, to the worker
var assignChunkToWorker = function(worker) {
  if (windowCalc.xPixelChunks.length === 0) {
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

  // pass results up to main thread, then give next chunk to the worker
  // add status to the data passed up
  const status = {
    "chunks": windowCalc.totalChunks,
    "chunksComplete": windowCalc.chunksComplete,
    "pixelWidth": windowCalc.lineWidth,
    "running": !isImageComplete()
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
  } else {
    assignChunkToWorker(worker);
  }
};

// this needs to be fixed or at least renamed: once
//   the chunks array is empty, there still may be ongoing
//   computations in other threads
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

