const points = [];
var totalLength = 0;

const dCanvas = document.getElementById('dc');
const dContext = dCanvas.getContext('2d');
var mouseDrag = false;
var mouseDragX = 0;
var mouseDragY = 0;

var historyParams = {};
var replaceStateTimeout = null;
var historyTimeout = null;
var resizeTimeout = null;
var helpTimeout = null;
var helpVisible = false;

// each "sequence" has its own "privContext" that can contain whatever data/functions
//   it needs to compute points
const sequences = [{
  "name": "Primes-1-Step-90-turn",
  "desc": "Prime Numbers: 1 step forward per integer, but for primes, turn 90 degrees clockwise before stepping",
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
      return changeDirectionDegrees(dir, 90);
    },
    "computeNextPoint": function(dir, n, x, y) {
      return computeNextPointDegrees(dir, 1, x, y);
    }
  }
},{
  "name": "Primes-1-Step-45-turn",
  "desc": "Prime Numbers: 1 step forward per integer, but for primes, turn 45 degrees clockwise before stepping",
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
      return changeDirectionDegrees(dir, 45);
    },
    "computeNextPoint": function(dir, n, x, y) {
      return computeNextPointDegrees(dir, 1, x, y);
    }
  }
},{
  "name": "Squares-1-Step-90-turn",
  "desc": "Perfect Squares: 1 step forward per integer, but for squares, turn 90 degrees clockwise before stepping",
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
      if (privContext.isSquare(i)) {
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
      return changeDirectionDegrees(dir, 90);
    },
    "computeNextPoint": function(dir, n, x, y) {
      return computeNextPointDegrees(dir, 1, x, y);
    },
    "isSquare": function(n) {
      const sqrt = Math.sqrt(n);
      return sqrt == Math.trunc(sqrt);
    }
  }
},{
  "name": "Squares-1-Step-45-turn",
  "desc": "Perfect Squares: 1 step forward per integer, but for squares, turn 45 degrees clockwise before stepping",
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
      if (privContext.isSquare(i)) {
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
      return changeDirectionDegrees(dir, 45);
    },
    "computeNextPoint": function(dir, n, x, y) {
      return computeNextPointDegrees(dir, 1, x, y);
    },
    "isSquare": function(n) {
      const sqrt = Math.sqrt(n);
      return sqrt == Math.trunc(sqrt);
    }
  }
},{
  "name": "Primes-X-Y-neg-mod-3",
  "desc": "Prime Numbers: (x,y) where Nth prime is X and (N+1)th prime is Y, and where X is negated if sum of digits of X and Y mod 3 is 1, Y is negated if mod 3 is 2",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    // a million points takes a while to compute, at least with this
    //   initial/naive method of computing/storing points
    if (historyParams.n > 1000000) {
      historyParams.n = 1000000;
    }
    const params = historyParams;

    var lastX = -1;
    var lastPoint = getPoint(0.0, 0.0);
    resultPoints.push(lastPoint);

    for (var i = 1; i < params.n; i+=1) {
      if (!isPrime(i)) {
        continue;
      }
      if (lastX == -1) {
        lastX = i;
      } else {
        var thisY = i;
        const digits = (lastX.toString() + thisY.toString()).split("");
        var digitsSum = 0;
        for (var j = 0; j < digits.length; j++) {
          digitsSum += digits[j];
        }
        // makes a pyramid
        // const digitsSumMod4 = digitsSum % 4;
        // if (digitsSumMod4 == 1) {
        //   lastX = lastX * -1;
        // } else if (digitsSumMod4 == 2) {
        //   thisY = thisY * -1;
        // } else if (digitsSumMod4 == 3) {
        //   lastX = lastX * -1;
        //   thisY = thisY * -1;
        // }
        const digitsSumMod4 = digitsSum % 3;
        if (digitsSumMod4 == 1) {
          lastX = lastX * -1;
        } else if (digitsSumMod4 == 2) {
          thisY = thisY * -1;
        }
        const nextPoint = getPoint(parseFloat(lastX), parseFloat(thisY));
        const diffX = nextPoint.x - lastPoint.x;
        const diffY = nextPoint.y - lastPoint.y;
        resultLength += Math.sqrt((diffX*diffX)+(diffY*diffY));
        resultPoints.push(nextPoint);
        //console.log("point [" + i + "]: (" + nextPoint.x + ", " + nextPoint.y + ")");
        lastX = -1;
        lastPoint = nextPoint;
      }
    }
    return {
      "points": resultPoints,
      "length": resultLength
    };
  },
  "privContext": {
  }
},{
  "name": "Primes-N-Step-90-turn",
  "desc": "Prime Numbers: n steps forward per integer, but for primes, turn 90 degrees clockwise before stepping",
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

    for (var i = 1; i < params.n; i+=1) {
      if (isPrime(i)) {
        //console.log(i + " is prime");
        // only add points right before we change direction, and once at the end
        resultPoints.push(nextPoint);
        privContext.direction = privContext.changeDirection(privContext.direction);
      }
      // find the next point according to direction and current location
      nextPoint = privContext.computeNextPoint(privContext.direction, i, nextPoint.x, nextPoint.y);
      resultLength += i;
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
      return changeDirectionDegrees(dir, 90);
    },
    "computeNextPoint": function(dir, n, x, y) {
      return computeNextPointDegrees(dir, n, x, y);
    }
  }
},{
  "name": "Trapped-Knight",
  "desc": "Numbered squares on a chessboard that a knight can jump to in sequence where the smallest-numbered square must be taken.  Credit to The Online Encyclopedia of Integer Sequences: https://oeis.org/A316667",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;
    privContext.visitedSquares = {};

    const params = historyParams;

    var nextPoint = getPoint(0.0, 0.0);
    if (!privContext.isNumberedSquare(privContext, nextPoint)) {
      var testPoint = nextPoint;
      privContext.trackNumberedSquare(privContext, 0, nextPoint);

      var testDirection = 0;
      var direction = 90;

      // spiral out from starting square, finding coordinates of all numbered squares
      // used trial and error to figure out how many numbered squares are needed
      for (var i = 1; i < 3562; i+=1) {
        testDirection = privContext.changeDirection(direction);
        testPoint = privContext.computeNextPoint(testDirection, 1, nextPoint.x, nextPoint.y);
        if (!privContext.isNumberedSquare(privContext, testPoint)) {
          direction = testDirection;
          nextPoint = testPoint;
        } else {
          nextPoint = privContext.computeNextPoint(direction, 1, nextPoint.x, nextPoint.y);
        }
        privContext.trackNumberedSquare(privContext, i, nextPoint);
      }
    }

    var lastPoint = getPoint(0.0, 0.0);
    resultPoints.push(lastPoint);
    privContext.visitSquare(privContext, 0, lastPoint);

    var reachable = [];
    var lowestReachableN = -1;
    var lowestReachableP = null;

    for (var i = 0; i < params.n; i+=1) {
      reachable = privContext.reachableSquares(lastPoint);
      for (var j = 0; j < reachable.length; j++) {
        if (lowestReachableN == -1 || privContext.getSquareNumber(privContext, reachable[j]) < lowestReachableN) {
          if (!privContext.isVisited(privContext, reachable[j])) {
            lowestReachableP = reachable[j];
            lowestReachableN = privContext.getSquareNumber(privContext, lowestReachableP);
          }
        }
      }
      if (lowestReachableN == -1) {
        break;
      }
      const diffX = lowestReachableP.x - lastPoint.x;
      const diffY = lowestReachableP.y - lastPoint.y;
      resultLength += Math.sqrt((diffX*diffX)+(diffY*diffY));

      lastPoint = lowestReachableP;
      resultPoints.push(lastPoint);
      privContext.visitSquare(privContext, lowestReachableN, lastPoint);
      lowestReachableN = -1;
    }

    return {
      "points": resultPoints,
      "length": resultLength
    };
  },
  "privContext": {
    // by "x-y" coordinates, store chessboard square numbers, starting with center square at "0-0"
    "boardPoints": {},
    "visitedSquares": {},
    "trackNumberedSquare": function(privContext, n, point) {
      privContext.boardPoints[point.x + "-" + point.y] = n;
    },
    "isNumberedSquare": function(privContext, point) {
      return (point.x + "-" + point.y) in privContext.boardPoints;
    },
    "getSquareNumber": function(privContext, point) {
      const id = point.x + "-" + point.y;
      if (! id in privContext.boardPoints) {
        console.log("MISSING SQUARE - " + id);
      }
      return privContext.boardPoints[id];
    },
    "visitSquare": function(privContext, n, point) {
      privContext.visitedSquares[point.x + "-" + point.y] = n;
    },
    "isVisited": function(privContext, point) {
      return (point.x + "-" + point.y) in privContext.visitedSquares;
    },
    // turn "left"
    "changeDirection": function(dir) {
      return changeDirectionDegrees(dir, -90);
    },
    "computeNextPoint": function(dir, n, x, y) {
      return computeNextPointDegrees(dir, n, x, y);
    },
    // from a square at point s, return the 8 squares that
    //   a knight could jump to
    "reachableSquares": function(s) {
      return [
        getPoint(s.x + 1, s.y - 2),
        getPoint(s.x + 2, s.y - 1),
        getPoint(s.x + 2, s.y + 1),
        getPoint(s.x + 1, s.y + 2),
        getPoint(s.x - 1, s.y - 2),
        getPoint(s.x - 2, s.y - 1),
        getPoint(s.x - 2, s.y + 1),
        getPoint(s.x - 1, s.y + 2)
      ];
    },
    "isSquare": function(n) {
      const sqrt = Math.sqrt(n);
      return sqrt == Math.trunc(sqrt);
    }
  }
}];

const sequencesByName = {};
for (var i = 0; i < sequences.length; i++) {
  sequencesByName[sequences[i].name] = sequences[i];
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
function computeNextPointDegrees(dir, n, x, y) {
  if (dir == 0) {
    return getPoint(x + n, y);
  } else if (dir == 45) {
    return getPoint(x + n, y + n);
  } else if (dir == 90) {
    return getPoint(x, y + n);
  } else if (dir == 135) {
    return getPoint(x - n, y + n);
  } else if (dir == 180) {
    return getPoint(x - n, y);
  } else if (dir == 225) {
    return getPoint(x - n, y - n);
  } else if (dir == 270) {
    return getPoint(x, y - n);
  }
  return getPoint(x + n, y - n); // 315
}

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
    "seq": "Primes-1-Step-90-turn",
    "v": 1,
    "n": 60000,
    "lineWidth": 1.0,
    "scale": 1.5,
    "offsetX": 0.3,
    "offsetY": 0.37,
    "lineColor": 1,
    "bgColor": 1,
    "lineWidth": 1.0
  };

  // on my monitor, good test settings for 60,000 points
  //params = {"v": 1, "n": 60000, "lineWidth": 1.0, "scale": 1.5, "offsetX": 0.3, "offsetY": 0.37};
  // on my monitor, good test settings for 500 points
  //params = {"v": 1, "n": 500, "lineWidth": 3.0, "scale": 20.0, "offsetX": 0.3, "offsetY": -0.2};

  // only change default settings if a known version of settings is given
  if (urlParams.has('v') && urlParams.get('v') == 1) {
    if (urlParams.has('seq')) {
      const seq = urlParams.get('seq');
      if (seq in sequencesByName) {
        params.seq = seq;
      } else {
        alert("no such sequence [" + seq + "]");
      }
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
      if (params.lineColor > lineColorSchemes.length || params.lineColor < 1) {
        params.lineColor = 1;
      }
    }
    if (urlParams.has('bgColor')) {
      params.bgColor = parseInt(urlParams.get('bgColor'));
      if (params.bgColor > 3 || params.bgColor < 1) {
        params.bgColor = 1;
      }
    }
    if (urlParams.has('lineWidth')) {
      params.lineWidth = parseFloat(urlParams.get('lineWidth'));
      if (params.lineWidth > 20.0) {
        params.lineWidth = 20.0;
      }
    }
  }
  console.log(params);

  historyParams = params;
}

function showParameters() {
  alert(
    "displayed sequence:\n" +
    sequencesByName[historyParams.seq].name + "\n" +
    "    " + sequencesByName[historyParams.seq].desc + "\n" +
    "\n" +
    "number of displayed integers:\n" +
    Number(historyParams.n).toLocaleString()
  );
}

function start() {
  // thanks to https://stackoverflow.com/a/1232046/259456
  points.length = 0;

  const params = historyParams;

  if (! params.seq in sequencesByName) {
    console.log("invalid seq parameter: no such sequence [" + params.seq + "]");
    return;
  }

  // run the selected sequence
  const sequence = sequencesByName[params.seq];
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
    ctx.fillStyle = "#333333";
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

var replaceHistory = function() {
  // no need to replaceState() here -- we'll replaceState() on param
  //   changes except for mouse dragging, which happen too fast
  history.replaceState("", document.title, document.location.pathname + "?" + new URLSearchParams(historyParams).toString());
  replaceStateTimeout = null;
  //history.pushState("", document.title, document.location.pathname + "?" + new URLSearchParams(historyParams).toString());
  //console.log("just pushed to history");
};

var pushToHistory = function() {
  // no need to replaceState() here -- we'll replaceState() on param
  //   changes except for mouse dragging, which happen too fast
  //history.replaceState("", document.title, document.location.pathname + "?" + new URLSearchParams(historyParams).toString());
  history.pushState("", document.title, document.location.pathname + "?" + new URLSearchParams(historyParams).toString());
  historyTimeout = null;
  //console.log("just pushed to history");
};

const lineColorSchemes = [
  function c(startPercentage) { // 1: red -> blue -> yellow
    if (startPercentage < 0.5) {
      const blue = parseInt(startPercentage * 2 * 240);
      return "rgba(" + (240 - blue) + ",0," + blue + ",1.0)";
    } else {
      const blue = 240 - parseInt((startPercentage - 0.5) * 2 * 240);
      return "rgba(" + (240 - blue) + "," + (240 - blue) + "," + blue + ",1.0)";
    }
  }, function c(startPercentage) { // 2: blue -> red
    const red = parseInt(startPercentage * 240);
    return "rgba(" + red + ",0," + (240 - red) + ",1.0)";
  }, function c(startPercentage) { // 3: blue -> yellow
    const red = parseInt(startPercentage * 240);
    return "rgba(" + red + "," + red + "," + (240 - red) + ",1.0)";
  }, function c(startPercentage) { // 4: orange -> purple
    const blue = parseInt(startPercentage * 240);
    return "rgba(240," + (120 - (blue/2)) + "," + blue + ",1.0)";
  }, function c(startPercentage) { // 5: light gray -> dark gray
    const c = parseInt(startPercentage * 150);
    return "rgba(" + (200 - c) + "," + (200 - c) + "," + (200 - c) + ",1.0)";
  }, function c(startPercentage) { // 6: red
    const red = 200 - parseInt(startPercentage * 30);
    return "rgba(" + red + "," + (red * 0.2) + "," + (red * 0.2) + ",1.0)";
  }, function c(startPercentage) { // 7: orange
    const red = 200 - parseInt(startPercentage * 40);
    return "rgba(" + red + "," + (red * 0.5) + ",0,1.0)";
  }, function c(startPercentage) { // 8: yellow
    const red = 200 - parseInt(startPercentage * 40);
    return "rgba(" + red + "," + red + ",0,1.0)";
  }, function c(startPercentage) { // 9: green
    const green = 200 - parseInt(startPercentage * 40);
    return "rgba(" + (green * 0.1) + "," + green + "," + (green * 0.1) + ",1.0)";
  }, function c(startPercentage) { // 10: blue
    const blue = 200 - parseInt(startPercentage * 40);
    return "rgba(" + (blue * 0.1) + "," + (blue * 0.1) + "," + blue + ",1.0)";
  }, function c(startPercentage) { // 11: purple
    const blue = 200 - parseInt(startPercentage * 40);
    return "rgba(" + blue + "," + (blue * 0.1) + "," + blue + ",1.0)";
  }, function c(startPercentage) { // 12: dark gray
    const c = 60 - parseInt(startPercentage * 20);
    return "rgba(" + c + "," + c + "," + c + ",1.0)";
  }, function c(startPercentage) { // 13: light gray
    const c = 200 - parseInt(startPercentage * 40);
    return "rgba(" + c + "," + c + "," + c + ",1.0)";
  }
];

function getLineColor(startPercentage, colorScheme) {
  if (colorScheme > 0 && colorScheme <= lineColorSchemes.length) {
    return lineColorSchemes[colorScheme-1](startPercentage);
  }
  return "rgba(200,200,200,1.0)";
}

function drawPoints(params) {
  // change URL bar to reflect current params, only if no params change
  //   for 1/4 second
  if (replaceStateTimeout != null) {
    window.clearTimeout(replaceStateTimeout);
  }
  replaceStateTimeout = window.setTimeout(replaceHistory, 250);

  // add entry to browser history only if no params change for 2 seconds
  // since the back button doesn't work with this, i'm just removing this
  //   for now
  //if (historyTimeout !== null) {
  //  window.clearTimeout(historyTimeout);
  //}
  //historyTimeout = window.setTimeout(pushToHistory, 2000);

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
      segmentX = x - lastX;
      segmentY = y - lastY;
      if (segmentX == 0) {
        drawnLength += Math.abs(segmentY);
      } else if (segmentY == 0) {
        drawnLength += Math.abs(segmentX);
      } else {
        drawnLength += Math.sqrt((segmentX*segmentX)+(segmentY*segmentY));
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
    "drag mouse to move, and scroll mouse wheel to zoom",
    "",
    "help   center start    line color    bg color",
    "  H⃣          C⃣              V⃣           B⃣",
    "",
    "move        move more      move less",
    "  W⃣             I⃣              ↑⃣",
    "A⃣ S⃣ D⃣         J⃣ K⃣ L⃣          ←⃣ ↓⃣ →⃣",
    "",
    "zoom      zoom less    line width",
    "Q⃣   E⃣        −⃣ +⃣           Z⃣ ",
    "",
    "show params   sequence    fewer/more points",
    "     P⃣            X⃣           N⃣ M⃣ "
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

function roundTo2Decimals(f) {
  var val = Math.round(f * 100.0);
  return parseFloat(val / 100.0);
}

function roundTo5Decimals(f) {
  var val = Math.round(f * 100000.0);
  return parseFloat(val / 100000.0);
}

// thanks to https://stackoverflow.com/a/3396805/259456
window.addEventListener("keydown", function(e) {
  //console.log(e.type + " - " + e.keyCode);

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
    if (historyParams.scale > 500) {
      historyParams.scale = 500;
    }
    drawPoints(historyParams);
  } else if (e.keyCode == 173 || e.keyCode == 109 /* minus */) {
    addParamPercentAndRound("scale", -1);
    if (historyParams.scale < 0.01) {
      historyParams.scale = 0.01;
    }
    drawPoints(historyParams);
  } else if (e.keyCode == 69 /* e */) {
    addParamPercentAndRound("scale", 50);
    if (historyParams.scale > 500) {
      historyParams.scale = 500;
    }
    drawPoints(historyParams);
  } else if (e.keyCode == 81 /* q */) {
    addParamPercentAndRound("scale", -50);
    if (historyParams.scale < 0) {
      historyParams.scale = 0.01;
    }
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
    if (historyParams.lineColor > lineColorSchemes.length) {
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
    var seqNum = -1;
    for (var i = 0; i < sequences.length; i++) {
      if (sequences[i].name == historyParams.seq) {
        seqNum = i;
        break;
      }
    }
    seqNum += 1;
    if (seqNum >= sequences.length) {
      seqNum = 0;
    }
    historyParams.seq = sequences[seqNum].name;
    start();
    drawPoints(historyParams);
  } else if (e.keyCode == 90 /* z */) {
    addParamPercentAndRound("lineWidth", 50);
    if (historyParams.lineWidth > 20.0) {
      historyParams.lineWidth = 0.5;
    }
    drawPoints(historyParams);
  } else if (e.keyCode == 72 /* h */) {
    activateHelp();
  } else if (e.keyCode == 80 /* p */) {
    showParameters();
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

dCanvas.addEventListener("mousedown", function(e) {
  mouseDrag = true;
  mouseDragX = e.pageX;
  mouseDragY = e.pageY;
});
dCanvas.addEventListener("mousemove", function(e) {
  if (!mouseDrag) {
    return;
  }
  const newX = e.pageX;
  const newY = e.pageY;
  const diffX = (mouseDragX - newX) / dCanvas.width;
  const diffY = (mouseDragY - newY) / dCanvas.height;
  historyParams.offsetX = roundTo5Decimals(historyParams.offsetX - diffX);
  historyParams.offsetY = roundTo5Decimals(historyParams.offsetY - diffY);
  mouseDragX = newX;
  mouseDragY = newY;
  drawPoints(historyParams);
});
dCanvas.addEventListener("mouseup", function(e) {
  mouseDrag = false;
});
dCanvas.addEventListener("wheel", function(e) {
  // set 48 wheelDeltaY units as 5% zoom (in or out)
  // so -48 is 95% zoom, and +96 is 110% zoom
  const oldScale = historyParams.scale;
  const newScale = roundTo5Decimals(historyParams.scale * (1.0 + ((e.wheelDeltaY / 48) * 0.05)));
  if (newScale < 0.00005) {
    historyParams.scale = 0.00005;
  } else if (newScale > 500) {
    historyParams.scale = 500.0;
  } else {
    historyParams.scale = newScale;
  }

  // use mouse position when scrolling to effecively zoom in/out directly on the spot where the mouse is
  //
  // points are placed with:
  //
  // (points[i].x * scale) + (canvas.width * (0.5 + params.offsetX))
  // any point directly under cursor, after zooming in/out, should remain exactly in place
  //
  // also, if the offsets are 0 and cursor is exactly over the (0,0) point, the new offsets should remain at 0
  //
  // algebra...
  // (points[i].x * newScale) + (canvas.width * (0.5 + params.newOffsetX)) = (points[i].x * oldScale) + (canvas.width * (0.5 + params.oldOffsetX))
  // (points[i].x * newScale) + (0.5*canvas.width) + (canvas.width*params.newOffsetX) = (points[i].x * oldScale) + (0.5*canvas.width) + (canvas.width*params.oldOffsetX)
  // (points[i].x * newScale) + (canvas.width*params.newOffsetX) = (points[i].x * oldScale) + (canvas.width*params.oldOffsetX)
  // canvas.width*params.newOffsetX = (points[i].x * oldScale) - (points[i].x * newScale) + (canvas.width*params.oldOffsetX)
  // canvas.width*params.newOffsetX = points[i].x * (oldScale - newScale) + (canvas.width*params.oldOffsetX)
  // params.newOffsetX = points[i].x * ((oldScale - newScale)/canvas.width) + params.oldOffsetX
  //
  // algebra to find the point in terms of scale, offset, and mouse position (e.g. e.pageX)
  // (pt_x * scale) + (canvas.width * (0.5 + params.offsetX)) = mouse_x
  // pt_x = (mouse_x - (canvas.width * (0.5 + params.offsetX)))/scale

  // this is a mess, but it works
  // this might be able to be simplified...
  const newOffsetX = ((e.pageX-(dCanvas.width  * (0.5 + historyParams.offsetX)))/oldScale) * ((oldScale - historyParams.scale)/dCanvas.width)  + historyParams.offsetX;
  const newOffsetY = ((e.pageY-(dCanvas.height * (0.5 + historyParams.offsetY)))/oldScale) * ((oldScale - historyParams.scale)/dCanvas.height) + historyParams.offsetY;
  historyParams.offsetX = roundTo5Decimals(newOffsetX);
  historyParams.offsetY = roundTo5Decimals(newOffsetY);

  drawPoints(historyParams);
});

parseUrlParams();
start();
activateHelp();
