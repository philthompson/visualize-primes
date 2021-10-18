const points = [];
var totalLength = 0;

const dCanvas = document.getElementById('dc');
const dContext = dCanvas.getContext('2d');

var historyParams = {};
var historyTimeout = null;
var resizeTimeout = null;
var helpTimeout = null;
var helpVisible = false;

// each "sequence" has its own "privContext" that can contain whatever data/functions
//   it needs to compute points
const sequences = [{
  "name": "Prime Numbers: 1 step forward per integer, but for primes, turn 90 degrees clockwise before stepping",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    // a million points takes a while to compute, at least with this
    //   initial/naive method of computing/storing points
    if (historyParams.n > 1000000) {
      historyParams.n = 1000000;
    }
    const params = historyParams;

    var nextPoint = getPoint(0.0, 0.0);
    privContext.direction = "U"; // start with 'U'p

    for (var i = 1.0; i < params.n; i+=1.0) {
      if (isPrime(i)) {
        //console.log(i + " is prime");
        // only add points right before we change direction, and once at the end
        resultPoints.push(nextPoint);
        privContext.direction = privContext.changeDirection(privContext.direction);
      }
      // find the next point according to direction and current location
      nextPoint = privContext.computeNextPoint(privContext.direction, i, nextPoint.x, nextPoint.y);
      resultLength += 1;
    }
    // add the last point
    resultPoints.push(nextPoint);
    return {
      "points": resultPoints,
      "length": resultLength
    };
  },
  "privContext": {
    // 'R'ight, 'L'eft, 'U'p, 'D'own
    "direction": 'R',
    // turn "right"
    "changeDirection": function(dir) {
      if (dir == "R") {
        return "D";
      } else if (dir == "D") {
        return "L";
      } else if (dir == "L") {
        return "U";
      } else {
        return "R";
      }
    },
    "computeNextPoint": function(dir, n, x, y) {
      if (dir == "R") {
        return getPoint(x + 1, y);
      } else if (dir == "D") {
        return getPoint(x, y + 1);
      } else if (dir == "L") {
        return getPoint(x - 1, y);
      }
      return getPoint(x, y - 1);
    }
  },
},{
  "name": "Prime Numbers: 1 step forward per integer, but for primes, turn 45 degrees clockwise before stepping",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    // a million points takes a while to compute, at least with this
    //   initial/naive method of computing/storing points
    if (historyParams.n > 1000000) {
      historyParams.n = 1000000;
    }
    const params = historyParams;

    var nextPoint = getPoint(0.0, 0.0);
    privContext.direction = 270; // start with up, 270 degree clockwise from 3 o'clock

    for (var i = 1.0; i < params.n; i+=1.0) {
      if (isPrime(i)) {
        //console.log(i + " is prime");
        // only add points right before we change direction, and once at the end
        resultPoints.push(nextPoint);
        privContext.direction = privContext.changeDirection(privContext.direction);
      }
      // find the next point according to direction and current location
      nextPoint = privContext.computeNextPoint(privContext.direction, i, nextPoint.x, nextPoint.y);
      resultLength += 1;
    }
    // add the last point
    resultPoints.push(nextPoint);
    return {
      "points": resultPoints,
      "length": resultLength
    };
  },
  "privContext": {
    // degrees clockwise, 0 is right (3 o'clock)
    "direction": 0,
    // turn "right"
    "changeDirection": function(dir) {
      var newDir = dir + 45;
      if (newDir >= 360) {
        return 0;
      }
      return newDir;
    },
    "computeNextPoint": function(dir, n, x, y) {
      if (dir == 0) {
        return getPoint(x + 1, y);
      } else if (dir == 45) {
        return getPoint(x + 1, y + 1);
      } else if (dir == 90) {
        return getPoint(x, y + 1);
      } else if (dir == 135) {
        return getPoint(x - 1, y + 1);
      } else if (dir == 180) {
        return getPoint(x - 1, y);
      } else if (dir == 225) {
        return getPoint(x - 1, y - 1);
      } else if (dir == 270) {
        return getPoint(x, y - 1);
      }
      return getPoint(x + 1, y - 1); // 315
    }
  }
},{
  "name": "Straight line: 1 step forward per integer",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    // a million points takes a while to compute, at least with this
    //   initial/naive method of computing/storing points
    if (historyParams.n > 100000) {
      historyParams.n = 100000;
    }
    const params = historyParams;

    var nextPoint = getPoint(0.0, 0.0);

    for (var i = 1.0; i < params.n; i+=1.0) {
      resultPoints.push(nextPoint);
      // find the next point according to direction and current location
      nextPoint = privContext.computeNextPoint(nextPoint.x, nextPoint.y);
      resultLength += 1;
    }
    // add the last point
    resultPoints.push(nextPoint);

    return {
      "points": resultPoints,
      "length": resultLength
    };
  },
  "privContext": {
    "computeNextPoint": function(x, y) {
      return getPoint(x + 1, y - 1);
    }
  },
}];

function isPrime(n) {
  if (n < 1) {
    return false;
  }
  for (var i = 2; i < n; i++) {
    if (n % i == 0) {
      return false;
    }
  }
  return true;
}

function getPoint(x, y) {
  return {"x": x, "y": y};
}

function parseUrlParams() {
  // for whatever reason, using the URL hash parameters doesn't cause
  //   the page to reload and re-draw the visualization, so we will
  //   use the URL search parameters instead (and use history.pushState
  //   when actually drawing the thing to ensure the URL is kept
  //   up-to-date with what is being drawn without reloading the page)
  var urlParams = new URLSearchParams(document.location.search);

  // default settings that work on my monitor
  var params = {
    "sequence": 1,
    "v": 1,
    "n": 60000,
    "lineWidth": 1.0,
    "scale": 1.5,
    "offsetX": 0.3,
    "offsetY": 0.37,
    "lineColor": 1,
    "bgColor": 1
  };

  // on my monitor, good test settings for 60,000 points
  //params = {"v": 1, "n": 60000, "lineWidth": 1.0, "scale": 1.5, "offsetX": 0.3, "offsetY": 0.37};
  // on my monitor, good test settings for 500 points
  //params = {"v": 1, "n": 500, "lineWidth": 3.0, "scale": 20.0, "offsetX": 0.3, "offsetY": -0.2};

  // only change default settings if a known version of settings is given
  if (urlParams.has('v') && urlParams.get('v') == 1) {
    if (urlParams.has('sequence')) {
      params.sequence = parseInt(urlParams.get('sequence'));
    }
    if (urlParams.has('n')) {
      params.n = 1.0 * parseInt(urlParams.get('n'));
    }
    if (urlParams.has('lineWidth')) {
      params.lineWidth = parseFloat(urlParams.get('lineWidth'));
    }
    if (urlParams.has('scale')) {
      params.scale = parseFloat(urlParams.get('scale'));
    }
    if (urlParams.has('offsetX')) {
      params.offsetX = parseFloat(urlParams.get('offsetX'));
    }
    if (urlParams.has('offsetY')) {
      params.offsetY = parseFloat(urlParams.get('offsetY'));
    }
    if (urlParams.has('lineColor')) {
      params.lineColor = parseInt(urlParams.get('lineColor'));
    }
    if (urlParams.has('bgColor')) {
      params.bgColor = parseInt(urlParams.get('bgColor'));
    }
  }
  console.log(params);

  historyParams = params;
}

function start() {
  // thanks to https://stackoverflow.com/a/1232046/259456
  points.length = 0;

  const params = historyParams;

  if (params.sequence <= 0 || params.sequence > sequences.length) {
    console.log("invalid sequence setting.  expected integer between 1 and " + sequences.length);
    return;
  }

  // run the selected sequence
  const sequence = sequences[params.sequence - 1];
  const out = sequence.computePointsAndLength(sequence.privContext);

  // copy the results
  totalLength = out.length;
  for (var i = 0; i < out.points.length; i++) {
    points.push(out.points[i]);
  }

  // draw the results
  setDScaleVars(dContext);
  drawPoints(params);
};

var pixelColor = function(imgData, x, y) {
  var red = imgData.data[((width * y) + x) * 4];
  var green = imgData.data[((width * y) + x) * 4 + 1];
  var blue = imgData.data[((width * y) + x) * 4 + 2];
  return [red, green, blue];
}

function fillBg(ctx) {
  var canvas = ctx.canvas;
  if (historyParams.bgColor == 2) {
    ctx.fillStyle = "#FFFFFF";
  } else if (historyParams.bgColor == 3) {
    ctx.fillStyle = "#777777";
  } else {
    ctx.fillStyle = "#000000";
  }
  ctx.fillRect(0,0,canvas.width, canvas.height);
}

function setDScaleVars(dCtx) {
  var canvas = dCtx.canvas;
  if (canvas.width != canvas.offsetWidth || canvas.height != canvas.offsetHeight) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    fillBg(dCtx);
  }
}

var pushToHistory = function() {
  history.pushState("", document.title, document.location.pathname + "?" + new URLSearchParams(historyParams).toString());
  //console.log("just pushed to history");
};

function getLineColor(startPercentage, colorScheme) {
  if (colorScheme == 1) { // red -> blue -> yellow
    if (startPercentage < 0.5) {
      const blue = parseInt(startPercentage * 2 * 240);
      return "rgba(" + (240 - blue) + ",0," + blue + ",1.0)";
    } else {
      const blue = 240 - parseInt((startPercentage - 0.5) * 2 * 240);
      return "rgba(" + (240 - blue) + "," + (240 - blue) + "," + blue + ",1.0)";
    }
  } else if (colorScheme == 2) { // blue -> red
    const red = parseInt(startPercentage * 240);
    return "rgba(" + red + ",0," + (240 - red) + ",1.0)";
  } else if (colorScheme == 3) { // blue -> yellow
    const red = parseInt(startPercentage * 240);
    return "rgba(" + red + "," + red + "," + (240 - red) + ",1.0)";
  } else if (colorScheme == 4) { // orange -> purple
    const blue = parseInt(startPercentage * 240);
    return "rgba(240," + (120 - (blue/2)) + "," + blue + ",1.0)";
  } else if (colorScheme == 5) { // light gray -> dark gray
    const c = parseInt(startPercentage * 150);
    return "rgba(" + (200 - c) + "," + (200 - c) + "," + (200 - c) + ",1.0)";
  } else if (colorScheme == 6) { // red
    const red = 200 - parseInt(startPercentage * 30);
    return "rgba(" + red + "," + (red * 0.2) + "," + (red * 0.2) + ",1.0)";
  } else if (colorScheme == 7) { // orange
    const red = 200 - parseInt(startPercentage * 40);
    return "rgba(" + red + "," + (red * 0.5) + ",0,1.0)";
  } else if (colorScheme == 8) { // yellow
    const red = 200 - parseInt(startPercentage * 40);
    return "rgba(" + red + "," + red + ",0,1.0)";
  } else if (colorScheme == 9) { // green
    const green = 200 - parseInt(startPercentage * 40);
    return "rgba(" + (green * 0.1) + "," + green + "," + (green * 0.1) + ",1.0)";
  } else if (colorScheme == 10) { // blue
    const blue = 200 - parseInt(startPercentage * 40);
    return "rgba(" + (blue * 0.1) + "," + (blue * 0.1) + "," + blue + ",1.0)";
  } else if (colorScheme == 11) { // purple
    const blue = 200 - parseInt(startPercentage * 40);
    return "rgba(" + blue + "," + (blue * 0.1) + "," + blue + ",1.0)";
  } else if (colorScheme == 12) { // dark gray
    const c = 60 - parseInt(startPercentage * 20);
    return "rgba(" + c + "," + c + "," + c + ",1.0)";
  } else if (colorScheme == 13) { // light gray
    const c = 200 - parseInt(startPercentage * 40);
    return "rgba(" + c + "," + c + "," + c + ",1.0)";
  }
  return "rgba(200,200,200,1.0)";
}

function drawPoints(params) {
  history.replaceState("", document.title, document.location.pathname + "?" + new URLSearchParams(params).toString());
  historyParams = params;
  if (historyTimeout !== null) {
    window.clearTimeout(historyTimeout);
  }
  historyTimeout = window.setTimeout(pushToHistory, 2000);

  const canvas = dContext.canvas;
  const lineWidth = params.lineWidth;
  const scale = params.scale;
  const offsetX = canvas.width * (0.5 + params.offsetX);
  const offsetY = canvas.height * (0.5 + params.offsetY);

  fillBg(dContext);
  console.log("drawing [" + points.length + "] points with a total length of [" + totalLength + "]");

  var drawnLength = 0.0;
  var totalLengthScaled = totalLength * scale;
  var lastX = 1.0 * offsetX;
  var lastY = 1.0 * offsetY;
  var segmentX = 0.0;
  var segmentY = 0.0;
  dContext.lineWidth = lineWidth;
  dContext.lineCap = "round";
  dContext.lineJoin = "round";
  dContext.beginPath();
  dContext.moveTo(offsetX, offsetY);
  for (var i = 0; i < points.length; i++) {
    var x = (points[i].x * scale) + offsetX;
    var y = (points[i].y * scale) + offsetY;
    // use previous point to determine how much of the overall length
    //   we have drawn and therefore which part much of the overall
    //   line gradient this segment should be drawn with
    if (i > 0) {
      segmentX = Math.abs(x - lastX);
      segmentY = Math.abs(y - lastY);
      if (segmentX == 0) {
        drawnLength += segmentY;
      } else {
        drawnLength += segmentX;
      }
    }
    dContext.beginPath();
    dContext.moveTo(lastX, lastY);
    dContext.strokeStyle = getLineColor(drawnLength / totalLengthScaled, params.lineColor);
    dContext.lineTo(x, y);
    // stroke every line individually in order to do gradual color gradient
    dContext.stroke();
    lastX = x;
    lastY = y;
  }

  if (helpVisible) {
    drawHelp();
  }
}

function drawHelp() {
  const canvas = dContext.canvas;
  const textSize = Math.max(Math.min(canvas.width, canvas.height) / 40, 8);
  const lines = [
    "help   center start    line color    bg color",
    "H⃣            C⃣              V⃣           B⃣",
    "",
    "move        move more      move less",
    "  W⃣             I⃣              ↑⃣",
    "A⃣ S⃣ D⃣         J⃣ K⃣ L⃣          ←⃣ ↓⃣ →⃣",
    "",
    "zoom      zoom less     ",
    "Q⃣   E⃣        −⃣ +⃣            ",
    "",
    "sequence    fewer/more points",
    "   X⃣           N⃣ M⃣ "
  ];

  var helpMaxY = textSize + 10 + (lines.length * 1.25 * textSize);
  dContext.fillStyle = "rgba(40,40,40,0.6)";
  dContext.fillRect(0,0,canvas.width, helpMaxY);

  dContext.font = textSize + 'px Monospace';
  dContext.fillStyle = "#999999";
  for (var i = 0; i < lines.length; i++) {
    const lineY = textSize + 10 + (i * 1.25 * textSize);
    dContext.fillText(lines[i], 24, lineY);
  }
}

// enable help, draw, then re-draw without help after 10 seconds
function activateHelp() {
  helpVisible = true;
  if (helpTimeout !== null) {
    window.clearTimeout(helpTimeout);
  }

  drawPoints(historyParams);

  helpTimeout = window.setTimeout(function() {
    helpVisible = false;
    drawPoints(historyParams);
  }, 10000);
};

// apparently using float math to add 0.01 to 0.06 doesn't result in 0.07
//   so instead we will multiply by 100, use integer math, then divide by 100
function addParamPercentAndRound(fieldName, nPercent) {
  if (! fieldName in historyParams) {
    console.log("unknown params field [" + fieldName + "]");
    return;
  }
  // use Math.round() instead of parseInt() because, for example:
  //   parseInt(0.29 * 100.0)   --> 28
  //   Math.round(0.29 * 100.0) --> 29
  var val = Math.round(historyParams[fieldName] * 100.0);
  val += nPercent;
  historyParams[fieldName] = parseFloat(val / 100.0);
}

// thanks to https://stackoverflow.com/a/3396805/259456
window.addEventListener("keydown", function(e) {
  console.log(e.type + " - " + e.keyCode);

  // for keys that change the number of points or the position of points, use
  //start();
  // otherwise, use
  //drawPoints(historyParams);

  if (e.keyCode == 39 /* right arrow */) {
    addParamPercentAndRound("offsetX", -1)
    drawPoints(historyParams);
  } else if (e.keyCode == 68 /* a */) {
    addParamPercentAndRound("offsetX", -10);
    drawPoints(historyParams);
  } else if (e.keyCode == 76 /* l */) {
    addParamPercentAndRound("offsetX", -50);
    drawPoints(historyParams);
  } else if (e.keyCode == 37 /* left arrow */) {
    addParamPercentAndRound("offsetX", 1);
    drawPoints(historyParams);
  } else if (e.keyCode == 65 /* a */) {
    addParamPercentAndRound("offsetX", 10);
    drawPoints(historyParams);
  } else if (e.keyCode == 74 /* j */) {
    addParamPercentAndRound("offsetX", 50);
    drawPoints(historyParams);
  } else if (e.keyCode == 38 /* up arrow */) {
    addParamPercentAndRound("offsetY", 1);
    drawPoints(historyParams);
  } else if (e.keyCode == 87 /* w */) {
    addParamPercentAndRound("offsetY", 10);
    drawPoints(historyParams);
  } else if (e.keyCode == 73 /* i */) {
    addParamPercentAndRound("offsetY", 50);
    drawPoints(historyParams);
  } else if (e.keyCode == 40 /* down arrow */) {
    addParamPercentAndRound("offsetY", -1);
    drawPoints(historyParams);
  } else if (e.keyCode == 83 /* s */) {
    addParamPercentAndRound("offsetY", -10);
    drawPoints(historyParams);
  } else if (e.keyCode == 75 /* k */) {
    addParamPercentAndRound("offsetY", -50);
    drawPoints(historyParams);
  } else if (e.keyCode == 61 || e.keyCode == 107 /* plus */) {
    addParamPercentAndRound("scale", 1);
    drawPoints(historyParams);
  } else if (e.keyCode == 173 || e.keyCode == 109 /* minus */) {
    addParamPercentAndRound("scale", -1);
    drawPoints(historyParams);
  } else if (e.keyCode == 69 /* e */) {
    addParamPercentAndRound("scale", 50);
    drawPoints(historyParams);
  } else if (e.keyCode == 81 /* q */) {
    addParamPercentAndRound("scale", -50);
    drawPoints(historyParams);
  } else if (e.keyCode == 67 /* c */) {
    historyParams.offsetX = 0.0;
    historyParams.offsetY = 0.0;
    drawPoints(historyParams);
  } else if (e.keyCode == 77 /* m */) {
    historyParams.n += 500;
    start();
    drawPoints(historyParams);
  } else if (e.keyCode == 78 /* n */) {
    if (historyParams.n > 100) {
      historyParams.n -= 100
    }
    start();
    drawPoints(historyParams);
  } else if (e.keyCode == 86 /* v */) {
    historyParams.lineColor += 1;
    if (historyParams.lineColor > 13) {
      historyParams.lineColor = 1;
    }
    drawPoints(historyParams);
  } else if (e.keyCode == 66 /* b */) {
    historyParams.bgColor += 1;
    if (historyParams.bgColor > 3) {
      historyParams.bgColor = 1;
    }
    drawPoints(historyParams);
  } else if (e.keyCode == 88 /* x */) {
    historyParams.sequence += 1;
    if (historyParams.sequence > sequences.length) {
      historyParams.sequence = 1;
    }
    start();
    drawPoints(historyParams);
  } else if (e.keyCode == 72 /* h */) {
    activateHelp();
  }
});

// re-draw if there's been a window resize and more than 500ms has elapsed
window.addEventListener("resize", function() {
  if (resizeTimeout !== null) {
    window.clearTimeout(resizeTimeout);
  }
  resizeTimeout = window.setTimeout(function() {
    setDScaleVars(dContext);
    drawPoints(historyParams);
  }, 500);
});

parseUrlParams();
start();
activateHelp();
