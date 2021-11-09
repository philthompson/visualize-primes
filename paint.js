const points = [];
var totalLength = 0;

const dCanvas = document.getElementById('dc');
const dContext = dCanvas.getContext('2d');
var mouseDrag = false;
var mouseDragX = 0;
var mouseDragY = 0;
var pinch = false;
var pinchStartDist = 0;

var historyParams = {};
var replaceStateTimeout = null;
var historyTimeout = null;
var resizeTimeout = null;
var helpVisible = false;
var menuVisible = false;

const windowLogTiming = true;
const windowPointCaching = true;
const mandelbrotCircleHeuristic = false;

const windowCalc = {
  "timeout": null,
  "seqName": "",
  "lineWidth": 0,
  "leftEdge": 0,
  "topEdge": 0,
  "rightEdge": 0,
  "bottomEdge": 0,
  "xPixelChunks": [],
  "resultPoints": [],
  "pointsBounds": "",
  "pointsCache": {},
  "totalTimeMs": 0,
  "totalPoints": 0,
  "cachedPoints": 0,
  "chunksComplete": 0,
  "totalChunks": 0,
  "eachPixUnits": infNum(1n, 0n),
  "leftEdge": infNum(0n, 0n),
  "topEdge": infNum(0n, 0n),
  "rightEdge": infNum(0n, 0n),
  "bottomEdge": infNum(0n, 0n),
  "n": 1
};

function infNum(value, exponent) {
  return {"v": value, "e": exponent};
}

function trimZeroes(stringNum) {
  var trimmed = stringNum.trim();
  const negative = trimmed.startsWith('-');
  if (negative) {
    trimmed = trimmed.substr(1);
  }
  while (trimmed.length > 1 && trimmed.startsWith('0')) {
    trimmed = trimmed.substr(1);
  }
  if (negative) {
    trimmed = "-" + trimmed;
  }
  const parts = trimmed.split('.');
  if (parts.length == 1) {
    return trimmed;
  }
  while (parts[1].length > 0 && parts[1].endsWith('0')) {
    parts[1] = parts[1].slice(0, -1);
  }
  if (parts[1].length == 0) {
    return trimmed;
  }
  return parts[0] + "." + parts[1];
}

var unitTest = trimZeroes("50000");
console.log("trimZeroes(\"50000\") = [" + unitTest + "] // 50000");

unitTest = trimZeroes("050");
console.log("trimZeroes(\"050\") = [" + unitTest + "] // 50");

unitTest = trimZeroes("-050");
console.log("trimZeroes(\"-050\") = [" + unitTest + "] // -50");

unitTest = trimZeroes("-022.00");
console.log("trimZeroes(\"-022.00\") = [" + unitTest + "] // -22");

unitTest = trimZeroes("022.002200");
console.log("trimZeroes(\"022.002200\") = [" + unitTest + "] // 22.0022");

unitTest = trimZeroes("-22.002200");
console.log("trimZeroes(\"-22.002200\") = [" + unitTest + "] // -22.0022");

function createInfNum(stringNum) {
  var trimmed = trimZeroes(stringNum);
  const parts = trimmed.split('.');
  if (parts.length == 1) {
    return infNum(BigInt(parts[0]), 0n);
  }
  return infNum(BigInt(parts[0] + "" + parts[1]), BigInt("-" + parts[1].length));
}

console.log(createInfNum("0.0"));
console.log(createInfNum("0"));
console.log(createInfNum("123"));
console.log(createInfNum("123.456"));
console.log(createInfNum("  3 "));
console.log(createInfNum("  123456789.000000000012345"));
console.log(createInfNum("  -4.00321"));
console.log(createInfNum("  -0.009 "));

// after a quick test this seems to actually create a copy
function copyInfNum(n) {
  return infNum(n.v+0n, n.e+0n);
}

// only reads values from a and b, so the given objects are never modified
function infNumMul(a, b) {
  // the product of the values
  // the sum of the exponents
  return infNum(a.v * b.v, a.e + b.e);
}

console.log("100 * 1.5 = ... // 150 (1500, -1)");
console.log(infNumMul(createInfNum("100"), createInfNum("1.5")));

console.log("123.5 * 1.5 = ... // 185.25 (18525, -2)");
console.log(infNumMul(createInfNum("123.5"), createInfNum("1.5")));

console.log("123.5 * 1.5 = ... // 185.25 (18525, -2)");
console.log(infNumMul(createInfNum("123.5"), createInfNum("1.5")));

console.log("15000 * 0.0006 = ... // 9 (9, 0)");
console.log(infNumMul(createInfNum("15000"), createInfNum("0.0006")));

// adjust the exponents to make them the same, by
//   increasing the value part of the InfNum with the
//   larger exponent
function normInfNum(argA, argB) {
  var a = copyInfNum(argA);
  var b = copyInfNum(argB);
  // if they already have the same exponent, our work is done
  if (a.e === b.e) {
    return [a, b];
  }
  var swapped = false;
  // find which operand has smaller exponent
  var s = a;
  var l = b;
  if (l.e < s.e) {
    swapped = true;
    s = b;
    l = a;
  }

  var expDiff = l.e - s.e;
  // multiply larger value, and reduce its exponent accordingly,
  //   to get matching exponents
  const newL = infNum(l.v * (10n ** expDiff), l.e - expDiff);

  // ensure we return the args in the same order
  if (swapped) {
    return [newL, s];
  }
  return [s, newL];
}

console.log("100 and 123.456"); // (100000, -3) and (123456, -3)
console.log(normInfNum(createInfNum("100"), createInfNum("123.456")));

console.log("0.0321 and 5"); // (321, -4) and (50000, -4)
console.log(normInfNum(createInfNum("0.0321"), createInfNum("5")));

console.log("22 and 5"); // (22, 0) and (5, 0)
console.log(normInfNum(createInfNum("22"), createInfNum("5")));

// copies values from a and b, so the given objects are never modified
function infNumAdd(a, b) {
  const norm = normInfNum(a, b);
  return infNum(norm[0].v + norm[1].v, norm[0].e);
}

console.log("100 + 1.5 = ... // 101.5 (1015, -1)");
console.log(infNumAdd(createInfNum("100"), createInfNum("1.5")));

console.log("123 + 0.456 = ... // 123.456 (123456, -3)");
console.log(infNumAdd(createInfNum("123"), createInfNum("0.456")));

console.log("0.00001 + 5.05 = ... // 5.05001 (505001, -5)");
console.log(infNumAdd(createInfNum("0.00001"), createInfNum("5.05")));


// copies values from a and b, so the given objects are not modified
function infNumSub(a, b) {
  const norm = normInfNum(a, b);
  return infNum(norm[0].v - norm[1].v, norm[0].e);
}

console.log("100 - 1.5 = ... // 98.5 (985, -1)");
console.log(infNumSub(createInfNum("100"), createInfNum("1.5")));

console.log("123 - 0.01 = ... // 122.99 (12299, -2)");
console.log(infNumSub(createInfNum("123"), createInfNum("0.01")));

console.log("0.00001 - 50 = ... // -49.99999 (-4999999, -5)");
console.log(infNumSub(createInfNum("0.00001"), createInfNum("50")));

function infNumDiv(argA, argB) {
  const norm = normInfNum(argA, argB);
  var a = norm[0];
  var b = norm[1];

  var truncated = infNum(a.v / b.v, a.e - b.e);

  var remainder = infNum(a.v % b.v, a.e - b.e);

  if (remainder.v === 0n) {
    return truncated;
  }

  // this may give 16 digits of precision?
  // seems easy enough to go to 32 or 64....
  var remInf = infNumMul(remainder, infNum(10000000000000000n, 0n));
  var remTrunc = infNum(remInf.v / b.v, -16n);

  return infNumAdd(truncated, remTrunc);
}

var unitTest = infNumDiv(createInfNum("50000"), createInfNum("20"));
console.log("50000 / 20 = [" + infNumToString(unitTest) + "] // 2500 (25, 2)");
console.log(unitTest);

unitTest = infNumDiv(createInfNum("100"), createInfNum("7"));
console.log("100 / 7 = [" + infNumToString(unitTest) + "] // 14.28571428571428...");
console.log(unitTest);

unitTest = infNumDiv(createInfNum("100"), createInfNum("64"));
console.log("100 / 64 = [" + infNumToString(unitTest) + "] // 1.5625 (15625, -4)");
console.log(unitTest);

unitTest = infNumDiv(createInfNum("1302"), createInfNum("10.5"));
console.log("1302 / 10.5 = [" + infNumToString(unitTest) + "] // 124");
console.log(unitTest);

function infNumEq(a, b) {
  const normalized = normInfNum(a, b);
  return normalized[0].v === normalized[1].v;
}
function infNumLt(a, b) {
  const normalized = normInfNum(a, b);
  return normalized[0].v < normalized[1].v;
}
function infNumLe(a, b) {
  const normalized = normInfNum(a, b);
  return normalized[0].v <= normalized[1].v;
}
function infNumGt(a, b) {
  if (a.v > b.v && a.e >= b.e) {
    return true;
  }
  const normalized = normInfNum(a, b);
  return normalized[0].v > normalized[1].v;
}
function infNumGe(a, b) {
  const normalized = normInfNum(a, b);
  return normalized[0].v >= normalized[1].v;
}

console.log("100 < 123.456 // true");
console.log(infNumLt(createInfNum("100"), createInfNum("123.456")));

console.log("0.0321 > 5 // false");
console.log(infNumGt(createInfNum("0.0321"), createInfNum("5")));

console.log("5 > 0.0321 // true");
console.log(infNumGt(createInfNum("5"), createInfNum("0.0321")));

console.log("22 === 5 // false");
console.log(infNumEq(createInfNum("22"), createInfNum("5")));

console.log("-22 > 5 // false");
console.log(infNumGt(createInfNum("-22"), createInfNum("5")));

console.log("-22 <= -22.0000 // true");
console.log(infNumLe(createInfNum("-22"), createInfNum("-22.0000")));

function infNumToString(n) {
  var value = n.v.toString();
  if (n.e === 0n) {
    return value;
  }
  if (n.e > 0n) {
    var i = 0n;
    while (i < n.e) {
      value = value + "0";
      i = i + 1n;
    }
    return value;
  }
  var i = 0n;
  var dec = "";
  var neg = false;
  if (value.startsWith("-")) {
    neg = true;
    value = value.substr(1);
  }
  while (i > n.e) {
    if (value.length > 0) {
      dec = value.slice(-1) + dec
      value = value.slice(0, -1);
    } else {
      dec = "0" + dec;
    }
    i = i - 1n;
  }
  if (value.length == 0) {
    value = "0";
  }
  if (neg) {
    value = "-" + value;
  }
  return trimZeroes(value + "." + dec);
}

console.log("(22,0) // 22");
console.log(infNumToString(infNum(22n, 0n)));

console.log("(22,1) // 220");
console.log(infNumToString(infNum(22n, 1n)));

console.log("22,-1) // 2.2");
console.log(infNumToString(infNum(22n, -1n)));

console.log("22,-2) // 0.22");
console.log(infNumToString(infNum(22n, -2n)));

console.log("22,-4) // 0.0022");
console.log(infNumToString(infNum(22n, -4n)));

console.log("(-22,0) // -22");
console.log(infNumToString(infNum(-22n, 0n)));

console.log("(-22,1) // -220");
console.log(infNumToString(infNum(-22n, 1n)));

console.log("-22,-4) // -0.0022");
console.log(infNumToString(infNum(-22n, -4n)));

function infNumTruncate(n) {
  var a = copyInfNum(n);
  const orig = a.v.toString();
  if (orig.length <= 24) {
    return a;
  }
  a.v = BigInt(a.v.toString().substring(0,24));
  a.e = a.e + BigInt(orig.length - 24);
  return a;
}


// each "sequence" has its own "privContext" that can contain whatever data/functions
//   it needs to compute points
const sequences = [{
  "name": "Primes-1-Step-90-turn",
  "calcFrom": "sequence",
  "desc": "Move 1 step forward per integer, but for primes, turn 90 degrees clockwise before moving.",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    // 5 million steps takes a while to compute, at least with this
    //   method of computing primes and drawing points
    if (historyParams.n > 5000000) {
      historyParams.n = 5000000;
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
    "scale": createInfNum("1.2"),
    "offsetX": createInfNum("0.2"),
    "offsetY": createInfNum("-0.3")
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
  "calcFrom": "sequence",
  "desc": "Move 1 step forward per integer, but for primes, turn 45 degrees clockwise before moving.  " +
          "When moving diagonally, we move 1 step on both the x and y axes, so we're actually " +
          "moving ~1.414 steps diagonally.",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    // 5 million steps takes a while to compute, at least with this
    //   imethod of computing primes and drawing points
    if (historyParams.n > 5000000) {
      historyParams.n = 5000000;
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
    "scale": createInfNum("0.85"),
    "offsetX": createInfNum("-0.07"),
    "offsetY": createInfNum("-0.32")
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
  "calcFrom": "sequence",
  "desc": "Move 1 step forward per integer, but for perfect squares, turn 90 degrees clockwise before moving.",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    // this is a straightforward predictable plot, so there's no point in
    //   going beyond a few thousand points let alone a million
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
    "scale": createInfNum("6.5"),
    "offsetX": infNum(0n, 0n),
    "offsetY": infNum(0n, 0n)
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
  "calcFrom": "sequence",
  "desc": "Move 1 step forward per integer, but for perfect squares, turn 45 degrees clockwise before moving.  " +
          "When moving diagonally, we move 1 step on both the x and y axes, so we're actually " +
          "moving ~1.414 steps diagonally.",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    // this is a straightforward predictable plot, so there's no point in
    //   going beyond a few thousand points let alone a million
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
    "scale": createInfNum("2.3"),
    "offsetX": infNum(0n, 0n),
    "offsetY": infNum(0n, 0n)
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
  "calcFrom": "sequence",
  "desc": "Where each plotted point <code>(x,y)</code> consists of the primes, in order.  " +
          "Those points are (2,3), (5,7), (11,13), and so on.<br/><br/>" +
          "Then we take the sum of the digits of both the <code>x</code> and <code>y</code> of each point.<br/>" +
          "If that sum, mod 3, is 1, the <code>x</code> is negated.<br/>" +
          "If that sum, mod 3, is 2, the <code>y</code> is negated.<br/><br/>" +
          "After applying the negation rule, the first three plotted points become:<br/>" +
          "<code>(2,3)&nbsp;&nbsp;→ sum digits = 5&nbsp;&nbsp;mod 3 = 2 → -y → (2,-3)</code><br/>" +
          "<code>(5,7)&nbsp;&nbsp;→ sum digits = 12 mod 3 = 0 →&nbsp;&nbsp;&nbsp;&nbsp;→ (5,7)</code><br/>" +
          "<code>(11,13)→ sum digits = 6&nbsp;&nbsp;mod 3 = 0 →&nbsp;&nbsp;&nbsp;&nbsp;→ (11,13)</code>",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    // this is a straightforward predictable plot, so there's no point in
    //   going beyond a few thousand points let alone a million
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
        resultLength += Math.hypot(nextPoint.x - lastPoint.x, nextPoint.y - lastPoint.y);
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
    "scale": createInfNum("0.08"),
    "offsetX": infNum(0n, 0n),
    "offsetY": infNum(0n, 0n)
  },
  "privContext": {
  }
},{
  "name": "Trapped-Knight",
  "calcFrom": "sequence",
  "desc": "On a chessboard, where the squares are numbered in a spiral, " +
          "find the squares a knight can jump to in sequence where the " +
          "smallest-numbered square must always be taken.  Previously-" +
          "visited squares cannot be returned to again.  After more than " +
          "2,000 jumps the knight has no valid squares to jump to, so the " +
          "sequence ends.<br/><br/>" +
          "Credit to The Online Encyclopedia of Integer Sequences:<br/>" +
          "<a target='_blank' href='https://oeis.org/A316667'>https://oeis.org/A316667</a><br/>" +
          "and to Numberphile:<br/>" +
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
      resultLength += Math.hypot(lowestReachableP.x - lastPoint.x, lowestReachableP.y - lastPoint.y);

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
    "scale": infNum(15n, 0n),
    "offsetX": infNum(0n, 0n),
    "offsetY": infNum(0n, 0n)
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
// },{
//   "name": "Circle",
//   "calcFrom": "window",
//   "desc": "Draws a purple circle, for testing the window calculation+drawing methods",
//   "computeBoundPointColor": function(privContext, x, y) {
//     if (infNumLe(infNumAdd(infNumMul(x, x), infNumMul(y, y)), privContext.circleRadiusSquared)) {
//       //return getColor(100, 40, 90);
//       return 1.0;
//     } else {
//       return -1.0;
//     }
//   },
//   // these settings are auto-applied when this sequence is activated
//   "forcedDefaults": {
//     "scale": infNum(40n, 0n),
//     "offsetX": infNum(0n, 0n),
//     "offsetY": infNum(0n, 0n)
//   },
//   "privContext": {
//     "black": getColor(0, 0, 0),
//     "circleRadiusSquared": infNum(100n, 0n)
//   }
},{
  "name": "Mandelbrot-set",
  "calcFrom": "window",
  "desc": "The Mandelbrot set is the set of complex numbers, that when repeatedly plugged into the following " +
    "simple function, does <i>not</i> run away to infinity.  The function is z<sub>n+1</sub> = z<sub>n</sub><sup>2</sup> + c.<br/>" +
    "For each plotted point <code>c</code>, we repeat the above function many times.<br/>" +
    "If the value jumps off toward infinity after say 10 iterations, we display a color at the pixel for point <code>c</code>.<br/>" +
    "If the value doesn't go off toward infinity until say 50 iterations, we pick a quite different color for that point.<br/>" +
    "If, after our alloted number of iterations has been computed, the value still hasn't gone off to infinity, we color that pixel the backgrond color (defaulting to black)." +
    "<br/><br/>Wikipedia has a terrific <a target='_blank' href='https://en.wikipedia.org/wiki/Mandelbrot_set'>article with pictures</a>." +
    "<br/><br/>My favorite explanation I've found so far is <a target='_blank' href='https://www.youtube.com/watch?v=FFftmWSzgmk'>this Numberphile video on YouTube</a>." +
    "<br/><br/><b>Tips for using this Mandelbrot set viewer</b>:" +
    "<br/>- When not zoomed in very far, keep the <code>n</code> (iterations) parameter low for faster calculation (use N and M keys to decrease/increase the <code>n</code> value)." +
    "<br/>- To see more detail when zoomed in, increase the <code>n</code> (iterations) parameter with the M key.  Calculations will be slower." +
    "<br/><br/><b>Known Issues:</b>" +
    "<br/>- When zoomed in beyond a certain point, the keyboard zoom/pan keys stop working as expected.  Use the mouse to zoom and pan." +
    "<br/>- When panning or zooming, the screen initially shows black instead of a low-resolution preview",
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeBoundPointColor": function(privContext, x, y) {
    const maxIter = historyParams.n;

    // circle heuristics to speed up zoomed-out viewing
    if (mandelbrotCircleHeuristic) {
      for (var i = 0; i < privContext.circles.length; i++) {
        const xDist = infNumSub(x, privContext.circles[i].centerX);
        const yDist = infNumSub(y, privContext.circles[i].centerY);
        if (infNumLe(infNumAdd(infNumMul(xDist, xDist), infNumMul(yDist, yDist)), privContext.circles[i].radSq)) {
          return -1.0; // background color
        }
      }
    }

    // the coords used for iteration
    var ix = infNum(0n, 0n);
    var iy = infNum(0n, 0n);
    var ixSq = infNum(0n, 0n);
    var iySq = infNum(0n, 0n);
    var ixTemp = infNum(0n, 0n);
    var iter = 0;
    while (iter < maxIter) {
      ixSq = infNumMul(ix, ix);
      iySq = infNumMul(iy, iy);
      if (infNumGt(infNumAdd(ixSq, iySq), privContext.boundsRadiusSquared)) {
        break;
      }
      ixTemp = infNumAdd(x, infNumSub(ixSq, iySq));
      iy = infNumAdd(y, infNumMul(privContext.two, infNumMul(ix, iy)));
      ix = ixTemp;
      ix = infNumTruncate(ix);
      iy = infNumTruncate(iy);
      iter++
    }

    if (iter == maxIter) {
      return -1.0; // background color
    } else {
      return privContext.applyColorCurve(iter / maxIter);
    }
  },
  // these settings are auto-applied when this sequence is activated
  "forcedDefaults": {
    "n": 50,
    "scale": infNum(400n, 0n),
    "offsetX": infNum(19n, -2n),
    "offsetY": infNum(0n, 0n)
  },
  "privContext": {
    //"purple": getColor(255, 40, 255),
    "two": infNum(2n, 0n),
    "black": getColor(0, 0, 0),
    "boundsRadiusSquared": infNum(4n, 0n),
    "colors": {},
    "applyColorCurve": function(pct) {
      //return pct;
      ////////////////////////////////////////////////////////
      // curve 1
      // computed using wolfram alpha:
      // quadratic fit {0.0,0.0},{0.1,0.2},{0.5, 0.7},{0.7,0.9},{1.0,1.0}
      // -0.851578x^2 + 1.84602x + 0.00888177
      //const result = (-0.851578*pct*pct) + (1.84602*pct) + 0.00888177;
      ////////////////////////////////////////////////////////
      // curve 2
      // quadratic fit {0.0,0.0},{0.1,0.3},{0.5, 0.75},{0.75,0.92},{1.0,1.0}
      // -0.970592x^2 + 1.90818x + 0.0509381
      //const result = (-0.970592*pct*pct) + (1.90818*pct) + 0.0509381;
      ////////////////////////////////////////////////////////
      // curve 3
      // quadratic fit {0.01,0.01},{0.2,0.4},{0.6, 0.75},{1.0,1.0}
      // -0.76991x^2 + 1.73351x + 0.0250757
      const result = (-0.76991*pct*pct) + (1.73351*pct) + 0.0250757;
      ////////////////////////////////////////////////////////
      // curve 4
      // log fit {0.01,0.01},{0.1,0.4},{0.4, 0.75},{0.75,0.92},{1.0,1.0}
      // 0.21566log(88.12x)
      if (result < 0.0) {
        return 0.0;
      }
      if (result > 1.0) {
        return 1.0;
      }
      return result;
    },
    "circles": [{
      "centerX": createInfNum("-0.29"),
      "centerY": infNum(0n, 0n),
      "radSq": createInfNum("0.18")
    },{
      "centerX": createInfNum("-0.06"),
      "centerY": createInfNum("0.22"),
      "radSq": createInfNum("0.13")
    },{
      "centerX": createInfNum("-0.06"),
      "centerY": createInfNum("-0.22"),
      "radSq": createInfNum("0.13")
    },{
      "centerX": createInfNum("-1.0"),
      "centerY": createInfNum("0.0"),
      "radSq": createInfNum("0.04")
    }]
  }
}];

function isComputationComplete() {
  return windowCalc.xPixelChunks.length == 0;// && privContext.resultPoints.length > 0;
}

//function getResults(privContext) {
//  return privContext.resultPoints;
//}

function computeBoundPoints(privContext) {
  // call a function to split the calculation into chunks and kick it off
  runWindowBoundPointsCalculators(privContext);
}

// call the plot's computeBoundPoints function in chunks, to better
//   allow interuptions for long-running calculations
function runWindowBoundPointsCalculators(privContext) {

  // use lineWidth to determine how large to make the calculated/displayed
  //   pixels, so round to integer
  // use Math.round(), not Math.trunc(), because we want the minimum
  //   lineWidth of 0.5 to result in a pixel size of 1
  const pixelSize = Math.round(windowCalc.lineWidth);

  const pixWidth = dContext.canvas.width;
  // use way fewer chunks for larger pixels, which mostly fixes mouse-dragging issues
  var numXChunks = 128;
  if (pixelSize == 64) {
    numXChunks = 1;
  } else if (pixelSize == 32) {
    numXChunks = 1;
  } else if (pixelSize == 16) {
    numXChunks = 32;
  } else if (pixelSize == 8 || pixelSize == 4) {
    numXChunks = 64;
  }
  var pixPerChunk = 1;
  var realPixelsPerChunk = pixWidth/numXChunks;
  var pixPerChunk = Math.trunc(realPixelsPerChunk / pixelSize) + 1;

  // split the x-axis, to break the computation down into interruptable chunks
  var xChunkPix = 0;
  var xChunk = [];
  for (var x = 0; x < pixWidth; x+=pixelSize) {
    xChunkPix++;
    if (xChunkPix > pixPerChunk) {
      windowCalc.xPixelChunks.push(xChunk);
      xChunkPix = 1;
      xChunk = [];
    }
    xChunk.push(x);
  }
  windowCalc.xPixelChunks.push(xChunk);
  windowCalc.totalChunks = windowCalc.xPixelChunks.length;

  waitAndDrawWindow();
}

function computeBoundPointsChunk(sequence, leftEdge, topEdge, rightEdge, bottomEdge, xChunk) {
  chunkStartMs = Date.now();
  const privContext = sequence.privContext;
  var resultPoints = [];

  // use lineWidth to determine how large to make the calculated/displayed
  //   pixels, so round to integer
  // use Math.round(), not Math.trunc(), because we want the minimum
  //   lineWidth of 0.5 to result in a pixel size of 1
  const pixelSize = createInfNum(Math.round(windowCalc.lineWidth).toString());
  const params = historyParams;

  // for each pixel shown, find the abstract coordinates represented by its... center?  edge?
  //const pixWidth = createInfNum(dContext.canvas.width.toString());
  const pixHeight = createInfNum(dContext.canvas.height.toString());

  const width = infNumSub(rightEdge, leftEdge);
  const height = infNumSub(bottomEdge, topEdge);

  var px = 0.0;
  var py = 0.0;
  var x = infNum(0n, 0n);
  for (var i = 0; i < xChunk.length; i++) {
    x = infNum(BigInt(xChunk[i]), 0n);

    px = infNumAdd(infNumMul(windowCalc.eachPixUnits, x), leftEdge);
    var y = infNum(0n, 0n);
    while (infNumLt(y, pixHeight)) {
      const pointPixel = infNumToString(x) + "," + infNumToString(y);
      if (pointPixel in windowCalc.pointsCache) {
        windowCalc.cachedPoints++;
        resultPoints.push(windowCalc.pointsCache[pointPixel]);
      } else {
        py = infNumAdd(infNumMul(windowCalc.eachPixUnits, y), topEdge);

        const pointColor = sequence.computeBoundPointColor(privContext, px, py);
        //console.log("computed point color [" + pointColor + "] for coord [" + pointPixel + "]");

        // x and y are integer (actual pixel) values, with no decimal component
        var point = getColorPoint(parseInt(infNumToString(x)), parseInt(infNumToString(y)), pointColor);
        windowCalc.pointsCache[pointPixel] = point;
        resultPoints.push(point);
      }
      y = infNumAdd(y, pixelSize);
    }
  }
  windowCalc.totalTimeMs += (Date.now() - chunkStartMs);
  windowCalc.totalPoints += resultPoints.length;
  windowCalc.chunksComplete++;
  return {
    "points": resultPoints,
  };
}

const presets = [{
  "seq": "Primes-1-Step-90-turn",
  "v": 1,
  "n": 60000,
  "lineWidth": 1,
  "scale": createInfNum("1.35"),
  "offsetX": createInfNum("0.22"),
  "offsetY": createInfNum("-0.34"),
  "lineColor": "rbgyo",
  "bgColor": "b"
},{
  "seq": "Trapped-Knight",
  "v": 1,
  "n": 2016,
  "lineWidth": 1.5,
  "scale": createInfNum("15.0"),
  "offsetX": createInfNum("0"),
  "offsetY": createInfNum("0"),
  "lineColor": "rbgyo",
  "bgColor": "b"
},{
  "seq": "Primes-1-Step-45-turn",
  "v": 1,
  "n": 32400,
  "lineWidth": 2,
  "scale": createInfNum("10.95"),
  "offsetX": createInfNum("-0.30847"),
  "offsetY": createInfNum("-0.96171"),
  "lineColor": "rbgyo",
  "bgColor": "b"
// this worked fine for a slightly smaller than average window on my computer
},{
  "seq": "Mandelbrot-set",
  "v": 1,
  "n": 450,
  "lineWidth": 1,
  "scale": createInfNum("1465819.0982171979091827284292"),
  "offsetX": createInfNum("-308.168814648192707"),
  "offsetY": createInfNum("-12.1356456670334135"),
  "lineColor": "rbgyo",
  "bgColor": "b"
}];

var menuHtml =
  "<div class='sequence-desc'>" +
    "<b>Presets:</b>";
for (var i = 0; i < presets.length; i++) {
  menuHtml += "<button style='float:none; margin:0.5rem; width:2.0rem;' class='preset-view-btn' id='preset-view-btn-" + (i+1) + "'>" + (i+1) +"</button>";
}
menuHtml += "</div>";
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
var activateSequenceHandler = function(e) {
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
  //drawPoints(historyParams);
};
for (var i = 0; i < viewButtons.length; i++) {
  viewButtons[i].addEventListener('click', activateSequenceHandler);
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

  // const newSeq = sequences[clickedId].name;
  // if (newSeq == historyParams.seq) {
  //   return;
  // }
  // //historyParams.seq = newSeq;
  // var defaults = Object.assign(historyParams, sequences[clickedId].forcedDefaults);
  // defaults.seq = newSeq;
  // replaceHistoryWithParams(defaults);
  // parseUrlParams();
  // start();
  // drawPoints(historyParams);
};
for (var i = 0; i < presetButtons.length; i++) {
  presetButtons[i].addEventListener('click', activatePresetHandler);
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

function getPoint(x, y) {
  return {"x": x, "y": y};
}

function getColor(r, g, b) {
  return {"r": r, "g": g, "b": b};
}

function getColorPoint(x, y, color) {
  return {"x": x, "y": y, "c": color};
}

function parseUrlParams() {
  // for whatever reason, using the URL hash parameters doesn't cause
  //   the page to reload and re-draw the visualization, so we will
  //   use the URL search parameters instead (and use history.pushState
  //   when actually drawing the thing to ensure the URL is kept
  //   up-to-date with what is being drawn without reloading the page)
  var urlParams = new URLSearchParams(document.location.search);

  // default settings are basically preset 1
  var params = {
    "seq": "Primes-1-Step-90-turn",
    "v": 1,
    "n": 60000,
    "lineWidth": 1.0,
    "scale": createInfNum("1.35"),
    "offsetX": createInfNum("0.22"),
    "offsetY": createInfNum("-0.34"),
    "lineColor": "rbgyo",
    "bgColor": "b"
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
      params.n = parseInt(urlParams.get('n'));
      if (params.n < 0) {
        params.n = 100;
      }
    }
    if (urlParams.has('scale')) {
      //params.scale = infNumTruncate(createInfNum(urlParams.get('scale')));
      params.scale = createInfNum(urlParams.get('scale'));
    }
    if (urlParams.has('offsetX')) {
      //params.offsetX = infNumTruncate(createInfNum(urlParams.get('offsetX')));
      params.offsetX = createInfNum(urlParams.get('offsetX'));
    }
    if (urlParams.has('offsetY')) {
      //params.offsetY = infNumTruncate(createInfNum(urlParams.get('offsetY')));
      params.offsetY = createInfNum(urlParams.get('offsetY'));
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
      params.lineWidth = sanityCheckLineWidth(parseFloat(urlParams.get('lineWidth')) || 1.0, false, sequencesByName[params.seq]);
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
  if (windowCalc.timeout != null) {
    window.clearTimeout(windowCalc.timeout);
  }

  // thanks to https://stackoverflow.com/a/1232046/259456
  points.length = 0;

  const params = historyParams;

  if (! params.seq in sequencesByName) {
    console.log("invalid seq parameter: no such sequence [" + params.seq + "]");
    return;
  }

  indicateActiveSequence();

  setDScaleVars(dContext);

  // run the selected sequence
  const sequence = sequencesByName[params.seq];
  if (sequence.calcFrom == "sequence") {
    const out = sequence.computePointsAndLength(sequence.privContext);

    // copy the results
    totalLength = out.length;
    for (var i = 0; i < out.points.length; i++) {
      points.push(out.points[i]);
    }

    drawPoints(params);
  } else if (sequence.calcFrom == "window") {
    resetWindowCalcCache();
    resetWindowCalcContext();
    calculateAndDrawWindow();
  } else {
    alert("Unexpected \"calcFrom\" field for the sequence: [" + sequence.calcFrom + "]");
  }

};

var pixelColor = function(imgData, x, y) {
  var red = imgData.data[((width * y) + x) * 4];
  var green = imgData.data[((width * y) + x) * 4 + 1];
  var blue = imgData.data[((width * y) + x) * 4 + 2];
  return [red, green, blue];
}

const bgColorSchemes = {
  "b": "rgba(0,0,0,1.0)",
  "g": "rgba(51,51,51,1.0)", //"#333333",
  "w": "rgba(255,255,255,1.0)"//"#FFFFFF"
}

const bgColorSchemeNames = [];
for (name in bgColorSchemes) {
  bgColorSchemeNames.push(name);
}

function getBgColor() {
  if (historyParams.bgColor in bgColorSchemes) {
    return bgColorSchemes[historyParams.bgColor];
  } else {
    return "rgba(0,0,0,1.0)";
  }
}

function fillBg(ctx) {
  var canvas = ctx.canvas;
  ctx.fillStyle = getBgColor();
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
  var paramsCopy = Object.assign({}, params);
  paramsCopy.scale = infNumToString(params.scale);
  paramsCopy.offsetX = infNumToString(infNumTruncate(params.offsetX));
  paramsCopy.offsetY = infNumToString(infNumTruncate(params.offsetY));
  history.replaceState("", document.title, document.location.pathname + "?" + new URLSearchParams(paramsCopy).toString());
  replaceStateTimeout = null;
};

var replaceHistory = function() {
  replaceHistoryWithParams(historyParams);
};

var pushToHistory = function() {
  var paramsCopy = Object.assign({}, historyParams);
  paramsCopy.scale = infNumToString(params.scale);
  paramsCopy.offsetX = infNumToString(infNumTruncate(params.offsetX));
  paramsCopy.offsetY = infNumToString(infNumTruncate(params.offsetY));
  // no need to replaceState() here -- we'll replaceState() on param
  //   changes except for mouse dragging, which happen too fast
  history.pushState("", document.title, document.location.pathname + "?" + new URLSearchParams(paramsCopy).toString());
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
    const red = 200 - parseInt(startPercentage * 80);
    return "rgba(" + red + "," + (red * 0.2) + "," + (red * 0.2) + ",1.0)";
  },
  "o": function c(startPercentage) { // orange
    const red = 200 - parseInt(startPercentage * 80);
    return "rgba(" + red + "," + (red * 0.5) + ",0,1.0)";
  },
  "y": function c(startPercentage) { // yellow
    const red = 200 - parseInt(startPercentage * 80);
    return "rgba(" + red + "," + red + ",0,1.0)";
  },
  "g": function c(startPercentage) { // green
    const green = 200 - parseInt(startPercentage * 80);
    return "rgba(" + (green * 0.1) + "," + green + "," + (green * 0.1) + ",1.0)";
  },
  "b": function c(startPercentage) { // blue
    const blue = 200 - parseInt(startPercentage * 80);
    return "rgba(" + (blue * 0.1) + "," + (blue * 0.1) + "," + blue + ",1.0)";
  },
  "p": function c(startPercentage) { // purple
    const blue = 200 - parseInt(startPercentage * 80);
    return "rgba(" + blue + "," + (blue * 0.1) + "," + blue + ",1.0)";
  },
  "dg": function c(startPercentage) { // dark gray
    const c = 60 - parseInt(startPercentage * 30);
    return "rgba(" + c + "," + c + "," + c + ",1.0)";
  },
  "lg": function c(startPercentage) { // light gray
    const c = 200 - parseInt(startPercentage * 80);
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

function redraw() {
  const sequence = sequencesByName[historyParams.seq];
  if (sequence.calcFrom == "sequence") {
    drawPoints(historyParams);
  } else if (sequence.calcFrom == "window") {
    //console.log("resetting windowCalc...");
    resetWindowCalcContext();
    calculateAndDrawWindow();
  }
}

function infNumToFloat(n) {
  return parseFloat(infNumToString(n));
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
  // this function is only used for drawing sequence plots,
  //   so lots of precision for scale and offset isn't needed,
  // convert scale, offsetX, and offsetY to float
  const scale = infNumToFloat(params.scale);
  const offsetX = canvas.width * (0.5 + infNumToFloat(params.offsetX));
  const offsetY = canvas.height * (0.5 + infNumToFloat(params.offsetY));

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
        drawnLength += Math.hypot(segmentX, segmentY);
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

function resetWindowCalcCache() {
  windowCalc.pointsCache = {};
}

function resetWindowCalcContext() {
  if (windowCalc.timeout != null) {
    window.clearTimeout(windowCalc.timeout);
  }
  fillBg(dContext);

  const params = historyParams;
  windowCalc.seqName = params.seq;

  // since line width is halved each time the draw occurs, use 128 to get
  //   the initial draw to use a 64-wide pixels
  windowCalc.lineWidth = 128;
  windowCalc.pixelsImage = dContext.createImageData(dContext.canvas.width, dContext.canvas.height);
  windowCalc.xPixelChunks = [];
  windowCalc.resultPoints = [];
  windowCalc.pointsBounds = "";
  windowCalc.totalTimeMs = 0;
  windowCalc.totalPoints = 0;
  windowCalc.cachedPoints = 0;
  windowCalc.chunksComplete = 0;
  windowCalc.totalChunks = 0;

  const fiftyPct = createInfNum("0.5");

  const canvasWidth = createInfNum(dContext.canvas.offsetWidth.toString());
  const canvasHeight = createInfNum(dContext.canvas.offsetHeight.toString());

  // rather than calculate this for each chunk, compute it once here
  windowCalc.eachPixUnits = infNumDiv(infNum(1n, 0n), params.scale);

  // find the visible abstract points using offset and scale
  const scaledWidth = infNumDiv(canvasWidth, params.scale);
  const offsetXPct = infNumAdd(fiftyPct, params.offsetX);
  const rightEdge = infNumSub(scaledWidth, infNumMul(scaledWidth, offsetXPct));
  const leftEdge = infNumSub(rightEdge, scaledWidth);

  const scaledHeight = infNumDiv(canvasHeight, params.scale);
  const offsetYPct = infNumAdd(fiftyPct, params.offsetY);
  const bottomEdge = infNumSub(scaledHeight, infNumMul(scaledHeight, offsetYPct));
  const topEdge = infNumSub(bottomEdge, scaledHeight);

  // only clear cache if iterations have changed or if any edge has moved
  // this allows cache to be re-used when changing colors
  if ( windowCalc.n != params.n ||
      !infNumEq(windowCalc.leftEdge, leftEdge) ||
      !infNumEq(windowCalc.topEdge, topEdge) ||
      !infNumEq(windowCalc.rightEdge, rightEdge) ||
      !infNumEq(windowCalc.bottomEdge, bottomEdge)) {
    windowCalc.pointsCache = {};
  }

  windowCalc.n = params.n;
  windowCalc.leftEdge = leftEdge;
  windowCalc.topEdge = topEdge;
  windowCalc.rightEdge = rightEdge;
  windowCalc.bottomEdge = bottomEdge;
}

function calculateAndDrawWindow() {
  drawCalculatingNotice(dContext);
  // thanks to https://stackoverflow.com/a/5521412/259456
  // hand control back to the browser to allow canvas to actually show
  //   the "calculating" text
  window.setTimeout(calculateAndDrawWindowInner, 50);
}

function calculateAndDrawWindowInner() {
  const params = historyParams;

  const sequence = sequencesByName[params.seq];

  const roundedParamLineWidth =  Math.round(params.lineWidth);
  const potentialTempLineWidth = Math.round(windowCalc.lineWidth / 2);
  if (potentialTempLineWidth <= roundedParamLineWidth) {
    windowCalc.lineWidth = roundedParamLineWidth;
  } else {
    windowCalc.lineWidth = potentialTempLineWidth;
  }

  // this calls some functions that will later call other functions
  //   to incrementally compute and display the results
  computeBoundPoints(sequence.privContext);
}

function waitAndDrawWindow() {
  const sequence = sequencesByName[windowCalc.seqName];

  var nextXChunk = windowCalc.xPixelChunks.shift();
  const isFinished = isComputationComplete();
  
  if (nextXChunk) {
    const out = computeBoundPointsChunk(sequence, windowCalc.leftEdge, windowCalc.topEdge, windowCalc.rightEdge, windowCalc.bottomEdge, nextXChunk);

    // copy the results
    for (var i = 0; i < out.points.length; i++) {
      points.push(out.points[i]);
    }

    // draw the results
    drawColorPoints();
    if (!isFinished) {
      drawCalculatingNotice(dContext);
    }
  }

  if (windowCalc.timeout != null) {
    window.clearTimeout(windowCalc.timeout);
  }

  // if the calculation is not finished, schedule another chunk to be calculated
  if (isFinished) {
    if (windowLogTiming) {
      console.log("computing [" + windowCalc.totalPoints + "] points, of which [" + windowCalc.cachedPoints + "] were cached, took [" + windowCalc.totalTimeMs + "] ms");
    }
  } else {
    windowCalc.timeout = window.setTimeout(waitAndDrawWindow, 25);
    return;
  }

  // if line width just finished is greater than the param lineWidth,
  //   we have to do it again
  // otherwise, we are done
  if (Math.round(windowCalc.lineWidth) > Math.round(historyParams.lineWidth)) {
    windowCalc.chunksComplete = 0;
    windowCalc.timeout = window.setTimeout(calculateAndDrawWindow, 250);
  }
}

function drawColorPoints() {
  // change URL bar to reflect current params, only if no params change
  //   for 1/4 second
  if (replaceStateTimeout != null) {
    window.clearTimeout(replaceStateTimeout);
  }
  replaceStateTimeout = window.setTimeout(replaceHistory, 250);

  const pixelSize = Math.round(windowCalc.lineWidth);
  const canvas = dContext.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const pixelsImage = windowCalc.pixelsImage;
  for (var i = 0; i < points.length; i++) {
    // use lineWidth param as "resolution":
    //   1 = 1  pixel  drawn per point
    //   2 = 2  pixels drawn per point
    //  10 = 10 pixels drawn per point
    const resX = points[i].x;
    const resY = points[i].y;
    const colorPct = points[i].c;
    var pointColor = getBgColor();
    if (colorPct >= 0) {
      pointColor = getLineColor(colorPct, historyParams.lineColor);
    }
    const rgba = pointColor.substr(5).split(',');
    pointColor = getColor(parseInt(rgba[0]),parseInt(rgba[1]),parseInt(rgba[2]));
    var pixelOffsetInImage = 0;
    for (var x = 0; x < pixelSize; x++) {
      // there may be a more efficient way to break early when pixels
      //   would extend beyond the edge of the canvas, other than
      //   checking every single pixel
      if (resX + x >= width) {
        break;
      }
      for (var y = 0; y < pixelSize; y++) {
        // there may be a more efficient way to break early when pixels
        //   would extend beyond the edge of the canvas, other than
        //   checking every single pixel
        if (resY + y >= height) {
          break;
        }
        pixelOffsetInImage = (((resY+y) * width) + (resX+x)) * 4;
        pixelsImage.data[pixelOffsetInImage+0] = pointColor.r;
        pixelsImage.data[pixelOffsetInImage+1] = pointColor.g;
        pixelsImage.data[pixelOffsetInImage+2] = pointColor.b;
        pixelsImage.data[pixelOffsetInImage+3] = 255; // alpha
      }
    }
  }
  dContext.putImageData(pixelsImage, 0, 0);
}

function drawCalculatingNotice(ctx) {
  const canvas = ctx.canvas;
  ctx.fillStyle = "rgba(100,100,100,0.7)";
  const noticeHeight = Math.max(24, canvas.height * 0.03);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 18);
  ctx.fillRect(0,canvas.height-noticeHeight,noticeWidth, noticeHeight);
  ctx.font = textHeight + "px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  const percentComplete = Math.round(windowCalc.chunksComplete * 100.0 / windowCalc.totalChunks);
  ctx.fillText("Calculating " + windowCalc.lineWidth + "-wide pixels (" + percentComplete + "%) ...", Math.round(noticeHeight*0.2), canvas.height - Math.round(noticeHeight* 0.2));
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
//  var val = Math.round(historyParams[fieldName] * 100.0);
//  val += nPercent;
//  historyParams[fieldName] = parseFloat(val / 100.0);

  const pct = infNumMul(historyParams[fieldName], infNum(100n, 0n));
  const newPct = infNumAdd(pct, createInfNum(nPercent.toString()));
  const roundedStr = infNumToString(newPct).split('.')[0];
  const rounded = infNumDiv(createInfNum(roundedStr), infNum(100n, 0n));
  //historyParams[fieldName] = infNumTruncate(rounded);
  historyParams[fieldName] = rounded;
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

function roundTo2Decimals(f) {
  var val = Math.round(f * 100.0);
  return parseFloat(val / 100.0);
}

function roundTo5Decimals(f) {
  var val = Math.round(f * 100000.0);
  return parseFloat(val / 100000.0);
}

function sanityCheckLineWidth(w, circular, sequence) {
  // window plots use lineWidth to determine how many pixels to
  //  display for each calculated pixel, so allow larger values
  //  for that
  if (w < 0.5) {
    return 0.5;
  }
  if (sequence.calcFrom == "window") {
    if (w > 64.0) {
      if (circular) {
        return 0.5;
      } else {
        return 64.0;
      }
    }
  } else {
    if (w > 20.0) {
      if (circular) {
        return 0.5;
      } else {
        return 20.0;
      }
    }
  }
  return w;
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
    redraw();
  } else if (e.keyCode == 68 /* d */) {
    addParamPercentAndRound("offsetX", -10);
    redraw();
  } else if (e.keyCode == 37 /* left arrow */) {
    addParamPercentAndRound("offsetX", 1);
    redraw();
  } else if (e.keyCode == 65 /* a */) {
    addParamPercentAndRound("offsetX", 10);
    redraw();
  } else if (e.keyCode == 38 /* up arrow */) {
    addParamPercentAndRound("offsetY", 1);
    redraw();
  } else if (e.keyCode == 87 /* w */) {
    addParamPercentAndRound("offsetY", 10);
    redraw();
  } else if (e.keyCode == 40 /* down arrow */) {
    addParamPercentAndRound("offsetY", -1);
    redraw();
  } else if (e.keyCode == 83 /* s */) {
    addParamPercentAndRound("offsetY", -10);
    redraw();
  } else if (e.keyCode == 61 || e.keyCode == 107 /* plus */) {
    applyParamPercent("scale", "1.01");
    redraw();
  } else if (e.keyCode == 173 || e.keyCode == 109 /* minus */) {
    applyParamPercent("scale", "0.99");
    if (infNumLt(historyParams.scale, infNum(1n, -2n))) {
      historyParams.scale = createInfNum("0.01");
    }
    redraw();
  } else if (e.keyCode == 69 /* e */) {
    applyParamPercent("scale", "1.05");
    redraw();
  } else if (e.keyCode == 81 /* q */) {
    applyParamPercent("scale", "0.95");
    if (infNumLt(historyParams.scale, infNum(0n, 0n))) {
      historyParams.scale = createInfNum("0.01");
    }
    redraw();
  } else if (e.keyCode == 67 /* c */) {
    historyParams.offsetX = createInfNum("0");
    historyParams.offsetY = createInfNum("0");
    redraw();
  } else if (e.keyCode == 77 /* m */) {
    if (sequencesByName[historyParams.seq].calcFrom == "sequence") {
      historyParams.n += 500;
    } else {
      historyParams.n += 100;
    }
    start();
  } else if (e.keyCode == 78 /* n */) {
    if (sequencesByName[historyParams.seq].calcFrom == "sequence") {
      if (historyParams.n > 100) {
        historyParams.n -= 100
      }
    } else {
      if (historyParams.n > 10) {
        historyParams.n -= 10
      }
    }
    start();
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

    redraw();
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
    redraw();
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
    // for all plots, force application of their defaults
    var defaults = Object.assign(historyParams, sequences[seqNum].forcedDefaults);
    replaceHistoryWithParams(defaults);
    parseUrlParams();
    start();
  } else if (e.keyCode == 90 /* z */) {
    // use Math.round() instead of parseInt() because, for example:
    //   parseInt(0.29 * 100.0)   --> 28
    //   Math.round(0.29 * 100.0) --> 29
    var valPct = Math.round(historyParams.lineWidth * 100.0);
    valPct += 50;
    historyParams.lineWidth = parseFloat(valPct / 100.0);

    historyParams.lineWidth = sanityCheckLineWidth(historyParams.lineWidth, true, sequencesByName[historyParams.seq]);
    if (sequencesByName[historyParams.seq].calcFrom == "window") {
      // changing the lineWidth for a window plot means we need to re-calculate
      start();
    } else {
      redraw();
    }
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
    activatePreset(presets[0]);
  } else if (e.keyCode == 50 || e.keyCode == 98 /* 2 */) {
    activatePreset(presets[1]);
  } else if (e.keyCode == 51 || e.keyCode == 99 /* 3 */) {
    activatePreset(presets[2]);
  // re-enable this preset once offsets are refactored
  //} else if (e.keyCode == 52 || e.keyCode == 100 /* 4 */) {
  //  activatePreset(presets[3]);
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
    redraw();
  }, 500);
});

// thanks to https://stackoverflow.com/a/11183333/259456 for
//   general ideas on pinch detection
var mouseDownHandler = function(e) {
  // this might help prevent strange ios/mobile weirdness
  e.preventDefault();
  // if 2 or more fingers touched
  if ("touches" in e && "1" in e.touches) {
    pinch = true;
    pinchStartDist = Math.hypot(e.touches['0'].pageX - e.touches['1'].pageX, e.touches['0'].pageY - e.touches['1'].pageY);
  }
  mouseDrag = true;
  mouseDragX = e.pageX;
  mouseDragY = e.pageY;
};
dCanvas.addEventListener("mousedown", mouseDownHandler);
dCanvas.addEventListener("touchstart", mouseDownHandler);

var mouseMoveHandler = function(e) {
  // this might help prevent strange ios/mobile weirdness
  e.preventDefault();
  if (!mouseDrag) {
    return;
  }

  // always mouse drag to perform pan, even if pinch zooming (it's nice
  //    to be able to pinch zoom and pan in one gesture)
  const newX = e.pageX;
  const newY = e.pageY;
  const diffX = (mouseDragX - newX) / dCanvas.width;
  const diffY = (mouseDragY - newY) / dCanvas.height;
  historyParams.offsetX = infNumSub(historyParams.offsetX, createInfNum(diffX.toString()));
  historyParams.offsetY = infNumSub(historyParams.offsetY, createInfNum(diffY.toString()));
  mouseDragX = newX;
  mouseDragY = newY;

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
    if (sequencesByName[historyParams.seq].calcFrom == "sequence") {
      if (infNumLt(newScale, minSeqScale)) {
        historyParams.scale = minSeqScale;
      } else if (infNumGt(newScale, maxSeqScale)) {
        historyParams.scale = maxSeqScale;
      } else {
        historyParams.scale = newScale;
      }
    // for window plots, use full-precision scale
    } else {
      historyParams.scale = newScale;
    }

    // see "wheel" event below for explanation of centering the zoom in/out from the mouse/pinch point
//    const newOffsetX = ((midX-(dCanvas.width  * (0.5 + historyParams.offsetX)))/oldScale) * ((oldScale - historyParams.scale)/dCanvas.width)  + historyParams.offsetX;
//    const newOffsetY = ((midY-(dCanvas.height * (0.5 + historyParams.offsetY)))/oldScale) * ((oldScale - historyParams.scale)/dCanvas.height) + historyParams.offsetY;
//    historyParams.offsetX = roundTo5Decimals(newOffsetX);
//    historyParams.offsetY = roundTo5Decimals(newOffsetY);

    const newOffsetX = calculateNewZoomOffset(createInfNum(midX.toString()), createInfNum(dCanvas.width.toString()),  historyParams.offsetX, oldScale, historyParams.scale);
    const newOffsetY = calculateNewZoomOffset(createInfNum(midY.toString()), createInfNum(dCanvas.height.toString()), historyParams.offsetY, oldScale, historyParams.scale);
    historyParams.offsetX = newOffsetX;
    historyParams.offsetY = newOffsetY;
  }

  redraw();
};
dCanvas.addEventListener("mousemove", mouseMoveHandler);
dCanvas.addEventListener("touchmove", mouseMoveHandler);

var mouseUpHandler = function(e) {
  // this might help prevent strange ios/mobile weirdness
  e.preventDefault();
  mouseDrag = false;
  // apparently pinch zoom gestures don't really use touchend event, but it's
  //   a good time to end a pinch gesture
  pinch = false;
};
dCanvas.addEventListener("mouseup", mouseUpHandler);
dCanvas.addEventListener("touchend", mouseUpHandler);

dCanvas.addEventListener("wheel", function(e) {
  // set 48 wheelDeltaY units as 5% zoom (in or out)
  // so -48 is 95% zoom, and +96 is 110% zoom
  const oldScale = historyParams.scale;
  var newScaleFactor = createInfNum((1.0 + ((e.wheelDeltaY / 48) * 0.05)).toString());
  if (infNumLt(newScaleFactor, createInfNum("0"))) {
    console.log("NEGATIVE scale factor would have been applied: [" + infNumToString(newScaleFactor) + "]");
    newScaleFactor = createInfNum("0.05");
  }
  const newScale = infNumMul(historyParams.scale, newScaleFactor);

  const maxSeqScale = createInfNum("500");
  const minSeqScale = createInfNum("0.00005");
  if (sequencesByName[historyParams.seq].calcFrom == "sequence") {
    if (infNumLt(newScale, minSeqScale)) {
      historyParams.scale = minSeqScale;
    } else if (infNumGt(newScale, maxSeqScale)) {
      historyParams.scale = maxSeqScale;
    } else {
      historyParams.scale = newScale;
    }
  // for window plots, use full-precision scale, though truncate later when writing in the URL
  } else {
    //historyParams.scale = infNumTruncate(newScale);
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

  // this is a mess, but it works (for default javascript floating point math)
  // replaced with infNum implementation below
  //const newOffsetX = ((e.pageX-(dCanvas.width  * (0.5 + historyParams.offsetX)))/oldScale) * ((oldScale - historyParams.scale)/dCanvas.width)  + historyParams.offsetX;
  //const newOffsetY = ((e.pageY-(dCanvas.height * (0.5 + historyParams.offsetY)))/oldScale) * ((oldScale - historyParams.scale)/dCanvas.height) + historyParams.offsetY;

//  const offsetXPct = infNumAdd(createInfNum("0.5"), historyParams.offsetX);
//  const offsetYPct = infNumAdd(createInfNum("0.5"), historyParams.offsetY);
//
//  const offsetXCanvas = infNumMul(createInfNum(dCanvas.width.toString()), offsetXPct);
//  const offsetYCanvas = infNumMul(createInfNum(dCanvas.height.toString()), offsetYPct);
//
//  const mouseXCanvas = infNumSub(createInfNum(e.pageX.toString()), offsetXCanvas);
//  const mouseYCanvas = infNumSub(createInfNum(e.pageY.toString()), offsetYCanvas);
//
//  const oldScaleMouseX = infNumDiv(mouseXCanvas, oldScale);
//  const oldScaleMouseY = infNumDiv(mouseYCanvas, oldScale);
//
//  const scaleDiff = infNumSub(oldScale, historyParams.scale);
//  const scaleDiffX = infNumDiv(scaleDiff, createInfNum(dCanvas.width.toString()));
//  const scaleDiffY = infNumDiv(scaleDiff, createInfNum(dCanvas.height.toString()));
//
//  const newOffsetX = infNumAdd(infNumMul(oldScaleMouseX, scaleDiffX), historyParams.offsetX);
//  const newOffsetY = infNumAdd(infNumMul(oldScaleMouseY, scaleDiffY), historyParams.offsetY);

  const newOffsetX = calculateNewZoomOffset(createInfNum(e.pageX.toString()), createInfNum(dCanvas.width.toString()),  historyParams.offsetX, oldScale, historyParams.scale);
  const newOffsetY = calculateNewZoomOffset(createInfNum(e.pageY.toString()), createInfNum(dCanvas.height.toString()), historyParams.offsetY, oldScale, historyParams.scale);

  //historyParams.offsetX = roundTo5Decimals(newOffsetX);
  //historyParams.offsetY = roundTo5Decimals(newOffsetY);
  historyParams.offsetX = newOffsetX;
  historyParams.offsetY = newOffsetY;

  redraw();
});

// all arguments must be infNum
//
//const newOffsetY = ((e.pageY-(dCanvas.height * (0.5 + historyParams.offsetY)))/oldScale) * ((oldScale - historyParams.scale)/dCanvas.height) + historyParams.offsetY;
function calculateNewZoomOffset(relativeToPosition, canvasSize, oldOffset, oldScale, newScale) {
  const fiftyPct = createInfNum("0.5");
  const offsetXPct = infNumAdd(fiftyPct, oldOffset);

  const offsetXCanvas = infNumMul(canvasSize, offsetXPct);

  const mouseXCanvas = infNumSub(relativeToPosition, offsetXCanvas);

  const oldScaleMouseX = infNumDiv(mouseXCanvas, oldScale);

  const scaleDiff = infNumSub(oldScale, newScale);
  const scaleDiffX = infNumDiv(scaleDiff, canvasSize);

  //return infNumTruncate(infNumAdd(infNumMul(oldScaleMouseX, scaleDiffX), oldOffset));
  return infNumAdd(infNumMul(oldScaleMouseX, scaleDiffX), oldOffset);
}

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
  hideFooter();
  document.getElementById('menu').style.display = 'none';
  document.getElementById('menu-open-wrap').style.display = 'block';
}

function openMenu() {
  menuVisible = true;
  closeHelpMenu();
  showFooter()
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
  showFooter();
  helpVisible = true;
  document.getElementById('help-menu').style.display = 'block';
  document.getElementById('menu-open-wrap').style.display = 'none';
}

function showFooter() {
  document.getElementById('footer').style.display = 'block';
}

function hideFooter() {
  document.getElementById('footer').style.display = 'none';
}

parseUrlParams();
start();
