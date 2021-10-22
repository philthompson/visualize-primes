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
var helpVisible = false;
var menuVisible = false;

// each "sequence" has its own "privContext" that can contain whatever data/functions
//   it needs to compute points
const sequences = [{
  "name": "Primes-1-Step-90-turn",
  "desc": "Move 1 step forward per integer, but for primes, turn 90 degrees clockwise before moving.",
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
    privContext.direction = 0;

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
  // these settings are auto-applied when this sequence is activated
  "forcedDefaults": {
    "v": 1,
    "n": 60000,
    "scale": 1.2,
    "offsetX": 0.2,
    "offsetY": -0.3
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
  "desc": "Move 1 step forward per integer, but for primes, turn 45 degrees clockwise before moving.  " +
          "When moving diagonally, we move 1 step on both the x and y axes, so we're actually " +
          "moving ~1.414 steps diagonally.",
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
    privContext.direction = 315;

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
  // these settings are auto-applied when this sequence is activated
  "forcedDefaults": {
    "v": 1,
    "n": 60000,
    "scale": 0.85,
    "offsetX": -0.07,
    "offsetY": -0.32
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
  "desc": "Move 1 step forward per integer, but for perfect squares, turn 90 degrees clockwise before moving.",
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
  // these settings are auto-applied when this sequence is activated
  "forcedDefaults": {
    "v": 1,
    "n": 5000,
    "scale": 6.5,
    "offsetX": 0.0,
    "offsetY": 0.0
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
  "desc": "Move 1 step forward per integer, but for perfect squares, turn 45 degrees clockwise before moving.  " +
          "When moving diagonally, we move 1 step on both the x and y axes, so we're actually " +
          "moving ~1.414 steps diagonally.",
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
  // these settings are auto-applied when this sequence is activated
  "forcedDefaults": {
    "v": 1,
    "n": 5000,
    "scale": 2.3,
    "offsetX": 0.0,
    "offsetY": 0.0
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
  "desc": "Where each plotted point <code>(x,y)</code> consists of the primes, in order.  " +
          "Those points are (2,-3), (5,7), (11,13), and so on.<br/><br/>" +
          "Then we take the sum of the digits of both the <code>x</code> and <code>y</code> of each point.<br/>" +
          "If that sum, mod 3, is 1, the <code>x</code> is negated.<br/>" +
          "If that sum, mod 3, is 2, the <code>y</code> is negated.<br/><br/>" +
          "After applying the negation rule, the first three plotted points become:<br/>" +
          "<code>(2,-3) → sum digits = 5&nbsp;&nbsp;mod 3 = 2 → -y → (2,-3)</code><br/>" +
          "<code>(5,7)&nbsp;&nbsp;→ sum digits = 12 mod 3 = 0 →&nbsp;&nbsp;&nbsp;&nbsp;→ (5,7)</code><br/>" +
          "<code>(11,13)→ sum digits = 6&nbsp;&nbsp;mod 3 = 0 →&nbsp;&nbsp;&nbsp;&nbsp;→ (11,13)</code>",
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
  // these settings are auto-applied when this sequence is activated
  "forcedDefaults": {
    "v": 1,
    "n": 5000,
    "scale": 0.08,
    "offsetX": 0.0,
    "offsetY": 0.0
  },
  "privContext": {
  }
},{
  "name": "Trapped-Knight",
  "desc": "On a chessboard, where the squares are numbered in a spiral, " +
          "find the squares a knight can jump to in sequence where the " +
          "smallest-numbered square must always be taken.  Previously-" +
          "visited squares cannot be returned to again.  After more than " +
          "2,000 jumps the knight has no valid squares to jump to, so the " +
          "sequence ends.<br/><br/>" +
          "Credit to The Online Encyclopedia of Integer Sequences<br/>" +
          "<a target='_blank' href='https://oeis.org/A316667'>https://oeis.org/A316667</a><br/>" +
          "<a target='_blank' href='https://www.youtube.com/watch?v=RGQe8waGJ4w'>https://www.youtube.com/watch?v=RGQe8waGJ4w</a>",
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
  // these settings are auto-applied when this sequence is activated
  "forcedDefaults": {
    "v": 1,
    "n": 2016,
    "scale": 15.0,
    "offsetX": 0.0,
    "offsetY": 0.0
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

var menuHtml = "";
const sequencesByName = {};
for (var i = 0; i < sequences.length; i++) {
  sequencesByName[sequences[i].name] = sequences[i];

  menuHtml +=
    "<div class='sequence-desc'>" +
      "<button class='seq-view-btn' id='seq-view-btn-" + i + "'>View</button>" +
      "<b>" + sequences[i].name + "</b><br/>" +
      sequences[i].desc +
    "</div>";
}
document.getElementById('menu-contents').innerHTML = menuHtml;
const viewButtons = document.getElementsByClassName("seq-view-btn");
var doSomething = function(e) {
  var clickedId = parseInt(e.target.id.split("-")[3]);
  if (clickedId >= sequences.length) {
    clickedId = 0;
  }
  const newSeq = sequences[clickedId].name;
  if (newSeq == historyParams.seq) {
    return;
  }
  //historyParams.seq = newSeq;
  var defaults = Object.assign(historyParams, sequences[clickedId].forcedDefaults);
  defaults.seq = newSeq;
  replaceHistoryWithParams(defaults);
  parseUrlParams();
  start();
  drawPoints(historyParams);
};
for (var i = 0; i < viewButtons.length; i++) {
  viewButtons[i].addEventListener('click', doSomething);
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
  if (n < 2) {
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
    "lineColor": "rby",
    "bgColor": "b",
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
      const color = urlParams.get('lineColor');
      if (color in lineColorSchemes) {
        params.lineColor = color;
      } else {
        alert("no such line color scheme [" + color + "]");
      }
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
      params.lineWidth = parseFloat(urlParams.get('lineWidth'));
      if (params.lineWidth > 20.0) {
        params.lineWidth = 20.0;
      }
    }
  }
  console.log(params);

  historyParams = params;
}

function indicateActiveSequence() {
  const buttons = document.getElementsByClassName('seq-view-btn');
  for (var i = 0; i < buttons.length; i++) {
    if (sequences[i].name == historyParams.seq) {
      buttons[i].innerHTML = 'Active';
      buttons[i].parentNode.classList.add('active-seq');
    } else {
      buttons[i].innerHTML = 'View';
      buttons[i].parentNode.classList.remove('active-seq');
    }
  }
}

function start() {
  // thanks to https://stackoverflow.com/a/1232046/259456
  points.length = 0;

  const params = historyParams;

  if (! params.seq in sequencesByName) {
    console.log("invalid seq parameter: no such sequence [" + params.seq + "]");
    return;
  }

  indicateActiveSequence();

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

const bgColorSchemes = {
  "b": "#000000",
  "g": "#333333",
  "w": "#FFFFFF"
}

const bgColorSchemeNames = [];
for (name in bgColorSchemes) {
  bgColorSchemeNames.push(name);
}

function fillBg(ctx) {
  var canvas = ctx.canvas;
  if (historyParams.bgColor in bgColorSchemes) {
    ctx.fillStyle = bgColorSchemes[historyParams.bgColor];
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

// this is separate so that we can call it with only a subset of params,
//   and the rest will be populated with standard values as part of parseUrlParams()
function replaceHistoryWithParams(params) {
  history.replaceState("", document.title, document.location.pathname + "?" + new URLSearchParams(params).toString());
  replaceStateTimeout = null;
};

var replaceHistory = function() {
  replaceHistoryWithParams(historyParams);
};

var pushToHistory = function() {
  // no need to replaceState() here -- we'll replaceState() on param
  //   changes except for mouse dragging, which happen too fast
  history.pushState("", document.title, document.location.pathname + "?" + new URLSearchParams(historyParams).toString());
  historyTimeout = null;
};

const lineColorSchemes = {
  "rby": function c(startPercentage) { // red -> blue -> yellow
    if (startPercentage < 0.5) {
      const blue = parseInt(startPercentage * 2 * 240);
      return "rgba(" + (240 - blue) + ",0," + blue + ",1.0)";
    } else {
      const blue = 240 - parseInt((startPercentage - 0.5) * 2 * 240);
      return "rgba(" + (240 - blue) + "," + (240 - blue) + "," + blue + ",1.0)";
    }
  },
  "rbgyo": function c(startPercentage) { // red -> blue -> green -> yellow -> orange
    if (startPercentage < 0.25) {
      const blue = parseInt(startPercentage * 4 * 240);
      return "rgba(" + (240 - blue) + ",0," + blue + ",1.0)";
    } else if (startPercentage < 0.5) {
      const green = parseInt((startPercentage - 0.25) * 4 * 240);
      return "rgba(0," + green + "," + (240 - green) + ",1.0)";
    } else if (startPercentage < 0.75) {
      const red = 240 - parseInt((startPercentage - 0.5) * 4 * 240);
      return "rgba(" + (240 - red) + "," + 240 + ",0,1.0)";
    } else {
      const blue = parseInt((startPercentage - 0.75) * 4 * 240);
      return "rgba(240," + (240 - (blue/2)) + ",0,1.0)";
    }
  },
  "br": function c(startPercentage) { // blue -> red
    const red = parseInt(startPercentage * 240);
    return "rgba(" + red + ",0," + (240 - red) + ",1.0)";
  },
  "by": function c(startPercentage) { // blue -> yellow
    const red = parseInt(startPercentage * 240);
    return "rgba(" + red + "," + red + "," + (240 - red) + ",1.0)";
  },
  "op": function c(startPercentage) { // orange -> purple
    const blue = parseInt(startPercentage * 240);
    return "rgba(240," + (120 - (blue/2)) + "," + blue + ",1.0)";
  },
  "lgdg": function c(startPercentage) { // light gray -> dark gray
    const c = parseInt(startPercentage * 150);
    return "rgba(" + (200 - c) + "," + (200 - c) + "," + (200 - c) + ",1.0)";
  },
  "r": function c(startPercentage) { // red
    const red = 200 - parseInt(startPercentage * 30);
    return "rgba(" + red + "," + (red * 0.2) + "," + (red * 0.2) + ",1.0)";
  },
  "o": function c(startPercentage) { // orange
    const red = 200 - parseInt(startPercentage * 40);
    return "rgba(" + red + "," + (red * 0.5) + ",0,1.0)";
  },
  "y": function c(startPercentage) { // yellow
    const red = 200 - parseInt(startPercentage * 40);
    return "rgba(" + red + "," + red + ",0,1.0)";
  },
  "g": function c(startPercentage) { // green
    const green = 200 - parseInt(startPercentage * 40);
    return "rgba(" + (green * 0.1) + "," + green + "," + (green * 0.1) + ",1.0)";
  },
  "b": function c(startPercentage) { // blue
    const blue = 200 - parseInt(startPercentage * 40);
    return "rgba(" + (blue * 0.1) + "," + (blue * 0.1) + "," + blue + ",1.0)";
  },
  "p": function c(startPercentage) { // purple
    const blue = 200 - parseInt(startPercentage * 40);
    return "rgba(" + blue + "," + (blue * 0.1) + "," + blue + ",1.0)";
  },
  "dg": function c(startPercentage) { // dark gray
    const c = 60 - parseInt(startPercentage * 20);
    return "rgba(" + c + "," + c + "," + c + ",1.0)";
  },
  "lg": function c(startPercentage) { // light gray
    const c = 200 - parseInt(startPercentage * 40);
    return "rgba(" + c + "," + c + "," + c + ",1.0)";
  }
};

const lineColorSchemeNames = [];
for (name in lineColorSchemes) {
  lineColorSchemeNames.push(name);
}

function getLineColor(startPercentage, colorScheme) {
  if (colorScheme in lineColorSchemes) {
    return lineColorSchemes[colorScheme](startPercentage);
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
}

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
  } else if (e.keyCode == 37 /* left arrow */) {
    addParamPercentAndRound("offsetX", 1);
    drawPoints(historyParams);
  } else if (e.keyCode == 65 /* a */) {
    addParamPercentAndRound("offsetX", 10);
    drawPoints(historyParams);
  } else if (e.keyCode == 38 /* up arrow */) {
    addParamPercentAndRound("offsetY", 1);
    drawPoints(historyParams);
  } else if (e.keyCode == 87 /* w */) {
    addParamPercentAndRound("offsetY", 10);
    drawPoints(historyParams);
  } else if (e.keyCode == 40 /* down arrow */) {
    addParamPercentAndRound("offsetY", -1);
    drawPoints(historyParams);
  } else if (e.keyCode == 83 /* s */) {
    addParamPercentAndRound("offsetY", -10);
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
    var schemeNum = -1;
    for (var i = 0; i < lineColorSchemeNames.length; i++) {
      if (lineColorSchemeNames[i] == historyParams.lineColor) {
        schemeNum = i;
        break;
      }
    }
    schemeNum += 1;
    if (schemeNum >= lineColorSchemeNames.length) {
      schemeNum = 0;
    }
    historyParams.lineColor = lineColorSchemeNames[schemeNum];

    drawPoints(historyParams);
  } else if (e.keyCode == 66 /* b */) {
    var schemeNum = -1;
    for (var i = 0; i < bgColorSchemeNames.length; i++) {
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
    //drawPoints(historyParams);
  } else if (e.keyCode == 90 /* z */) {
    addParamPercentAndRound("lineWidth", 50);
    if (historyParams.lineWidth > 20.0) {
      historyParams.lineWidth = 0.5;
    }
    drawPoints(historyParams);
  } else if (e.keyCode == 72 /* h */) {
    if (helpVisible) {
      closeHelpMenu();
    } else {
      openHelpMenu();
    }
  } else if (e.keyCode == 80 /* p */) {
    if (menuVisible) {
      closeMenu();
    } else {
      openMenu();
    }
  } else if (e.keyCode == 49 || e.keyCode == 97 /* 1 */) {
    replaceHistoryWithParams({
      "seq": "Primes-1-Step-90-turn",
      "v": 1,
      "n": 60000,
      "lineWidth": 1,
      "scale": 1.35,
      "offsetX": 0.22,
      "offsetY": -0.34,
      "lineColor": "rbgyo",
      "bgColor": "b"
    });
    parseUrlParams();
    start();
  } else if (e.keyCode == 50 || e.keyCode == 98 /* 2 */) {
    replaceHistoryWithParams({
      "seq": "Trapped-Knight",
      "v": 1,
      "n": 2016,
      "lineWidth": 1.5,
      "scale": 15.0,
      "offsetX": 0.0,
      "offsetY": 0.0,
      "lineColor": "rbgyo",
      "bgColor": "b"
    });
    parseUrlParams();
    start();
  } else if (e.keyCode == 51 || e.keyCode == 99 /* 3 */) {
    replaceHistoryWithParams({
      "seq": "Primes-1-Step-45-turn",
      "v": 1,
      "n": 32400,
      "lineWidth": 2,
      "scale": 10.95,
      "offsetX": -0.30847,
      "offsetY": -0.96171,
      "lineColor": "rbgyo",
      "bgColor": "b"
    });
    parseUrlParams();
    start();
  //} else if (e.keyCode == 57 || e.keyCode == 105 /* 9 */) {
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

document.getElementById('menu-open').addEventListener("click", function(e) {
  openMenu();
}, true);
document.getElementById('menu-close').addEventListener("click", function(e) {
  closeMenu();
  closeHelpMenu();
}, true);
document.getElementById('help-menu-open').addEventListener("click", function(e) {
  openHelpMenu();
}, true);
document.getElementById('help-menu-close').addEventListener("click", function(e) {
  closeHelpMenu();
}, true);

function closeMenu() {
  menuVisible = false;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('menu-open-wrap').style.display = 'block';
}

function openMenu() {
  menuVisible = true;
  closeHelpMenu();
  document.getElementById('menu').style.display = 'block';
  document.getElementById('menu-open-wrap').style.display = 'none';
}

function closeHelpMenu() {
  helpVisible = false;
  document.getElementById('help-menu').style.display = 'none';
  document.getElementById('menu-open-wrap').style.display = 'block';
}

function openHelpMenu() {
  //hideHelp();
  closeMenu();
  helpVisible = true;
  document.getElementById('help-menu').style.display = 'block';
  document.getElementById('menu-open-wrap').style.display = 'none';
}

parseUrlParams();
start();
