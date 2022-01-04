
const forceWorkerReloadUrlParam = "force-worker-reload=true";
const forceWorkerReload = self.location.toString().includes(forceWorkerReloadUrlParam);

const urlParams = new URLSearchParams(self.location.search);
const appVersion = urlParams.has("v") ? urlParams.get('v') : "unk";

if (forceWorkerReload) {
  importScripts("infnum.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
  importScripts("floatexp.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
  importScripts("plots.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
} else {
  importScripts("infnum.js?v=" + appVersion);
  importScripts("floatexp.js?v=" + appVersion);
  importScripts("plots.js?v=" + appVersion);
}

const plotsByName = {};
for (let i = 0; i < plots.length; i++) {
  plotsByName[plots[i].name] = plots[i];
}

var lastComputeChunkMsg = null;
var referencePx = null;
var referencePy = null;
var referenceOrbit = null;
var referencePlotId = null;
var referenceBlaTables = null;

self.onmessage = function(e) {
  if (e.data.t == "compute-chunk") {
    lastComputeChunkMsg = e.data.v;

    if (referencePlotId !== null && lastComputeChunkMsg.chunk.plotId !== referencePlotId) {
      referenceOrbit = null;
      referenceBlaTables = null;
    }
  } else if (e.data.t == "reference-orbit") {
    referencePx = e.data.v.referencePx;
    referencePy = e.data.v.referencePy;
    referenceOrbit = e.data.v.referenceOrbit;
    referencePlotId = e.data.v.referencePlotId;
  } else if (e.data.t == "bla-tables") {
    referencePx = e.data.v.referencePx;
    referencePy = e.data.v.referencePy;
    referenceBlaTables = e.data.v.referenceBlaTables;
    referencePlotId = e.data.v.referencePlotId;
  } else {
    console.log("subworker received unknown message:", e);
  }
  if (lastComputeChunkMsg === null) {
    return;
  }
  if (referenceOrbit === null && (
        lastComputeChunkMsg.chunk.algorithm.startsWith("perturb-") ||
        lastComputeChunkMsg.chunk.algorithm.startsWith("bla-")
      )) {
    postMessage({t: "send-reference-orbit", v:0});
  } else if (referenceBlaTables === null && lastComputeChunkMsg.chunk.algorithm.startsWith("bla-")) {
    postMessage({t: "send-bla-tables", v:0});
  } else {
    let chunk = lastComputeChunkMsg;
    lastComputeChunkMsg = null;
    //computeChunk(e.data.v.plotId, e.data.v.chunk, e.data.v.cachedIndices, referencePx, referencePy, referenceOrbit);
    computeChunk(chunk.plotId, chunk.chunk, chunk.cachedIndices);
  }
};

//var computeChunk = function(plotId, chunk, cachedIndices, referencePx, referencePy, referenceOrbit) {
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
  ////////////////////////////////

  let px = chunk.chunkPos.x;
  let py = chunk.chunkPos.y;
//  let incX = chunk.chunkInc.x;
  let incY = chunk.chunkInc.y;

  const computeFn = plotsByName[chunk.plot].computeBoundPointColor;

  // assume exactly one of x or y increments is zero
//  let moveX = true;
//  if (infNumEq(infNum(0n, 0n), chunk.chunkInc.x)) {
//    moveX = false;
//  }
//  if (moveX) {
//    let norm = normInfNum(px, incX);
//    px = norm[0];
//    incX = norm[1];
//  } else {
    let norm = normInfNum(py, incY);
    py = norm[0];
    incY = norm[1];
//  }

  // pre-allocate array so we don't have to use array.push()
  const results = new Array(chunk.chunkLen);
  // if entire chunk is cached, we don't have to do anything
  if (cachedIndices.length < chunk.chunkLen) {
    if (chunk.algorithm.startsWith("basic-")) {
//    if (moveX) {
//      for (let i = 0; i < chunk.chunkLen; i++) {
//        if (!binarySearchIncludesNumber(cachedIndices, i)) {
//          results[i] = computeFn(chunk.chunkN, chunk.chunkPrecision, chunk.useFloat, px, py);
//        }
//        // since we want to start at the given starting position, increment
//        //   the position AFTER computing each result
//        px = infNumAddNorm(px, incX);
//      }
//    } else {
      for (let i = 0; i < chunk.chunkLen; i++) {
        if (!binarySearchIncludesNumber(cachedIndices, i)) {
          results[i] = computeFn(chunk.chunkN, chunk.chunkPrecision, chunk.algorithm, px, py);
        }
        // since we want to start at the given starting position, increment
        //   the position AFTER computing each result
        py = infNumAddNorm(py, incY);
      }

    // if not calculating with straightforward algorithm, we will use
    //   the perturbation theory algorithm
    } else if (chunk.algorithm.startsWith("perturb-")) {
      //if (infNumEq(chunk.chunkPos.x, referencePx) && infNumEq(chunk.chunkPos.y, referencePy)) {
      //  console.log("chunk position and reference point are the same!!?!?");
      //}
      const perturbFn = chunk.algorithm.includes("floatexp") ?
        plotsByName[chunk.plot].computeBoundPointColorPerturbOrBlaFloatExp
        :
        plotsByName[chunk.plot].computeBoundPointColorPerturbOrBlaFloat;

      // assuming chunks are all moving along the y axis, for single px
      for (let i = 0; i < chunk.chunkLen; i++) {
        if (!binarySearchIncludesNumber(cachedIndices, i)) {
          results[i] = perturbFn(chunk.chunkN, chunk.chunkPrecision, px, py, chunk.algorithm, referencePx, referencePy, referenceOrbit);
        }
        // since we want to start at the given starting position, increment
        //   the position AFTER computing each result
        py = infNumAddNorm(py, incY);
      }
    } else if (chunk.algorithm.startsWith("bla-")) {

      const blaFn = chunk.algorithm.includes("floatexp") ?
        plotsByName[chunk.plot].computeBoundPointColorPerturbOrBlaFloatExp
        :
        plotsByName[chunk.plot].computeBoundPointColorPerturbOrBlaFloat;

      // assuming chunks are all moving along the y axis, for single px
      for (let i = 0; i < chunk.chunkLen; i++) {
        if (!binarySearchIncludesNumber(cachedIndices, i)) {
          results[i] = blaFn(chunk.chunkN, chunk.chunkPrecision, px, py, chunk.algorithm, referencePx, referencePy, referenceOrbit, referenceBlaTables);
        }
        // since we want to start at the given starting position, increment
        //   the position AFTER computing each result
        py = infNumAddNorm(py, incY);
      }
    }
  }
  chunk["results"] = results;
  chunk["plotId"] = plotId;
  postMessage({t: "completed-chunk", v:chunk});
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

// a version of the FNV-1a hash that accepts all possible unicode/char values
//   (and 64, 128, 256, 512, or 1024 bits of output, not just 32) is available here:
// FNV-1a hash from https://github.com/sindresorhus/fnv1a/blob/main/index.js (MIT license)

// thanks to https://gist.github.com/vaiorabbit/5657561
// 32 bit FNV-1a hash
// Ref.: http://isthe.com/chongo/tech/comp/fnv/
function fnv32a( str )
{
  var FNV1_32A_INIT = 0x811c9dc5;
  var hval = FNV1_32A_INIT;
  for ( var i = 0; i < str.length; ++i )
  {
    hval ^= str.charCodeAt(i);
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  return hval >>> 0;
}
