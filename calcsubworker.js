
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
  computeChunk(e.data.plotId, e.data.chunk, e.data.cachedIndices, e.data.referencePx, e.data.referencePy, e.data.referenceOrbit);
};

var computeChunk = function(plotId, chunk, cachedIndices, referencePx, referencePy, referenceOrbit) {
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

  if (infNumEq(chunk.chunkPos.x, referencePx) && infNumEq(chunk.chunkPos.y, referencePy)) {
    console.log("chunk position and reference point are the same!!?!?");
  }

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
    if (chunk.useFloat) {
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
          results[i] = computeFn(chunk.chunkN, chunk.chunkPrecision, chunk.useFloat, px, py);
        }
        // since we want to start at the given starting position, increment
        //   the position AFTER computing each result
        py = infNumAddNorm(py, incY);
      }


    // compute reference orbit, once per entire chunk (for now)
    //   but only if float is not being used
    } else {
      // using upper 5% of 32-bit unsigned integer range should
      //   effectively represent 5% of all possible integers
      const lowerBoundHashVal = (Math.pow(2, 32) - 1) * 1.0;
      const perturbFn = plotsByName[chunk.plot].computeBoundPointColorPerturb;

/*
      // for now, use middle point of chunk
      let referenceChunkIndex = Math.floor(chunk.chunkLen / 2);
      let referencePx = px;
      //let referencePx = infNumAdd(px, infNumMul(incY, infNum(3n, 0n)));
      let referencePy = infNumAdd(py, infNumMul(incY, infNum(BigInt(referenceChunkIndex), 0n)));
      //let referencePx = infNum(0n, 0n);
      //let referencePy = infNum(0n, 0n);
      let referenceOrbit = plotsByName[chunk.plot].computeReferenceOrbitFloat(chunk.chunkN, chunk.chunkPrecision, referencePx, referencePy);
*/
      //console.log("computed referenceOrbit for chunk index [" + referenceChunkIndex + "] (out of " + chunk.chunkLen + " points), which is:", referenceOrbit);

      // assuming chunks are all moving along the y axis, for single px
      for (let i = 0; i < chunk.chunkLen; i++) {
        if (!binarySearchIncludesNumber(cachedIndices, i)) {
          let refPx = copyInfNum(referencePx);
          let refPy = copyInfNum(referencePy);
          let refOrbit = referenceOrbit;

          // hash this chunk to give us deterministic 5% chance of having
          //   to compute both the full-precision orbit and the perturbation
          //   theory lower-precision orbit, so we can compare the two
          let fullPrecisionResult = null;
          let chunkIndexId = infNumFastStr(chunk.chunkPos.x) + "," + infNumFastStr(chunk.chunkPos.y) + "," + i;
          //console.log({fnv32a: fnv32a(chunkIndexId)});
          if (fnv32a(chunkIndexId) > lowerBoundHashVal) {
            // full precision result is apparently QUITE different from the
            //   perturbation theory result... which means something is broken
            fullPrecisionResult = computeFn(chunk.chunkN, chunk.chunkPrecision, chunk.useFloat, px, py);
            
            // instead of computing the full-precision orbit for 5% of points, instead, compute
            //   a new reference orbit
            //refPx = infNumAdd(chunk.chunkPos.x, infNumMul(incY, infNum(5n, 0n)));
            //refPy = infNumAdd(chunk.chunkPos.y, infNumMul(incY, infNum(5n, 0n)));
            refPx = infNumAdd(px, infNumMul(incY, infNum(BigInt((i % 4)+2), 0n)));
            refPy = infNumAdd(py, infNumMul(incY, infNum(3n, 0n)));
            refOrbit = plotsByName[chunk.plot].computeReferenceOrbitFloat(chunk.chunkN, chunk.chunkPrecision, refPx, refPy);
            //refOrbit = plotsByName[chunk.plot].computeReferenceOrbit(chunk.chunkN, chunk.chunkPrecision, refPx, refPy);
            //console.log("computed new one-off reference orbit (it has " + refOrbit.length + " points)");
          }

          // for now, the perturb function itself can detect when the
          //   reference point itself is being re-computed
          //if (i === referenceChunkIndex) {
          //  results[i] = referenceOrbit.length >= chunk.chunkN ? -1 : (referenceOrbit.length / chunk.chunkN);
          //} else {
            results[i] = perturbFn(chunk.chunkN, chunk.chunkPrecision, px, py, refPx, refPy, refOrbit);
            //console.log("chunk index", i, "gave us iter% of", results[i], "at py:", infNumExpString(py));
          //}

          if (fullPrecisionResult !== null) {
            let mainRefResult = perturbFn(chunk.chunkN, chunk.chunkPrecision, px, py, referencePx, referencePy, referenceOrbit);
            //console.log(chunkIndexId + ": \n" +
            //  "             full: [" + fullPrecisionResult + "], \n" +
            //  "          perturb: [" + mainRefResult + "], \n" +
            //  "  perturb-one-off: [" + results[i] + "]\n" +
            //  "     main ref: " + infNumExpString(referencePx) + "," + infNumExpString(referencePy) + "\n" +
            //  "  one-off ref: " + infNumExpString(refPx) + "," + infNumExpString(refPy) + "\n" +
            //  "  incY: " + infNumToString(incY));
            //results[i] = fullPrecisionResult;
            if (infNumEq(px, refPx) && infNumEq(py, refPy)) {
              console.log("chunk index position and reference point (refPx/Py) are the same!!?!?");
            }
            if (infNumEq(referencePx, refPx) && infNumEq(referencePy, refPy)) {
              console.log("a new reference position was used, but it's the same!!?!?");
            }
          }

        }
        // since we want to start at the given starting position, increment
        //   the position AFTER computing each result
        py = infNumAddNorm(py, incY);
      }
    }

//    }
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
