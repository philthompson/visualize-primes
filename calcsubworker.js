
// temporary polyfill since Chrome/Safari don't quite yet support this
if (!self.structuredClone) {
  // thanks to https://stackoverflow.com/a/70315718/259456
  BigInt.prototype.toJSON = function() {
      return this.toString();
  };
  self.structuredClone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };
}

const forceWorkerReloadUrlParam = "force-worker-reload=true";
const forceWorkerReload = self.location.toString().includes(forceWorkerReloadUrlParam);

const urlParams = new URLSearchParams(self.location.search);
const appVersion = urlParams.has("v") ? urlParams.get('v') : "unk";

if (forceWorkerReload) {
  importScripts("infnum.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
  importScripts("floatexp.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
  importScripts("mathiface.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
  importScripts("plots.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
} else {
  importScripts("infnum.js?v=" + appVersion);
  importScripts("floatexp.js?v=" + appVersion);
  importScripts("mathiface.js?v=" + appVersion);
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
var saCoefficients = null;
var mathPlotId = null;
var math = null;
var algorithm = null;
var smooth = null;

self.onmessage = function(e) {
  if (e.data.t == "compute-chunk") {
    lastComputeChunkMsg = e.data.v;
    // these are always set to whatever is in the last chunk message
    algorithm = lastComputeChunkMsg.algorithm;
    smooth = lastComputeChunkMsg.smooth;

    if (referencePlotId !== null && lastComputeChunkMsg.chunk.plotId !== referencePlotId) {
      referenceOrbit = null;
      referenceBlaTables = null;
      saCoefficients = null;
    }

    // once per plot, ensure the correct math interface is used
    if (math === null || lastComputeChunkMsg.chunk.plotId !== mathPlotId) {
      math = selectMathInterfaceFromAlgorithm(lastComputeChunkMsg.algorithm);
      mathPlotId = lastComputeChunkMsg.referencePlotId;
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
  } else if (e.data.t == "sa-coefficients") {
    referencePx = e.data.v.referencePx;
    referencePy = e.data.v.referencePy;
    saCoefficients = e.data.v.saCoefficients;
    referencePlotId = e.data.v.referencePlotId;
  } else {
    console.log("subworker received unknown message:", e);
  }
  if (lastComputeChunkMsg === null) {
    return;
  }
  if (referenceOrbit === null && (
        lastComputeChunkMsg.algorithm.includes("perturb-") ||
        lastComputeChunkMsg.algorithm.includes("bla-") ||
        lastComputeChunkMsg.algorithm.includes("sapx")
      )) {
    postMessage({t: "send-reference-orbit", v:0});
  } else if (referenceBlaTables === null && lastComputeChunkMsg.algorithm.includes("bla-")) {
    postMessage({t: "send-bla-tables", v:0});
  } else if (saCoefficients === null && lastComputeChunkMsg.algorithm.includes("sapx")) {
    postMessage({t: "send-sa-coefficients", v:0});
  } else {
    let chunk = lastComputeChunkMsg;
    lastComputeChunkMsg = null;
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

  let blaPixelsCount = 0;
  let blaIterationsSkipped = 0;
  let blaSkips = 0;

  // special case for when entire chunk is cached
  if (cachedIndices.length === 1 && cachedIndices[0] === -1) {
    // for this special case, don't allocate the entire results array
    chunk.results = [];
    chunk.plotId = plotId;
    chunk.blaPixelsCount = blaPixelsCount;
    chunk.blaIterationsSkipped = blaIterationsSkipped;
    chunk.blaSkips = blaSkips;
    postMessage({t: "completed-chunk", v:chunk});
    return;
  }

  // pre-allocate array so we don't have to use array.push()
  const results = new Array(chunk.chunkLen);

  // if entire chunk is cached, we don't have to do anything
  if (cachedIndices.length < chunk.chunkLen) {

    if (algorithm.includes("basic-")) {
      const computeFn = algorithm.includes("stripes-") ?
        plotsByName[chunk.plot].computeBoundPointColorStripes
        :
        plotsByName[chunk.plot].computeBoundPointColor;

      const px = chunk.chunkPos.x;
      let py, incY;
      const isInfNum = math.name == "arbprecis";
      if (isInfNum) {
        let norm = normInfNum(chunk.chunkPos.y, chunk.chunkInc.y);
        py = norm[0];
        incY = norm[1];
      } else {
        py = chunk.chunkPos.y;
        incY = chunk.chunkInc.y;
      }

      for (let i = 0; i < chunk.chunkLen; i++) {
        if (!binarySearchIncludesNumber(cachedIndices, i)) {
          results[i] = computeFn(chunk.chunkN, chunk.chunkPrecision, algorithm, px, py, smooth);
        }
        // since we want to start at the given starting position, increment
        //   the position AFTER computing each result
        py = isInfNum ? infNumAddNorm(py, incY) : math.add(py, incY);
      }

    // if not calculating with straightforward algorithm, we will use
    //   the perturbation theory algorithm
    } else if (algorithm.includes("perturb-")) {
      const perturbFn = plotsByName[chunk.plot].computeBoundPointColorPerturbOrBla;

      //if (infNumEq(chunk.chunkPos.x, referencePx) && infNumEq(chunk.chunkPos.y, referencePy)) {
      //  console.log("chunk position and reference point are the same!!?!?");
      //}

      // for perturb, the chunk positions are actually deltas relative to
      //   the reference point
      const dx = chunk.chunkPos.x;
      let dy = chunk.chunkPos.y;
      const incY = chunk.chunkInc.y;

      // assuming chunks are all moving along the y axis, for single px
      for (let i = 0; i < chunk.chunkLen; i++) {
        if (!binarySearchIncludesNumber(cachedIndices, i)) {
          results[i] = perturbFn(chunk.chunkN, chunk.chunkPrecision, dx, dy, algorithm, referencePx, referencePy, referenceOrbit, referenceBlaTables, saCoefficients, smooth).colorpct;
        }
        // since we want to start at the given starting position, increment
        //   the delta AFTER computing each result
        dy = math.add(dy, incY);
      }

    } else if (algorithm.includes("bla-")) {
      const blaFn = plotsByName[chunk.plot].computeBoundPointColorPerturbOrBla;

      // for perturb, the chunk positions are actually deltas relative to
      //   the reference point
      const dx = chunk.chunkPos.x;
      let dy = chunk.chunkPos.y;
      const incY = chunk.chunkInc.y;

      // assuming chunks are all moving along the y axis, for single px
      for (let i = 0; i < chunk.chunkLen; i++) {
        if (!binarySearchIncludesNumber(cachedIndices, i)) {
          let pixelResult = blaFn(chunk.chunkN, chunk.chunkPrecision, dx, dy, algorithm, referencePx, referencePy, referenceOrbit, referenceBlaTables, saCoefficients, smooth);
          results[i] = pixelResult.colorpct;
          blaPixelsCount++;
          blaIterationsSkipped += pixelResult.blaItersSkipped;
          blaSkips += pixelResult.blaSkips;
        }
        // since we want to start at the given starting position, increment
        //   the position AFTER computing each result
        dy = math.add(dy, incY);
      }
    }
  }
  chunk.results = results;
  chunk.plotId = plotId;
  chunk.blaPixelsCount = blaPixelsCount;
  chunk.blaIterationsSkipped = blaIterationsSkipped;
  chunk.blaSkips = blaSkips;
  postMessage({t: "completed-chunk", v:chunk});
  //if (blaPixelsCount > 0 && blaIterationsSkipped > 0) {
  //  console.log("for entire chunk of [" + chunk.chunkLen + "] pixels, [" + (blaPixelsCount).toLocaleString() + "] pixels skipped [" + (blaIterationsSkipped).toLocaleString() + "] iterations with BLA, averaging [" + Math.floor(blaIterationsSkipped / blaPixelsCount) + "] per pixel");
  //} else {
  //  console.log("for entire chunk of [" + chunk.chunkLen + "] pixels, no pixels had BLA iteration skips");
  //}
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
