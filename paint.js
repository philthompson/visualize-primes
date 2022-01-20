// do linting at https://jshint.com
/* jshint esversion: 11 */
const points = [];
var totalLength = 0;

const dCanvas = document.getElementById("dc");
const dContext = dCanvas.getContext("2d");
const fitSizeCanvas = document.getElementById("fit-size-canvas");
const fitSizeContext = fitSizeCanvas.getContext("2d");
var fullSizeScalePower = 1; // 2^x scale for the full-size image.  0: same size, 1: twice as big, 2: 4x...
var fullSizeScaleFactor = 2 ** fullSizeScalePower;
var fullSizeScalePowerDouble = 2 * fullSizeScalePower; // used to calculated pixel offset in fit image
var mouseDrag = false;
var mouseDragX = 0;
var mouseDragY = 0;
var pinch = false;
var pinchStartDist = 0;
var showMousePosition = false;
var annotateClickPosition = false;
var mouseNoticePosX = infNum(0n, 0n);
var mouseNoticePosY = infNum(0n, 0n);
var shiftPressed = false;
var commandPressed = false;
var autoResize = true;

var historyParams = {};
var replaceStateTimeout = null;
var historyTimeout = null;
var resizeTimeout = null;
var helpVisible = false;
var controlsVisible = false;
var menuVisible = false;

const windowLogTiming = true;
const forceWorkerReloadUrlParam = "force-worker-reload=true";
const forceWorkerReload = window.location.toString().includes(forceWorkerReloadUrlParam);
var precision = 24;
var builtGradient = null;

var activePlotAlgorithms = null;

// since user machines and user needs are different, the number of
//   workers is not a URL param
var workersCount = 1;
const maxWorkers = 32;
// Safari doesn't support subworkers, and other browsers
//   may not support workers at all -- in these cases,
//   detect this and fall back to iterated main thread
//   computation/drawing
var useWorkers = true;
if (!window.Worker) {
  useWorkers = false;
}
if (useWorkers) {
  warnAboutWorkers();
  document.getElementById("workers-warning").style.display = "none";
}

const appVersion = (function(scriptElement) {
  let src = scriptElement.getAttribute("src");
  // use everything after, and including, the first "?"
  let urlParams = new URLSearchParams(src.substring(src.indexOf("?")));
  return urlParams.has("v") ? urlParams.get('v') : "unk";
})(document.currentScript);

function warnAboutWorkers() {
  document.getElementById("workers-warning").innerHTML =
    "<b><u>Workers do not function in your browser!</u></b><br/><br/>" +
    "Very Plotter works much better, and can use more advanced algorithms to allow " +
    "deeper zooming, with web workers and subworkers.<br/><br/>" +
    "Subworkers currently do not function in Safari and some mobile browsers, for example.<br/><br/>" +
    "The recommended browsers are desktop Firefox, Chrome, or Edge, or similar.";
}

const startPassNumber = 0;

const windowCalc = {
  timeout: null,
  plotName: "",
  algorithm: "auto",
  math: null,
  stage: "",
  passNumber: null,
  lineWidth: 0,
  xPixelChunks: [],
  pixelCache: [],
  pointsBounds: "",
  passTimeMs: 0,
  totalTimeMs: 0,
  startTimeMs: 0,
  endTimeMs: 0,
  totalPoints: 0,
  cachedPoints: 0,
  chunksComplete: 0,
  totalChunks: 0,
  eachPixUnits: infNum(1n, 0n),
  eachPixUnitsM: null,
  leftEdge: infNum(0n, 0n),
  topEdge: infNum(0n, 0n),
  rightEdge: infNum(0n, 0n),
  bottomEdge: infNum(0n, 0n),
  leftEdgeM: null,
  topEdgeM: null,
  rightEdgeM: null,
  bottomEdgeM: null,
  eachPixUnitsFloat: 0.0,
  leftEdgeFloat: 0.0,
  topEdgeFloat: 0.0,
  n: 1,
  scale: infNum(1n, 0n),
  runtimeMs: -1,
  avgRuntimeMs: -1,
  worker: null,
  workersCountRange: "-",
  saItersSkipped: null,
  plotId: 0,
  fitImage: null,
  pixelsImage: null,
  referencePx: null,
  referencePy: null,
  referenceOrbit: null
};
var windowCalcRepeat = -1;
var windowCalcTimes = [];
var imageParametersCaption = false;

var //previewImage = null;
previewImage = null;
var previewImageOffsetX = 0;
var previewImageOffsetY = 0;

const inputGotoTopLeftX = document.getElementById("go-to-tl-x");
const inputGotoTopLeftY = document.getElementById("go-to-tl-y");
const inputGotoBotRightX = document.getElementById("go-to-br-x");
const inputGotoBotRightY = document.getElementById("go-to-br-y");
const inputGotoCenterX = document.getElementById("go-to-c-x");
const inputGotoCenterY = document.getElementById("go-to-c-y");
const inputGotoScale = document.getElementById("go-to-scale");
const inputGotoMag = document.getElementById("go-to-mag");
const btnGotoBoundsGo = document.getElementById("go-to-b-go");
const btnGotoBoundsReset = document.getElementById("go-to-b-reset");
const btnGotoCenterGo = document.getElementById("go-to-c-go");
const btnGotoCenterReset = document.getElementById("go-to-c-reset");
const inputNIterations = document.getElementById("n-iter-n");
const btnNIterationsGo = document.getElementById("n-iter-go");
const btnNIterationsReset = document.getElementById("n-iter-reset");
const inputGradGrad = document.getElementById("grad-grad");
const btnGradGo = document.getElementById("grad-go");
const btnGradReset = document.getElementById("grad-reset");
const gradCanvas = document.getElementById('gradient-canvas');
const gradCanvasRow = document.getElementById("gradient-canvas-tr");
const gradCtx = gradCanvas.getContext('2d');
const workersSelect = document.getElementById("workers-select");
const detailsWorkersControls = document.getElementById("workers-controls");
const gradientSelect = document.getElementById("gradient-select");
const gradControlsDetails = document.getElementById("gradient-controls-details");
const gradError = document.getElementById("gradient-error");
const autoResizeCb = document.getElementById("auto-resize-cb");
const inputAlgoAlgo = document.getElementById("algo-algo");
const algoSelect = document.getElementById("algo-select");
const btnAlgoGo = document.getElementById("algo-go");
const btnAlgoReset = document.getElementById("algo-reset");
const detailsAlgoControls = document.getElementById("algo-controls");

const blogLinkMain = document.getElementById("blog-link");
const blogLinkMandel = document.getElementById("blog-link-mandel");

document.getElementById("btn-download").addEventListener("click", function() {
  if (isCurrentPlotAWindowPlot()) {
    dContext.putImageData(windowCalc.pixelsImage, 0, 0);
  } else {
    drawPointsFullSize();
  }
  // thanks to https://stackoverflow.com/a/50300880/259456
  let link = document.createElement("a");
  link.download = "filename.png";
  link.href = dCanvas.toDataURL();
  link.click();
});

// this is checked each time a key is pressed, so keep it
//   here so we don't have to do a DOM query every time
const inputFields =
  Array.from(document.getElementsByTagName("input")).concat(
  Array.from(document.getElementsByTagName("textarea")));

function isCurrentPlotAWindowPlot() {
  return plotsByName[historyParams.plot].calcFrom == "window";
}

// -||- THIS BELOW SECTION can be removed once all common browsers -||-
// -vv-   (including Safari) support web workers and subworkers    -vv-

// call the plot's computeBoundPoints function in chunks, to better
//   allow interuptions for long-running calculations
function calculateWindowPassChunks() {
  windowCalc.passNumber++;
  windowCalc.chunksComplete = 0;
  const roundedParamLineWidth =  Math.round(historyParams.lineWidth);
  const potentialTempLineWidth = Math.round(windowCalc.lineWidth / 2);
  if (potentialTempLineWidth <= roundedParamLineWidth) {
    windowCalc.lineWidth = roundedParamLineWidth;
  } else {
    windowCalc.lineWidth = potentialTempLineWidth;
  }

  // use lineWidth to determine how large to make the calculated/displayed
  //   pixels, so round to integer
  // use Math.round(), not Math.trunc(), because we want the minimum
  //   lineWidth of 0.5 to result in a pixel size of 1
  const pixelSize = Math.round(windowCalc.lineWidth);

  // for the first pass, we don't skip any previously-calculated
  //   pixels.  otherwise, we skip every other pixel in every
  //   other (even-numbered 0th, 2nd, 4th, ...) chunk
  const skipPrevPixels = windowCalc.passNumber > startPassNumber;

  const yPointsPerChunk = Math.ceil(dContext.canvas.height / pixelSize) + 1;
  const yPointsPerChunkHalf = Math.ceil(yPointsPerChunk / 2);

  const incX = infNumMul(windowCalc.eachPixUnits, infNum(BigInt(pixelSize), 0n));
  const incXTwice = infNumMul(incX, infNum(2n, 0n));
  let cursorX = copyInfNum(windowCalc.leftEdge);
  let chunkNum = 0;
  for (let x = 0; x < dContext.canvas.width; x+=pixelSize) {
    let chunk = {};
    if (skipPrevPixels && chunkNum % 2 == 0) {
      Object.assign(chunk, {
        "chunkPix": {"x": x, "y": dContext.canvas.height - pixelSize},
        // since we start at bottom edge, we increment pixels by subtracting Y value
        //   (because javascript canvas Y coordinate is backwards)
        "chunkPixInc": {"x": 0, "y": -2 * pixelSize},
        "chunkPos": {"x": copyInfNum(cursorX), "y": infNumAdd(windowCalc.bottomEdge, incX)},
        // within the chunk inself, each position along the chunk is incremented in the
        //   Y dimension, and since chunk pixels are square, the amount incremented in
        //   the Y dimension is the same as incX
        "chunkInc": {"x": infNum(0n, 0n), "y": copyInfNum(incXTwice)},
        "chunkLen": yPointsPerChunkHalf
      });
    } else {
      Object.assign(chunk, {
        "chunkPix": {"x": x, "y": dContext.canvas.height},
        // since we start at bottom edge, we increment pixels by subtracting Y value
        //   (because javascript canvas Y coordinate is backwards)
        "chunkPixInc": {"x": 0, "y": -1 * pixelSize},
        "chunkPos": {"x": copyInfNum(cursorX), "y": copyInfNum(windowCalc.bottomEdge)},
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
  // thanks to https://stackoverflow.com/a/12646864/259456
  for (let i = windowCalc.xPixelChunks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [windowCalc.xPixelChunks[i], windowCalc.xPixelChunks[j]] = [windowCalc.xPixelChunks[j], windowCalc.xPixelChunks[i]];
  }

  windowCalc.totalChunks = windowCalc.xPixelChunks.length;
}

function calculateReferenceOrbit() {
  // start with middle of window for reference point (doesn't have to
  //   exactly align with a pixel)
  windowCalc.referencePx = infNumAdd(windowCalc.leftEdge, infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(dCanvas.width/2)), 0n)));
  windowCalc.referencePy = infNumAdd(windowCalc.bottomEdge, infNumMul(windowCalc.eachPixUnits, infNum(BigInt(Math.floor(dCanvas.height/2)), 0n)));
  let refOrbitCalcContext = null;
  while (refOrbitCalcContext === null || !refOrbitCalcContext.done) {
    refOrbitCalcContext = plotsByName[historyParams.plot].computeReferenceOrbit(windowCalc.n, precision, windowCalc.algorithm, windowCalc.referencePx, windowCalc.referencePy, -1, refOrbitCalcContext);
    drawStatusNotice(fitSizeContext, refOrbitCalcContext.status);
  }
  windowCalc.referenceOrbit = refOrbitCalcContext.orbit;

  console.log("calculated middle reference orbit, with [" + windowCalc.referenceOrbit.length + "] iterations, for point:");
  console.log("referencePx: " + infNumToString(windowCalc.referencePx));
  console.log("referencePy: " + infNumToString(windowCalc.referencePy));
}

function computeBoundPointsChunk(chunk) {
  var chunkStartMs = Date.now();
  const plot = plotsByName[historyParams.plot];

  const norm = normInfNum(chunk.chunkPos.y, chunk.chunkInc.y);
  const px = chunk.chunkPos.x;
  let py = norm[0];
  const incY = norm[1];

  const pixX = chunk.chunkPix.x;
  let pixY = chunk.chunkPix.y;
  const pixIncY = chunk.chunkPixInc.y;

  // pre-allocate array so we don't have to use array.push()
  const results = new Array(chunk.chunkLen);

  if (windowCalc.algorithm.includes("basic-")) {
    const computeFn = plot.computeBoundPointColor;
    for (let i = 0; i < chunk.chunkLen; i++) {
      const pointResult = computeFn(windowCalc.n, precision, windowCalc.algorithm, px, py);
      // create a wrappedPoint
      // px -- the pixel "color point"
      // pt -- the abstract coordinate on the plane (not needed since we are not caching)
      results[i] = {px: getColorPoint(pixX, pixY, pointResult)};
      // since we want to start at the given starting position, increment
      //   the position AFTER computing each result
      py = infNumAddNorm(py, incY);
      pixY += pixIncY;
    }

  // if not calculating with basic algorithm, we will use
  //   the perturbation theory algorithm
  } else if (windowCalc.algorithm.includes("perturb-")) {
    const perturbFn = plot.computeBoundPointColorPerturbOrBla;

    for (let i = 0; i < chunk.chunkLen; i++) {
      const pointResult = perturbFn(windowCalc.n, precision, px, py, windowCalc.algorithm, windowCalc.referencePx, windowCalc.referencePy, windowCalc.referenceOrbit, null, null).colorpct;
      // create a wrappedPoint
      // px -- the pixel "color point"
      // pt -- the abstract coordinate on the plane (not needed since we are not caching)
      results[i] = {px: getColorPoint(pixX, pixY, pointResult)};
      // since we want to start at the given starting position, increment
      //   the position AFTER computing each result
      py = infNumAddNorm(py, incY);
      pixY += pixIncY;
    }
  }

  windowCalc.passTimeMs += (Date.now() - chunkStartMs);
  windowCalc.totalPoints += results.length;
  windowCalc.chunksComplete++;
  return {
    "points": results,
  };
}

function isPassComputationComplete() {
  return windowCalc.xPixelChunks.length == 0;// && privContext.resultPoints.length > 0;
}

function drawCalculatingNoticeOld(ctx) {
  const canvas = ctx.canvas;
  ctx.fillStyle = "rgba(100,100,100,1.0)";
  const noticeHeight = Math.max(24, canvas.height * 0.03);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 18);
  ctx.fillRect(0,canvas.height-noticeHeight,noticeWidth, noticeHeight);
  ctx.font = textHeight + "px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  const percentComplete = Math.round(windowCalc.chunksComplete * 100.0 / windowCalc.totalChunks);
  let noticeText = "";
  if (windowCalc.stage === windowCalcStages.drawCalculatingNotice && windowCalc.algorithm.startsWith("perturb-")) {
    noticeText = "Calculating reference orbit ...";
  } else {
    noticeText = "Calculating " + windowCalc.lineWidth + "-wide pixels (" + percentComplete + "%) ...";
  }
  ctx.fillText(noticeText, Math.round(noticeHeight*0.2), canvas.height - Math.round(noticeHeight* 0.2));
}

function cleanUpWindowCache() {
  // since we are no longer caching points like we used to,
  //   this does nothing
}

// -^^- THIS ABOVE SECTION can be removed once all common browsers -^^-
// -||-   (including Safari) support web workers and subworkers    -||-

const presets = [{
  "plot": "Mandelbrot-set",
  "v": 4,
  "n": 20000,
  "lineWidth": 1,
  "mag": createInfNum("2.8e10"),
  "centerX": createInfNum("-0.74364392705773112"),
  "centerY": createInfNum("0.131825980877688413"),
  "gradient": "bBgwo-B~20.20.20-repeat9-shift2",
  "bgColor": "b"
},{
  "plot": "Mandelbrot-set",
  "v": 4,
  "n": 400,
  "lineWidth": 1,
  "mag": createInfNum("4.07284768207e3"),
  "centerX": createInfNum("2.73260706888e-1"),
  "centerY": createInfNum("-5.89495392784e-3"),
  "gradient": "roygbv-repeat3",
  "bgColor": "b"
},{
  "plot": "Primes-1-Step-90-turn",
  "v": 4,
  "n": 60000,
  "lineWidth": 1,
  "mag": infNum(1n, 0n),
  "centerX": createInfNum("-240"),
  "centerY": createInfNum("288.4"),
  "gradient": "rbgyo",
  "bgColor": "b"
},{
  "plot": "Trapped-Knight",
  "v": 4,
  "n": 2016,
  "lineWidth": 1.5,
  "mag": infNum(1n, 0n),
  "centerX": createInfNum("0"),
  "centerY": createInfNum("0"),
  "gradient": "rbgyo",
  "bgColor": "b"
},{
  "plot": "Primes-1-Step-45-turn",
  "v": 4,
  "n": 32400,
  "lineWidth": 2,
  "mag": createInfNum("1.45033112581e1"),
  "centerX": createInfNum("35"),
  "centerY": createInfNum("100"),
  "gradient": "rbgyo",
  "bgColor": "b"
}];

var menuHtml =
  "<div class='plot-desc'>" +
    "<b>Presets:</b>";
for (var i = 0; i < presets.length; i++) {
  menuHtml += "<button style='float:none; margin:0.5rem; width:2.0rem;' class='preset-view-btn' id='preset-view-btn-" + (i+1) + "'>" + (i+1) +"</button>";
}
menuHtml += "</div>";
const plotsByName = {};
for (var i = 0; i < plots.length; i++) {
  plotsByName[plots[i].name] = plots[i];

  menuHtml +=
    "<div class='plot-desc'>" +
      "<button class='plot-view-btn' id='plot-view-btn-" + i + "'>View</button>" +
      "<b>" + plots[i].name + "</b><br/>" +
      plots[i].desc +
    "</div>";
}
document.getElementById("menu-contents").innerHTML = menuHtml;
const viewButtons = document.getElementsByClassName("plot-view-btn");
var activatePlotHandler = function(e) {
  var clickedId = parseInt(e.target.id.split("-")[3]);
  if (clickedId >= plots.length) {
    clickedId = 0;
  }
  const newPlot = plots[clickedId].name;
  if (newPlot == historyParams.plot) {
    return;
  }
  var defaults = Object.assign(historyParams, plots[clickedId].forcedDefaults);
  defaults.plot = newPlot;
  replaceHistoryWithParams(defaults);
  parseUrlParams();
  start();
};
for (var i = 0; i < viewButtons.length; i++) {
  viewButtons[i].addEventListener("click", activatePlotHandler);
}

function activatePreset(presetParams) {
  replaceHistoryWithParams(presetParams);
  parseUrlParams();
  start();
}
const presetButtons = document.getElementsByClassName("preset-view-btn");
var activatePresetHandler = function(e) {
  var clickedId = parseInt(e.target.id.split("-")[3]) - 1;
  if (clickedId < 0 || clickedId >= presets.length) {
    clickedId = 0;
  }
  activatePreset(presets[clickedId]);
};
for (var i = 0; i < presetButtons.length; i++) {
  presetButtons[i].addEventListener('click', activatePresetHandler);
}

for (let i = 1; i <= maxWorkers; i++) {
  workersSelect.innerHTML += "<option " + (i === workersCount ? "selected" : "") + " value=\"" + i + "\">" + i + "</option>";
}
workersSelect.addEventListener("change", setWorkersCountWithSelect);

function setWorkersCountWithSelect() {
  workersCount = parseInt(workersSelect.value);
  changeWorkersCount();
}

function changeWorkersCount() {
  if (windowCalc.worker !== null) {
    windowCalc.worker.postMessage({"t": "workers-count", "v": workersCount});
  }
}

function stopWorkers() {
  // prevent any more updates from being drawn
  windowCalc.plotId++;
  if (windowCalc.worker !== null) {
    windowCalc.worker.postMessage({"t": "stop", "v": 0});
  }
}

function changeDirectionDegrees(dir, degrees) {
  var newDir = dir + degrees;
  while (newDir < 0) {
    newDir += 360;
  }
  while (newDir >= 360) {
    newDir -= 360;
  }
  return newDir;
}

// 0 degrees is 3 o'clock
function computeNextPointDegrees(dir, n, x, y, v = {none: ""}) {
  if (dir == 0) {
    return getPoint(x + n, y, v);
  } else if (dir == 45) {
    return getPoint(x + n, y + n, v);
  } else if (dir == 90) {
    return getPoint(x, y + n, v);
  } else if (dir == 135) {
    return getPoint(x - n, y + n, v);
  } else if (dir == 180) {
    return getPoint(x - n, y, v);
  } else if (dir == 225) {
    return getPoint(x - n, y - n, v);
  } else if (dir == 270) {
    return getPoint(x, y - n, v);
  }
  return getPoint(x + n, y - n, v); // 315
}

// in my testing, just adding the sqrt as the iteration boundary
//   gives the fastest primality checking
// keeping an array of previously-found primes, and just checking
//   modulo those, was not nearly as fast as expected and not
//   nearly as fast as this simple function
function isPrime(n) {
  if (n < 2) {
    return false;
  }
  const sqrtN = Math.sqrt(n);
  for (var i = 2; i <= sqrtN; i++) {
    if (n % i == 0) {
      return false;
    }
  }
  return true;
}

function getPoint(x, y, v = {none: ""}) {
  return {x: x, y: y, v: v};
}

function getColor(r, g, b) {
  return {r: r, g: g, b: b};
}

function getColorPoint(x, y, color) {
  return {x: x, y: y, c: color};
}

function parseUrlParams() {
  // for whatever reason, using the URL hash parameters doesn't cause
  //   the page to reload and re-draw the visualization, so we will
  //   use the URL search parameters instead (and use history.pushState
  //   when actually drawing the thing to ensure the URL is kept
  //   up-to-date with what is being drawn without reloading the page)
  var urlParams = new URLSearchParams(document.location.search);

  if (urlParams.has("repeat")) {
    windowCalcRepeat = parseInt(urlParams.get("repeat"));
  }

  // default params are mandelbrot defaults
  var params = {
    "plot": "Mandelbrot-set",
    "algorithm": "auto",
    "v": 4,
    "lineWidth": 1,
    "n": 60,
    //"scale": infNum(400n, 0n),
    "mag": infNum(1n, 0n),
    "centerX": createInfNum("-0.65"),
    "centerY": infNum(0n, 0n),
    "gradient": "Bbgoyw",
    "bgColor": "b"
  };

  // only change default settings if a known version of settings is given
  if (urlParams.has('v') && ["1","2","3","4"].includes(urlParams.get('v'))) {
    let plotName = params.plot;
    if (["1","2","3"].includes(urlParams.get('v')) && urlParams.has('seq')) {
      plotName = urlParams.get('seq');
    } else if (["4"].includes(urlParams.get('v')) && urlParams.has('plot')) {
      plotName = urlParams.get('plot');
    }
    if (plotName in plotsByName) {
      params.plot = plotName;
    } else {
      alert("no such plot [" + plotName + "]");
    }
    const plot = plotsByName[plotName];
    if (urlParams.has('n')) {
      params.n = parseInt(urlParams.get('n').replaceAll(",", ""));
      if (params.n < 0) {
        params.n = 100;
      }
    }
    // scale takes precedence over "mag"nification
    if (urlParams.has("scale")) {
      params.scale = parseScaleString(urlParams.get("scale"));
      // since scale is present in URL, do not use scale to determine initial
      //   magnification
      params.mag = convertScaleToMagnification(params.scale, plot.magnificationFactor);
    } else if (urlParams.has("mag")) {
      params.mag = parseScaleString(urlParams.get("mag"));
      params.scale = convertMagnificationToScale(params.mag, plot.magnificationFactor);
    }
    // the very first URLs had "offsetX" and "offsetY" which were a percentage
    //   of canvas width/height to offset.  this meant URLs centered the plot
    //   on different locations depending on screen size, which makes no sense
    //   for sharing so those offset parameters are now just ignored
    if (urlParams.get('v') == 1) {
      params.centerX = infNum(0n, 0n);
      params.centerY = infNum(0n, 0n);
    } else {
      if (urlParams.has("centerX")) {
        params.centerX = createInfNum(urlParams.get("centerX").replaceAll(",", ""));
      }
      if (urlParams.has("centerY")) {
        let yParam = createInfNum(urlParams.get("centerY").replaceAll(",", ""));
        // convert older v=2 URL centerY to v=3 centerY by negating it
        if (urlParams.get('v') == 2) {
          yParam = infNumMul(infNum(-1n, 0n), yParam);
        }
        params.centerY = yParam;
      }
    }
    if (urlParams.has("lineColor")) {
      params.gradient = urlParams.get("lineColor");
    }
    if (urlParams.has("gradient")) {
      params.gradient = urlParams.get("gradient");
    }
    if (urlParams.has('bgColor')) {
      const color = urlParams.get('bgColor');
      if (color in bgColorSchemes) {
        params.bgColor = color;
      } else {
        alert("no such background color scheme [" + color + "]");
      }
    }
    if (urlParams.has('lineWidth')) {
      params.lineWidth = sanityCheckLineWidth(parseFloat(urlParams.get('lineWidth')) || 1.0, false, plot);
    }
    if (urlParams.has('workers')) {
      try {
        const w = parseInt(urlParams.get('workers'));
        if (w > 0 && w <= maxWorkers) {
          workersCount = w;
          workersSelect.value = workersCount;
        }
      } catch (e) {}
    }
    if (urlParams.has("algo")) {
      params.algorithm = urlParams.get("algo");
    }
  }
  try {
    buildGradient(params.gradient);
    hideGradientError();
  } catch (e) {
    displayGradientError(e);
  }
  console.log(params);

  historyParams = params;
}

function indicateActivePlot() {
  const buttons = document.getElementsByClassName('plot-view-btn');
  for (var i = 0; i < buttons.length; i++) {
    if (plots[i].name == historyParams.plot) {
      buttons[i].innerHTML = 'Active';
      buttons[i].parentNode.classList.add('active-plot');
    } else {
      buttons[i].innerHTML = 'View';
      buttons[i].parentNode.classList.remove('active-plot');
    }
  }
}

function setupGradientSelectControl(gradients) {
  const htmlOptions = [];
  let foundSelected = false;
  for (let i = 0; i < gradients.length; i++) {
    let selected = false;
    if (gradients[i].gradient == historyParams.gradient) {
      selected = true;
      foundSelected = true;
    } else if (!foundSelected && i === gradients.length - 1) {
      selected = true;
    }
    htmlOptions.push("<option " + (selected ? "selected" : "") + " value=\"" + gradients[i].gradient + "\">" + gradients[i].name + "</option>");
  }
  gradientSelect.innerHTML = htmlOptions.join("");
  updateGradientPreview();
}

gradientSelect.addEventListener("change", function(e) {
  if (gradientSelect.value == "") {
    return;
  }
  inputGradGrad.value = gradientSelect.value;
  updateGradientPreview();
});

function setupAlgorithmSelectControl(algorithms) {
  const htmlOptions = [];
  let foundSelected = false;
  for (let i = 0; i < algorithms.length; i++) {
    let selected = false;
    if (algorithms[i].algorithm == historyParams.algorithm) {
      selected = true;
      foundSelected = true;
    } else if (!foundSelected && i === algorithms.length - 1) {
      selected = true;
    }
    htmlOptions.push("<option " + (selected ? "selected" : "") + " value=\"" + algorithms[i].algorithm + "\">" + algorithms[i].name + "</option>");
  }
  algoSelect.innerHTML = htmlOptions.join("");
}

algoSelect.addEventListener("change", function(e) {
  if (algoSelect.value == "") {
    return;
  }
  inputAlgoAlgo.value = algoSelect.value;
});

var resetAlgorithmInput = function() {
  inputAlgoAlgo.value = historyParams.algorithm;
};

btnAlgoGo.addEventListener("click", function() {
  try {
    historyParams.algorithm = inputAlgoAlgo.value;
    // save the user's last entered algorithm into the "custom" algorithm
    activePlotAlgorithms[activePlotAlgorithms.length-1].algorithm = historyParams.algorithm;
    setupAlgorithmSelectControl(activePlotAlgorithms);
    redraw();
  } catch (e) {}
});
btnAlgoReset.addEventListener("click", resetAlgorithmInput);

function start() {
  stopWorkers();
  if (windowCalc.timeout != null) {
    window.clearTimeout(windowCalc.timeout);
  }

  // thanks to https://stackoverflow.com/a/1232046/259456
  points.length = 0;

  const params = historyParams;

  if (! params.plot in plotsByName) {
    console.log("invalid plot parameter: no such plot [" + params.plot + "]");
    return;
  }

  indicateActivePlot();

  if (params.plot.startsWith("Mandelbrot")) {
    blogLinkMain.style.display = "none";
    blogLinkMandel.style.display = "";
    detailsWorkersControls.style.display = "";
    if (!useWorkers) {
      document.getElementById("workers-warning").style.display = "";
    }
  } else {
    blogLinkMain.style.display = "";
    blogLinkMandel.style.display = "none";
    detailsWorkersControls.style.display = "none";
    document.getElementById("workers-warning").style.display = "none";
  }

  setDScaleVars();

  // run the selected plot
  const plot = plotsByName[params.plot];
  document.title = "Very Plotter - " + plot.pageTitle;

  if ("listAlgorithms" in plot.privContext) {
    // copy the algorithms so that the user's custom one can
    //   be saved into the "custom" slot
    activePlotAlgorithms = plot.privContext.listAlgorithms();
    setupAlgorithmSelectControl(activePlotAlgorithms);
    detailsAlgoControls.style.display = "";
  } else {
    detailsAlgoControls.style.display = "none";
  }

  if (plot.calcFrom == "sequence") {
    annotateClickPosition = true;
    // if viewing a sequence plot, ensure there's no window
    //   worker left running
    if (windowCalc.worker != null) {
      windowCalc.worker.terminate();
      windowCalc.worker = null;
    }

    setupGradientSelectControl(sequencePlotGradients);

    const out = plot.computePointsAndLength(plot.privContext);

    // copy the results
    totalLength = out.length;
    for (var i = 0; i < out.points.length; i++) {
      points.push(out.points[i]);
    }

    resetWindowCalcContext();
    drawPointsFitSize();
  } else if (plot.calcFrom == "window") {
    annotateClickPosition = false;
    setupGradientSelectControl(windowPlotGradients);
    resetWindowCalcCache();
    resetWindowCalcContext();
    calculateAndDrawWindow();
  } else {
    alert("Unexpected \"calcFrom\" field for the plot: [" + plot.calcFrom + "]");
  }
}

//var pixelColor = function(imgData, x, y) {
//  var red = imgData.data[((width * y) + x) * 4];
//  var green = imgData.data[((width * y) + x) * 4 + 1];
//  var blue = imgData.data[((width * y) + x) * 4 + 2];
//  return [red, green, blue];
//};

const bgColorSchemes = {
  "b": "rgba(0,0,0,1.0)",
  "g": "rgba(51,51,51,1.0)", //"#333333",
  "w": "rgba(255,255,255,1.0)"//"#FFFFFF"
};

const bgColorSchemeNames = [];
for (let name in bgColorSchemes) {
  bgColorSchemeNames.push(name);
}

function getBgColor(stringFormat = true) {
  let color = "rgba(0,0,0,1.0)";
  if (historyParams.bgColor in bgColorSchemes) {
    color = bgColorSchemes[historyParams.bgColor];
  }
  if (stringFormat) {
    return color;
  } else {
    let rgba = getBgColor().substr(5).split(',');
    return getColor(parseInt(rgba[0]),parseInt(rgba[1]),parseInt(rgba[2]));
  }
}

function fillBg(ctx) {
  var canvas = ctx.canvas;
  ctx.fillStyle = getBgColor();
  ctx.fillRect(0,0,canvas.width, canvas.height);
}

function setDScaleVarsNoScale() {
  let canvas = fitSizeCanvas;
  if (canvas.width != canvas.offsetWidth || canvas.height != canvas.offsetHeight) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    dCanvas.width = canvas.width * fullSizeScaleFactor;
    dCanvas.height = canvas.height * fullSizeScaleFactor;
    fillBg(fitSizeContext);
  }
}

function setDScaleVars() {
  setDScaleVarsNoScale();
  historyParams.scale = convertMagnificationToScale(historyParams.mag, plotsByName[historyParams.plot].magnificationFactor);
}

function convertScaleToMagnification(scale, magnificationFactor) {
  const smallDimensionPixels = infNum(BigInt(Math.min(dCanvas.width, dCanvas.height)), 0n);
  // magnificationFactor * scale / windowPixels 
  // 24 significant digits is always enough for magnification, right?
  return infNumDiv(infNumMul(scale, magnificationFactor), smallDimensionPixels, Math.min(precision, 24));
}

// if the given magnification is very close to the scale, leave it alone
//   otherwise, convert the scale to the correct magnification
// because scale is ultimately how the image is rendered, when the user
//   provides a magnification (like 2.8e11) we convert that mag to the scale
// when rendering an image, we always convert the scale back to a mag to
//   ensure a mag can be displayed in the URL for sharing
// with rounding/truncation problems, a user might enter "2.8e11" for the mag,
//   then after being converted to scale and converted back to mag, we might
//   end up with "2.7999999e11" for mag
// to avoid this, if the magnification is already very close to the scale,
//   don't perform that second conversion back to mag -- since scale is what's
//   actually used to render the image, if there is some rounding error between
//   mag and scale it doesn't actually matter, and this way, we keep any user-
//   entered magnification value as-is
function convertScaleToMagnificationIfNeeded(scale, mag, magnificationFactor) {
  const converted = convertScaleToMagnification(scale, magnificationFactor);
  let needToConvert = true;
  if (mag !== null && "v" in mag && "e" in mag) {
    // 24 significant digits is always enough for magnification, right?
    let divPrecis = Math.min(precision, 24);
    let ratio = infNumGt(converted, mag) ? infNumDiv(converted, mag, divPrecis) : infNumDiv(mag, converted, divPrecis);
    needToConvert = infNumGt(ratio, createInfNum("1.0001"));
  }
  return needToConvert ? converted : mag;
}

function convertMagnificationToScale(magnification, magnificationFactor) {
  const smallDimensionPixels = infNum(BigInt(Math.min(dCanvas.width, dCanvas.height)), 0n);
  // magnifiction * windowPixels / magnificationFactor
  // 24 significant digits is always enough for scale, right?
  return infNumDiv(infNumMul(magnification, smallDimensionPixels), magnificationFactor, Math.min(precision, 24));
}

// this is separate so that we can call it with only a subset of params,
//   and the rest will be populated with standard values as part of parseUrlParams()
function replaceHistoryWithParams(params) {
  var paramsCopy = structuredClone(params);
  // set "algo" in URL from algorithm, if not auto
  if ("algorithm" in paramsCopy && paramsCopy.algorithm != "auto") {
    paramsCopy["algo"] = paramsCopy.algorithm;
  }
  delete paramsCopy.algorithm;
  // include magnification in URL, not scale
  paramsCopy.mag = infNumExpStringTruncToLen(params.mag, precision);
  delete paramsCopy.scale;
  paramsCopy.centerX = infNumExpStringTruncToLen(params.centerX, precision);
  paramsCopy.centerY = infNumExpStringTruncToLen(params.centerY, precision);
  history.replaceState("", document.title, document.location.pathname + "?" + new URLSearchParams(paramsCopy).toString());
  replaceStateTimeout = null;
}

var replaceHistory = function() {
  replaceHistoryWithParams(historyParams);
};

var pushToHistory = function() {
  var paramsCopy = structuredClone(historyParams);
  // include magnification in URL, not scale
  paramsCopy.mag = infNumExpStringTruncToLen(historyParams.mag, precision);
  delete paramsCopy.scale;
  paramsCopy.centerX = infNumExpStringTruncToLen(historyParams.centerX, precision);
  paramsCopy.centerY = infNumExpStringTruncToLen(historyParams.centerY, precision);
  // no need to replaceState() here -- we'll replaceState() on param
  //   changes except for mouse dragging, which happen too fast
  history.pushState("", document.title, document.location.pathname + "?" + new URLSearchParams(paramsCopy).toString());
  historyTimeout = null;
};

const windowPlotGradients = [
  {gradient: "Bbgoyw", name:"dark blue-green"},
  {gradient: "Bpow-repeat2", name:"purple-orange"},
  {gradient: "Bw-repeat3", name:"black & white"},
  {gradient: "GBPw-P~250.34.188-G~73.106.3-repeat2", name:"olive-pink"},
  {gradient: "TGw-G~250.210.22-T~0.255.195-repeat3", name:"teal-gold"},
  {gradient: "roywB-B~80.80.255", name:"custom"}
];

const sequencePlotGradients = [
  {gradient: "rby", name:"red-blue-yellow"},
  {gradient: "rbgyo", name:"reverse rainbow"},
  {gradient: "roygbv", name:"rainbow"},
  {gradient: "br", name:"blue-red"},
  {gradient: "by", name:"blue-yellow"},
  {gradient: "op", name:"orange-purple"},
  {gradient: "LD-L~220.220.220-D~30.30.30", name:"light gray - dark gray"},
  {gradient: "LD-L~240.20.20-D~100.0.0", name:"red"},
  {gradient: "LD-L~250.100.0-D~120.60.0", name:"orange"},
  {gradient: "LD-L~240.240.0-D~120.120.0", name:"yellow"},
  {gradient: "LD-L~20.240.20-D~0.100.0", name:"green"},
  {gradient: "LD-L~20.20.250-D~0.0.120", name:"blue"},
  {gradient: "LD-L~220.0.220-D~120.0.120", name:"purple"},
  {gradient: "LD-L~90.90.90-D~30.30.30", name:"dark gray"},
  {gradient: "LD-L~220.220.220-D~100.100.100", name:"light gray"},
  {gradient: "roywB-B~80.80.255", name:"custom"}
];

// match color declaration like "a~1.2.3" or "r~150.30.30"
const customColorRegex = /^[a-zA-z]~[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;

// build global gradient stops from format:
//   roygbvx-saturation60-brightness90-width80-offset30-repeat10-mirror2-shift3-x~30.30.30
function buildGradient(gradientString) {
  try {
    const grad = buildGradientObj(gradientString);
    builtGradient = grad;
    hideGradientError();
  } catch (e) {
    displayGradientError(e);
  }
}

function buildGradientObj(gradientString) {
  if (gradientString.trim().length === 0) {
    throw "gradient must not be empty";
  }
  const colorsByName = {
    "r": [240,0,0],
    "o": [240,120,0],
    "y": [240,240,0],
    "g": [0,240,0],
    "b": [0,0,240],
    "v": [240,0,240],
    "p": [240,0,240],
    "w": [255,255,255],
    "B": [0,0,0]
  };
  const grad = {};
  const args = {};
  const splitArgs = gradientString.trim().split("-");
  const colorArgs = splitArgs[0];
  const argNames = ["saturation","brightness","width","offset","repeat","mirror","shift"];
  let colorMatch = null;
  for (let i = 1; i < splitArgs.length; i++) {
    colorMatch = splitArgs[i].match(customColorRegex);
    if (colorMatch !== null) {
      let customColorName = colorMatch[0].charAt(0);
      let customRgbValuesSplit = colorMatch[0].substring(2).split("."); // "x~1.2.3" -> ["1","2","3"]
      let customRgbValues = [];
      for (let i = 0; i < customRgbValuesSplit.length; i++) {
        let value = parseInt(customRgbValuesSplit[i]);
        value = Math.min(255, Math.max(0, value)); // restrict to 0-255
        customRgbValues.push(value);
      }
      colorsByName[customColorName] = customRgbValues;
    } else {
      for (let j = 0; j < argNames.length; j++) {
        const argName = argNames[j];
        if (splitArgs[i].startsWith(argName)) {
          args[argName] = splitArgs[i].substring(argName.length);
          try {
            if (args[argName] == "") {
              throw "integer expected as part of option";
            }
            args[argName] = parseInt(args[argName]);
            if (["shift","saturation","brightness"].includes(argName)) {
              if (args[argName] < -99 || args[argName] > 99) {
                throw "option must be greater than -100 and less than 100";
              }
            } else {
              if (args[argName] <= 0 || args[argName] > 100) {
                throw "option must be greater than 0 and less than 101";
              }
            }
          } catch (e) {
            throw "Invalid integer value for gradient option [" + splitArgs[i] + "]: " + e.toString();
            //delete args[argName];
            //continue;
          }
        }
      }
    }
  }
  const colorsDefault = "roygbv";
  let colors = "";
  for (let i = 0; i < colorArgs.length && i < 20; i++) {
    const color = colorArgs.charAt(i);
    if (color in colorsByName) {
      colors = colors + color;
    }
  }
  if (colors.length == 0) {
    colors = colorsDefault;
  }
  // mirror is applied before repeat
  // mirror: rgb -> rgbgr -> rgbgrgbgr
  if ("mirror" in args && colors.length > 1) {
    let mirrorLimit = Math.min(args.mirror, 4);
    for (let n = 0; n < mirrorLimit; n++) {
      let newColors = colors.split("");
      // skip last char when reversing
      for (let i = newColors.length - 2; i >= 0 ; i--) {
        newColors.push(newColors[i]);
      }
      colors = newColors.join("");
    }
  }
  if ("repeat" in args) {
    colors = colors.repeat(Math.min(args.repeat, 100));
  }
  if ("shift" in args && colors.length > 1) {
    let split = colors.split("");
    if (args.shift > 0) {
      for (let i = 0; i < args.shift; i++) {
        split.unshift(split.pop());
      }
    } else if (args.shift < 0) {
      for (let i = 0; i > args.shift; i--) {
        split.push(split.shift());
      }
    }
    colors = split.join("");
  }
  // calculate the stop points here, then later apply width and offset
  // TODO: handle repeating like "ooorvvv" or "rgggb" by making extra-wide stops
  //  r    g    b
  // 255   0    0
  //  0   255   0
  //  0    0   255
  grad.orderedStops = [];
  // apply width arg by scaling all stops
  const totalWidth = "width" in args ? Math.min(1.0, (args.width / 100.0)) : 1.0;

  if (colors.length === 1) {
    let colorRgb = colorsByName[colors];
    if (colorRgb === undefined) {
      colorRgb = colorsByName["o"];
    }
    grad.orderedStops.push({
      lower: 0.0,
      upper: totalWidth,
      rLower: colorRgb[0],
      gLower: colorRgb[1],
      bLower: colorRgb[2],
      rRange: 0.0,
      gRange: 0.0,
      bRange: 0.0
    });
  } else {
    let prevStopUpper = 0.0;
    for (let i = 0; i < colors.length - 1; i++) {
      // for stop 0, gradient is color[0] -> color[1]
      // for stop 1, gradient is color[1] -> color[2]
      let colorRgbA = colorsByName[colors.charAt(i)];
      if (colorRgbA === undefined) {
        colorRgbA = colorsByName["w"];
      }
      let colorRgbB = colorsByName[colors.charAt(i+1)];
      if (colorRgbB === undefined) {
        colorRgbB = colorsByName["w"];
      }
      const stop = {};
      stop.rLower = colorRgbA[0];
      stop.gLower = colorRgbA[1];
      stop.bLower = colorRgbA[2];
      stop.rRange = colorRgbB[0] - stop.rLower;
      stop.gRange = colorRgbB[1] - stop.gLower;
      stop.bRange = colorRgbB[2] - stop.bLower;
      stop.lower = prevStopUpper;
      if (i == colors.length - 2) {
        stop.upper = 1.0;
      } else {
        // we cannot divide by zero because if there's only one stop, we
        //   do not even enter this for loop
        stop.upper = stop.lower + ((1.0 / (colors.length - 1)) * totalWidth);
      }
      grad.orderedStops.push(stop);
      prevStopUpper = stop.upper;
    }
  }

  const maxOffset = 1.0 - totalWidth;
  const offset = "offset" in args ? Math.min(maxOffset, (args.offset / 100.0)) : 0.0;
  // even if offset is zero, we still need to set each stop's range
  for (let i = 0; i < grad.orderedStops.length; i++) {
    // do not touch the lower bound of the first stop
    if (offset > 0 && i === 0) {
      continue;
    }
    grad.orderedStops[i].lower += offset;

    // do not touch the upper bound of the last stop
    if (i + 1 < grad.orderedStops.length) {
      grad.orderedStops[i].upper += offset;
    }
    grad.orderedStops[i].range = grad.orderedStops[i].upper - grad.orderedStops[i].lower;
  }
  return grad;
}


function applyBuiltGradient(gradient, pct, stringFormat = true) {
  let color = {r:255, g:255, b:255};
  let lo = 0;
  let hi = gradient.orderedStops.length - 1;
  let x = null;
  while (lo <= hi) {
    x = (lo + hi) >>1;
    if (pct < gradient.orderedStops[x].lower) {
      hi = x - 1;
    } else if (pct > gradient.orderedStops[x].upper) {
      lo = x + 1;
    } else {
      let stop = gradient.orderedStops[x];
      // put code elsewhere to avoid needing this
      //if (stop.range > 0) {
        let withinStopPct = (pct - stop.lower) / stop.range;
        color = {
          r: Math.floor((withinStopPct * stop.rRange) + stop.rLower),
          g: Math.floor((withinStopPct * stop.gRange) + stop.gLower),
          b: Math.floor((withinStopPct * stop.bRange) + stop.bLower)
        };
      //}
      break;
    }
  }
  if (stringFormat) {
    return "rgba(" + color.r + "," + color.g + "," + color.b + ",1.0)";
  } else {
    return color;
  }
}

function redraw() {
  resetWindowCalcContext();
  const plot = plotsByName[historyParams.plot];
  if (plot.calcFrom == "sequence") {
    // if viewing a sequence plot, ensure there's no window
    //   worker left running
    if (windowCalc.worker != null) {
      windowCalc.worker.terminate();
      windowCalc.worker = null;
    }
    annotateClickPosition = true;
    drawPointsFitSize();
  } else if (plot.calcFrom == "window") {
    annotateClickPosition = false;
    calculateAndDrawWindow();
  }
}

function infNumToFloat(n) {
  return parseFloat(infNumExpStringTruncToLen(n, 18));
}

function drawPointsFitSize() {
  drawPoints(historyParams, fitSizeContext, fullSizeScaleFactor, 1);
}

function drawPointsFullSize() {
  drawPoints(historyParams, dContext, 1, fullSizeScaleFactor);
}

function drawPoints(params, ctx, scaleFactor, lineWidthFactor) {
  // change URL bar to reflect current params, only if no params change
  //   for 1/4 second
  if (replaceStateTimeout != null) {
    window.clearTimeout(replaceStateTimeout);
  }
  replaceStateTimeout = window.setTimeout(replaceHistory, 250);

  const lineWidth = params.lineWidth * lineWidthFactor;
  // this function is only used for drawing sequence plots,
  //   so lots of precision for scale and offset isn't needed,
  // convert scale to float, and below use float version of left/top edges
  const scale = infNumToFloat(params.scale) / scaleFactor;

  fillBg(ctx);
  console.log("drawing [" + points.length + "] points with a total length of [" + totalLength + "]");

  var drawnLength = 0.0;
  var totalLengthScaled = totalLength * scale;
  var lastX = (0.0 - windowCalc.leftEdgeFloat) * scale;
  var lastY = (windowCalc.topEdgeFloat - 0.0) * scale;
  var segmentX = 0.0;
  var segmentY = 0.0;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (var i = 0; i < points.length; i++) {
    var x = (points[i].x - windowCalc.leftEdgeFloat) * scale;
    var y = (windowCalc.topEdgeFloat - points[i].y) * scale;
    // use previous point to determine how much of the overall length
    //   we have drawn and therefore which part much of the overall
    //   line gradient this segment should be drawn with
    if (i > 0) {
      segmentX = x - lastX;
      segmentY = y - lastY;
      if (segmentX == 0) {
        drawnLength += Math.abs(segmentY);
      } else if (segmentY == 0) {
        drawnLength += Math.abs(segmentX);
      } else {
        drawnLength += Math.hypot(segmentX, segmentY);
      }
    }
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    //ctx.strokeStyle = getLineColor(drawnLength / totalLengthScaled, params.lineColor);
    ctx.strokeStyle = applyBuiltGradient(builtGradient, drawnLength / totalLengthScaled);
    ctx.lineTo(x, y);
    // stroke every line individually in order to do gradual color gradient
    ctx.stroke();
    lastX = x;
    lastY = y;
  }
}

// since the cache lives in the main worker, we can wipe the
//   cache easily by killing that worker
function resetWindowCalcCache() {
  console.log("purging window points cache");
  if (windowCalc.worker != null) {
    windowCalc.worker.postMessage({t:"wipe-cache",v:null});
  }
}

function resetMandelbrotReferenceOrbit() {
  console.log("purging mandelbrot reference orbit");
  if (windowCalc.worker != null) {
    windowCalc.worker.postMessage({t:"wipe-ref-orbit",v:null});
  }
}

function resetWindowCalcContext() {
  // for now, while we don't have caching implemented for workers,
  //   just kill any running worker here (whenever we change any
  //   param to force a redraw())
  //if (windowCalc.worker != null) {
  //  windowCalc.worker.terminate();
  //}
  // this timeout is used to kick off an image computation
  //   after a short delay, so always cancel any outstanding
  //   delayed kickoff when redrawing
  if (windowCalc.timeout != null) {
    window.clearTimeout(windowCalc.timeout);
  }
  //fillBg(dContext);

  const plot = plotsByName[historyParams.plot];
  const params = historyParams;
  windowCalc.plotName = params.plot;
  windowCalc.stage = "";

  let settings = {
    precision: 12, // significant digits
    algorithm: "basic-float"
  };

  if ("adjustPrecision" in plot.privContext) {
    settings = plot.privContext.adjustPrecision(historyParams.scale, useWorkers);
  }

  // set the plot-specific global precision to use first
  if (historyParams.algorithm != "auto") {
    let algoPrecis = undefined;
    try {
      algoPrecis = parseInt(historyParams.algorithm.split("-").find(e => e.startsWith("sigdig")).substring(6));
    } catch (e) {}
    if (algoPrecis !== undefined) {
      settings.precision = algoPrecis;
    }
    settings.algorithm = historyParams.algorithm;
  }
  precision = settings.precision;
  windowCalc.algorithm = settings.algorithm;
  console.log("user-adjusted settings:", {precision:precision, algorithm:windowCalc.algorithm});

  windowCalc.math = selectMathInterfaceFromAlgorithm(windowCalc.algorithm);

  // attempt to resolve slowdown experienced when repeatedly panning/zooming,
  //   where the slowdown is resolved when refreshing the page
  historyParams.scale = infNumTruncateToLen(historyParams.scale, precision);
  historyParams.mag = convertScaleToMagnificationIfNeeded(historyParams.scale, historyParams.mag, plot.magnificationFactor);
  historyParams.centerX = infNumTruncateToLen(historyParams.centerX, precision);
  historyParams.centerY = infNumTruncateToLen(historyParams.centerY, precision);

  // save the image for previewing when panning
  if (previewImage === null) {
    //previewImage = fullSizeScalePower == 0 ? windowCalc.pixelsImage : windowCalc.fitImage;
    previewImage = windowCalc.fitImage;
  }

  windowCalc.lineWidth = 128; // placeholder value
  // the imagedata for the canvas that fits on the screen
  windowCalc.fitImage = fitSizeContext.getImageData(0, 0, fitSizeCanvas.width, fitSizeCanvas.height);
  // the imagedata for the invisible canvas that's the full size
  windowCalc.pixelsImage = dContext.getImageData(0, 0, dCanvas.width, dCanvas.height);
  windowCalc.xPixelChunks = [];
  windowCalc.pointsBounds = "";
  windowCalc.passTimeMs = 0;
  windowCalc.totalTimeMs = 0;
  windowCalc.startTimeMs = Date.now();
  windowCalc.endTimeMs = 0;
  windowCalc.totalPoints = 0;
  windowCalc.cachedPoints = 0;
  windowCalc.totalChunks = 0;
  windowCalc.runtimeMs = -1;
  windowCalc.avgRuntimeMs = -1;
  windowCalc.workersCountRange = "-";
  windowCalc.saItersSkipped = null;
  windowCalc.plotId++; // int wrapping around is fine

  const two = infNum(2n, 0n);

  //const canvasWidth = createInfNum(dContext.canvas.offsetWidth.toString());
  //const canvasHeight = createInfNum(dContext.canvas.offsetHeight.toString());
  const canvasWidth = createInfNum(dCanvas.width.toString());
  const canvasHeight = createInfNum(dCanvas.height.toString());

  // rather than calculate this for each chunk, compute it once here
  windowCalc.eachPixUnits = infNumDiv(infNum(1n, 0n), params.scale, precision);
  windowCalc.eachPixUnitsM = windowCalc.math.createFromInfNum(windowCalc.eachPixUnits);

  // find the visible abstract points using offset and scale
  const scaledWidth = infNumDiv(canvasWidth, params.scale, precision);
  const leftEdge = infNumSub(params.centerX, infNumDiv(infNumDiv(canvasWidth, two, precision), params.scale, precision));
  const rightEdge = infNumAdd(leftEdge, scaledWidth);

  const scaledHeight = infNumDiv(canvasHeight, params.scale, precision);
  const topEdge = infNumAdd(params.centerY, infNumDiv(infNumDiv(canvasHeight, two, precision), params.scale, precision));
  const bottomEdge = infNumSub(topEdge, scaledHeight);

  // only clear cache if iterations have changed or if zoom has changed
  // this allows us to re-use the cache when panning, or changing colors
  if (windowCalc.n != params.n || !infNumEq(windowCalc.scale, params.scale)) {
    resetWindowCalcCache();
  }

  windowCalc.n = params.n;
  windowCalc.scale = params.scale;
  windowCalc.leftEdge = leftEdge;
  windowCalc.topEdge = topEdge;
  windowCalc.rightEdge = rightEdge;
  windowCalc.bottomEdge = bottomEdge;
  windowCalc.eachPixUnitsFloat = infNumToFloat(windowCalc.eachPixUnits);
  windowCalc.leftEdgeFloat = infNumToFloat(leftEdge);
  windowCalc.topEdgeFloat = infNumToFloat(topEdge);
  windowCalc.leftEdgeM = windowCalc.math.createFromInfNum(leftEdge);
  windowCalc.topEdgeM = windowCalc.math.createFromInfNum(topEdge);
  windowCalc.rightEdgeM = windowCalc.math.createFromInfNum(rightEdge);
  windowCalc.bottomEdgeM = windowCalc.math.createFromInfNum(bottomEdge);

  resetGoToBoundsValues();
  resetGoToCenterValues();
  resetNIterationsValue();
  resetGradientInput();
  resetAlgorithmInput();
}

function resetGoToBoundsValues() {
  var imaginaryCoordinates = false;
  if ("usesImaginaryCoordinates" in plotsByName[historyParams.plot].privContext) {
    imaginaryCoordinates = plotsByName[historyParams.plot].privContext.usesImaginaryCoordinates;
  }
  inputGotoTopLeftX.value = windowCalc.leftEdgeFloat;
  inputGotoTopLeftY.value = windowCalc.topEdgeFloat + (imaginaryCoordinates ? "i" : "");
  inputGotoBotRightX.value = infNumToFloat(windowCalc.rightEdge);
  inputGotoBotRightY.value = infNumToFloat(windowCalc.bottomEdge) + (imaginaryCoordinates ? "i" : "");
}
function resetGoToCenterValues() {
  var imaginaryCoordinates = false;
  if ("usesImaginaryCoordinates" in plotsByName[historyParams.plot].privContext) {
    imaginaryCoordinates = plotsByName[historyParams.plot].privContext.usesImaginaryCoordinates;
  }
  inputGotoCenterX.value = infNumExpString(historyParams.centerX);
  inputGotoCenterY.value = infNumExpString(historyParams.centerY) + (imaginaryCoordinates ? "i" : "");
  inputGotoScale.value = infNumExpString(historyParams.scale);
  inputGotoMag.value = infNumExpString(historyParams.mag);
}

function resetNIterationsValue() {
  // if plot is mandelbrot, change "N" to "iterations"
  if (windowCalc.plotName === "Mandelbrot-set") {
    document.getElementById("n-iter-label1").innerHTML = "iterations";
    document.getElementById("n-iter-label2").innerHTML = "iterations:";
  } else {
    document.getElementById("n-iter-label1").innerHTML = "N";
    document.getElementById("n-iter-label2").innerHTML = "N:";
  }
  inputNIterations.value = (historyParams.n).toLocaleString();
}

function applyGoToBoundsValues() {
  let leftX, rightX, topY, bottomY;
  try {
    leftX = createInfNum(inputGotoTopLeftX.value.replaceAll(",", ""));
  } catch (e) {
    alert("Invalid top left x value");
    return;
  }
  try {
    rightX = createInfNum(inputGotoBotRightX.value.replaceAll(",", ""));
  } catch (e) {
    alert("Invalid bottom right x value");
    return;
  }
  if (infNumGe(leftX, rightX)) {
    alert("Top left x value must be less than bottom right x value");
    return;
  }
  try {
    topY = createInfNum(replaceAllEachChar(inputGotoTopLeftY.value, ",iI ", ""));
  } catch (e) {
    alert("Invalid top left x value");
    return;
  }
  try {
    bottomY = createInfNum(replaceAllEachChar(inputGotoBotRightY.value, ",iI ", ""));
  } catch (e) {
    alert("Invalid bottom right x value");
    return;
  }
  if (infNumGe(bottomY, topY)) {
    alert("Bottom left y value must be less than top left y value");
    return;
  }
  const diffX = infNumSub(rightX,   leftX);
  const diffY = infNumSub(  topY, bottomY);
  const newCenterX = infNumAdd(  leftX, infNumDiv(diffX, infNum(2n, 0n), precision));
  const newCenterY = infNumAdd(bottomY, infNumDiv(diffY, infNum(2n, 0n), precision));

  const scaleX = infNumDiv(createInfNum(dCanvas.width.toString()), diffX, precision);
  const scaleY = infNumDiv(createInfNum(dCanvas.height.toString()), diffY, precision);

  console.log("X spans [" + infNumToString(diffX) + "] units, thus [" + infNumToString(scaleX) + "] pixels/unit");
  console.log("Y spans [" + infNumToString(diffY) + "] units, thus [" + infNumToString(scaleY) + "] pixels/unit");

  var smaller = scaleX;
  if (infNumLt(scaleY, scaleX)) {
    smaller = scaleY;
  }

  console.log("going with scale of [" + infNumToString(smaller) + "]");

  historyParams.centerX = newCenterX;
  historyParams.centerY = newCenterY;
  historyParams.scale = smaller;

  redraw();
}
function applyGoToCenterValues() {
  try {
    historyParams.centerX = createInfNum(inputGotoCenterX.value.replaceAll(",", ""));
  } catch (e) {
    alert("Invalid center x value");
    return;
  }
  try {
    historyParams.centerY = createInfNum(replaceAllEachChar(inputGotoCenterY.value, ",iI ", ""));
  } catch (e) {
    alert("Invalid center y value");
    return;
  }
  try {
    historyParams.scale = createInfNum(inputGotoScale.value.replaceAll(",", ""));
  } catch (e) {
    alert("Invalid scale value");
    return;
  }
  redraw();
}

// parse scale and magnification strings:
// - throw away plus signs, spaces, and commas
// - if ^ is present, treat both sides as int (BigInt) and raise left side to right side
// - accept only positive exponents, so throw away minus signs in exponent
function parseScaleString(str) {
  let cleaned = replaceAllEachChar(str, ", +", "");
  if (cleaned.length === 0) {
    throw "Value cannot be empty";
  }
  let powerSplit = cleaned.split("^");
  if (powerSplit.length > 1) {
    return infNum(BigInt(powerSplit[0].split(".")[0]) ** BigInt(powerSplit[1].replaceAll("-","").split(".")[0]), 0n);
  } else {
    return createInfNum(powerSplit[0]);
  }
}

function setMagInputToMatchScale() {
  if (inputGotoScale.value == "Invalid magnification value") {
    return;
  }
  try {
    if (inputGotoScale.value.length === 0) {
      return;
    }
    let scale = parseScaleString(inputGotoScale.value);
    let mag = convertScaleToMagnification(scale, plotsByName[windowCalc.plotName].magnificationFactor);
    inputGotoMag.value = infNumExpString(mag);
  } catch (e) {
    inputGotoMag.value = "Invalid scale value";
  }
}

function setScaleInputToMatchMag() {
  if (inputGotoScale.value == "Invalid scale value") {
    return;
  }
  try {
    if (inputGotoMag.value.length === 0) {
      return;
    }
    let mag = parseScaleString(inputGotoMag.value);
    let scale = convertMagnificationToScale(mag, plotsByName[windowCalc.plotName].magnificationFactor);
    inputGotoScale.value = infNumExpString(scale);
  } catch (e) {
    inputGotoScale.value = "Invalid magnification value";
  }
}

inputGotoScale.addEventListener("change", setMagInputToMatchScale);
inputGotoScale.addEventListener("input", setMagInputToMatchScale);
inputGotoScale.addEventListener("propertychange", setMagInputToMatchScale);
inputGotoScale.addEventListener("paste", setMagInputToMatchScale);
inputGotoMag.addEventListener("change", setScaleInputToMatchMag);
inputGotoMag.addEventListener("input", setScaleInputToMatchMag);
inputGotoMag.addEventListener("propertychange", setScaleInputToMatchMag);
inputGotoMag.addEventListener("paste", setScaleInputToMatchMag);

function applyNIterationsValue() {
  const newN = parseInt(inputNIterations.value.replaceAll(",", ""));
  if (newN > 0) {
    historyParams.n = newN;
    resetNIterationsValue();
    start();
  }
}

function textInputHasFocus() {
  var anyHasFocus = false;
  for (let i = 0; i < inputFields.length; i++) {
    // thanks to https://stackoverflow.com/a/30714894/259456
    if (inputFields[i] === document.activeElement) {
      anyHasFocus = true;
      break;
    }
  }
  return anyHasFocus;
}

btnGotoBoundsGo.addEventListener("click", applyGoToBoundsValues);
btnGotoBoundsReset.addEventListener("click", resetGoToBoundsValues);
btnGotoCenterGo.addEventListener("click", applyGoToCenterValues);
btnGotoCenterReset.addEventListener("click", resetGoToCenterValues);

btnNIterationsGo.addEventListener("click", applyNIterationsValue);
btnNIterationsReset.addEventListener("click", resetNIterationsValue);

// messages received from main worker:
// chunk complete
var calcWorkerOnmessage = function(e) {
  if (!useWorkers) {
    return;
  }
  if ("subworkerNoWorky" in e.data) {
    useWorkers = false;
    warnAboutWorkers();
    redraw();
    return;
  }
  if (e.data.plotId !== windowCalc.plotId) {
    return;
  }
  if ("statusMessage" in e.data) {
    const messageString = e.data.statusMessage;
    repaintOnly();
    drawStatusNotice(fitSizeContext, messageString);
    if (showMousePosition) {
      redrawMousePosNotice();
    }
    if (imageParametersCaption) {
      drawImageParameters();
    }
    return;
  }
  // e.calcStatus - {chunks: int, chunksComplete: int, pixelWidth: int, running: boolean, workersCount: string, workersNow: int}
  drawWorkerColorPoints(e);
  if (showMousePosition) {
    redrawMousePosNotice();
  }
  windowCalc.workersCountRange = e.data.calcStatus.workersCount;
  if ("saItersSkipped" in e.data.calcStatus) {
    windowCalc.saItersSkipped = e.data.calcStatus.saItersSkipped;
  }
  const percentComplete = Math.round(e.data.calcStatus.chunksComplete * 100.0 / e.data.calcStatus.chunks);
  if (percentComplete < 100) {
    drawCalculatingNotice(fitSizeContext, e.data.calcStatus.pixelWidth, percentComplete, e.data.calcStatus.workersNow);

  // if the pass is complete, the entire image may be complete
  } else {
    if (windowLogTiming) {
      const totalPts = e.data.calcStatus.passPoints;
      const cachedPts = e.data.calcStatus.passCachedPoints;
      const cachedPct = Math.round(cachedPts * 10000.0 / totalPts) / 100.0;
      console.log("computing [" + totalPts + "] points of width [" + e.data.calcStatus.pixelWidth + "], of which [" + cachedPts + "] were cached (" + cachedPct + "%)");//, took [" + windowCalc.passTimeMs + "] ms");
    }
    if (e.data.calcStatus.running) {
      drawStartingPassNotice();
    } else {
      if (windowLogTiming) {
        windowLogOverallImage();
        if (windowCalcRepeat > 1) {
          windowCalcRepeat -= 1;
          resetWindowCalcCache();
          resetMandelbrotReferenceOrbit();
          redraw();
        } else if (windowCalcRepeat === 1) {
          windowCalcRepeat -= 1;
          windowAverageTiming();
        }
      }
      if (imageParametersCaption) {
        drawImageParameters();
      }
    }
  }
};

function drawWorkerColorPoints(workerMessage) {
  const e = workerMessage.data;
  // e.chunkPix - {x: int, y: int} - starting point of the chunk's pixel on canvas
  // e.chunkPixInc - {x: int, y: int} - coordinate to add to previous pixel to move to next pixel
  // e.chunkPos - {x: InfNumExpStr, y: InfNumExpStr} - starting point of the chunk
  // e.chunkInc - {x: InfNumExpStr, y: InfNumExpStr} - the coordinate to add to the previous point to move to the next point
  // e.chunkLen - int - the number of points in the chunk
  // e.results -  [float,int,...] - array of results values, one per point in the chunk
  // e.calcStatus - {chunks: int, chunksComplete: int, pixelWidth: int, running: boolean}

  const pixIncY = e.chunkPixInc.y;
  const pixelSize = e.calcStatus.pixelWidth;

  const pixX = e.chunkPix.x;
  let pixY = e.chunkPix.y;
  // pre-allocate array so we don't have to use array.push()
  const results = new Array(e.chunkLen);

  for (let i = 0; i < e.chunkLen; i++) {
    // x and y are integer (actual pixel) values, with no decimal component
    const point = getColorPoint(pixX, pixY, e.results[i]);
    // create a wrappedPoint
    // px -- the pixel "color point"
    // pt -- the abstract coordinate on the plane (not using since we aren't caching)
    results[i] = {"px": point};
    // since we want to start at the given starting position, increment
    //   both the position and pixel AFTER creating each result
    pixY += pixIncY;
  }
  //if (fullSizeScalePower == 0) {
  //  drawColorPointsNoScale(results, pixelSize);
  //  previewImage = windowCalc.pixelsImage;
  //} else {
  //  drawColorPoints(results, pixelSize);
  //  previewImage = windowCalc.fitImage;
  //}
  drawColorPoints(results, pixelSize);
  //previewImage = fullSizeScalePower == 0 ? windowCalc.pixelsImage : windowCalc.fitImage;
  previewImage = windowCalc.fitImage;
  previewImageOffsetX = 0;
  previewImageOffsetY = 0;
}

// simple, synchronous/blocking function to calculate and draw
//   the entire image, for floating point only
function calculateAndDrawWindowSync(pixelSize) {
  const compute = plotsByName[windowCalc.plotName].computeBoundPointColor;
  let step = (windowCalc.eachPixUnitsFloat * fullSizeScaleFactor) * pixelSize;
  let px = windowCalc.leftEdgeFloat;
  let xStep = step;
  // pre-allocate array so we don't have to use array.push()
  const results = new Array(Math.ceil(fitSizeCanvas.width/pixelSize) * Math.ceil(fitSizeCanvas.height/pixelSize));
  let resultCounter = 0;
  for (let x = 0; x < fitSizeCanvas.width; x+=pixelSize) {
    let py = windowCalc.topEdgeFloat;
    for (let y = 0; y < fitSizeCanvas.height; y+=pixelSize) {
      // create a wrappedPoint
      // px -- the pixel "color point"
      // pt -- the abstract coordinate on the plane
      results[resultCounter] = {
        px: getColorPoint(x, y, compute(windowCalc.n, precision, windowCalc.algorithm, px, py))
      };
      resultCounter++;
      py -= step;
    }
    px += xStep;
  }
  drawColorPointsFitOnlyNoCache(results, pixelSize);
}

function calculateAndDrawWindow() {
  if (windowCalc.algorithm == "basic-float") {
    // since we are just starting a new image, calculate and draw the first
    //   pass synchronously, so that as the user drags a mouse/finger, or
    //   zooms, the canvas is updated as rapidly as possible
    calculateAndDrawWindowSync(100);
    previewImage = null;
    previewImageOffsetX = 0;
    previewImageOffsetY = 0;
  } else {
    drawPreviewImage();
  }

  if (windowCalc.timeout != null) {
    window.clearTimeout(windowCalc.timeout);
  }
  if (useWorkers) {
    // after drawing the fist pass synchronously, we'll do all subsequent
    //   passes via the worker and its subworkers
    // BUT FIRST wait 1/4 second because the user might still be panning/zooming
    windowCalc.timeout = window.setTimeout(kickoffWindowWorker, 250);
  } else {
    windowCalc.timeout = window.setTimeout(kickoffWindowDrawLoop, 250);
  }
}

function resetPixelCache() {
  windowCalc.pixelCache = new Array(dCanvas.width);
  for (let i = 0; i < windowCalc.pixelCache.length; i++) {
    windowCalc.pixelCache[i] = new Array(dCanvas.height);
  }
}

// start the non-worker calculate/draw loop
function kickoffWindowDrawLoop() {
  if (windowCalc.timeout != null) {
    window.clearTimeout(windowCalc.timeout);
  }
  // resetting the pixelCache might be slightly slow, so it's been
  //   moved here
  resetPixelCache();
  // since the linewidth is divided by 2 on each pass, start with a multiple
  //   of a power of 2.  this way, we end up at the desired pixel size ("line width")
  // since this is the slower non-worker way to draw the image, we'll start
  //   with pixels that are twice as wide as the worker pixels
  let startLineWidth = windowCalc.algorithm == "basic-float" ?
    Math.round(historyParams.lineWidth) * 64
    :
    Math.round(historyParams.lineWidth) * 256;
  while (startLineWidth > 300) {
    startLineWidth /= 2;
  }
  windowCalc.lineWidth = startLineWidth;
  windowCalc.passNumber = startPassNumber - 1;
  windowCalc.stage = windowCalcStages.drawCalculatingNotice;
  windowCalc.timeout = window.setInterval(windowDrawLoop, 5);
}

function kickoffWindowWorker() {
  if (windowCalc.worker === null) {
    if (forceWorkerReload) {
      windowCalc.worker = new Worker("calcworker.js?v=" + appVersion + "&" + forceWorkerReloadUrlParam + "&t=" + (Date.now()));
    } else {
      windowCalc.worker = new Worker("calcworker.js?v=" + appVersion);
    }
    windowCalc.worker.onmessage = calcWorkerOnmessage;
  } else {
    windowCalc.worker.postMessage({"t": "stop", "v": 0});
  }
  // resetting the pixelCache might be slightly slow, so it's been
  //   moved here
  resetPixelCache();
  // since the linewidth is divided by 2 on each pass, start with a multiple
  //   of a power of 2.  this way, we end up at the desired pixel size ("line width")
  let startLineWidth = windowCalc.algorithm == "basic-float" ?
    Math.round(historyParams.lineWidth) * 32
    :
    Math.round(historyParams.lineWidth) * 128;
  while (startLineWidth > 300) {
    startLineWidth /= 2;
  }
  const workerCalc = {};
  workerCalc.plot = windowCalc.plotName;
  workerCalc.eachPixUnits = windowCalc.eachPixUnits;
  workerCalc.eachPixUnitsM = windowCalc.eachPixUnitsM;
  workerCalc.leftEdge = windowCalc.leftEdge;
  workerCalc.rightEdge = windowCalc.rightEdge;
  workerCalc.topEdge = windowCalc.topEdge;
  workerCalc.bottomEdge = windowCalc.bottomEdge;
  workerCalc.leftEdgeM = windowCalc.leftEdgeM;
  workerCalc.rightEdgeM = windowCalc.rightEdgeM;
  workerCalc.topEdgeM = windowCalc.topEdgeM;
  workerCalc.bottomEdgeM = windowCalc.bottomEdgeM;
  workerCalc.n = windowCalc.n;
  workerCalc.precision = precision;
  workerCalc.algorithm = windowCalc.algorithm;
  workerCalc.startWidth = startLineWidth;
  workerCalc.finalWidth = Math.round(historyParams.lineWidth);
  workerCalc.canvasWidth = dContext.canvas.width;
  workerCalc.canvasHeight = dContext.canvas.height;
  workerCalc.workers = workersCount;
  workerCalc.plotId = windowCalc.plotId;

  windowCalc.worker.postMessage({"t": "worker-calc", "v": workerCalc});
}

var resetGradientInput = function() {
  inputGradGrad.value = historyParams.gradient;
  updateGradientPreview();
};

btnGradGo.addEventListener("click", function() {
  try {
    buildGradient(inputGradGrad.value);
    historyParams.gradient = inputGradGrad.value;
    hideGradientError();
    if (isCurrentPlotAWindowPlot()) {
      // save the user's last entered gradient into the "custom" gradient
      windowPlotGradients[windowPlotGradients.length-1].gradient = historyParams.gradient;
      setupGradientSelectControl(windowPlotGradients);
      recolor();
    } else {
      sequencePlotGradients[sequencePlotGradients.length-1].gradient = historyParams.gradient;
      setupGradientSelectControl(sequencePlotGradients);
      redraw();
    }
  } catch (e) {
    displayGradientError(e);
  }
});
btnGradReset.addEventListener("click", resetGradientInput);

inputGradGrad.addEventListener("change", updateGradientPreview);
inputGradGrad.addEventListener("input", updateGradientPreview);
inputGradGrad.addEventListener("propertychange", updateGradientPreview);
inputGradGrad.addEventListener("paste", updateGradientPreview);

function updateGradientPreview() {
  try {
    const gradient = buildGradientObj(inputGradGrad.value);
    hideGradientError();
    gradCanvas.width = gradCanvas.offsetWidth;
    gradCanvas.height = gradCanvas.offsetHeight;
    const w = gradCanvas.width;
    const h = gradCanvas.height;
    // before the gradient controls are actually opened by the user
    //   for the first time, the canvas has zero width and height,
    //   so for that situtation we don't need to build and draw
    //   the gradient
    if (w === 0 || h === 0) {
      return;
    }
    for (let i = 0; i <= w; i++) {
      gradCtx.fillStyle = applyBuiltGradient(gradient, i/w);
      // for some reason, when starting with i of 0, we end up
      //   with a blank (white) pixel on the far left of the
      //   canvas.  this is fixed by drawing the first vertical
      //   line at x=-1
      gradCtx.fillRect(i-1, 0, 1, h);
    }
  } catch (e) {
    displayGradientError(e);
  }
}

gradControlsDetails.addEventListener("toggle", function() {
  if (gradControlsDetails.open) {
    updateGradientPreview();
  }
});

function displayGradientError(e) {
  gradError.style.display = "";
  gradError.innerHTML = e.toString();
  gradCanvasRow.style.display = "none";
}

function hideGradientError() {
  gradError.innerHTML = "";
  gradError.style.display = "none";
  gradCanvasRow.style.display = "";
}

autoResizeCb.addEventListener("change", function() {
  autoResize = autoResizeCb.checked;
  if (autoResize) {
    resizeCanvas();
  }
});
autoResizeCb.checked = autoResize;

const windowCalcStages = {
  drawCalculatingNotice: "draw-calculating-notice",
  calculateReferenceOrbit: "calculate-reference-orbit",
  calculateChunks: "calculate-chunks",
  doNextChunk: "next-chunk",
  cleanUpWindowCache: "clean-up-window-cache",
  stop: "stop"
};

// the main window plot drawing loop, called repeatedly by setInterval()
//function waitAndDrawWindow() {
function windowDrawLoop() {
  //console.log("windowDrawLoop() at " + new Error().stack.split('\n')[1]);

  if (windowCalc.stage === windowCalcStages.drawCalculatingNotice) {
    drawCalculatingNoticeOld(fitSizeContext);
    // if line width just finished is greater than the param lineWidth,
    //   we have to do it again
    // otherwise, we are done so do cleanup/end-of-image stuff
    windowCalc.stage = windowCalcStages.calculateReferenceOrbit;

  } else if (windowCalc.stage === windowCalcStages.calculateReferenceOrbit) {
    if (windowCalc.algorithm.startsWith("perturb-")) {
      calculateReferenceOrbit();
    } else {
      windowCalc.referencePx = null;
      windowCalc.referencePy = null;
      windowCalc.referenceOrbit = null;
    }
    windowCalc.stage = windowCalcStages.calculateChunks;

  } else if (windowCalc.stage === windowCalcStages.calculateChunks) {
    calculateWindowPassChunks();
    windowCalc.stage = windowCalcStages.doNextChunk;

  } else if (windowCalc.stage === windowCalcStages.doNextChunk) {
    const isPassFinished = calculateAndDrawNextChunk();

    if (isPassFinished) {
      // log timing of this pass (a single lineWidth)
      if (windowLogTiming) {
        windowCalc.totalTimeMs += windowCalc.passTimeMs;
        let cachedPct = Math.round(windowCalc.cachedPoints * 10000.0 / windowCalc.totalPoints) / 100.0;
        console.log("computing [" + windowCalc.totalPoints + "] points of width [" + windowCalc.lineWidth + "], of which [" + windowCalc.cachedPoints + "] were cached (" + cachedPct + "%), took [" + windowCalc.passTimeMs + "] ms");
      }

      // if line width just finished is greater than the param lineWidth,
      //   we have to do it again
      // otherwise, we are done
      if (windowCalc.lineWidth > Math.round(historyParams.lineWidth)) {
        windowCalc.stage = windowCalcStages.calculateChunks;
      } else {
        if (windowLogTiming) {
          windowLogOverallImage();
          if (windowCalcRepeat > 1) {
            windowCalcRepeat -= 1;
            resetWindowCalcCache();
            redraw();
          } else if (windowCalcRepeat === 1) {
            windowCalcRepeat -= 1;
            windowAverageTiming();
          }
        }
        // draw image parameteres
        if (imageParametersCaption) {
          drawImageParameters();
        }
        // do a separate stage for cache cleaning so that the "Calculating..."
        //   notice is removed from the screen before cache cleaning starts
        //   (since cache cleaning is kind of slow, the "Calculating 99%"
        //   would stay visible during the cache cleaning)
        windowCalc.stage = windowCalcStages.cleanUpWindowCache;
      }
    }

  } else if (windowCalc.stage === windowCalcStages.cleanUpWindowCache) {
    cleanUpWindowCache();
    if (windowCalc.timeout != null) {
      window.clearTimeout(windowCalc.timeout);
    }

  // if the stage is not set (or set to "stop"), stop
  } else {
    if (windowCalc.timeout != null) {
      window.clearTimeout(windowCalc.timeout);
    }
  }
}

function calculateAndDrawNextChunk() {
  // in order to waste less time idle between chunks, do 8 chunks
  //   at a time (this may have to be adjusted for slower locations,
  //   like locations at much higher scales or higher max iterations)
  let isPassFinished = false;
  for (let i = 0; i < 8 && !isPassFinished; i++) {
    var nextXChunk = windowCalc.xPixelChunks.shift();
    isPassFinished = isPassComputationComplete();

    if (nextXChunk) {
      drawColorPoints(computeBoundPointsChunk(nextXChunk).points, Math.round(windowCalc.lineWidth));
      //previewImage = fullSizeScalePower == 0 ? windowCalc.pixelsImage : windowCalc.fitImage;
      previewImage = windowCalc.fitImage;
      previewImageOffsetX = 0;
      previewImageOffsetY = 0;
    }
  }
  // since the UI won't update unless idle, don't bother drawing
  //   the calculating notice between the above 8 chunks -- just
  //   do it once after all of them
  if (!isPassFinished) {
    drawCalculatingNoticeOld(fitSizeContext);
  }
  return isPassFinished;
}

function windowLogOverallImage() {
  windowCalc.endTimeMs = Date.now();
  const overallTimeMs = windowCalc.endTimeMs - windowCalc.startTimeMs;
  windowCalc.runtimeMs = overallTimeMs;
  // output overall timing info
  console.log("COMPLETED image [" +
    "w:" + dCanvas.width + ", " +
    "h:" + dCanvas.height + ", " +
    "lineWidth:" + Math.round(historyParams.lineWidth) + ", " +
    "n:" + historyParams.n + ", " +
    "centerX:" + infNumToString(infNumTruncateToLen(historyParams.centerX, precision)) + ", " +
    "centerY:" + infNumToString(infNumTruncateToLen(historyParams.centerY, precision)) + ", " +
    "scale:" + infNumToString(infNumTruncateToLen(historyParams.scale, precision)) +
    "] took: " +
    "[" + overallTimeMs + "] ms of overall time, " +
    "[" + windowCalc.totalTimeMs + "] ms of compute/draw time, " +
    "[" + (overallTimeMs - windowCalc.totalTimeMs) + "] ms of idle/wait time");
  windowCalcTimes.push(overallTimeMs);
}

function windowAverageTiming() {
  let maxTime = 0;
  let minTime = 0;
  if (windowCalcTimes.length > 4) {
    for (let i = 0; i < windowCalcTimes.length; i++) {
      if (windowCalcTimes[i] > maxTime) {
        maxTime = windowCalcTimes[i];
      }
      if (minTime == 0 || windowCalcTimes[i] < minTime) {
        minTime = windowCalcTimes[i];
      }
    }
  }
  let sum = 0;
  let num = 0;
  for (let i = 0; i < windowCalcTimes.length; i++) {
    if (windowCalcTimes[i] == maxTime || windowCalcTimes[i] == minTime) {
      continue;
    }
    sum += windowCalcTimes[i];
    num++;
  }
  if (num > 0) {
    windowCalc.avgRuntimeMs = (sum/num);
    console.log("excluding max [" + maxTime + "] and min [" + minTime + "], the average overall time of [" + num + "] images was [" + windowCalc.avgRuntimeMs + "] ms");
  }
}

function drawColorPointsFitOnlyNoCache(windowPoints, pixelSize) {
  // change URL bar to reflect current params, only if no params change
  //   for 1/4 second
  if (replaceStateTimeout != null) {
    window.clearTimeout(replaceStateTimeout);
  }
  replaceStateTimeout = window.setTimeout(replaceHistory, 250);

  //const pixelSize = Math.round(windowCalc.lineWidth);
  //const canvas = dContext.canvas;
  const width = fitSizeCanvas.width;
  const height = fitSizeCanvas.height;
  const imageData = fullSizeScalePower == 0 ? windowCalc.pixelsImage : windowCalc.fitImage;
  //const context = fullSizeScalePower == 0 ? dContext : fitSizeContext;
  const context = fitSizeContext
  const fitImage = windowCalc.fitImage;
  const bgColor = getBgColor(false);
  let pointColor = null;
  for (let i = 0; i < windowPoints.length; i++) {
    // use lineWidth param as "resolution":
    //   1 = 1  pixel  drawn per point
    //   2 = 2  pixels drawn per point
    //  10 = 10 pixels drawn per point
    const resX = windowPoints[i].px.x;
    const resY = windowPoints[i].px.y;
    const colorPct = windowPoints[i].px.c;
    // just completely skip points with this special color "value"
    if (colorPct == windowCalcIgnorePointColor) {
      continue;
    } else if (colorPct == windowCalcBackgroundColor) {
      pointColor = bgColor;
    } else {
      pointColor = applyBuiltGradient(builtGradient, colorPct, false);
    }
    let pixelOffsetInImage = 0;
    let pixX, pixY;
    for (let x = 0; x < pixelSize; x++) {
      pixX = resX + x;
      // there may be a more efficient way to break early when pixels
      //   would extend beyond the edge of the canvas, other than
      //   checking every single pixel
      if (pixX >= width) {
        break;
      }
      for (let y = 0; y < pixelSize; y++) {
        pixY = resY + y;
        // there may be a more efficient way to break early when pixels
        //   would extend beyond the edge of the canvas, other than
        //   checking every single pixel
        if (pixY >= height) {
          break;
        }
        pixelOffsetInImage = ((pixY * width) + pixX) * 4;
        imageData.data[pixelOffsetInImage+0] = pointColor.r;
        imageData.data[pixelOffsetInImage+1] = pointColor.g;
        imageData.data[pixelOffsetInImage+2] = pointColor.b;
        imageData.data[pixelOffsetInImage+3] = 255; // alpha
      }
    }
  }
  context.putImageData(imageData, 0, 0);
}

function drawColorPoints(windowPoints, pixelSize) {
  // change URL bar to reflect current params, only if no params change
  //   for 1/4 second
  if (replaceStateTimeout != null) {
    window.clearTimeout(replaceStateTimeout);
  }
  replaceStateTimeout = window.setTimeout(replaceHistory, 250);

  //const pixelSize = Math.round(windowCalc.lineWidth);
  const canvas = dContext.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const pixelsImage = windowCalc.pixelsImage;
  const fitWidth = fitSizeCanvas.width;
  const fitImage = windowCalc.fitImage;
  const bgColor = getBgColor(false);
  let pointColor = null;
  let pixX, pixY, fitPixX, fitPixY;
  let pixelOffsetInImage = 0;
  let fitPixOffset = 0;
  for (let i = 0; i < windowPoints.length; i++) {
    // use lineWidth param as "resolution":
    //   1 = 1  pixel  drawn per point
    //   2 = 2  pixels drawn per point
    //  10 = 10 pixels drawn per point
    const resX = windowPoints[i].px.x;
    const resY = windowPoints[i].px.y;
    let lastFitPixX = 31 << 26;
    let lastFitPixY = 31 << 26;
    //let lastFitPixOffset = 31 << 26;
    const colorPct = windowPoints[i].px.c;
    // just completely skip points with this special color "value"
    if (colorPct == windowCalcIgnorePointColor) {
      continue;
    } else if (colorPct == windowCalcBackgroundColor) {
      pointColor = bgColor;
    } else {
      pointColor = applyBuiltGradient(builtGradient, colorPct, false);
    }
    
    //let fitOffsetInImage = 0;
    for (let x = 0; x < pixelSize; x++) {
      pixX = resX + x;
      // there may be a more efficient way to break early when pixels
      //   would extend beyond the edge of the canvas, other than
      //   checking every single pixel
      if (pixX >= width) {
        break;
      }
      fitPixX = pixX >> fullSizeScalePower;
      for (let y = 0; y < pixelSize; y++) {
        pixY = resY + y;
        // there may be a more efficient way to break early when pixels
        //   would extend beyond the edge of the canvas, other than
        //   checking every single pixel
        if (pixY >= height) {
          break;
        }
        pixelOffsetInImage = ((pixY * width) + pixX) * 4;
        //pixelOffsetInImage = ((pixY * width) + pixX) << 2;
        pixelsImage.data[pixelOffsetInImage+0] = pointColor.r;
        pixelsImage.data[pixelOffsetInImage+1] = pointColor.g;
        pixelsImage.data[pixelOffsetInImage+2] = pointColor.b;
        pixelsImage.data[pixelOffsetInImage+3] = 255; // alpha
        windowCalc.pixelCache[pixX][pixY] = colorPct;
        if (fullSizeScalePower == 0) {
          continue;
        }
        //fitPixOffset = pixelOffsetInImage >> fullSizeScalePowerDouble;
        //let shortcutOffsetSave = fitPixOffset;
        fitPixY = pixY >> fullSizeScalePower;
        if (fitPixY == lastFitPixY && fitPixX == lastFitPixX) {
        //if (fitPixOffset == lastFitPixOffset) {
          continue;
        }
        lastFitPixX = fitPixX;
        lastFitPixY = fitPixY;
        //lastFitPixOffset = fitPixOffset;
        fitPixOffset = ((fitPixY * fitWidth) + fitPixX) * 4;
        //fitPixOffset = ((fitPixY * fitWidth) + fitPixX) << 2;
        //console.log("diff correct - shortcut = " + (fitPixOffset-shortcutOffsetSave));
        fitImage.data[fitPixOffset+0] = pointColor.r;
        fitImage.data[fitPixOffset+1] = pointColor.g;
        fitImage.data[fitPixOffset+2] = pointColor.b;
        fitImage.data[fitPixOffset+3] = 255; // alpha
      }
    }
  }
  // doing putImageData() on both images is too time-consuming,
  //   and especially since the pixelsImage may be several times
  //   larger than the fitImage, and since the user doesn't actually
  //   see the pixelsImage (until downloading it) we don't need to
  //   draw the pixelsImage on the invisible dContext
  //dContext.putImageData(pixelsImage, 0, 0);
  if (fullSizeScalePower == 0) {
    fitSizeContext.putImageData(pixelsImage, 0, 0);
  } else {
    fitSizeContext.putImageData(fitImage, 0, 0);
  }
}

function recolor() {
  if (replaceStateTimeout != null) {
    window.clearTimeout(replaceStateTimeout);
  }
  // ensure this gradient is inserted into the URL bar
  replaceStateTimeout = window.setTimeout(replaceHistory, 250);
  resetGradientInput();
  const fitWidth = fitSizeCanvas.width;
  const width = dCanvas.width;
  const height = dCanvas.height;
  const bgColor = getBgColor(false);
  let colorPct = -2;
  let color = null;
  let pixelOffsetInImage = null;
  let fitOffset, fitX, fitY;
  let lastFitY = 31 << 26;
  let lastFitX = 31 << 26;
  for (let x = 0; x < width; x++) {
    fitX = x >> fullSizeScalePower;
    for (let y = 0; y < height; y++) {
      colorPct = windowCalc.pixelCache[x][y];
      if (colorPct === undefined || colorPct == windowCalcIgnorePointColor) {
        continue;
      }
      if (colorPct == windowCalcBackgroundColor) {
        color = bgColor;
      } else {
        color = applyBuiltGradient(builtGradient, colorPct, false);
      }
      pixelOffsetInImage = ((y * width) + x) * 4;
      windowCalc.pixelsImage.data[pixelOffsetInImage+0] = color.r;
      windowCalc.pixelsImage.data[pixelOffsetInImage+1] = color.g;
      windowCalc.pixelsImage.data[pixelOffsetInImage+2] = color.b;
      windowCalc.pixelsImage.data[pixelOffsetInImage+3] = 255; // alpha
      if (fullSizeScalePower == 0) {
        continue;
      }
      fitY = y >> fullSizeScalePower;
      if (fitY == lastFitY && fitX == lastFitX) {
        continue;
      }
      lastFitX = fitX;
      lastFitY = fitY;
      fitOffset = ((fitY * fitWidth) + fitX) * 4;
      windowCalc.fitImage.data[fitOffset+0] = color.r;
      windowCalc.fitImage.data[fitOffset+1] = color.g;
      windowCalc.fitImage.data[fitOffset+2] = color.b;
      windowCalc.fitImage.data[fitOffset+3] = 255; // alpha
    }
  }
  //dContext.putImageData(windowCalc.pixelsImage, 0, 0);
  if (fullSizeScalePower == 0) {
    fitSizeContext.putImageData(windowCalc.pixelsImage, 0, 0);
  } else {
    fitSizeContext.putImageData(windowCalc.fitImage, 0, 0);
  }
}

function repaintOnly() {
  if (plotsByName[historyParams.plot].calcFrom == "sequence") {
    drawPointsFitSize();
  } else {
    if (fullSizeScalePower == 0) {
      fitSizeContext.putImageData(windowCalc.pixelsImage, 0, 0);
    } else {
      fitSizeContext.putImageData(windowCalc.fitImage, 0, 0);
    }
  }
}

function drawPreviewImage() {
  fillBg(fitSizeContext);
  if (previewImage !== null) {
    fitSizeContext.putImageData(previewImage, previewImageOffsetX, previewImageOffsetY);
  }
}

function drawCalculatingNotice(ctx, pixelSize, percentComplete, workersNow) {
  const canvas = ctx.canvas;
  ctx.fillStyle = "rgba(100,100,100,1.0)";
  const noticeHeight = Math.max(24, canvas.height * 0.03);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 24);
  ctx.fillRect(0,canvas.height-noticeHeight,noticeWidth, noticeHeight);
  ctx.font = textHeight + "px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  const workersText = workersNow + " worker" + (workersNow > 1 ? "s" : "");
  ctx.fillText("Calculating " + pixelSize + "-wide pixels (" + percentComplete + "%) with " + workersText + " ...", Math.round(noticeHeight*0.2), canvas.height - Math.round(noticeHeight* 0.2));
}

function drawStatusNotice(ctx, message) {
  const canvas = ctx.canvas;
  ctx.fillStyle = "rgba(100,100,100,1.0)";
  const noticeHeight = Math.max(24, canvas.height * 0.03);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 24);
  ctx.fillRect(0,canvas.height-noticeHeight,noticeWidth, noticeHeight);
  ctx.font = textHeight + "px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillText(message + " ...", Math.round(noticeHeight*0.2), canvas.height - Math.round(noticeHeight* 0.2));
}

function drawStartingPassNotice() {
  const ctx = fitSizeContext;
  const canvas = fitSizeCanvas;
  ctx.fillStyle = "rgba(100,100,100,1.0)";
  const noticeHeight = Math.max(24, canvas.height * 0.03);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 24);
  ctx.fillRect(0,canvas.height-noticeHeight,noticeWidth, noticeHeight);
  ctx.font = textHeight + "px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillText("Starting next pass ...", Math.round(noticeHeight*0.2), canvas.height - Math.round(noticeHeight* 0.2));
}

function redrawMousePosNotice() {
  drawMousePosNotice(mouseNoticePosX, mouseNoticePosY);
}

function drawMousePosNotice(x, y) {
  mouseNoticePosX = x;
  mouseNoticePosY = y;
  const canvas = fitSizeCanvas;
  const ctx = fitSizeContext;
  const noticeHeight = Math.max(16, canvas.height * 0.03);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 18);
  const lines = [];
  const lineValLengthLimit = 22;
  let imaginaryCoordinates = false;
  if ("usesImaginaryCoordinates" in plotsByName[historyParams.plot].privContext) {
    imaginaryCoordinates = plotsByName[historyParams.plot].privContext.usesImaginaryCoordinates;
  }
  let usingFloat = true;
  if (historyParams.plot.startsWith("Mandelbrot") && windowCalc.algorithm != "basic-float") {
    usingFloat = false;
  }
  let xVal = null;
  let yVal = null;
  if (usingFloat) {
    xVal = infNumToFloat(x).toString();
    yVal = infNumToFloat(y).toString();
  } else {
    xVal = infNumToString(infNumTruncateToLen(x, precision));
    yVal = infNumToString(infNumTruncateToLen(y, precision));
  }
  let entries = [
    ["x", xVal],
    ["y", yVal + (imaginaryCoordinates ? "i" : "")]
  ];
  for (let i = 0; i < entries.length; i++) {
    const entryLabel = entries[i][0];
    let entryValue = entries[i][1];
    lines.push(entryLabel + ": " + entryValue.substring(0,lineValLengthLimit));
    while (entryValue.length > lineValLengthLimit) {
      entryValue = entryValue.substring(lineValLengthLimit);
      lines.push("   " + entryValue.substring(0,lineValLengthLimit));
    }
  }
  ctx.font = textHeight + "px monospace";
  for (let i = lines.length - 1, j = 0; i >= 0; i--, j++) {
    ctx.fillStyle = "rgba(100,100,100,1.0)";
    ctx.fillRect(0, canvas.height - (noticeHeight * (j+2)), noticeWidth, noticeHeight);
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillText(lines[i], Math.round(noticeHeight*0.2), canvas.height - (noticeHeight * (j+1)) - Math.round(noticeHeight* 0.2));
  }
}

function drawImageParameters() {
  const canvas = fitSizeCanvas;
  const ctx = fitSizeContext;
  const lineValLengthLimit = 26;
  const noticeHeight = Math.max(16, canvas.height * 0.01);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * lineValLengthLimit * 0.9);
  const lines = [];
  let entries = [
    [" x (re)", infNumExpString(historyParams.centerX)],
    [" y (im)", infNumExpString(historyParams.centerY)],
    [" magnif", infNumExpString(historyParams.mag)],
    ["  scale", infNumExpString(historyParams.scale)],
    ["   iter", historyParams.n.toString()],
    ["   grad", historyParams.gradient],
    ["  bgclr", historyParams.bgColor],
    ["workers", windowCalc.workersCountRange]
  ];
  entries.push(["   algo", windowCalc.algorithm]);
  entries.push(["sig dig", precision.toString()]);
  if (windowCalc.saItersSkipped !== null) {
    entries.push(["sa skip", windowCalc.saItersSkipped.toString()]);
  }
  if (windowCalc.runtimeMs > 0) {
    entries.push([" run ms", windowCalc.runtimeMs.toString()]);
  }
  if (windowCalc.avgRuntimeMs > 0) {
    entries.push([" avg ms", windowCalc.avgRuntimeMs.toString()]);
  }
  for (let i = 0; i < entries.length; i++) {
    const entryLabel = entries[i][0];
    let entryValue = entries[i][1];
    lines.push(entryLabel + ": " + entryValue.substring(0,lineValLengthLimit));
    while (entryValue.length > lineValLengthLimit) {
      entryValue = entryValue.substring(lineValLengthLimit);
      lines.push("         " + entryValue.substring(0,lineValLengthLimit));
    }
  }
  ctx.font = textHeight + "px monospace";
  for (let i = lines.length - 1, j = 0; i >= 0; i--, j++) {
    ctx.fillStyle = "rgba(100,100,100,1.0)";
    ctx.fillRect(canvas.width - noticeWidth, canvas.height - (noticeHeight * (j+1)), noticeWidth, noticeHeight);
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillText(lines[i], canvas.width - noticeWidth + Math.round(noticeHeight*0.2), canvas.height - (noticeHeight * j) - Math.round(noticeHeight* 0.2));
  }
}

function drawSequencePointsData(infoPoints, mouseX, mouseY) {
  const canvas = fitSizeCanvas;
  const ctx = fitSizeContext;
  // for now, put this info toward the top left of screen
  //   (will be centered on phone screens)
  const noticeOffsetLeft = canvas.width * 0.25;
  const noticeHeight = Math.max(16, canvas.height * 0.03);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 18);
  const lines = [];
  const lineValLengthLimit = 19;

  let firstEntry = true;
  let entries = [];
  for (let i = 0; i < infoPoints.length; i++) {
    if (firstEntry) {
      let coords = "(" + infoPoints[i].x + "," + infoPoints[i].y + ")";
      entries.push([coords, ""]);
      firstEntry = false;
    }
    //let spaces = new Array(coords.length).fill(" ").join("");
    //let firstKey = true;
    for (let key in infoPoints[i].v) {
      entries.push(["  " + key, infoPoints[i].v[key].toString()]);
      //firstKey = false;
    }
  }
  for (let i = 0; i < entries.length; i++) {
    const entryLabel = entries[i][0];
    const entryValLengthLimit = lineValLengthLimit - entryLabel.length;
    let entryValue = entries[i][1];
    lines.push(entryLabel + ": " + entryValue.substring(0,entryValLengthLimit));
    while (entryValue.length > entryValLengthLimit) {
      entryValue = entryValue.substring(entryValLengthLimit);
      lines.push(new Array(entryLabel.length+2).fill(" ").join("") + entryValue.substring(0,entryValLengthLimit));
    }
  }
  ctx.font = textHeight + "px monospace";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = "rgba(100,100,100,1.0)";
    ctx.fillRect(noticeOffsetLeft, (noticeHeight * (i)), noticeWidth, noticeHeight);
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillText(lines[i], noticeOffsetLeft + Math.round(noticeHeight*0.2), (noticeHeight * (i+1)) - Math.round(noticeHeight* 0.2));
  }
  ctx.beginPath();
  const scale = infNumToFloat(historyParams.scale) / fullSizeScaleFactor;
  const circleX = (infoPoints[0].x - windowCalc.leftEdgeFloat) * scale;
  const circleY = (windowCalc.topEdgeFloat - infoPoints[0].y) * scale;
  ctx.lineWidth = 4.0;
  ctx.strokeStyle = "rgb(25,25,25)";
  ctx.arc(circleX, circleY, 20, 0, 2 * Math.PI, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = "rgb(230,230,230)";
  ctx.arc(circleX, circleY, 20, 0, 2 * Math.PI, false);
  ctx.stroke();
}

// take the visible number of pixels
// pan the given percent of pixels
function panPercentOfPixels(isHorizontal, nPercent) {
  const dimensionPixels = isHorizontal ? dCanvas.width : dCanvas.height;
  // use Math.round()! make sure we move in an exact multiple of the
  //   pixel size, in order to re-use previously cached pixels after the move
  const pixelsToPan = Math.round(dimensionPixels * nPercent);
  const unitsToPan = infNumMul(createInfNum(pixelsToPan.toString()), windowCalc.eachPixUnits);
  if (isHorizontal) {
    historyParams.centerX = infNumAdd(historyParams.centerX, unitsToPan);
    previewImageOffsetX -= pixelsToPan / fullSizeScaleFactor;
  } else {
    historyParams.centerY = infNumAdd(historyParams.centerY, unitsToPan);
    previewImageOffsetY += pixelsToPan / fullSizeScaleFactor;
  }
}

function applyParamPercent(fieldName, pctStr) {
  if (! fieldName in historyParams) {
    console.log("unknown params field [" + fieldName + "]");
    return;
  }
  const pct = createInfNum(pctStr);
  if (infNumLe(pct, infNum(0n, 0n))) {
    console.log("cannot apply a zero or negative percentage to field [" + fieldName + "]");
    return;
  }
  const newVal = infNumMul(historyParams[fieldName], pct);
  historyParams[fieldName] = newVal;
}

function sanityCheckLineWidth(w, circular, plot) {
  // window plots use lineWidth to determine how many pixels to
  //  display for each calculated pixel, so allow larger values
  //  for that
  if (plot.calcFrom == "window") {
    let newW = Math.round(w);
    if (newW > 64) {
      if (circular) {
        return 1;
      } else {
        return 64;
      }
    } else if (newW < 1) {
      return 1;
    }
    return newW;
  } else {
    if (w > 20.0) {
      if (circular) {
        return 0.5;
      } else {
        return 20.0;
      }
    } else if (w < 0.5) {
      return 0.5;
    }
    return w;
  }
}

function convertPixelPosToPlanePos(x, y) {
  let pixX = infNum(BigInt(x*fullSizeScaleFactor), 0n);
  let pixY = infNum(BigInt(y*fullSizeScaleFactor), 0n);
  // this all works, to re-compute left/top edges here
  //const canvasWidth = createInfNum(dCanvas.width.toString());
  //const canvasHeight = createInfNum(dCanvas.height.toString());
  //const leftEdge = infNumSub(historyParams.centerX, infNumDiv(infNumDiv(canvasWidth, two), historyParams.scale));
  //const topEdge = infNumSub(historyParams.centerY, infNumDiv(infNumDiv(canvasHeight, two), historyParams.scale));
  //const posX = infNumAdd(infNumDiv(pixX, historyParams.scale), leftEdge);
  //const posY = infNumAdd(infNumDiv(pixY, historyParams.scale), topEdge);
  // these do work, using pre-computed left/top edges
  let posX = infNumAdd(infNumDiv(pixX, historyParams.scale, precision), windowCalc.leftEdge);
  let posY = infNumSub(windowCalc.topEdge, infNumDiv(pixY, historyParams.scale, precision));
  return {x: posX, y:posY};
}

function findClosestSequencePoints(x, y) {
  if (points === null || points.length === 0) {
    return [];
  }
  let closestPoint = points[0];
  let closestPoints = [closestPoint];
  // if the first point's data "v"alue property has a "none" as a key, it
  //   is explicitly non-selectable/annotatable so we'll skip it 
  if (points.length > 1 && closestPoint.v.hasOwnProperty("none")) {
    closestPoint = points[1];
    closestPoints = [closestPoint];
  }
  // since we're comparing hypotenuses of right triangles, we don't actually
  //   need to take the square roots (don't use Math.hypot())
  let closestPointDist = Math.pow(closestPoint.x - x, 2) + Math.pow(closestPoint.y - y, 2);
  let pointDist = null;
  for (let i = 2; i < points.length; i++) {
    // square the x distance (for most points, we can skip squaring the y entirely)
    pointDist = Math.pow(points[i].x-x, 2);
    // if the x distance squared is small, add the y distance squared
    if (pointDist <= closestPointDist) {
      pointDist += Math.pow(points[i].y - y, 2);
      // if the point's data "v"alue property has a "none" as a key, it
      //   is explicitly non-selectable/annotatable so we'll skip it 
      if (points[i].v.hasOwnProperty("none")) {
        continue;
      }
      if (pointDist < closestPointDist) {
        closestPoint = points[i];
        closestPoints = [closestPoint];
        closestPointDist = pointDist;
      } else if (pointDist === closestPointDist) {
        closestPoints.push(points[i]);
      }
    }
  }
  // allow clicks relatively far away from all points to return none at all
  if (closestPointDist > Math.pow((dCanvas.width / infNumToFloat(historyParams.scale)) * 0.07, 2)) {
    closestPoints = [];
  } else if (closestPoints[0].v.hasOwnProperty("none")) {
    closestPoints.shift();
  }
  return closestPoints;
}

function drawAnnotationAtPixelPosition(x, y) {
  if (plotsByName[historyParams.plot].calcFrom == "sequence") {
    let pos = convertPixelPosToPlanePos(x, y);
    // for non-window plots, we should always be able to use floating point math
    const posXFloat = infNumToFloat(pos.x);
    const posYFloat = infNumToFloat(pos.y);
    const closestPoints = findClosestSequencePoints(posXFloat, posYFloat);
    // since we know the plot is a sequence, we can force a re-draw
    //   here without calling a full "redraw()"
    // even if we have no closestPoints, we still want to re-draw
    //   because we might be clearing away an old annotation
    drawPointsFitSize();
    if (closestPoints.length === 0) {
      return;
    }
    drawSequencePointsData(closestPoints, x, y);
  } else {
    // we may want to annotate each pixel in window plots as well
  }
}

window.addEventListener("keyup", function(e) {
  if (e.key == "Shift" || e.keyCode == 16) {
    shiftPressed = false;
  } else if (
      e.key == "Meta"    || e.keyCode == 224 ||
      e.key == "Alt"     || e.keyCode == 18 ||
      e.key == "Control" || e.keyCode == 17) {
    commandPressed = false;
  }
});

var dispatchCorrespondingKeydownEvent = function(e) {
  let keyName = e.target.id.substring(4);
  let keyEvent = new KeyboardEvent('keydown', {key: keyName,});
  window.dispatchEvent(keyEvent);
};

// when a key cap in the help menu is clicked, actually fire the key event as if
//   that key was pressed -- this allows devices without a keyboard (mobile)
//   to do everything a keyboard user can
const kbdElements = document.getElementsByTagName("kbd");
for (let i = 0; i < kbdElements.length; i++) {
  if (kbdElements[i].id.startsWith("kbd-")) {
    kbdElements[i].addEventListener("click", dispatchCorrespondingKeydownEvent);
  }
}

// thanks to https://stackoverflow.com/a/3396805/259456
window.addEventListener("keydown", function(e) {
  if (textInputHasFocus()) {
    return;
  }
  //console.log(e.type + " - keycode:" + e.keyCode + " key:" + e.key);

  // for keys that change the number of points or the position of points, use
  //start();
  // otherwise, use
  //drawPoints(historyParams);

  if (e.keyCode == 16 || e.key == "Shift") {
    shiftPressed = true;
  } else if (
      e.key == "Meta"    || e.keyCode == 224 ||
      e.key == "Alt"     || e.keyCode == 18 ||
      e.key == "Control" || e.keyCode == 17) {
    commandPressed = true;
  } else if (e.keyCode == 39 || e.key == "ArrowRight") {
    panPercentOfPixels(true, -0.01);
    redraw();
  } else if (e.keyCode == 68 || e.key == "d" || e.key == "D") {
    panPercentOfPixels(true, -0.1);
    redraw();
  } else if (e.keyCode == 37 || e.key == "ArrowLeft") {
    panPercentOfPixels(true, 0.01);
    redraw();
  } else if (e.keyCode == 65 || e.key == "a" || e.key == "A") {
    panPercentOfPixels(true, 0.1);
    redraw();
  } else if (e.keyCode == 38 || e.key == "ArrowUp") {
    panPercentOfPixels(false, 0.01);
    redraw();
  } else if (e.keyCode == 87 || e.key == "w" || e.key == "W") {
    panPercentOfPixels(false, 0.1);
    redraw();
  } else if (e.keyCode == 40 || e.key == "ArrowDown") {
    panPercentOfPixels(false, -0.01);
    redraw();
  } else if (e.keyCode == 83 || e.key == "s" || e.key == "S") {
    panPercentOfPixels(false, -0.1);
    redraw();
  } else if (e.keyCode == 61 || e.keyCode == 107 || e.key == "+") {
    // command/control and plus does browser zoom, so don't do anything on this combination
    if (!commandPressed) {
      applyParamPercent("scale", "1.01");
      redraw();
    }
  } else if (e.keyCode == 173 || e.keyCode == 109 || e.key == "-") {
    // command/control and minus does browser zoom, so don't do anything on this combination
    if (!commandPressed) {
      applyParamPercent("scale", "0.99");
      if ("minScale" in plotsByName[historyParams.plot].privContext &&
          infNumLt(historyParams.scale, plotsByName[historyParams.plot].privContext.minScale)) {
        historyParams.scale = plotsByName[historyParams.plot].privContext.minScale;
      } else if (infNumLt(historyParams.scale, infNum(1n, -2n))) {
        historyParams.scale = createInfNum("0.01");
      }
      redraw();
    }
  } else if (e.keyCode == 69 || e.key == "e" || e.key == "E") {
    if (plotsByName[historyParams.plot].calcFrom == "sequence") {
      applyParamPercent("scale", "1.05");
    } else {
      applyParamPercent("scale", "10");
    }
    redraw();
  } else if (e.keyCode == 81 || e.key == "q" || e.key == "Q") {
    if (plotsByName[historyParams.plot].calcFrom == "sequence") {
      applyParamPercent("scale", "0.95");
    } else {
      applyParamPercent("scale", "0.1");
    }
    if ("minScale" in plotsByName[historyParams.plot].privContext &&
        infNumLt(historyParams.scale, plotsByName[historyParams.plot].privContext.minScale)) {
      historyParams.scale = plotsByName[historyParams.plot].privContext.minScale;
    } else if (infNumLt(historyParams.scale, infNum(1n, -2n))) {
      historyParams.scale = createInfNum("0.01");
    }
    redraw();
  } else if (e.keyCode == 67 || e.key == "c" || e.key == "C") {
    historyParams.centerX = createInfNum("0");
    historyParams.centerY = createInfNum("0");
    redraw();
  } else if (e.keyCode == 77 || e.key == "m" || e.key == "M") {
    if (plotsByName[historyParams.plot].calcFrom == "sequence") {
      historyParams.n += 500;
      start();
    } else {
      historyParams.n += 100;
      start();
    }
  } else if (e.keyCode == 78  || e.key == "n" || e.key == "N") {
    if (historyParams.n > 100) {
      historyParams.n -= 100;
      start();
    }
  } else if (e.keyCode == 86 || e.key == "v" || e.key == "V") {
    const gradients = plotsByName[historyParams.plot].calcFrom == "sequence" ? sequencePlotGradients : windowPlotGradients;
    let schemeNum = -1;
    for (let i = 0; i < gradients.length; i++) {
      if (gradients[i].gradient == historyParams.gradient) {
        schemeNum = i;
        break;
      }
    }
    schemeNum += 1;
    if (schemeNum >= gradients.length) {
      schemeNum = 0;
    }
    historyParams.gradient = gradients[schemeNum].gradient;
    setupGradientSelectControl(gradients);
    try {
      buildGradient(historyParams.gradient);
      hideGradientError();
    } catch (e) {
      displayGradientError(e);
    }
    if (plotsByName[historyParams.plot].calcFrom == "window") {
      recolor();
    } else {
      redraw();
    }
  } else if (e.keyCode == 66 || e.key == "b" || e.key == "B") {
    let schemeNum = -1;
    for (let i = 0; i < bgColorSchemeNames.length; i++) {
      if (bgColorSchemeNames[i] == historyParams.bgColor) {
        schemeNum = i;
        break;
      }
    }
    schemeNum += 1;
    if (schemeNum >= bgColorSchemeNames.length) {
      schemeNum = 0;
    }
    historyParams.bgColor = bgColorSchemeNames[schemeNum];
    if (plotsByName[historyParams.plot].calcFrom == "window") {
      recolor();
    } else {
      redraw();
    }
  } else if (e.keyCode == 88 || e.key == "x" || e.key == "X") {
    let plotNum = -1;
    for (let i = 0; i < plots.length; i++) {
      if (plots[i].name == historyParams.plot) {
        plotNum = i;
        break;
      }
    }
    plotNum += 1;
    if (plotNum >= plots.length) {
      plotNum = 0;
    }
    historyParams.plot = plots[plotNum].name;
    // for all plots, force application of their defaults
    let defaults = Object.assign(historyParams, plots[plotNum].forcedDefaults);
    replaceHistoryWithParams(defaults);
    parseUrlParams();
    start();
  } else if (e.keyCode == 90 || e.key == "z" || e.key == "Z") {
    if (plotsByName[historyParams.plot].calcFrom == "window") {
      historyParams.lineWidth = sanityCheckLineWidth(historyParams.lineWidth + 1, true, plotsByName[historyParams.plot]);
      // changing the lineWidth for a window plot means we need to re-calculate
      start();
    } else {
      historyParams.lineWidth = sanityCheckLineWidth(historyParams.lineWidth + 0.5, true, plotsByName[historyParams.plot]);
      redraw();
    }
  } else if (e.keyCode == 72 || e.key == "h" || e.key == "H") {
    if (helpVisible) {
      closeHelpMenu();
    } else {
      openHelpMenu();
    }
  } else if (e.keyCode == 79 || e.key == "o" || e.key == "O") {
    if (controlsVisible) {
      closeControlsMenu();
    } else {
      openControlsMenu();
    }
  } else if (e.keyCode == 80 || e.key == "p" || e.key == "P") {
    if (menuVisible) {
      closeMenu();
    } else {
      openMenu();
    }
  } else if (e.key == "r" || e.key == "R" || e.keyCode == 82) {
    showMousePosition = !showMousePosition;
    if (!showMousePosition) {
      repaintOnly();
      if (imageParametersCaption) {
        drawImageParameters();
      }
    }
  } else if (e.key == "t" || e.key == "T" || e.keyCode == 84) {
    imageParametersCaption = !imageParametersCaption;
    if (imageParametersCaption) {
      drawImageParameters();
    } else {
      repaintOnly();
    }
  } else if (e.key == "y" || e.key == "Y" || e.keyCode == 89) {
    if (workersCount > 1) {
      workersCount--;
    }
    workersSelect.value = workersCount;
    changeWorkersCount();
  } else if (e.key == "u" || e.key == "U" || e.keyCode == 85) {
    if (workersCount < maxWorkers) {
      workersCount++;
    }
    workersSelect.value = workersCount;
    changeWorkersCount();
  } else if (e.key == "Escape" || e.keyCode == 27) {
    if (!useWorkers) {
      windowCalc.stage = windowCalcStages.stop;
    }
    stopWorkers();
    repaintOnly();
  } else if (e.keyCode == 49 || e.keyCode == 97 || e.key == "1") {
    activatePreset(presets[0]);
  } else if (e.keyCode == 50 || e.keyCode == 98 || e.key == "2") {
    activatePreset(presets[1]);
  } else if (e.keyCode == 51 || e.keyCode == 99 || e.key == "3") {
    activatePreset(presets[2]);
  } else if (e.keyCode == 52 || e.keyCode == 100 || e.key == "4") {
    activatePreset(presets[3]);
  } else if (e.keyCode == 53 || e.keyCode == 101 || e.key == "5") {
    activatePreset(presets[4]);
  //} else if (e.keyCode == 57 || e.keyCode == 105 || e.key == "9") {
  }
});

function resizeCanvas() {
  if (!autoResize) {
    return;
  }
  setDScaleVars();
  redraw();
}

// re-draw if there's been a window resize and more than 500ms has elapsed
window.addEventListener("resize", function() {
  if (resizeTimeout !== null) {
    window.clearTimeout(resizeTimeout);
  }
  if (!autoResize) {
    console.log("ignoring window resize event");
    return;
  }
  resizeTimeout = window.setTimeout(resizeCanvas, 500);
});

// thanks to https://stackoverflow.com/a/11183333/259456 for
//   general ideas on pinch detection
var mouseDownHandler = function(e) {
  // this might help prevent strange ios/mobile weirdness
  e.preventDefault();
  // ignore right- and middle-click
  if ("button" in e && e.button != 0) {
    return;
  }
  if (shiftPressed) {
    let pixXFloat = Math.round(e.pageX - (fitSizeCanvas.width / 2));
    let pixYFloat = Math.round((fitSizeCanvas.height - e.pageY) - (fitSizeCanvas.height / 2));
    let pixX = infNum(BigInt(pixXFloat), 0n);
    let pixY = infNum(BigInt(pixYFloat), 0n);
    // make sure we move in an exact multiple of the pixel size, so
    //   that we can re-use previously-cached points
    let posX = infNumAdd(infNumMul(pixX, windowCalc.eachPixUnits), historyParams.centerX);
    let posY = infNumAdd(infNumMul(pixY, windowCalc.eachPixUnits), historyParams.centerY);
    historyParams.centerX = posX;
    historyParams.centerY = posY;
    previewImageOffsetX -= pixXFloat;
    previewImageOffsetY += pixYFloat;
    drawPreviewImage();
    redraw();
    return;
  }
  // if 2 or more fingers touched
  if ("touches" in e && "1" in e.touches) {
    pinch = true;
    pinchStartDist = Math.hypot(e.touches['0'].pageX - e.touches['1'].pageX, e.touches['0'].pageY - e.touches['1'].pageY);
  }
  mouseDrag = true;
  mouseDragX = e.pageX;
  mouseDragY = e.pageY;
};
fitSizeCanvas.addEventListener("mousedown", mouseDownHandler);
fitSizeCanvas.addEventListener("touchstart", mouseDownHandler);

var mouseMoveHandler = function(e) {
  // this might help prevent strange ios/mobile weirdness
  e.preventDefault();
  if (!mouseDrag) {
    if (showMousePosition) {
      let pos = convertPixelPosToPlanePos(e.pageX, e.pageY);
      drawMousePosNotice(pos.x, pos.y);
    }
    return;
  }

  // always mouse drag to perform pan, even if pinch zooming (it's nice
  //    to be able to pinch zoom and pan in one gesture)
  const newX = e.pageX;
  const newY = e.pageY;
  // make sure we move in an exact multiple of the pixel size
  //   in order to re-use previously cached pixels after the move
  const pixDiffX = (mouseDragX - newX) * fullSizeScaleFactor;
  const pixDiffY = (mouseDragY - newY) * fullSizeScaleFactor;
  const diffX = infNumMul(infNum(BigInt(pixDiffX), 0n), windowCalc.eachPixUnits);
  const diffY = infNumMul(infNum(BigInt(pixDiffY), 0n), windowCalc.eachPixUnits);
  historyParams.centerX = infNumAdd(historyParams.centerX, diffX);
  historyParams.centerY = infNumSub(historyParams.centerY, diffY);
  mouseDragX = newX;
  mouseDragY = newY;

  previewImageOffsetX -= pixDiffX / fullSizeScaleFactor;
  previewImageOffsetY -= pixDiffY / fullSizeScaleFactor;

  // if 2 or more fingers are touching, perform zoom
  if ("touches" in e && "1" in e.touches) {
    // calc some stuff to zoom in/out where pinch occurred
    const midX = (e.touches['0'].pageX + e.touches['1'].pageX) / 2;
    const midY = (e.touches['0'].pageY + e.touches['1'].pageY) / 2;
    const oldScale = historyParams.scale;
    // figure out percentage the fingers have moved closer/farther apart
    const pinchDuringDist = Math.hypot(e.touches['0'].pageX - e.touches['1'].pageX, e.touches['0'].pageY - e.touches['1'].pageY);
    const pinchRatio = pinchDuringDist / pinchStartDist;
    // updating this this is crucial to avoid way over-zooming
    pinchStartDist = pinchDuringDist;
    const newScale = infNumMul(historyParams.scale, createInfNum(pinchRatio.toString()));
    //if (newScale < 0.00005) {
    //  historyParams.scale = 0.00005;
    //} else if (newScale > 500) {
    //  historyParams.scale = 500.0;
    //} else {
    //  historyParams.scale = newScale;
    //}

    const maxSeqScale = createInfNum("500");
    const minSeqScale = createInfNum("0.00005");
    if (plotsByName[historyParams.plot].calcFrom == "sequence") {
      if (infNumLt(newScale, minSeqScale)) {
        historyParams.scale = minSeqScale;
      } else if (infNumGt(newScale, maxSeqScale)) {
        historyParams.scale = maxSeqScale;
      } else {
        historyParams.scale = newScale;
      }
    // for window plots, use full-precision scale
    } else {
      if ("minScale" in plotsByName[historyParams.plot].privContext &&
          infNumLt(newScale, plotsByName[historyParams.plot].privContext.minScale)) {
        return;
      }
      historyParams.scale = newScale;
    }

    // see "wheel" event below for explanation of centering the zoom in/out from the mouse/pinch point

    const newCenterX = calculateNewZoomCenterX(infNum(BigInt(midX*fullSizeScaleFactor), 0n), infNum(BigInt(dCanvas.width), 0n),  historyParams.centerX, oldScale, historyParams.scale);
    const newCenterY = calculateNewZoomCenterY(infNum(BigInt(midY*fullSizeScaleFactor), 0n), infNum(BigInt(dCanvas.height), 0n), historyParams.centerY, oldScale, historyParams.scale);
    historyParams.centerX = newCenterX;
    historyParams.centerY = newCenterY;
  }

  redraw();
};
fitSizeCanvas.addEventListener("mousemove", mouseMoveHandler);
fitSizeCanvas.addEventListener("touchmove", mouseMoveHandler);

var mouseUpHandler = function(e) {
  // this might help prevent strange ios/mobile weirdness
  e.preventDefault();
  mouseDrag = false;
  // apparently pinch zoom gestures don't really use touchend event, but it's
  //   a good time to end a pinch gesture
  pinch = false;
  if (annotateClickPosition) {
    drawAnnotationAtPixelPosition(e.pageX, e.pageY);
  }
};
fitSizeCanvas.addEventListener("mouseup", mouseUpHandler);
fitSizeCanvas.addEventListener("touchend", mouseUpHandler);

fitSizeCanvas.addEventListener("wheel", function(e) {
  // set 48 wheelDeltaY units as 5% zoom (in or out)
  // so -48 is 95% zoom, and +96 is 110% zoom
  const oldScale = historyParams.scale;
  var newScaleFactor = createInfNum((1.0 + ((e.wheelDeltaY / 48) * 0.05)).toString());
  if (infNumLt(newScaleFactor, createInfNum("0"))) {
    console.log("NEGATIVE scale factor would have been applied: [" + infNumToString(newScaleFactor) + "]");
    newScaleFactor = createInfNum("0.05");
  }
  const newScale = infNumMul(historyParams.scale, newScaleFactor);

  //const maxSeqScale = createInfNum("500");
  const maxSeqScale = createInfNum("5000000000");
  const minSeqScale = createInfNum("0.00005");
  if (plotsByName[historyParams.plot].calcFrom == "sequence") {
    if (infNumLt(newScale, minSeqScale)) {
      historyParams.scale = minSeqScale;
    } else if (infNumGt(newScale, maxSeqScale)) {
      historyParams.scale = maxSeqScale;
    } else {
      historyParams.scale = newScale;
    }
  // for window plots, use full-precision scale, though truncate later when writing in the URL
  } else {
    if ("minScale" in plotsByName[historyParams.plot].privContext &&
        infNumLt(newScale, plotsByName[historyParams.plot].privContext.minScale)) {
      return;
    }
    historyParams.scale = newScale;
  }

  // use mouse position when scrolling to effecively zoom in/out directly on the spot where the mouse is

  const newCenterX = calculateNewZoomCenterX(infNum(BigInt(e.pageX*fullSizeScaleFactor), 0n), infNum(BigInt(dCanvas.width), 0n),  historyParams.centerX, oldScale, historyParams.scale);
  const newCenterY = calculateNewZoomCenterY(infNum(BigInt(e.pageY*fullSizeScaleFactor), 0n), infNum(BigInt(dCanvas.height), 0n), historyParams.centerY, oldScale, historyParams.scale);

  historyParams.centerX = newCenterX;
  historyParams.centerY = newCenterY;

  redraw();
});

// all arguments must be infNum
function calculateNewZoomCenterX(pixelPosition, canvasSize, oldCenter, oldScale, newScale) {
  // since the point directly under the mouse while zooming (or under
  //   the middle point of the two-finger zoom action) will stay
  //   in the same position after the new zoom and center are applied,
  //   we can use that fact to set the old and new position equal to
  //   each other and algebraically solve for the new centerX

  // beforeZoomX = (xPos - oldLeftEdge) * oldScale
  // oldLeftEdge = oldCenterX - ((width / 2) / oldScale)
  // therefore
  // beforeZoomX = (xPos - (oldCenterX - ((width / 2) / oldScale))) * oldScale
  // beforeZoomX = (xPos * oldScale) - (oldCenterX * oldScale) + (width/2)
  //
  // since beforeZoomX == afterZoomX
  // (xPos * newScale) - (newCenterX * newScale) + (width/2) = (xPos * oldScale) - (oldCenterX * oldScale) + (width/2)
  // (xPos * newScale) - (newCenterX * newScale) = (xPos * oldScale) - (oldCenterX * oldScale)
  // (xPos * newScale) = (xPos * oldScale) - (oldCenterX * oldScale) + (newCenterX * newScale)
  // (xPos * newScale) - (xPos * oldScale) + (oldCenterX * oldScale) = (newCenterX * newScale)
  // flip
  // (newCenterX * newScale) = (xPos * newScale) - (xPos * oldScale) + (oldCenterX * oldScale)
  // newCenterX = xPos - (xPos * oldScale / newScale) + (oldCenterX * oldScale / newScale)

  const edge = infNumSub(oldCenter, infNumDiv(infNumDiv(canvasSize, infNum(2n, 0n), precision), oldScale, precision));
  // calculate the X position using the given pixelPosition
  // pixelX = (xPos - leftEdge) * oldScale
  // xPos = (pixelX / oldScale) + leftEdge
  const pos = infNumAdd(infNumDiv(pixelPosition, oldScale, precision), edge);
  const scaleRatio = infNumDiv(oldScale, newScale, precision);
  return infNumAdd(infNumSub(pos, infNumMul(pos, scaleRatio)), infNumMul(oldCenter, scaleRatio));
}

// all arguments must be infNum
function calculateNewZoomCenterY(pixelPosition, canvasSize, oldCenter, oldScale, newScale) {
  // since the point directly under the mouse while zooming (or under
  //   the middle point of the two-finger zoom action) will stay
  //   in the same position after the new zoom and center are applied,
  //   we can use that fact to set the old and new position equal to
  //   each other and algebraically solve for the new centerY

  // beforeZoomY = (oldTopEdge - yPos) * oldScale
  // oldTopEdge =  oldCenterY + ((width / 2) / oldScale)
  // therefore
  // beforeZoomY = ((oldCenterY + ((width / 2) / oldScale)) - yPos) * oldScale
  // beforeZoomY = (oldCenterY + ((width / 2) / oldScale) - yPos) * oldScale
  // beforeZoomY = (oldCenterY * oldScale) + (width / 2) - (yPos * oldScale)
  //
  // since beforeZoomY == afterZoomY
  // (newCenterY * newScale) + (width / 2) - (yPos * newScale) = (oldCenterY * oldScale) + (width / 2) - (yPos * oldScale)
  // (newCenterY * newScale) - (yPos * newScale) = (oldCenterY * oldScale) - (yPos * oldScale)
  // (newCenterY * newScale) = (oldCenterY * oldScale) - (yPos * oldScale) + (yPos * newScale)
  // newCenterY = (oldCenterY * oldScale / newScale) - (yPos * oldScale / newScale) + yPos

  const edge = infNumAdd(oldCenter, infNumDiv(infNumDiv(canvasSize, infNum(2n, 0n), precision), oldScale, precision));
  // calculate the Y position using the given pixelPosition
  // pixelY = (topEdge - yPos) * oldScale
  // pixelY / oldScale = topEdge - yPos
  // yPos = topEdge - (pixelY / oldScale)
  const pos = infNumSub(edge, infNumDiv(pixelPosition, oldScale, precision));
  const scaleRatio = infNumDiv(oldScale, newScale, precision);

  return infNumAdd(infNumSub(infNumMul(oldCenter, scaleRatio), infNumMul(pos, scaleRatio)), pos);
}

document.getElementById('menu-open').addEventListener("click", function(e) {
  openMenu();
}, true);
document.getElementById('menu-close').addEventListener("click", function(e) {
  closeMenu();
  closeHelpMenu();
  closeControlsMenu();
}, true);
document.getElementById('help-menu-open').addEventListener("click", function(e) {
  openHelpMenu();
}, true);
document.getElementById('help-menu-close').addEventListener("click", function(e) {
  closeMenu();
  closeHelpMenu();
  closeControlsMenu();
}, true);
document.getElementById('controls-menu-open').addEventListener("click", function(e) {
  openControlsMenu();
}, true);
document.getElementById('controls-menu-close').addEventListener("click", function(e) {
  closeMenu();
  closeHelpMenu();
  closeControlsMenu();
}, true);

function closeMenu() {
  menuVisible = false;
  hideFooter();
  document.getElementById('menu').style.display = 'none';
  document.getElementById('menu-open-wrap').style.display = 'block';
}

function openMenu() {
  menuVisible = true;
  closeHelpMenu();
  closeControlsMenu();
  showFooter();
  document.getElementById('menu').style.display = 'block';
  document.getElementById('menu-open-wrap').style.display = 'none';
}

function closeHelpMenu() {
  helpVisible = false;
  hideFooter();
  document.getElementById('help-menu').style.display = 'none';
  document.getElementById('menu-open-wrap').style.display = 'block';
}

function openHelpMenu() {
  closeMenu();
  closeControlsMenu();
  showFooter();
  helpVisible = true;
  document.getElementById('help-menu').style.display = 'block';
  document.getElementById('menu-open-wrap').style.display = 'none';
}

function closeControlsMenu() {
  controlsVisible = false;
  hideFooter();
  document.getElementById('controls-menu').style.display = 'none';
  document.getElementById('menu-open-wrap').style.display = 'block';
}

function openControlsMenu() {
  closeMenu();
  closeHelpMenu();
  showFooter();
  controlsVisible = true;
  document.getElementById('controls-menu').style.display = 'block';
  document.getElementById('menu-open-wrap').style.display = 'none';
  updateGradientPreview();
}

function showFooter() {
  document.getElementById('footer').style.display = 'block';
}

function hideFooter() {
  document.getElementById('footer').style.display = 'none';
}

// build a gradient here just so the global one isn't left null
buildGradient("rygb");
// since scale is determined by magnification, we need to set the
//   canvas size before parsing URL parameters
setDScaleVarsNoScale();
parseUrlParams();
start();
