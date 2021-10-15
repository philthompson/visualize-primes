var points = [];
var totalLength = 0;
// 'R'ight, 'L'eft, 'U'p, 'D'own
var direction = 'R';

var dcanvas = document.getElementById('dc');
var dContext = dcanvas.getContext('2d');

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
  var x = 0.0;
  var y = 0.0;
  direction = "U"; // start with 'U'p

  // 60,000 seems like a good non-overlapping point
  //     - this fits on my monitor: drawPoints(1.0, 1.5, canvas.width * 0.8, canvas.height * 0.87);
  //     - this is a good scale on my monitor: drawPoints(1.0, 3.0, canvas.width * 0.8, canvas.height * 0.87);
  for (var i = 1.0; i < 60000.0; i+=1.0) {
    if (isPrime(i)) {
      //console.log(i + " is prime");
      // only add points right before we change direction
      points.push(getPoint(x, y));
      changeDirection();
    }
    // find the next point according to direction and current location
    var nextPoint = computeNextPoint(i, x, y)
    x = nextPoint.x;
    y = nextPoint.y;
    //points.push(nextPoint);
  }

  setDScaleVars(dContext);
  var canvas = dContext.canvas;
  // works for 60,000 points
  //drawPoints(1.0, 1.5, canvas.width * 0.8, canvas.height * 0.87);
  drawPoints(1.0, 1.52, canvas.width * 0.8, canvas.height * 0.87);
  // works for 500 points
  //drawPoints(3.0, 20.0, canvas.width * 0.8, canvas.height * 0.2);
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


function drawPoints(lineWidth, scale, offsetX, offsetY) {
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
