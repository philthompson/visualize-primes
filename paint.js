const points = [];
var totalLength = 0;
// 'R'ight, 'L'eft, 'U'p, 'D'own
var direction = 'R';

const dCanvas = document.getElementById('dc');
const dContext = dCanvas.getContext('2d');

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

// turn "right"
function changeDirection() {
  if (direction == "R") {
    direction = "D";
  } else if (direction == "D") {
    direction = "L";
  } else if (direction == "L") {
    direction = "U";
  } else {
    direction = "R";
  }
}

function getPoint(x, y) {
  return {"x": x, "y": y};
}

function computeNextPoint(n, x, y) {
  //var amountToAdd = n;
  var amountToAdd = 1;
  totalLength += amountToAdd;
  if (direction == "R") {
    return {"x": (x+amountToAdd), "y": y};
  } else if (direction == "D") {
    return {"x": x, "y": (y-amountToAdd)};
  } else if (direction == "L") {
    return {"x": (x-amountToAdd), "y": y};
  }
  return getPoint(x, y + amountToAdd);
}

var start = function() {
  // for whatever reason, using the URL hash parameters doesn't cause
  //   the page to reload and re-draw the visualization, so we will
  //   use the URL search parameters instead (and use history.pushState
  //   when actually drawing the thing to ensure the URL is kept
  //   up-to-date with what is being drawn without reloading the page)
  var urlParams = new URLSearchParams(document.location.search);

  // default settings that work on my monitor
  var params = {
    "v": 1,
    "n": 60000,
    "lineWidth": 1.0,
    "scale": 1.5,
    "offsetX": 0.3,
    "offsetY": 0.37
  };

  // on my monitor, good test settings for 60,000 points
  //params = {"v": 1, "n": 60000, "lineWidth": 1.0, "scale": 1.5, "offsetX": 0.3, "offsetY": 0.37};
  // on my monitor, good test settings for 500 points
  //params = {"v": 1, "n": 500, "lineWidth": 3.0, "scale": 20.0, "offsetX": 0.3, "offsetY": -0.2};

  // only change default settings if a known version of settings is given
  if (urlParams.has('v') && urlParams.get('v') == 1) {
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
  }
  console.log(params);

  var nextPoint = getPoint(0.0, 0.0);
  direction = "U"; // start with 'U'p

  for (var i = 1.0; i < params.n; i+=1.0) {
    if (isPrime(i)) {
      //console.log(i + " is prime");
      // only add points right before we change direction, and once at the end
      points.push(nextPoint);
      changeDirection();
    }
    // find the next point according to direction and current location
    nextPoint = computeNextPoint(i, nextPoint.x, nextPoint.y);
    //points.push(nextPoint);
  }
  // add the last point
  points.push(nextPoint);

  setDScaleVars(dContext);

  drawPoints(params);
};

var pixelColor = function(imgData, x, y) {
  var red = imgData.data[((width * y) + x) * 4];
  var green = imgData.data[((width * y) + x) * 4 + 1];
  var blue = imgData.data[((width * y) + x) * 4 + 2];
  return [red, green, blue];
}

function fillBlack(ctx) {
  var canvas = ctx.canvas;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0,0,canvas.width, canvas.height);
}

function setDScaleVars(dCtx) {
  var canvas = dCtx.canvas;
  if (canvas.width != canvas.offsetWidth || canvas.height != canvas.offsetHeight) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    fillBlack(dCtx);
  }
}


function drawPoints(params) {
  history.pushState("", document.title, document.location.pathname + "?" + new URLSearchParams(params).toString());
  const canvas = dContext.canvas;
  const lineWidth = params.lineWidth;
  const scale = params.scale;
  const offsetX = canvas.width * (0.5 + params.offsetX);
  const offsetY = canvas.height * (0.5 + params.offsetY);

  fillBlack(dContext);
  console.log("drawing [" + points.length + "] points with a total length of [" + totalLength + "]");

  var drawnLength = 0.0;
  var totalLengthScaled = totalLength * scale;
  var lastX = 1.0 * offsetX;
  var lastY = 1.0 * offsetY;
  var segmentX = 0.0;
  var segmentY = 0.0;
  var lineColor = "rgba(255,0,0,1.0)";
  dContext.lineWidth = lineWidth;
  dContext.lineCap = "round";
  dContext.lineJoin = "round";
  dContext.beginPath();
  dContext.moveTo(offsetX, offsetY);
  for (var i = 0; i < points.length; i++) {
    var x = (points[i].x * scale) + offsetX;
    var y = (points[i].y * scale) + offsetY;
    var redStart = parseInt((drawnLength / totalLengthScaled) * 240);
    var blueStart = 240 - redStart;
    // use previous point to determine how long this line segment is
    //   and therefore how much of the overall line gradient this segment
    //   should contain
    if (i > 0) {
      segmentX = Math.abs(x - lastX);
      segmentY = Math.abs(y - lastY);
      if (segmentX == 0) {
        drawnLength += segmentY;
      } else {
        drawnLength += segmentX;
      }
    }
    lineColor = "rgba(" + redStart + ",0," + blueStart + ",1.0)";
    //console.log("line color [" + lineColor + "]");
    dContext.beginPath();
    dContext.moveTo(lastX, lastY);
    dContext.strokeStyle = lineColor;
    //console.log("line to (" + x + ", " + y + ")");
    dContext.lineTo(x, y);
    // stroke every line individually in order to do gradual color gradient
    dContext.stroke();
    lastX = x;
    lastY = y;
  }
}

start();
