
var useWorkers = true;

if (!self.Worker) {
  useWorkers = false;
  self.postMessage({subworkerNoWorky: true});
  self.close();
}

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
  "edgesM": null,
  "n": null,
  "precision": null,
  "algorithm": null,
  "math": null,
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
  "referenceOrbitSmooth": null,
  "referenceBlaTables": null,
  "referenceBlaN": null,
  "referenceBottomLeftDeltaX": null,
  "referenceBottomLeftDeltaY": null,
  "saCoefficients": null,
  "saCoefficientsN": null,
  "saCoefficientsEdges": null,
  "saCoefficientsParams": null,
  "passBlaPixels": null,
  "passBlaIterationsSkipped": null,
  "passBlaSkips": null,
  "totalBlaPixels": null,
  "totalBlaIterationsSkipped": null,
  "totalBlaSkips": null,
  "referenceBlaEpsilon": null,
  "setupStage": null,
  "setupStageState": null,
  "setupStageIsStarted": null,
  "setupStageIsFinished": null,
  "caching" : null,
  "smooth": null
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
  console.log("got message [" + e.data.t + "]");
  if (e.data.t == "worker-calc") {
    runCalc(e.data.v);
  } else if (e.data.t == "chunk-ordering") {
    windowCalc.chunkOrdering = e.data.v;
    updateRunningChunksOrdering();
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
  windowCalc.eachPixUnitsM = msg.eachPixUnitsM;
  // edges in InfNum objects
  windowCalc.edges = {
    left: msg.leftEdge,
    right:  msg.rightEdge,
    top: msg.topEdge,
    bottom: msg.bottomEdge
  };
  // edges for algorithm's math inteface
  windowCalc.edgesM = {
    left: msg.leftEdgeM,
    right:  msg.rightEdgeM,
    top: msg.topEdgeM,
    bottom: msg.bottomEdgeM
  };
  windowCalc.n = msg.n;
  windowCalc.precision = msg.precision;
  windowCalc.algorithm = msg.algorithm;
  windowCalc.math = selectMathInterfaceFromAlgorithm(windowCalc.algorithm);
  windowCalc.passNumber = startPassNumber - 1;
  // the main thread does its own 64-wide pixels synchronously,
  //   so the worker threads should start at 32-wide (set to 64
  //   here so that after dividing by two initially we are at 32)
  windowCalc.lineWidth = msg.startWidth * 2;
  windowCalc.finalWidth = msg.finalWidth;
  windowCalc.chunksComplete = 0;
  windowCalc.canvasWidth = msg.canvasWidth;
  windowCalc.canvasHeight = msg.canvasHeight;
  windowCalc.chunkOrdering = msg.chunkOrdering;
  windowCalc.smooth = msg.smooth;
  // since pixel position math is now dependent on algorithm,
  //   the old caching no longer works as-is, so we will just
  //   turn it off for now
  windowCalc.caching = false;
//  // include "nocache" in algorithm name to turn off caching
//  windowCalc.caching = !windowCalc.algorithm.includes("nocache");
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

    // TODO make this a separate thing that can be run with a controls
    //   menu button or something (for non-"basic" algorithms, it will
    //   always be run)
    // try ball arithmetic here for basic, too
    // start with middle of window for reference point (doesn't have to
    //   exactly align with a pixel)
//    const newReferencePx = infNumAdd(windowCalc.edges.left, infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(windowCalc.canvasWidth/2)), 0n)));
//    const newReferencePy = infNumAdd(windowCalc.edges.bottom, infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(windowCalc.canvasHeight/2)), 0n)));
//    const rectHalfX = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(windowCalc.canvasWidth / 2)), 0n));
//    const rectHalfY = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(windowCalc.canvasHeight / 2)), 0n));
//    const period = plotsByName[windowCalc.plot].findPeriodBallArithmetic2ndOrder(windowCalc.n, windowCalc.precision, windowCalc.algorithm, newReferencePx, newReferencePy, rectHalfX, rectHalfY, false);
//    if (period > 0) {
//      const getNthIterationAndDerivative = plotsByName[windowCalc.plot].getNthIterationAndDerivative;
//      const foundMinibrotNucleus = plotsByName[windowCalc.plot].newtonsMethod(period, newReferencePx, newReferencePy, windowCalc.precision, getNthIterationAndDerivative);
//      if (
//          infNumGt(foundMinibrotNucleus.x, windowCalc.edges.right) ||
//          infNumLt(foundMinibrotNucleus.x, windowCalc.edges.left) ||
//          infNumGt(foundMinibrotNucleus.y, windowCalc.edges.top) ||
//          infNumLt(foundMinibrotNucleus.y, windowCalc.edges.bottom)) {
//        console.log("newton nucleus is off screen!");
//        windowCalc.referencePeriod = -1;
//      } else {
//        windowCalc.referencePeriod = period;
//        windowCalc.referencePx = foundMinibrotNucleus.x;
//        windowCalc.referencePy = foundMinibrotNucleus.y;
//        console.log("found ref x/y/period!");
//        setMinibrotNucleusMessage({
//          x: foundMinibrotNucleus.x,
//          y: foundMinibrotNucleus.y,
//          period: period
//        });
//      }
//    }

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
}

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

    // if using BLA, and the ref point is a periodic, as long as it's still
    //   within the middle 98% of the image (by radius) then it can be re-used
    // otherwise, we'll re-use it if it's in the middle 30% of the
    //   image
    let maxAllowablePixelsMove = (windowCalc.referencePeriod > 0 && windowCalc.algorithm.includes("bla-")) ?
      Math.ceil(Math.min(windowCalc.canvasHeight, windowCalc.canvasWidth) * 0.49)
      :
      Math.ceil(Math.min(windowCalc.canvasHeight, windowCalc.canvasWidth) * 0.15);
    let maxAllowableMove = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(maxAllowablePixelsMove), 0n));
    // square this as well
    maxAllowableMove = infNumMul(maxAllowableMove, maxAllowableMove);

    if (infNumGt(squaredDiff, maxAllowableMove)) {
      refPointHasMoved = true;
      console.log("the previous ref orbit is NOT within [" + maxAllowablePixelsMove + "] pixels of the center, so we need a new ref orbit");
    } else {
      console.log("the previous ref orbit is within [" + maxAllowablePixelsMove + "] pixels of the center, so it's still valid");
      if (windowCalc.referencePeriod > 0 && windowCalc.algorithm.includes("bla-")) {
        setMinibrotNucleusMessage({
          x: windowCalc.referencePx,
          y: windowCalc.referencePy,
          period: windowCalc.referencePeriod
        });
      }
    }
  }

  if (windowCalc.referenceOrbitN === null || windowCalc.referenceOrbitN < windowCalc.n ||
      windowCalc.referenceOrbitPrecision === null || windowCalc.referenceOrbitPrecision / windowCalc.precision < 0.98 ||
      windowCalc.referenceOrbitSmooth !== windowCalc.smooth ||
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

    if (state === null) {
      state = {
        minibrotFindingState: null,
        computeRefOrbitState: null,
        status: "",
        done: false
      };
    }

    // temporary, try to find period only when "bla-" is used
    const findPeriod = windowCalc.algorithm.includes("bla-");
    if (!findPeriod) {
      windowCalc.referencePeriod = -1;
    } else {
      if (state.minibrotFindingState === null) {
        // ball arithmetic method
        state.rectHalfX = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(windowCalc.canvasWidth / 2)), 0n));
        state.rectHalfY = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(windowCalc.canvasHeight / 2)), 0n));
      }

      const getNthIterationAndDerivative = plotsByName[windowCalc.plot].getNthIterationAndDerivative;
      const newtonsMethod = plotsByName[windowCalc.plot].newtonsMethod;
      if (state.minibrotFindingState === null || !state.minibrotFindingState.done) {
        state.minibrotFindingState = plotsByName[windowCalc.plot].findMinibrotWithBallArithmetic1stOrderAndNewton(windowCalc.n, windowCalc.precision, windowCalc.algorithm, windowCalc.referencePx, windowCalc.referencePy, state.rectHalfX, state.rectHalfY, getNthIterationAndDerivative, newtonsMethod, state.minibrotFindingState);
        sendStatusMessage(state.minibrotFindingState.status);
        if (state.minibrotFindingState.done) {
          const foundMinibrotNucleus = state.minibrotFindingState.nucleus;
          if (foundMinibrotNucleus === null) {
              console.log("no found newton nucleus is within the window");
              windowCalc.referencePeriod = -1;
          } else {
              windowCalc.referencePeriod = foundMinibrotNucleus.period;
              windowCalc.referencePx = foundMinibrotNucleus.x;
              windowCalc.referencePy = foundMinibrotNucleus.y;
              console.log("found ref x/y/period!");
              setMinibrotNucleusMessage({
                x: foundMinibrotNucleus.x,
                y: foundMinibrotNucleus.y,
                period: foundMinibrotNucleus.period
              });
          }
        }
        return state;
      }
    }

    if (state.computeRefOrbitState === null || !state.computeRefOrbitState.done) {
      state.computeRefOrbitState = plotsByName[windowCalc.plot].computeReferenceOrbit(windowCalc.n, windowCalc.precision, windowCalc.algorithm, windowCalc.referencePx, windowCalc.referencePy, windowCalc.referencePeriod, windowCalc.smooth, state.computeRefOrbitState);
      sendStatusMessage(state.computeRefOrbitState.status);
      if (state.computeRefOrbitState.done) {
        state.done = true;
      } else {
        return state;
      }
    }
  }
  if (state.done) {
    windowCalc.referenceOrbit = state.computeRefOrbitState.orbit;
    windowCalc.referenceOrbitN = windowCalc.n;
    windowCalc.referenceOrbitPrecision = windowCalc.precision;
    windowCalc.referenceOrbitSmooth = windowCalc.smooth;
    console.log("calculated new " + (windowCalc.referencePeriod === -1 ? "middle" : "periodic") + " reference orbit, with [" + windowCalc.referenceOrbit.length + "] iterations, for point:");
    console.log("referencePx: " + infNumToString(windowCalc.referencePx));
    console.log("referencePy: " + infNumToString(windowCalc.referencePy));
  }
  return state;
}

function setupCheckBlaCoefficients() {
  // if we are using bivariate linear approximation, and we haven't already
  //   calculated them based on the ref orbit, calculate the coefficients
  if (windowCalc.algorithm.includes("bla-")) {
    windowCalc.totalBlaPixels = 0;
    windowCalc.totalBlaIterationsSkipped = 0;
    windowCalc.totalBlaSkips = 0;
    const algoEpsilon = getBLAEpsilonFromAlgorithm(windowCalc.algorithm);
    if (windowCalc.referenceBlaTables === null ||
        // not sure how changing N (max iterations) affects BLA coefficients,
        //   so just require a full re-compute for now if it has changed
        windowCalc.n !== windowCalc.referenceBlaN ||
        windowCalc.referenceBlaWindowEdges === null ||
        // if any window edge changed, we need to re-compute BLAs
        !infNumEq(windowCalc.edges.top,    windowCalc.referenceBlaWindowEdges.top) ||
        !infNumEq(windowCalc.edges.bottom, windowCalc.referenceBlaWindowEdges.bottom) ||
        !infNumEq(windowCalc.edges.left,   windowCalc.referenceBlaWindowEdges.left) ||
        !infNumEq(windowCalc.edges.right,  windowCalc.referenceBlaWindowEdges.right) ||
        (algoEpsilon !== null && !infNumEq(algoEpsilon, windowCalc.referenceBlaEpsilon))) {
      return true;
    } else {
      console.log("re-using previously-calculated BLA coefficient tables");
    }
  }
  // no need to calculate BLA coefficients
  return false;
}

function findFathestCornerFromPoint(infNumComplexPt, edges) {
  let testPoint = {x:edges.left, y:edges.top};
  let dist = infNumMath.complexAbs(infNumMath.complexSub(infNumComplexPt, testPoint));
  let farthestPoint = structuredClone(testPoint);
  let farthestDist = structuredClone(dist);
  testPoint = {x:edges.left, y:edges.bottom};
  dist = infNumMath.complexAbs(infNumMath.complexSub(infNumComplexPt, testPoint));
  if (infNumGt(dist, farthestDist)) {
    farthestPoint = structuredClone(testPoint);
    farthestDist = structuredClone(dist);
  }
  testPoint = {x:edges.right, y:edges.top};
  dist = infNumMath.complexAbs(infNumMath.complexSub(infNumComplexPt, testPoint));
  if (infNumGt(dist, farthestDist)) {
    farthestPoint = structuredClone(testPoint);
    farthestDist = structuredClone(dist);
  }
  testPoint = {x:edges.right, y:edges.bottom};
  dist = infNumMath.complexAbs(infNumMath.complexSub(infNumComplexPt, testPoint));
  if (infNumGt(dist, farthestDist)) {
    farthestPoint = structuredClone(testPoint);
  }
  return farthestPoint;
}

// put 8 test points along the line from the corner to 33% along the line
// put 16 test points along the line from the 33% point to 66% point
// put 32 test points along the line from the 66% point to the ref point
function getTestPointsInOrderFromAToB(infNumComplexA, infNumComplexB, windowCalcMath, precis) {
  const pointsDifference = infNumMath.complexSub(infNumComplexB, infNumComplexA);
  const testLineLength = infNumMath.complexAbs(pointsDifference);
  const testLinePixels = infNumDiv(testLineLength, windowCalc.eachPixUnits, precis);
  const firstThirdPointsFloat = floatMath.createFromInfNum(infNumDiv(testLinePixels, infNum(64n, 0n), 10));
  const firstThirdPoints = BigInt(Math.round(firstThirdPointsFloat));
  console.log("test line covers [" + infNumToString(infNumTruncateToLen(testLinePixels, 15)) + "] pixels, so dividing the far third of that line into [" + firstThirdPoints + "] test points");
  // each third of the line needs to be subdivided into
  //   4x firstThirdPoints
  const stepDiv = firstThirdPoints * 4n * 3n;
  const firstThirdSteps = firstThirdPoints * 4n;
  const secondThirdSteps = firstThirdSteps * 2n;
  const step = infNumMath.complexRealDiv(pointsDifference, infNum(stepDiv, 0n), precis);
  let points = [];
  let testPointComplex;
  let testPointDelta;
  for (let i = 0n; i < stepDiv; i += 1n) {
    if (
        (i < firstThirdSteps && i % 4n === 0n) ||
        (i >= firstThirdSteps && i < secondThirdSteps && i % 2n === 0n) ||
        (i >= secondThirdSteps)) {
      testPointComplex = infNumMath.complexAdd(infNumComplexA, infNumMath.complexRealMul(step, infNum(i, 0n)));
      // the delta is the difference from the reference point (point B)
      //   to the test point
      testPointDelta = infNumMath.complexSub(testPointComplex, infNumComplexB);
      points.push({
        dx: windowCalcMath.createFromInfNum(testPointDelta.x),
        dy: windowCalcMath.createFromInfNum(testPointDelta.y),
        complex: testPointComplex
      });
    }
  }
  return points;
}

// somehow, the "epsilon" value with our BLA implementation here doesn't
//   seem rigidly tied to the underlying math datatype.  for example,
//   floating-point math should in theory necessetate a particular value
//   for epsilon, as that's the entire idea behind BLA in the first place:
//   when the squared term is smaller than the smallest value that can be
//   represented by the math datatype, it can be ignored thus leading to
//   a linear approximation.
//
// for individual images, when the value used for epsilon is made a little
//   smaller, the image looks the same but skips fewer iterations with the
//   BLA and thus takes longer to render.  or, if the epsilon is made a
//   little larger, the image looks the same but renders faster.  make the
//   epsilon too big, however, and strange inaccurate results are rendered.
//
// this function picks the best valid epsilon for the location being
//   rendered.  it does this by comparing, at several points, the iteration
//   count for an orbit calculated fully with perturbation-theory vs the
//   iteration count calculated with BLA.  if there's inaccuracy, the epsilon
//   is considered "bad" and BLAs with a different epsilon are calculated,
//   and all the test points are checked again.  if an epsilon results in
//   an accurate rendering, it's considered "better" than the previous "best"
//   epsilon if it skips more iterations.
//
// a binary-ish search is used to find the best epsilon.  since computing and
//   testing BLAs is fast, this approach is reasonably fast.
function setupBlaCoefficients(state) {
  if (state === null || !state.done) {
    if (state === null) {
      windowCalc.referenceBlaTables = null;
      sendStatusMessage("Calculating BLA coefficient tables");
    }

    // if the window's algorithm string specifies a BLA epsilon, use
    //   that instead of auto-finding the epsilon
    const algoSpecifiedEpsilon = getBLAEpsilonFromAlgorithm(windowCalc.algorithm);
    if (algoSpecifiedEpsilon !== null) {
      const algoSpecifiedEpsilonStr = infNumExpStringTruncToLen(algoSpecifiedEpsilon, 2);
      while (state === null || !state.done) {
        state = plotsByName[windowCalc.plot].computeBlaTables(windowCalc.algorithm, null, windowCalc.referenceOrbit, windowCalc.referencePx, windowCalc.referencePy, windowCalc.edges, state);
        sendStatusMessage("for ε=" + algoSpecifiedEpsilonStr + ": " + state.status);
      }
      if (state.done) {
        windowCalc.referenceBlaN = windowCalc.n;
        windowCalc.referenceBlaWindowEdges = structuredClone(windowCalc.edges);
        windowCalc.referenceBlaTables = state.blas;
        windowCalc.referenceBlaEpsilon = state.infNumEpsilon;
      }
      return state;
    }

    // find the line from the ref point to the farthest image corner
    const refPoint = {x:windowCalc.referencePx, y:windowCalc.referencePy};
    const farthestCorner = findFathestCornerFromPoint(refPoint, windowCalc.edges);
    //console.log("farthest corner is [(" + infNumToString(farthestCorner.x) + "," + infNumToString(farthestCorner.y) + ")]");

    // calculate test points along that line
    const testPoints = getTestPointsInOrderFromAToB(farthestCorner, refPoint, windowCalc.math, windowCalc.precision);
    console.log("testing [" + testPoints.length + "] points to find the best BLA epsilon");
    // set the test points as the debug points to be drawn, toggled with R key
    //sendDebugPointsMessage({
    //  points: testPoints.map(x => x.complex)
    //});

    // perturb only algorithm
    const perturbAlgo = "perturb-" + windowCalc.math.name;
    const nullBlaTables = null; // for perturb only, pass null blaTables
    const nullSaCoefficients = null; // for perturb and BLA, pass null saCoefficients

    // perturb results need to only be calculated once for each
    //   test point, so save them in this array
    const testPointsPerturb = [];

    // calculate starting BLAs, using starting epsilon
    let epsilon = windowCalc.math.name === "float" ? infNum(1n, -54n) : infNum(1n, -129n);
    let epsilonStr = infNumExpStringTruncToLen(epsilon, 2);
    let totalTestPointBLAIterSkips = 0;

    // the "best" epsilon is the largest value where all test points are accurate
    let bestEpsilon = null;
    let bestTotalTestPointBLAIterSkips = 0;
    // the "smallest bad" is the smallest epsilon where one or more test points are not accurate
    let smallestBadEpsilon = null;

    // start at farthest test point from the ref point
    let testPointsCursor = 0;

    const totalTestPoints = testPoints.length;
    let dx, dy, blaResult;
    // TODO this loop doesn't return the "state" object yet, so this
    //   loop (which may be slow) is not cancel-able
    while (testPointsCursor < totalTestPoints) {

      if (state === null) {
        while (state === null || !state.done) {
          state = plotsByName[windowCalc.plot].computeBlaTables(windowCalc.algorithm, epsilon, windowCalc.referenceOrbit, windowCalc.referencePx, windowCalc.referencePy, windowCalc.edges, state);
          sendStatusMessage("For ε=" + epsilonStr + ": " + state.status);
        }
      }

      // do both perturb and BLA for the point until it escapes or hits n
      // results look like: {colorpct: iter, blaItersSkipped: blaItersSkipped, blaSkips: blaSkips};
      if (testPointsPerturb[testPointsCursor] === undefined) {
        testPointsPerturb[testPointsCursor] =
                  plotsByName[windowCalc.plot].computeBoundPointColorPerturbOrBla(windowCalc.n, windowCalc.precision, testPoints[testPointsCursor].dx, testPoints[testPointsCursor].dy, perturbAlgo,          windowCalc.referencePx, windowCalc.referencePy, windowCalc.referenceOrbit, nullBlaTables, nullSaCoefficients, windowCalc.smooth);
      }
      blaResult = plotsByName[windowCalc.plot].computeBoundPointColorPerturbOrBla(windowCalc.n, windowCalc.precision, testPoints[testPointsCursor].dx, testPoints[testPointsCursor].dy, windowCalc.algorithm, windowCalc.referencePx, windowCalc.referencePy, windowCalc.referenceOrbit, state.blas,    nullSaCoefficients, windowCalc.smooth);
      totalTestPointBLAIterSkips += blaResult.blaItersSkipped;
      sendStatusMessage("Tested " + Math.round(testPointsCursor * 100.0 / totalTestPoints) + "% of test pts for ε=" + epsilonStr);

      // if the BLA is accurate, proceed to the test point next closest to the ref point
      // compare as percentage of n, where 1e-2 is 1%, 1e-3 is 0.1%, etc
      if ((Math.abs(testPointsPerturb[testPointsCursor].colorpct - blaResult.colorpct)/testPointsPerturb[testPointsCursor].colorpct) < 1e-5) {
        testPointsCursor++;
        if (testPointsCursor === totalTestPoints) {
          // if all test points were accurate, and this is the best
          //   epsilon, save it to make the upper bound epsilon larger
          if (bestEpsilon === null ||
              (infNumGt(epsilon, bestEpsilon) && totalTestPointBLAIterSkips > bestTotalTestPointBLAIterSkips)) {
            bestEpsilon = epsilon;
            bestTotalTestPointBLAIterSkips = totalTestPointBLAIterSkips;
          // if all test points were accurate, but this is not the
          //   best epsilon, save it to make the lower bound epsilon smaller
          } else if (smallestBadEpsilon === null ||
              (infNumLt(epsilon, smallestBadEpsilon))) {
            smallestBadEpsilon = epsilon;
          }
          // pick a new epsilon below
          state = null;
        }

      // if the BLA is not accurate, decrease epsilon and use BLA upon all the already-tried points again
      } else {
        if (smallestBadEpsilon === null || infNumLt(epsilon, smallestBadEpsilon)) {
          smallestBadEpsilon = epsilon;
        }
        // pick a new epsilon below
        state = null;
      }

      // if state is null here, that's our sigal from the lines above
      //   that a new epsilon (and thus BLAs) need to be calculated
      if (state === null) {
        // halve our epsilon's exponent if no bad epsilon has been
        //   found (which makes it much larger)
        if (smallestBadEpsilon === null) {
          epsilon = infNum(epsilon.v, epsilon.e / 2n);

        // if bestEpsilon is null, double the power of the epsilon
        //   we tried (which makes it much smaller)
        } else if (bestEpsilon === null) {
          epsilon = infNum(epsilon.v, epsilon.e * 2n);

        // try the middle value between smallestBadEpsilon and bestEpsilon
        } else {
          let exponentDiff = smallestBadEpsilon.e - bestEpsilon.e;
          // if the difference between the exponents of smallestBadEpsilon and bestEpsilon is less than 2, we are done
          if (exponentDiff < 2n) {
            // compute final BLAs based on the best epsilon, where
            //   we go two powers of ten smaller, to increase
            //   render accuracy
            epsilon = infNum(bestEpsilon.v, bestEpsilon.e - 2n);
            console.log("final bestEpsilon found to be [" + infNumExpStringTruncToLen(bestEpsilon, 2) + "]");
            console.log("using adjusted epsilon [" + infNumExpStringTruncToLen(epsilon, 2) + "] to render the image");
            while (state === null || !state.done) {
              state = plotsByName[windowCalc.plot].computeBlaTables(windowCalc.algorithm, epsilon, windowCalc.referenceOrbit, windowCalc.referencePx, windowCalc.referencePy, windowCalc.edges, state);
              sendStatusMessage("For ε=" + epsilonStr + ": " + state.status);
            }
            break;
          } else {
            epsilon = infNum(smallestBadEpsilon.v, smallestBadEpsilon.e - (exponentDiff >> 1n));
          }
        }
        epsilonStr = infNumExpStringTruncToLen(epsilon, 2);
        totalTestPointBLAIterSkips = 0;
        testPointsCursor = 0;
        console.log("trying new epsilon [" + epsilonStr + "]");
        sendStatusMessage("Trying new ε of " + epsilonStr);
      }
      // if at any point, BLA skips zero iters for all test points, stop decreasing BLA?
      //   (and note in console that SA should be used for this location)
    }
  }
  if (state.done) {
    windowCalc.referenceBlaN = windowCalc.n;
    windowCalc.referenceBlaWindowEdges = structuredClone(windowCalc.edges);
    windowCalc.referenceBlaTables = state.blas;
    windowCalc.referenceBlaEpsilon = state.infNumEpsilon;
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
      windowCalc.saCoefficients = null;
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
      setupPixelPositionDelta();
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

// for the non-basic (perturbation theory) algorithm, we don't ever need
//   to fully calculate the position of all points to our set "precision"
//   (number of significant digits) with arbitrary precision math.
// instead (again, just for perturbation theory) all we need is the
//   difference from the reference point to each pixel -- and that difference
//   value will always be really small and expressable with float or
//   floatexp
function setupPixelPositionDelta() {
  windowCalc.referenceBottomLeftDeltaX = null;
  windowCalc.referenceBottomLeftDeltaY = null;
  if (windowCalc.algorithm.includes("basic") ||
      windowCalc.referencePx === null ||
      windowCalc.referencePy === null) {
    // having just reset the delta to null is what we want
    return;
  }
  // the subtraction is done backwards from how i'd expect,
  //   but that's how deltas are calculated now in the
  //   Mandelbrot perturbation theory function
  windowCalc.referenceBottomLeftDeltaX = windowCalc.math.createFromInfNum(infNumSub(windowCalc.edges.left, windowCalc.referencePx));
  windowCalc.referenceBottomLeftDeltaY = windowCalc.math.createFromInfNum(infNumSub(windowCalc.edges.bottom, windowCalc.referencePy));
}

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
      "cachedIndices": [],
      "algorithm": windowCalc.algorithm,
      "smooth": windowCalc.smooth
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
};

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
}

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
    windowCalc.totalBlaPixels += msg.data.blaPixelsCount;
    windowCalc.totalBlaIterationsSkipped += msg.data.blaIterationsSkipped;
    windowCalc.totalBlaSkips += msg.data.blaSkips;
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
    status.saItersSkipped = windowCalc.saCoefficients.itersToSkip;
  }
  if (windowCalc.totalBlaPixels !== null && windowCalc.referenceBlaEpsilon !== null) {
    status.totalBlaPixels = windowCalc.totalBlaPixels;
    status.totalBlaIterationsSkipped = windowCalc.totalBlaIterationsSkipped;
    status.totalBlaSkips = windowCalc.totalBlaSkips;
    status.blaEpsilon = infNumExpStringTruncToLen(windowCalc.referenceBlaEpsilon, 2);
  }
  msg.data.calcStatus = status;
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

// very slow implementation here of "sort by closest to middle"
//
// this answer is the right idea, but we need to sort based on
//   array index, not value at each index
//   https://stackoverflow.com/a/56342484/259456
//
// (and i'd like it to do an in-place sort)
function centerOutArray(array) {
  const newArr = [];
  while (array.length > 0) {
    // remove middle element from what remains of the array, and
    //   add it to the end of the new array
    newArr.push(array.splice(array.length >> 1, 1)[0]);
  }
  while (newArr.length > 0) {
    array.push(newArr.shift());
  }
}

// sort the array of chunks on the x pixel
function sortXPixelChunksArray(array) {
  array.sort(function(a, b) {
    return a.chunkPix.x - b.chunkPix.x;
  });
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
  
  // the logic below is the same for basic and for perturb, but the
  //   values represent different things:
  // - cursorX - basic  : the actual position of the pixel
  //           - perturb: the x delta to the pixel from the reference point
  //
  // - yBottom - basic  : the actual y position of the pixel at the bottom of the screen
  //           - perturb: the y delta to the bottom pixel from the reference point
  //
  const isBasic = windowCalc.algorithm.includes("basic");

  const incX = windowCalc.math.mul(windowCalc.eachPixUnitsM, windowCalc.math.createFromNumber(pixelSize));
  const incXTwice = windowCalc.math.mul(incX, windowCalc.math.createFromNumber(2));
  const zero = windowCalc.math.createFromNumber(0);

  let cursorX, yBottom;
  if (isBasic) {
    // before, all this math was always done with InfNum
    //incX = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(pixelSize), 0n));
    //incXTwice = infNumMul(incX, infNum(2n, 0n));
    //cursorX = structuredClone(windowCalc.edges.left);
    //yBottom = structuredClone(windowCalc.edges.bottom);
    //yBottomSkip = infNumAdd(windowCalc.edges.bottom, incX);
    //zero = infNum(0n, 0n);
    cursorX = structuredClone(windowCalc.edgesM.left);
    yBottom = structuredClone(windowCalc.edgesM.bottom);
  } else {
    cursorX = structuredClone(windowCalc.referenceBottomLeftDeltaX);
    yBottom = structuredClone(windowCalc.referenceBottomLeftDeltaY);
  }

  const yBottomSkip = windowCalc.math.add(yBottom, incX);

  let chunkNum = 0;
  for (let x = 0; x < windowCalc.canvasWidth; x+=pixelSize) {
    let chunk = {
      "plot": windowCalc.plot,
      "chunkN": windowCalc.n,
      "chunkPrecision": windowCalc.precision
    };
    if (skipPrevPixels && chunkNum % 2 == 0) {
      Object.assign(chunk, {
        "chunkPix": {"x": x, "y": windowCalc.canvasHeight - pixelSize},
        // since we start at bottom edge, we increment pixels by subtracting Y value
        //   (because javascript canvas Y coordinate is backwards)
        "chunkPixInc": {"x": 0, "y": -2 * pixelSize},
        "chunkPos": {"x": structuredClone(cursorX), "y": structuredClone(yBottomSkip)},
        // within the chunk inself, each position along the chunk is incremented in the
        //   Y dimension, and since chunk pixels are square, the amount incremented in
        //   the Y dimension is the same as incX
        "chunkInc": {"x": structuredClone(zero), "y": structuredClone(incXTwice)},
        "chunkLen": yPointsPerChunkHalf
      });
    } else {
      Object.assign(chunk, {
        "chunkPix": {"x": x, "y": windowCalc.canvasHeight},
        // since we start at bottom edge, we increment pixels by subtracting Y value
        //   (because javascript canvas Y coordinate is backwards)
        "chunkPixInc": {"x": 0, "y": -1 * pixelSize},
        "chunkPos": {"x": structuredClone(cursorX), "y": structuredClone(yBottom)},
        // within the chunk inself, each position along the chunk is incremented in the
        //   Y dimension, and since chunk pixels are square, the amount incremented in
        //   the Y dimension is the same as incX
        "chunkInc": {"x": structuredClone(zero), "y": structuredClone(incX)},
        "chunkLen": yPointsPerChunk
      });
    }
    windowCalc.xPixelChunks.push(chunk);
    //cursorX = isBasic ? infNumAdd(cursorX, incX) : windowCalc.math.add(cursorX, incX);
    cursorX = windowCalc.math.add(cursorX, incX);
    chunkNum++;
  }

  if (windowCalc.chunkOrdering == "random") {
    // it's a fun effect to see the image materialize in a random
    //   way, as opposed to strictly left-to-right, plus it allows
    //   the user to get a sense for the final image much sooner,
    //   allowing the user to decide whether to continue panning or
    //   zooming
    shuffleArray(windowCalc.xPixelChunks);
  } else if (windowCalc.chunkOrdering == "center first") {
    centerOutArray(windowCalc.xPixelChunks);
  }

  windowCalc.totalChunks = windowCalc.xPixelChunks.length;
};

function updateRunningChunksOrdering() {
  if (windowCalc.chunkOrdering == "random") {
    shuffleArray(windowCalc.xPixelChunks);
  } else if (windowCalc.chunkOrdering == "center first") {
    sortXPixelChunksArray(windowCalc.xPixelChunks);
    centerOutArray(windowCalc.xPixelChunks);
  } else {
    sortXPixelChunksArray(windowCalc.xPixelChunks);
  }
}

function sendStatusMessage(message) {
  self.postMessage({
    plotId: windowCalc.plotId,
    statusMessage: message
  });
}

function setMinibrotNucleusMessage(data) {
  self.postMessage({
    plotId: windowCalc.plotId,
    minibrotNucleusFound: data
  });
}

function sendDebugPointsMessage(data) {
  self.postMessage({
    plotId: windowCalc.plotId,
    debugPoints: data
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

