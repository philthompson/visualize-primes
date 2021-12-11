
const forceWorkerReloadUrlParam = "force-worker-reload=true";
const forceWorkerReload = self.location.toString().includes(forceWorkerReloadUrlParam);

if (forceWorkerReload) {
  importScripts("infnum.js?" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
  importScripts("plots.js?" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
} else {
  importScripts("infnum.js");
  importScripts("plots.js");
}

const plotsByName = {};
for (let i = 0; i < plots.length; i++) {
  plotsByName[plots[i].name] = plots[i];
}

self.onmessage = function(e) {
  //console.log("loading: " + e.data.infNumScriptUri);
  // load the script blob that contains the function used to
  //   actually compute each point -- that function is always
  //   called "computeBoundPointColor" and is defined by each
  //   window plot
  //importScripts(e.data.computeFnUrl, e.data.infNumScriptUri);
  computeChunk(e.data.plotId, e.data.chunk, e.data.cachedIndices);
};

var computeChunk = function(plotId, chunk, cachedIndices) {
  // TODO: just use overall time as measured in main thread, don't keep
  //         separate running times on a per-chunk or per-subworker basis
  //var chunkStartMs = Date.now();

  ////////////////////////////////
  // e.chunkPix - {x: int, y: int} - starting point of the chunk's pixel on canvas
  // e.chunkPixInc - {x: int, y: int} - coordinate to add to previous pixel to move to next pixel
  // e.chunkPos - {x: InfNumExpStr, y: InfNumExpStr} - starting point of the chunk
  // e.chunkInc - {x: InfNumExpStr, y: InfNumExpStr} - the coordinate to add to the previous point to move to the next point
  // e.chunkLen - int - the number of points in the chunk
  // e.chunkN - max iterations
  // e.chunkPrecision - precision to use for arbitrary-precision numbers
  // e.results -  [int,int,...] - array of integer "interations" values, one per point in the chunk
  // e.calcStatus - {chunks: int, chunksComplete: int, pixelWidth: int, running: boolean}
//  const zero = InfNum(0n, 0n);
//  let posX = createInfNumFromExpStr(e.chunkPos.x);
//  let posY = createInfNumFromExpStr(e.chunkPos.y);
//  let incX = createInfNumFromExpStr(e.chunkInc.x);
//  let incY = createInfNumFromExpStr(e.chunkInc.y);
  ////////////////////////////////

  //console.log("computing chunk with float? [" + chunk.useFloat + "]");
  //console.log(chunk);

  let px = chunk.chunkPos.x;
  let py = chunk.chunkPos.y;
  let incX = chunk.chunkInc.x;
  let incY = chunk.chunkInc.y;

  const computeFn = plotsByName[chunk.plot].computeBoundPointColor;

  // assume exactly one of x or y increments is zero
  let moveX = true;
  if (infNumEq(infNum(0n, 0n), chunk.chunkInc.x)) {
    moveX = false;
  }
  if (moveX) {
    let norm = normInfNum(px, incX);
    px = norm[0];
    incX = norm[1];
  } else {
    let norm = normInfNum(py, incY);
    py = norm[0];
    incY = norm[1];
  }

  // pre-allocate array so we don't have to use array.push()
  const results = new Array(chunk.chunkLen);
  if (cachedIndices.length < chunk.chunkLen) {
    if (moveX) {
      for (let i = 0; i < chunk.chunkLen; i++) {
        if (!binarySearchIncludesNumber(cachedIndices, i)) {
          results[i] = computeFn(self, chunk.chunkN, chunk.chunkPrecision, chunk.useFloat, px, py);
        }
        // since we want to start at the given starting position, increment
        //   the position AFTER computing each result
        px = infNumAddNorm(px, incX);
      }
    } else {
      for (let i = 0; i < chunk.chunkLen; i++) {
        if (!binarySearchIncludesNumber(cachedIndices, i)) {
          results[i] = computeFn(self, chunk.chunkN, chunk.chunkPrecision, chunk.useFloat, px, py);
        }
        // since we want to start at the given starting position, increment
        //   the position AFTER computing each result
        py = infNumAddNorm(py, incY);
      }
    }
  }
  chunk["results"] = results;
  chunk["plotId"] = plotId;
  postMessage(chunk);
};

// based on the function at https://stackoverflow.com/a/29018745/259456
// this version returns true if the target is found
function binarySearchIncludesNumber(sortedArray, target) {
  let lo = 0;
  let hi = sortedArray.length - 1;
  let x = null;
  let diff = null;
  while (lo <= hi) {
    x = (lo + hi) >>1;
    diff = target - sortedArray[x];
    if (diff > 0) {
      lo = x + 1;
    } else if (diff < 0) {
      hi = x - 1;
    } else {
      return true;
    }
  }
  return false;
}
