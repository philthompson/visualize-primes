// do linting at https://jshint.com
/* jshint esversion: 11 */
const points = [];
var totalLength = 0;

const dCanvas = document.getElementById('dc');
const dContext = dCanvas.getContext('2d');
var mouseDrag = false;
var mouseDragX = 0;
var mouseDragY = 0;
var pinch = false;
var pinchStartDist = 0;
var showMousePosition = false;
var shiftPressed = false;
var commandPressed = false;

var historyParams = {};
var replaceStateTimeout = null;
var historyTimeout = null;
var resizeTimeout = null;
var helpVisible = false;
var menuVisible = false;

const doUnitTests = true;
const windowLogTiming = true;
const mandelbrotCircleHeuristic = false;
var truncateLength = 24;
var mandelbrotFloat = false;
const windowCalcIgnorePointColor = -2;
var builtGradient = null;

const windowCalc = {
  "timeout": null,
  "plotName": "",
  "lineWidth": 0,
  "xPixelChunks": [],
  "resultPoints": [],
  "pointsBounds": "",
  "pointsCache": {},
  "passTimeMs": 0,
  "totalTimeMs": 0,
  "startTimeMs": 0,
  "endTimeMs": 0,
  "totalPoints": 0,
  "cachedPoints": 0,
  "chunksComplete": 0,
  "totalChunks": 0,
  "eachPixUnits": infNum(1n, 0n),
  "leftEdge": infNum(0n, 0n),
  "topEdge": infNum(0n, 0n),
  "rightEdge": infNum(0n, 0n),
  "bottomEdge": infNum(0n, 0n),
  "leftEdgeFloat": 0.0,
  "topEdgeFloat": 0.0,
  "n": 1,
  "scale": infNum(1n, 0n),
  "runtimeMs": -1,
  "avgRuntimeMs": -1
};
var windowCalcRepeat = 0;
var windowCalcTimes = [];
var imageParametersCaption = false;

const inputGotoTopLeftX = document.getElementById("go-to-tl-x");
const inputGotoTopLeftY = document.getElementById("go-to-tl-y");
const inputGotoBotRightX = document.getElementById("go-to-br-x");
const inputGotoBotRightY = document.getElementById("go-to-br-y");
const inputGotoCenterX = document.getElementById("go-to-c-x");
const inputGotoCenterY = document.getElementById("go-to-c-y");
const inputGotoScale = document.getElementById("go-to-scale");
const btnGotoBoundsGo = document.getElementById("go-to-b-go");
const btnGotoBoundsReset = document.getElementById("go-to-b-reset");
const btnGotoCenterGo = document.getElementById("go-to-c-go");
const btnGotoCenterReset = document.getElementById("go-to-c-reset");
const inputGradGrad = document.getElementById("grad-grad");
const btnGradGo = document.getElementById("grad-go");
const btnGradReset = document.getElementById("grad-reset");

// this is checked each time a key is pressed, so keep it
//   here so we don't have to do a DOM query every time
const inputFields = document.getElementsByTagName("input");

function infNum(value, exponent) {
  return {"v": value, "e": exponent};
}

function trimZeroesOld(stringNum) {
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

function trimZeroes(stringNum) {
  var parts = stringNum.trim().split('.');
  const negative = parts[0].startsWith('-');
  if (negative) {
    parts[0] = parts[0].substr(1);
  }
  let leadingZeroes = 0;
  for (let i = 0; i < parts[0].length - 1; i++) {
    if (parts[0].charAt(i) === '0') {
      leadingZeroes++;
    } else {
      break;
    }
  }
  parts[0] = parts[0].substring(leadingZeroes);
  if (parts[0].length == 0) {
    parts[0] = "0";
  }
  if (negative) {
    parts[0] = "-" + parts[0];
  }
  if (parts.length == 1 || parts[1].length == 0) {
    return parts[0];
  }
  let trailingZeroes = 0;
  for (let i = parts[1].length - 1; i >= 0; i--) {
    if (parts[1].charAt(i) === '0') {
      trailingZeroes--;
    } else {
      break;
    }
  }
  if (trailingZeroes < 0) {
    parts[1] = parts[1].slice(0, trailingZeroes);
    if (parts[1].length == 0) {
      return parts[0];
    }
  }
  return parts[0] + "." + parts[1];
}

if (doUnitTests) {
  let unitTest = "50000";
  console.log("trimZeroes(\"" + unitTest + "\") = [" + trimZeroes(unitTest) + "] // 50000");

  unitTest = "050";
  console.log("trimZeroes(\"" + unitTest + "\") = [" + trimZeroes(unitTest) + "] // 50");

  unitTest = "-050";
  console.log("trimZeroes(\"" + unitTest + "\") = [" + trimZeroes(unitTest) + "] // -50");

  unitTest = "-022.00";
  console.log("trimZeroes(\"" + unitTest + "\") = [" + trimZeroes(unitTest) + "] // -22");

  unitTest = "022.002200";
  console.log("trimZeroes(\"" + unitTest + "\") = [" + trimZeroes(unitTest) + "] // 22.0022");

  unitTest = "-22.002200";
  console.log("trimZeroes(\"" + unitTest + "\") = [" + trimZeroes(unitTest) + "] // -22.0022");

  unitTest = "000.002200";
  console.log("trimZeroes(\"" + unitTest + "\") = [" + trimZeroes(unitTest) + "] // 0.0022");

  unitTest = "-.0022";
  console.log("trimZeroes(\"" + unitTest + "\") = [" + trimZeroes(unitTest) + "] // -0.0022");

  unitTest = "5.";
  console.log("trimZeroes(\"" + unitTest + "\") = [" + trimZeroes(unitTest) + "] // 5");
}

function createInfNum(stringNum) {
  if (stringNum.includes("e") || stringNum.includes("E")) {
    const split = replaceAllEachChar(stringNum, ", ", "").replaceAll("E", "e").split("e");
    let value = split[0];
    let exponent = 0;
    if (value.includes(".")) {
      let valSplit = value.split(".");
      exponent -= valSplit[1].length;
      value = valSplit[0] + valSplit[1];
    }
    exponent += parseInt(split[1]);
    return infNum(BigInt(value), BigInt(exponent));
  } else {
    var trimmed = trimZeroes(stringNum);
    const parts = trimmed.split('.');
    if (parts.length == 1) {
      return infNum(BigInt(parts[0]), 0n);
    }
    return infNum(BigInt(parts[0] + "" + parts[1]), BigInt("-" + parts[1].length));
  }
}

if (doUnitTests) {
  console.log(createInfNum("0.0"));
  console.log(createInfNum("0"));
  console.log(createInfNum("123"));
  console.log(createInfNum("123.456"));
  console.log(createInfNum("  3 "));
  console.log(createInfNum("  123456789.000000000012345"));
  console.log(createInfNum("  -4.00321"));
  console.log(createInfNum("  -0.009 "));
  let unitTest = "123e4";
  console.log("createInfNum(" + unitTest + ") = ... // (123n, 4n)");
  console.log(createInfNum(unitTest));

  unitTest = "1.23e4";
  console.log("createInfNum(" + unitTest + ") = ... // (123n, 2n)");
  console.log(createInfNum(unitTest));

  unitTest = "5. E22";
  console.log("createInfNum(" + unitTest + ") = ... // (5n, 22n)");
  console.log(createInfNum(unitTest));

  unitTest = "  1.23 e -10";
  console.log("createInfNum(" + unitTest + ") = ... // (123n, -12n)");
  console.log(createInfNum(unitTest));

  unitTest = "  1,234 E -10";
  console.log("createInfNum(" + unitTest + ") = ... // (1234n, -10n)");
  console.log(createInfNum(unitTest));
}

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

if (doUnitTests) {
  console.log("100 * 1.5 = ... // 150 (1500, -1)");
  console.log(infNumMul(createInfNum("100"), createInfNum("1.5")));

  console.log("123.5 * 1.5 = ... // 185.25 (18525, -2)");
  console.log(infNumMul(createInfNum("123.5"), createInfNum("1.5")));

  console.log("123.5 * 1.5 = ... // 185.25 (18525, -2)");
  console.log(infNumMul(createInfNum("123.5"), createInfNum("1.5")));

  console.log("15000 * 0.0006 = ... // 9 (9, 0)");
  console.log(infNumMul(createInfNum("15000"), createInfNum("0.0006")));
}

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

if (doUnitTests) {
  console.log("100 and 123.456"); // (100000, -3) and (123456, -3)
  console.log(normInfNum(createInfNum("100"), createInfNum("123.456")));

  console.log("0.0321 and 5"); // (321, -4) and (50000, -4)
  console.log(normInfNum(createInfNum("0.0321"), createInfNum("5")));

  console.log("22 and 5"); // (22, 0) and (5, 0)
  console.log(normInfNum(createInfNum("22"), createInfNum("5")));
}

// more optimized way to normalize this number of InfNums with each other
// no loops, and minimum number of if statements
// the first arg, only, is copied and returned
function normInPlaceInfNum(argA, b, c, d, e, f) {
  let a = copyInfNum(argA);
  // assume they do not already all have same the exponent to save all the checking
  let smallestExponent = a.e;
  if (b.e < smallestExponent) {
    smallestExponent = b.e;
  }
  if (c.e < smallestExponent) {
    smallestExponent = c.e;
  }
  if (d.e < smallestExponent) {
    smallestExponent = d.e;
  }
  if (e.e < smallestExponent) {
    smallestExponent = e.e;
  }
  if (f.e < smallestExponent) {
    smallestExponent = f.e;
  }
  // multiply all values by 10^diff, and reduce each exponent accordingly,
  //   to get all matching exponents
  let expDiff = a.e - smallestExponent;
  a.v = a.v * (10n ** expDiff);
  a.e = a.e - expDiff;
  expDiff = b.e - smallestExponent;
  b.v = b.v * (10n ** expDiff);
  b.e = b.e - expDiff;
  expDiff = c.e - smallestExponent;
  c.v = c.v * (10n ** expDiff);
  c.e = c.e - expDiff;
  expDiff = d.e - smallestExponent;
  d.v = d.v * (10n ** expDiff);
  d.e = d.e - expDiff;
  expDiff = e.e - smallestExponent;
  e.v = e.v * (10n ** expDiff);
  e.e = e.e - expDiff;
  expDiff = f.e - smallestExponent;
  f.v = f.v * (10n ** expDiff);
  f.e = f.e - expDiff;

  return a;
}

if (doUnitTests) {
  let testA = infNum(5n, -2n);
  let testB = infNum(5n, -1n);
  let testC = infNum(5n, 0n);
  let testD = infNum(5n, 1n);
  let testE = infNum(5n, 2n);
  let testF = infNum(5n, 3n);
  let normA = normInPlaceInfNum(testA, testB, testC, testD, testE, testF);
  console.log("testA -> (" + normA.v + " ," + normA.e + ")");
  console.log("testB -> (" + testB.v + " ," + testB.e + ")");
  console.log("testC -> (" + testC.v + " ," + testC.e + ")");
  console.log("testD -> (" + testD.v + " ," + testD.e + ")");
  console.log("testE -> (" + testE.v + " ," + testE.e + ")");
  console.log("testF -> (" + testF.v + " ," + testF.e + ")");

  testA = infNum(5n, -2n);
  testB = infNum(5n, -11n);
  testC = infNum(5n, -3n);
  testD = infNum(5n, -22n);
  testE = infNum(5n, -2n);
  testF = infNum(5n, -5n);
  normA = normInPlaceInfNum(testA, testB, testC, testD, testE, testF);
  console.log("testA -> (" + normA.v + " ," + normA.e + ")");
  console.log("testB -> (" + testB.v + " ," + testB.e + ")");
  console.log("testC -> (" + testC.v + " ," + testC.e + ")");
  console.log("testD -> (" + testD.v + " ," + testD.e + ")");
  console.log("testE -> (" + testE.v + " ," + testE.e + ")");
  console.log("testF -> (" + testF.v + " ," + testF.e + ")");

  testA = infNum(5n, 2n);
  testB = infNum(5n, 11n);
  testC = infNum(5n, 3n);
  testD = infNum(5n, 22n);
  testE = infNum(5n, 2n);
  testF = infNum(5n, 5n);
  normA = normInPlaceInfNum(testA, testB, testC, testD, testE, testF);
  console.log("testA -> (" + normA.v + " ," + normA.e + ")");
  console.log("testB -> (" + testB.v + " ," + testB.e + ")");
  console.log("testC -> (" + testC.v + " ," + testC.e + ")");
  console.log("testD -> (" + testD.v + " ," + testD.e + ")");
  console.log("testE -> (" + testE.v + " ," + testE.e + ")");
  console.log("testF -> (" + testF.v + " ," + testF.e + ")");
}


// copies values from a and b, so the given objects are never modified
function infNumAdd(a, b) {
  const norm = normInfNum(a, b);
  return infNum(norm[0].v + norm[1].v, norm[0].e);
}

if (doUnitTests) {
  console.log("100 + 1.5 = ... // 101.5 (1015, -1)");
  console.log(infNumAdd(createInfNum("100"), createInfNum("1.5")));

  console.log("123 + 0.456 = ... // 123.456 (123456, -3)");
  console.log(infNumAdd(createInfNum("123"), createInfNum("0.456")));

  console.log("0.00001 + 5.05 = ... // 5.05001 (505001, -5)");
  console.log(infNumAdd(createInfNum("0.00001"), createInfNum("5.05")));
}

// assumes arguments have the same exponent
function infNumAddNorm(a, b) {
  return infNum(a.v + b.v, a.e);
}

// copies values from a and b, so the given objects are not modified
function infNumSub(a, b) {
  const norm = normInfNum(a, b);
  return infNum(norm[0].v - norm[1].v, norm[0].e);
}

if (doUnitTests) {
  console.log("100 - 1.5 = ... // 98.5 (985, -1)");
  console.log(infNumSub(createInfNum("100"), createInfNum("1.5")));

  console.log("123 - 0.01 = ... // 122.99 (12299, -2)");
  console.log(infNumSub(createInfNum("123"), createInfNum("0.01")));

  console.log("0.00001 - 50 = ... // -49.99999 (-4999999, -5)");
  console.log(infNumSub(createInfNum("0.00001"), createInfNum("50")));
}

// assumes arguments have the same exponent
function infNumSubNorm(a, b) {
  return infNum(a.v - b.v, a.e);
}

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

if (doUnitTests) {
  let unitTest = infNumDiv(createInfNum("50000"), createInfNum("20"));
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
}

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

// assumes the argumments have the same exponent
function infNumGtNorm(a, b) {
  return a.v > b.v;
}

if (doUnitTests) {
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
}

function infNumToString(n) {
  var value = n.v.toString();
  if (n.e === 0n) {
    return value;
  }
  if (n.e > 0n) {
    let i = 0n;
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
      dec = value.slice(-1) + dec;
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

if (doUnitTests) {
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
}

function infNumExpString(n) {
  return infNumExpStringTruncToLen(n, -1);
}

function infNumExpStringTrunc(n) {
  return infNumExpStringTruncToLen(n, truncateLength);
}

function infNumExpStringTruncToLen(n, truncDecimals) {
  var value = n.v.toString();
  let negative = false;
  if (n.v < 0) {
    negative = true;
    value = value.substring(1);
  }
  let bd = value.length;
  let ad = value.length - 1;
  let finalExponent = n.e + BigInt(ad.toString());
  let decimal = trimZeroes(value.substring(0, 1) + "." + value.substring(1));
  if (!decimal.includes(".")) {
    decimal = decimal + ".0";
  }
  if (truncDecimals > 0) {
    decimal = decimal.substring(0, truncDecimals + 2);
  }
  if (negative) {
    decimal = "-" + decimal;
  }
  return decimal + "e" + finalExponent.toString();
}

if (doUnitTests) {
  let unitTest = "22";
  console.log("infNumExpString(\"" + unitTest + "\") = [" + infNumExpString(createInfNum(unitTest)) + "]// 2.2e1");

  unitTest = "123456789";
  console.log("infNumExpStringTruncToLen(\"" + unitTest + "\", 5) = [" + infNumExpStringTruncToLen(createInfNum(unitTest), 5) + "]// 1.23456e8");
}

// divides the value portion of n as long as it's divisible by 10
function infNumFastStr(n) {
  let nCopy = copyInfNum(n);
  while (nCopy.v % 10n === 0n) {
    nCopy.v /= 10n;
    nCopy.e += 1n;
  }
  // using radix 16 because in testing it was 75% faster than
  //   radix 10 and 32
  return nCopy.v.toString(16) + "e" + nCopy.e.toString(16);
}

// thanks to https://stackoverflow.com/a/47593316/259456 for hash function
function xmur3(str) {
  for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
    h = h << 13 | h >>> 19;
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
}

// thanks to https://stackoverflow.com/a/47593316/259456 for seed-able rng
function sfc32(a, b, c, d) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
    var t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

if (doUnitTests) {
  let seed = xmur3("718724816339");
  // Output four 32-bit hashes to provide the seed for sfc32.
  let rand = sfc32(seed(), seed(), seed(), seed());

  let n = [];
  for (let i = 0; i < 500000; i++) {
    n.push(infNum(BigInt(rand().toString().replaceAll(".", "")), BigInt(rand().toString().replaceAll(".", "").substring(0,3))));
  }
  let s = [];
  let t = null;
  let startMs = Date.now();
  for (let i = 0; i < n.length; i++) {
    if (i < 20) {
      s.push(infNumFastStr(n[i]));
    } else {
      t = infNumFastStr(n[i]);
    }
  }
  let durationMs = Date.now() - startMs;
  console.log("BigInt took [" + durationMs + "] ms for infNumFastStr(n):");
  console.log(s.join("\n"));

  ////////////////////////////////////////////////////////////////////////
  s = [];
  startMs = Date.now();
  for (let i = 0; i < n.length; i++) {
    if (i < 20) {
      s.push(infNumExpString(n[i]));
    } else {
      t = infNumExpString(n[i]);
    }
  }
  durationMs = Date.now() - startMs;
  console.log("BigInt took [" + durationMs + "] ms for infNumExpString(n):");
  console.log(s.join("\n"));
  
  ////////////////////////////////////////////////////////////////////////
  s = [];
  startMs = Date.now();
  for (let i = 0; i < n.length; i++) {
    if (i < 20) {
      s.push(infNumToString(n[i]));
    } else {
      t = infNumToString(n[i]);
    }
  }
  durationMs = Date.now() - startMs;
  console.log("BigInt took [" + durationMs + "] ms for infNumToString(n):");
  console.log(s.join("\n"));
}

function infNumTruncate(n) {
  return infNumTruncateToLen(n, truncateLength);
}

function infNumTruncateToLen(n, len) {
  var a = copyInfNum(n);
  const orig = a.v.toString();
  if (orig.length <= len) {
    return a;
  }
  a.v = BigInt(a.v.toString().substring(0,len));
  a.e = a.e + BigInt(orig.length - len);
  return a;
}

// each "plot" has its own "privContext" that can contain whatever data/functions
//   it needs to compute points
const plots = [{
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
    "<br/>- To see more detail when zoomed in, increase the <code>n</code> (iterations) parameter with the M key.  Calculations will be slower.",
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeBoundPointColor": function(privContext, x, y) {
    const maxIter = historyParams.n;

    if (mandelbrotFloat) {
      let xFloat = parseFloat(infNumToString(infNumTruncateToLen(x, 16)));
      let yFloat = parseFloat(infNumToString(infNumTruncateToLen(y, 16)));
      let ix = 0;
      let iy = 0;
      let ixSq = 0;
      let iySq = 0;
      let ixTemp = 0;
      let iter = 0;
      while (iter < maxIter) {
        ixSq = ix * ix;
        iySq = iy * iy;
        if (ixSq + iySq > 4) {
          break;
        }
        ixTemp = xFloat + (ixSq - iySq);
        iy = yFloat + (2 * ix * iy);
        ix = ixTemp;
        iter++;
      }

      if (iter == maxIter) {
        return -1.0; // background color
      } else {
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return privContext.applyColorCurve(iter / maxIter);
      }
    }

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
    try {
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
        iter++;
      }

      if (iter == maxIter) {
        return -1.0; // background color
      } else {
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return privContext.applyColorCurve(iter / maxIter);
      }
    } catch (e) {
      console.log("ERROR CAUGHT when processing point (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return windowCalcIgnorePointColor; // special color value that will not be displayed
    }
  },
  // version using normInPlaceInfNum
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeBoundPointColorNew": function(privContext, x, y) {
    const maxIter = historyParams.n;

    // circle heuristics to speed up zoomed-out viewing
    //if (mandelbrotCircleHeuristic) {
    //  for (var i = 0; i < privContext.circles.length; i++) {
    //    const xDist = infNumSub(x, privContext.circles[i].centerX);
    //    const yDist = infNumSub(y, privContext.circles[i].centerY);
    //    if (infNumLe(infNumAdd(infNumMul(xDist, xDist), infNumMul(yDist, yDist)), privContext.circles[i].radSq)) {
    //      return -1.0; // background color
    //    }
    //  }
    //}

    // the coords used for iteration
    var ix = infNum(0n, 0n);
    var iy = infNum(0n, 0n);
    // temporary things needed multiple times per iteration
    var ixSq = null;//infNum(0n, 0n);
    var iySq = null;//infNum(0n, 0n);
    var ixiy = null;
    var boundsRadiusSquaredNorm = null;
    var ixTemp = null;//infNum(0n, 0n);
    var xNorm = null;
    var yNorm = null;
    var iter = 0;
    try {
      while (iter < maxIter) {
        ixSq = infNumMul(ix, ix);
        iySq = infNumMul(iy, iy);
        ixiy = infNumMul(ix, iy);
        xNorm = copyInfNum(x);
        yNorm = copyInfNum(y);
        boundsRadiusSquaredNorm = normInPlaceInfNum(privContext.boundsRadiusSquared, ixSq, iySq, xNorm, yNorm, ixiy);
        if (infNumGtNorm(infNumAddNorm(ixSq, iySq), boundsRadiusSquaredNorm)) {
          break;
        }
        ixTemp = infNumAddNorm(xNorm, infNumSubNorm(ixSq, iySq));
        // multiplying by 2 (v=2n, e=0n) does not affect the exponent, so no need to normalize afterwards
        iy = infNumAddNorm(yNorm, infNumMul(privContext.two, ixiy));
        ix = infNumTruncate(ixTemp);
        iy = infNumTruncate(iy);
        iter++;
      }

      if (iter == maxIter) {
        return -1.0; // background color
      } else {
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return privContext.applyColorCurve(iter / maxIter);
      }
    } catch (e) {
      console.log("ERROR CAUGHT when processing point (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return windowCalcIgnorePointColor; // special color value that will not be displayed
    }
  },
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 50,
    "scale": infNum(400n, 0n),
    "centerX": createInfNum("-0.65"),
    "centerY": infNum(0n, 0n)
  },
  "privContext": {
    "usesImaginaryCoordinates": true,
    "two": infNum(2n, 0n),
    "black": getColor(0, 0, 0),
    "boundsRadiusSquared": infNum(4n, 0n),
    "colors": {},
    "applyColorCurve": function(pct) {
      const result = pct;
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
      //const result = (-0.76991*pct*pct) + (1.73351*pct) + 0.0250757;
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
    }],
    "adjustTruncate": function() {
      // these values need more testing to ensure they create pixel-identical images
      //   to higher-precision images
      if (infNumLt(historyParams.scale, createInfNum("1000"))) {
        mandelbrotFloat = true;
        truncateLength = 12;
      } else if (infNumLt(historyParams.scale, createInfNum("2,000,000".replaceAll(",", "")))) {
        mandelbrotFloat = true;
        truncateLength = 12;
      } else if (infNumLt(historyParams.scale, createInfNum("30,000,000,000,000".replaceAll(",", "")))) {
        mandelbrotFloat = true;
        truncateLength = 20;
      } else {
        mandelbrotFloat = false;
        truncateLength = 24;
      }
      console.log("set truncateLength to [" + truncateLength + "], using floats for mandelbrot [" + mandelbrotFloat + "]");
    },
    "minScale": createInfNum("20")
  }
},{
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
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 60000,
    "scale": createInfNum("1.2"),
    "centerX": createInfNum("-240"),
    "centerY": createInfNum("288")
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
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 60000,
    "scale": createInfNum("0.85"),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
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
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 5000,
    "scale": createInfNum("6.5"),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
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
    const diagHypot = Math.sqrt(2);

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
      resultLength += privContext.direction % 90 == 0 ? 1 : diagHypot;
    }
    // add the last point
    resultPoints.push(nextPoint);
    return {
      "points": resultPoints,
      "length": resultLength
    };
  },
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 5000,
    "scale": createInfNum("2.3"),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
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
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 5000,
    "scale": createInfNum("0.08"),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
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
      let testPoint = nextPoint;
      privContext.trackNumberedSquare(privContext, 0, nextPoint);

      let testDirection = 0;
      let direction = 90;

      // spiral out from starting square, finding coordinates of all numbered squares
      // used trial and error to figure out how many numbered squares are needed
      for (let i = 1; i < 3562; i+=1) {
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

    for (let i = 0; i < params.n; i+=1) {
      reachable = privContext.reachableSquares(lastPoint);
      for (let j = 0; j < reachable.length; j++) {
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
      resultPoints.push(getPoint(lastPoint.x, -1 * lastPoint.y));
      privContext.visitSquare(privContext, lowestReachableN, lastPoint);
      lowestReachableN = -1;
    }

    return {
      "points": resultPoints,
      "length": resultLength
    };
  },
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 2016,
    "scale": infNum(15n, 0n),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
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
//   // these settings are auto-applied when this plot is activated
//   "forcedDefaults": {
//     "scale": infNum(40n, 0n),
//     "offsetX": infNum(0n, 0n),
//     "offsetY": infNum(0n, 0n)
//   },
//   "privContext": {
//     "black": getColor(0, 0, 0),
//     "circleRadiusSquared": infNum(100n, 0n)
//   }
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
  pixPerChunk = Math.trunc(realPixelsPerChunk / pixelSize) + 1;

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

function computeBoundPointsChunk(plot, xChunk) {
  var chunkStartMs = Date.now();
  const privContext = plot.privContext;
  var resultPoints = [];

  // use lineWidth to determine how large to make the calculated/displayed
  //   pixels, so round to integer
  // use Math.round(), not Math.trunc(), because we want the minimum
  //   lineWidth of 0.5 to result in a pixel size of 1
  const pixelSizeFloat = Math.round(windowCalc.lineWidth);
  const pixelSize = createInfNum(pixelSizeFloat.toString());
  //const params = historyParams;

  // for each pixel shown, find the abstract coordinates represented by its... center?  edge?
  //const pixWidth = createInfNum(dContext.canvas.width.toString());
  const pixHeight = createInfNum(dContext.canvas.height.toString());

  let px = null;
  let py = null;
  let x = 0;
  const yStep = infNumMul(windowCalc.eachPixUnits, pixelSize);
  const yNorm = normInfNum(yStep, windowCalc.topEdge);
  const yStepNorm = yNorm[0];
  const topNorm = yNorm[1];
  for (let i = 0; i < xChunk.length; i++) {
    x = xChunk[i];
    xInfNum = infNum(BigInt(xChunk[i]), 0n);

    px = infNumAdd(infNumMul(windowCalc.eachPixUnits, xInfNum), windowCalc.leftEdge);
    pxStr = infNumToString(px) + ",";
    py = topNorm;
    for (let y = 0; y < dCanvas.height; y += pixelSizeFloat) {
      const pointPixel = pxStr + infNumToString(py);
      if (pointPixel in windowCalc.pointsCache) {
        windowCalc.cachedPoints++;
        // update the pixel on the screen, in case we've panned since
        //   the point was originally cached
        windowCalc.pointsCache[pointPixel].px.x = x;
        windowCalc.pointsCache[pointPixel].px.y = y;
        resultPoints.push(windowCalc.pointsCache[pointPixel]);
      } else {
        const pointColor = plot.computeBoundPointColor(privContext, px, py);

        // x and y are integer (actual pixel) values, with no decimal component
        const point = getColorPoint(x, y, pointColor);
        // px -- the pixel "color point"
        // pt -- the abstract coordinate on the plane
        let wrappedPoint = {"px": point, "pt": {"x":copyInfNum(px), "y":copyInfNum(py)}};
        windowCalc.pointsCache[pointPixel] = wrappedPoint;
        resultPoints.push(wrappedPoint);
      }
      py = infNumSubNorm(py, yStepNorm);
    }
  }
  windowCalc.passTimeMs += (Date.now() - chunkStartMs);
  windowCalc.totalPoints += resultPoints.length;
  windowCalc.chunksComplete++;
  return {
    "points": resultPoints,
  };
}

const presets = [{
  "plot": "Mandelbrot-set",
  "v": 4,
  "n": 400,
  "lineWidth": 1,
  "scale": createInfNum("1640000"),
  "centerX": createInfNum("0.273210669156851807493494"),
  "centerY": createInfNum("-0.00588612373984032474800031"),
  "gradient": "rbgyo",
  "bgColor": "b"
},{
  "plot": "Primes-1-Step-90-turn",
  "v": 4,
  "n": 60000,
  "lineWidth": 1,
  "scale": createInfNum("1.35"),
  "centerX": createInfNum("-240"),
  "centerY": createInfNum("288.4"),
  "gradient": "rbgyo",
  "bgColor": "b"
},{
  "plot": "Trapped-Knight",
  "v": 4,
  "n": 2016,
  "lineWidth": 1.5,
  "scale": createInfNum("15.0"),
  "centerX": createInfNum("0"),
  "centerY": createInfNum("0"),
  "gradient": "rbgyo",
  "bgColor": "b"
},{
  "plot": "Primes-1-Step-45-turn",
  "v": 4,
  "n": 32400,
  "lineWidth": 2,
  "scale": createInfNum("10.95"),
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

  if (urlParams.has("repeat")) {
    windowCalcRepeat = parseInt(urlParams.get("repeat"));
  }

  // default params are mandelbrot defaults
  var params = {
    "plot": "Mandelbrot-set",
    "v": 4,
    "lineWidth": 1,
    "n": 40,
    "scale": infNum(400n, 0n),
    "centerX": createInfNum("-0.65"),
    "centerY": infNum(0n, 0n),
    "gradient": "rbgyo",
    "bgColor": "b"
  };

  // only change default settings if a known version of settings is given
  if (urlParams.has('v') && ["1","2","3","4"].includes(urlParams.get('v'))) {
    let plot = params.plot;
    if (["1","2","3"].includes(urlParams.get('v')) && urlParams.has('seq')) {
      plot = urlParams.get('seq');
    } else if (["4"].includes(urlParams.get('v')) && urlParams.has('plot')) {
      plot = urlParams.get('plot');
    }
    if (plot in plotsByName) {
      params.plot = plot;
    } else {
      alert("no such plot [" + plot + "]");
    }
    if (urlParams.has('n')) {
      params.n = parseInt(urlParams.get('n').replaceAll(",", ""));
      if (params.n < 0) {
        params.n = 100;
      }
    }
    if (urlParams.has("scale")) {
      params.scale = createInfNum(urlParams.get("scale").replaceAll(",", ""));
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
    buildGradient(params.gradient);
    if (urlParams.has('bgColor')) {
      const color = urlParams.get('bgColor');
      if (color in bgColorSchemes) {
        params.bgColor = color;
      } else {
        alert("no such background color scheme [" + color + "]");
      }
    }
    if (urlParams.has('lineWidth')) {
      params.lineWidth = sanityCheckLineWidth(parseFloat(urlParams.get('lineWidth')) || 1.0, false, plotsByName[params.plot]);
    }
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

function start() {
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

  setDScaleVars(dContext);

  // run the selected plot
  const plot = plotsByName[params.plot];
  if (plot.calcFrom == "sequence") {
    const out = plot.computePointsAndLength(plot.privContext);

    // copy the results
    totalLength = out.length;
    for (var i = 0; i < out.points.length; i++) {
      points.push(out.points[i]);
    }

    resetWindowCalcContext();
    drawPoints(params);
  } else if (plot.calcFrom == "window") {
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
  paramsCopy.scale = infNumExpStringTrunc(params.scale);
  paramsCopy.centerX = infNumExpStringTrunc(params.centerX);
  paramsCopy.centerY = infNumExpStringTrunc(params.centerY);
  history.replaceState("", document.title, document.location.pathname + "?" + new URLSearchParams(paramsCopy).toString());
  replaceStateTimeout = null;
}

var replaceHistory = function() {
  replaceHistoryWithParams(historyParams);
};

var pushToHistory = function() {
  var paramsCopy = Object.assign({}, historyParams);
  paramsCopy.scale = infNumExpStringTrunc(historyParams.scale);
  paramsCopy.centerX = infNumExpStringTrunc(historyParams.centerX);
  paramsCopy.centerY = infNumExpStringTrunc(historyParams.centerY);
  // no need to replaceState() here -- we'll replaceState() on param
  //   changes except for mouse dragging, which happen too fast
  history.pushState("", document.title, document.location.pathname + "?" + new URLSearchParams(paramsCopy).toString());
  historyTimeout = null;
};

const lineColorSchemes = [
  "rby", // red -> blue -> yellow
  "rbgyo", // red -> blue -> green -> yellow -> orange
  "br", // blue -> red
  "by", // blue -> yellow
  "op", // orange -> purple
  "LD-L(200_200_200)-D(50_50_50)", // light gray - dark gray
  "LD-L(200_40_40)-D(120_24_24)", // red
  "LD-L(200_100_0)-D(120_60_0)", // orange
  "LD-L(200_200_0)-D(120_120_0)", // yellow
  "LD-L(20_200_20)-D(12_120_12)", // green
  "LD-L(20_20_200)-D(12_12_120)", // blue
  "LD-L(200_20_200)-D(120_12_120)", // purple
  "LD-L(60_60_60)-D(30_30_30)", // dark gray
  "LD-L(200_200_200)-D(120_120_120)" // light gray
];

// match color declaration like "a(1_2_3)" or "r(150_30_30)"
const customColorRegex = /^[a-zA-z]\([0-9]{1,3}_[0-9]{1,3}_[0-9]{1,3}\)$/;

// build global gradient stops from format:
//   roygbv-saturation60-brightness90-width80-offset30-repeat10-mirror2-shift3
function buildGradient(gradientString) {
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
  const splitArgs = gradientString.split("-");
  const colorArgs = splitArgs[0];
  const argNames = ["saturation","brightness","width","offset","repeat","mirror","shift"];
  let colorMatch = null;
  for (let i = 1; i < splitArgs.length; i++) {
    colorMatch = splitArgs[i].match(customColorRegex);
    if (colorMatch !== null) {
      let customColorName = colorMatch[0].charAt(0);
      let customRgbValuesSplit = colorMatch[0].slice(2, -1).split("_"); // "x(1_2_3)" -> ["1","2","3"]
      let customRgbValues = [];
      for (let i = 0; i < customRgbValuesSplit.length; i++) {
        let value = parseInt(customRgbValuesSplit[i]);
        value = Math.min(255, Math.max(0, value)); // restrict to 0-255
        customRgbValues.push(value);
      }
      colorsByName[customColorName] = customRgbValues
    } else {
      for (let j = 0; j < argNames.length; j++) {
        const argName = argNames[j];
        if (splitArgs[i].startsWith(argName)) {
          args[argName] = splitArgs[i].substring(argName.length);
          try {
            args[argName] = parseInt(args[argName]);
            if (["shift","saturation","brightness"].includes(argName)) {
              if (args[argName] < -99 || args[argName] > 99) {
                throw "argument must be greater than -100 and less than 100";
              }
            } else {
              if (args[argName] <= 0 || args[argName] > 100) {
                throw "argument must be greater than 0 and less than 101";
              }
            }
          } catch (e) {
            alert("Invalid integer value for gradient argument [" + splitArgs[i] + "]");
            delete args[argName];
            continue;
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
  // mirror: rgb -> rgbgr -> rgbgrgb -> rgbgrgbgr
  if ("mirror" in args && colors.length > 1) {
    const n = args.mirror;
    let rev = [];
    // skip last char when reversing
    for (let i = colors.length - 2; i >= 0; i--) {
      rev.push(colors.charAt(i));
    }
    rev = rev.join("");
    let newColors = "";
    for (let i = 0; i < args.mirror && i < 20; i++) {
      if (i % 2 == 0) {
        newColors += colors.substring(1);
      } else {
        newColors += rev; // don't need to skip first char here
      }
    }
    colors = newColors;
  }
  if ("repeat" in args) {
    colors = colors.repeat(args.repeat > 20 ? 20 : args.repeat);
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
  grad["orderedStops"] = [];
  // apply width arg by scaling all stops
  const totalWidth = "width" in args ? Math.min(1.0, (args.width / 100.0)) : 1.0;
  let prevStopRgb = null;
  for (let i = 0; i < colors.length; i++) {
    const colorLetter = colors.charAt(i);
    if (! colorLetter in colorsByName) {
      continue;
    }
    const colorRgb = colorsByName[colorLetter];
    const stop = {};

    if (prevStopRgb === null) {
      prevStopRgb = colorRgb;
      stop["lower"] = 0.0;
      // if this is the first and last stop, set the upper pct, lower color, and zero range
      if (colors.length == i + 1) {
        stop["upper"] = totalWidth;
        stop["rLower"] = prevStopRgb[0];
        stop["gLower"] = prevStopRgb[1];
        stop["bLower"] = prevStopRgb[2];
        stop["rRange"] = 0.0;
        stop["gRange"] = 0.0;
        stop["bRange"] = 0.0;
      // if this is the first but not last stop, set upper to zero
      } else {
        stop["upper"] = 0.0;
      }
      grad.orderedStops.push(stop);
      continue;
    // if this is not the first stop, the lower is the previous stop's upper
    } else {
      stop["lower"] = grad.orderedStops[grad.orderedStops.length-1].upper;
    }
    stop["rLower"] = prevStopRgb[0];
    stop["gLower"] = prevStopRgb[1];
    stop["bLower"] = prevStopRgb[2];

    if (colors.length == i + 1) {
      //stop["upper"] = totalWidth;
      stop["upper"] = 1.0;
    } else {
      // we cannot divide by zero because if there's only one stop, we've
      //   already called break above
      stop["upper"] = stop.lower + ((1.0 / (colors.length - 1)) * totalWidth);
    }

    stop["rRange"] = colorRgb[0] - stop["rLower"];
    stop["gRange"] = colorRgb[1] - stop["gLower"];
    stop["bRange"] = colorRgb[2] - stop["bLower"];

    prevStopRgb = colorRgb;
    grad.orderedStops.push(stop);
  }
  const maxOffset = 1.0 - totalWidth;
  const offset = "offset" in args ? Math.min(maxOffset, (args.offset / 100.0)) : 0.0;
  // even if offset is zero, we still need to set each stop's range
  for (let i = 0; i < grad.orderedStops.length; i++) {
    // do not touch the lower bound of the first stop
    if (i > 0) {
      grad.orderedStops[i].lower += offset;
    }
    // do not touch the upper bound of the last stop
    if (i + 1 < grad.orderedStops.length) {
      grad.orderedStops[i].upper += offset;
    }
    grad.orderedStops[i].range = grad.orderedStops[i].upper - grad.orderedStops[i].lower;
  }
  builtGradient = grad;
}

function applyBuiltGradient(gradient, percentage) {
  const pct = Math.max(0.0, Math.min(1.0, percentage));
  let color = "rgba(255,255,255,1.0)";
  for (let i = 0; i < gradient.orderedStops.length; i++) {
    if (pct <= gradient.orderedStops[i].upper) {
      let stop = gradient.orderedStops[i];
      // put code elsewhere to avoid needing this
      if (stop.range == 0) {
        break;
      }
      let withinStopPct = (pct - stop.lower) / stop.range;
      let r = (withinStopPct * stop.rRange) + stop.rLower;
      let g = (withinStopPct * stop.gRange) + stop.gLower;
      let b = (withinStopPct * stop.bRange) + stop.bLower;
      color = "rgba(" + r + "," + g + "," + b + ",1.0)";
      break;
    }
  }
  return color;
}

function redraw() {
  resetWindowCalcContext();
  const plot = plotsByName[historyParams.plot];
  if (plot.calcFrom == "sequence") {
    drawPoints(historyParams);
  } else if (plot.calcFrom == "window") {
    //resetWindowCalcContext();
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

  const lineWidth = params.lineWidth;
  // this function is only used for drawing sequence plots,
  //   so lots of precision for scale and offset isn't needed,
  // convert scale to float, and below use float version of left/top edges
  const scale = infNumToFloat(params.scale);

  fillBg(dContext);
  console.log("drawing [" + points.length + "] points with a total length of [" + totalLength + "]");

  var drawnLength = 0.0;
  var totalLengthScaled = totalLength * scale;
  var lastX = (0.0 - windowCalc.leftEdgeFloat) * scale;
  var lastY = (windowCalc.topEdgeFloat - 0.0) * scale;
  var segmentX = 0.0;
  var segmentY = 0.0;
  dContext.lineWidth = lineWidth;
  dContext.lineCap = "round";
  dContext.lineJoin = "round";
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
    dContext.beginPath();
    dContext.moveTo(lastX, lastY);
    //dContext.strokeStyle = getLineColor(drawnLength / totalLengthScaled, params.lineColor);
    dContext.strokeStyle = applyBuiltGradient(builtGradient, drawnLength / totalLengthScaled);
    dContext.lineTo(x, y);
    // stroke every line individually in order to do gradual color gradient
    dContext.stroke();
    lastX = x;
    lastY = y;
  }
}

function resetWindowCalcCache() {
  console.log("purging window points cache");
  windowCalc.pointsCache = {};
}

function resetWindowCalcContext() {
  if (windowCalc.timeout != null) {
    window.clearTimeout(windowCalc.timeout);
  }
  fillBg(dContext);

  const params = historyParams;
  windowCalc.plotName = params.plot;

  // attempt to resolve slowdown experienced when repeatedly panning/zooming,
  //   where the slowdown is resolved when refreshing the page
  historyParams.scale = infNumTruncate(historyParams.scale);
  historyParams.centerX = infNumTruncate(historyParams.centerX);
  historyParams.centerY = infNumTruncate(historyParams.centerY);

  if ("adjustTruncate" in plotsByName[params.plot].privContext) {
    plotsByName[params.plot].privContext.adjustTruncate();
  }

  // since line width is halved each time the draw occurs, use 128 to get
  //   the initial draw to use a 64-wide pixels
  windowCalc.lineWidth = 128;
  windowCalc.pixelsImage = dContext.createImageData(dContext.canvas.width, dContext.canvas.height);
  windowCalc.xPixelChunks = [];
  windowCalc.resultPoints = [];
  windowCalc.pointsBounds = "";
  windowCalc.passTimeMs = 0;
  windowCalc.totalTimeMs = 0;
  windowCalc.startTimeMs = Date.now();
  windowCalc.endTimeMs = 0;
  windowCalc.totalPoints = 0;
  windowCalc.cachedPoints = 0;
  windowCalc.chunksComplete = 0;
  windowCalc.totalChunks = 0;
  windowCalc.runtimeMs = -1;
  windowCalc.avgRuntimeMs = -1;

  const two = infNum(2n, 0n);

  const canvasWidth = createInfNum(dContext.canvas.offsetWidth.toString());
  const canvasHeight = createInfNum(dContext.canvas.offsetHeight.toString());

  // rather than calculate this for each chunk, compute it once here
  windowCalc.eachPixUnits = infNumTruncate(infNumDiv(infNum(1n, 0n), params.scale));

  // find the visible abstract points using offset and scale
  const scaledWidth = infNumDiv(canvasWidth, params.scale);
  const leftEdge = infNumSub(params.centerX, infNumDiv(infNumDiv(canvasWidth, two), params.scale));
  const rightEdge = infNumAdd(leftEdge, scaledWidth);

  const scaledHeight = infNumDiv(canvasHeight, params.scale);
  const topEdge = infNumAdd(params.centerY, infNumDiv(infNumDiv(canvasHeight, two), params.scale));
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
  windowCalc.leftEdgeFloat = infNumToFloat(leftEdge);
  windowCalc.topEdgeFloat = infNumToFloat(topEdge);

  resetGoToBoundsValues();
  resetGoToCenterValues();
  resetGradientInput();
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
  inputGotoCenterX.value = infNumToFloat(historyParams.centerX);
  inputGotoCenterY.value = infNumToFloat(historyParams.centerY) + (imaginaryCoordinates ? "i" : "");
  inputGotoScale.value = infNumToFloat(historyParams.scale);
}

function replaceAllEachChar(subject, replaceThese, replaceWith) {
  var s = subject;
  for (let i = 0; i < replaceThese.length; i++) {
    s = s.replaceAll(replaceThese.charAt(i), replaceWith);
  }
  return s;
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
  const newCenterX = infNumAdd(  leftX, infNumDiv(diffX, infNum(2n, 0n)));
  const newCenterY = infNumAdd(bottomY, infNumDiv(diffY, infNum(2n, 0n)));

  const scaleX = infNumDiv(createInfNum(dCanvas.width.toString()), diffX);
  const scaleY = infNumDiv(createInfNum(dCanvas.height.toString()), diffY);

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

function calculateAndDrawWindow() {
  // if lineWidth is 128, then we are starting with a fresh drawing
  // in this case, drawing will be fast (64-wide pixels) so don't bother
  //   drawing the "Calculating ..." notice text
  if (windowCalc.lineWidth == 128) {
    calculateAndDrawWindowInner();
  } else {
    drawCalculatingNotice(dContext);
    // thanks to https://stackoverflow.com/a/5521412/259456
    // hand control back to the browser to allow canvas to actually show
    //   the "calculating" text
    window.setTimeout(calculateAndDrawWindowInner, 50);
  }
}

var resetGradientInput = function() {
  inputGradGrad.value = historyParams.gradient;
};

btnGradGo.addEventListener("click", function() {
  historyParams.gradient = inputGradGrad.value;
  buildGradient(historyParams.gradient);
  redraw();
});
btnGradReset.addEventListener("click", resetGradientInput);

function calculateAndDrawWindowInner() {
  const params = historyParams;

  const plot = plotsByName[params.plot];

  const roundedParamLineWidth =  Math.round(params.lineWidth);
  const potentialTempLineWidth = Math.round(windowCalc.lineWidth / 2);
  if (potentialTempLineWidth <= roundedParamLineWidth) {
    windowCalc.lineWidth = roundedParamLineWidth;
  } else {
    windowCalc.lineWidth = potentialTempLineWidth;
  }

  // this calls some functions that will later call other functions
  //   to incrementally compute and display the results
  computeBoundPoints(plot.privContext);
}

function waitAndDrawWindow() {
  //console.log("waitAndDrawWindow() at " + new Error().stack.split('\n')[1]);
  const plot = plotsByName[windowCalc.plotName];

  var nextXChunk = windowCalc.xPixelChunks.shift();
  const isFinished = isComputationComplete();
  
  if (nextXChunk) {
    const out = computeBoundPointsChunk(plot, nextXChunk);

    // draw the results
    drawColorPoints(out.points);
    if (!isFinished) {
      drawCalculatingNotice(dContext);
    }
  }

  if (windowCalc.timeout != null) {
    window.clearTimeout(windowCalc.timeout);
  }

  // if the calculation is not finished, schedule another chunk to be calculated
  if (!isFinished) {
    windowCalc.timeout = window.setTimeout(waitAndDrawWindow, 25);
    return;
  }

  // log timing of this pass (a single lineWidth)
  if (windowLogTiming) {
    windowCalc.totalTimeMs += windowCalc.passTimeMs;
    let cachedPct = Math.round(windowCalc.cachedPoints * 10000.0 / windowCalc.totalPoints) / 100.0;
    console.log("computing [" + windowCalc.totalPoints + "] points of width [" + windowCalc.lineWidth + "], of which [" + windowCalc.cachedPoints + "] were cached (" + cachedPct + "%), took [" + windowCalc.passTimeMs + "] ms");
  }

  // if line width just finished is greater than the param lineWidth,
  //   we have to do it again
  // otherwise, we are done
  if (Math.round(windowCalc.lineWidth) > Math.round(historyParams.lineWidth)) {
    windowCalc.chunksComplete = 0;
    windowCalc.timeout = window.setTimeout(calculateAndDrawWindow, 250);
    return;
  }

  if (windowLogTiming) {
    windowCalc.endTimeMs = Date.now();
    const overallTimeMs = windowCalc.endTimeMs - windowCalc.startTimeMs;
    windowCalc.runtimeMs = overallTimeMs;
    // output overall timing info
    console.log("COMPLETED image [" +
      "w:" + dCanvas.width + ", " +
      "h:" + dCanvas.height + ", " +
      "lineWidth:" + Math.round(historyParams.lineWidth) + ", " +
      "n:" + historyParams.n + ", " +
      "centerX:" + infNumToString(infNumTruncate(historyParams.centerX)) + ", " +
      "centerY:" + infNumToString(infNumTruncate(historyParams.centerY)) + ", " +
      "scale:" + infNumToString(infNumTruncate(historyParams.scale)) +
      "] took: " +
      "[" + overallTimeMs + "] ms of overall time, " +
      "[" + windowCalc.totalTimeMs + "] ms of compute/draw time, " +
      "[" + (overallTimeMs - windowCalc.totalTimeMs) + "] ms of idle/wait time");
    if (windowCalcRepeat > 1) {
      windowCalcTimes.push(overallTimeMs);
      windowCalcRepeat -= 1;
      resetWindowCalcCache();
      redraw();
      return;
    } else {
      windowCalcTimes.push(overallTimeMs);
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
  }

  // now that the image has been completed, delete any cached
  //   points outside of the window
  let cachedPointsKept = 0;
  let cachedPointsToDelete = [];
  for (let name in windowCalc.pointsCache) {
    if (infNumLt(windowCalc.pointsCache[name].pt.x, windowCalc.leftEdge) ||
        infNumGt(windowCalc.pointsCache[name].pt.x, windowCalc.rightEdge) ||
        infNumLt(windowCalc.pointsCache[name].pt.y, windowCalc.bottomEdge) ||
        infNumGt(windowCalc.pointsCache[name].pt.y, windowCalc.topEdge)) {
      cachedPointsToDelete.push(name);
    } else {
      cachedPointsKept++;
    }
  }
  for (let i = 0; i < cachedPointsToDelete.length; i++) {
    delete windowCalc.pointsCache[name];
  }
  const deletedPct = Math.round(cachedPointsToDelete.length * 10000.0 / (cachedPointsToDelete.length + cachedPointsKept)) / 100.0;
  console.log("deleted [" + cachedPointsToDelete.length + "] points from the cache (" + deletedPct + "%)");

  // draw image parameteres
  if (imageParametersCaption) {
    drawImageParameters();
  }
}

function drawColorPoints(windowPoints) {
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
  for (let i = 0; i < windowPoints.length; i++) {
    // use lineWidth param as "resolution":
    //   1 = 1  pixel  drawn per point
    //   2 = 2  pixels drawn per point
    //  10 = 10 pixels drawn per point
    const resX = windowPoints[i].px.x;
    const resY = windowPoints[i].px.y;
    const colorPct = windowPoints[i].px.c;
    let pointColor = getBgColor();
    // just completely skip points with this special color "value"
    if (colorPct == windowCalcIgnorePointColor) {
      continue;
    } else if (colorPct >= 0) {
      pointColor = applyBuiltGradient(builtGradient, colorPct);
    }
    const rgba = pointColor.substr(5).split(',');
    pointColor = getColor(parseInt(rgba[0]),parseInt(rgba[1]),parseInt(rgba[2]));
    let pixelOffsetInImage = 0;
    for (let x = 0; x < pixelSize; x++) {
      // there may be a more efficient way to break early when pixels
      //   would extend beyond the edge of the canvas, other than
      //   checking every single pixel
      if (resX + x >= width) {
        break;
      }
      for (let y = 0; y < pixelSize; y++) {
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

function repaintOnly() {
  dContext.putImageData(windowCalc.pixelsImage, 0, 0);
}

function drawCalculatingNotice(ctx) {
  const canvas = ctx.canvas;
  ctx.fillStyle = "rgba(100,100,100,1.0)";
  const noticeHeight = Math.max(24, canvas.height * 0.03);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 18);
  ctx.fillRect(0,canvas.height-noticeHeight,noticeWidth, noticeHeight);
  ctx.font = textHeight + "px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  const percentComplete = Math.round(windowCalc.chunksComplete * 100.0 / windowCalc.totalChunks);
  ctx.fillText("Calculating " + windowCalc.lineWidth + "-wide pixels (" + percentComplete + "%) ...", Math.round(noticeHeight*0.2), canvas.height - Math.round(noticeHeight* 0.2));
}

function drawMousePosNotice(x, y) {
  const canvas = dCanvas;
  const ctx = dContext;
  ctx.fillStyle = "rgba(100,100,100,1.0)";
  const noticeHeight = Math.max(24, canvas.height * 0.03);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 18);
  ctx.fillRect(0,canvas.height-noticeHeight-noticeHeight,noticeWidth, noticeHeight);
  ctx.font = textHeight + "px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  let xRound = Math.round(x * 100.0) / 100.0;
  let yRound = Math.round(y * 100.0) / 100.0;
  ctx.fillText("(" + xRound + ", " + yRound + ")", Math.round(noticeHeight*0.2), canvas.height - noticeHeight - Math.round(noticeHeight* 0.2));
}

function drawImageParameters() {
  const canvas = dCanvas;
  const ctx = dContext;
  const noticeHeight = Math.max(16, canvas.height * 0.01);
  const textHeight = Math.round(noticeHeight * 0.6);
  const noticeWidth = Math.max(200, textHeight * 18);
  const lines = [];
  const paramLengthLimit = 22;
  let entries = [
    ["x (re)", infNumExpString(historyParams.centerX)],
    ["y (im)", infNumExpString(historyParams.centerY)],
    [" scale", infNumExpString(historyParams.scale)],
    ["  iter", historyParams.n.toString()],
    ["  grad", historyParams.gradient],
    [" bgclr", historyParams.bgColor]
  ];
  if (historyParams.plot.startsWith("Mandelbrot") && mandelbrotFloat) {
    entries.push(["precis", "floating pt"]);
  } else {
    entries.push(["precis", truncateLength.toString()]);
  }
  if (windowCalc.runtimeMs > 0) {
    entries.push(["run ms", windowCalc.runtimeMs.toString()])
  }
  if (windowCalc.avgRuntimeMs > 0) {
    entries.push(["avg ms", windowCalc.avgRuntimeMs.toString()])
  }
  for (let i = 0; i < entries.length; i++) {
    const entryLabel = entries[i][0];
    let entryValue = entries[i][1];
    lines.push(entryLabel + ": " + entryValue.substring(0,paramLengthLimit));
    while (entryValue.length > paramLengthLimit) {
      entryValue = entryValue.substring(paramLengthLimit);
      lines.push("        " + entryValue.substring(0,paramLengthLimit));
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
  } else {
    historyParams.centerY = infNumAdd(historyParams.centerY, unitsToPan);
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
  if (w < 0.5) {
    return 0.5;
  }
  if (plot.calcFrom == "window") {
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
    applyParamPercent("scale", "1.05");
    redraw();
  } else if (e.keyCode == 81 || e.key == "q" || e.key == "Q") {
    applyParamPercent("scale", "0.95");
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
    } else {
      historyParams.n += 100;
    }
    start();
  } else if (e.keyCode == 78  || e.key == "n" || e.key == "N") {
    if (plotsByName[historyParams.plot].calcFrom == "sequence") {
      if (historyParams.n > 100) {
        historyParams.n -= 100;
      }
    } else {
      if (historyParams.n > 10) {
        historyParams.n -= 10;
      }
    }
    start();
  } else if (e.keyCode == 86 || e.key == "v" || e.key == "V") {
    let schemeNum = -1;
    for (let i = 0; i < lineColorSchemes.length; i++) {
      if (lineColorSchemes[i] == historyParams.gradient) {
        schemeNum = i;
        break;
      }
    }
    schemeNum += 1;
    if (schemeNum >= lineColorSchemes.length) {
      schemeNum = 0;
    }
    historyParams.gradient = lineColorSchemes[schemeNum];
    buildGradient(historyParams.gradient);
    redraw();
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
    redraw();
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
    // use Math.round() instead of parseInt() because, for example:
    //   parseInt(0.29 * 100.0)   --> 28
    //   Math.round(0.29 * 100.0) --> 29
    let valPct = Math.round(historyParams.lineWidth * 100.0);
    valPct += 50;
    historyParams.lineWidth = parseFloat(valPct / 100.0);

    historyParams.lineWidth = sanityCheckLineWidth(historyParams.lineWidth, true, plotsByName[historyParams.plot]);
    if (plotsByName[historyParams.plot].calcFrom == "window") {
      // changing the lineWidth for a window plot means we need to re-calculate
      start();
    } else {
      redraw();
    }
  } else if (e.keyCode == 72 || e.key == "h" || e.key == "H") {
    if (helpVisible) {
      closeHelpMenu();
    } else {
      openHelpMenu();
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
  } else if (e.keyCode == 49 || e.keyCode == 97 || e.key == "1") {
    activatePreset(presets[0]);
  } else if (e.keyCode == 50 || e.keyCode == 98 || e.key == "2") {
    activatePreset(presets[1]);
  } else if (e.keyCode == 51 || e.keyCode == 99 || e.key == "3") {
    activatePreset(presets[2]);
  } else if (e.keyCode == 52 || e.keyCode == 100 || e.key == "4") {
    activatePreset(presets[3]);
  //} else if (e.keyCode == 57 || e.keyCode == 105 || e.key == "9") {
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
  // ignore right- and middle-click
  if ("button" in e && e.button != 0) {
    return;
  }
  if (shiftPressed) {
    let pixX = createInfNum(Math.round(e.pageX - (dCanvas.width / 2)).toString());
    let pixY = createInfNum(Math.round((dCanvas.height - e.pageY) - (dCanvas.height / 2)).toString());
    // make sure we move in an exact multiple of the pixel size, so
    //   that we can re-use previously-cached points
    let posX = infNumAdd(infNumMul(pixX, windowCalc.eachPixUnits), historyParams.centerX);
    let posY = infNumAdd(infNumMul(pixY, windowCalc.eachPixUnits), historyParams.centerY);
    historyParams.centerX = posX;
    historyParams.centerY = posY;
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
dCanvas.addEventListener("mousedown", mouseDownHandler);
dCanvas.addEventListener("touchstart", mouseDownHandler);

var mouseMoveHandler = function(e) {
  // this might help prevent strange ios/mobile weirdness
  e.preventDefault();
  if (!mouseDrag) {
    if (showMousePosition) {
      //const two = infNum(2n, 0n);
      let pixX = createInfNum(e.pageX.toString());
      let pixY = createInfNum(e.pageY.toString());
      // this all works, to re-compute left/top edges here
      //const canvasWidth = createInfNum(dCanvas.width.toString());
      //const canvasHeight = createInfNum(dCanvas.height.toString());
      //const leftEdge = infNumSub(historyParams.centerX, infNumDiv(infNumDiv(canvasWidth, two), historyParams.scale));
      //const topEdge = infNumSub(historyParams.centerY, infNumDiv(infNumDiv(canvasHeight, two), historyParams.scale));
      //const posX = infNumAdd(infNumDiv(pixX, historyParams.scale), leftEdge);
      //const posY = infNumAdd(infNumDiv(pixY, historyParams.scale), topEdge);
      // these do work, using pre-computed left/top edges
      let posX = infNumAdd(infNumDiv(pixX, historyParams.scale), windowCalc.leftEdge);
      let posY = infNumSub(windowCalc.topEdge, infNumDiv(pixY, historyParams.scale));
      drawMousePosNotice(infNumToFloat(posX), infNumToFloat(posY));
    }
    return;
  }

  // always mouse drag to perform pan, even if pinch zooming (it's nice
  //    to be able to pinch zoom and pan in one gesture)
  const newX = e.pageX;
  const newY = e.pageY;
  // make sure we move in an exact multiple of the pixel size
  //   in order to re-use previously cached pixels after the move
  const diffX = infNumMul(createInfNum((mouseDragX - newX).toString()), windowCalc.eachPixUnits);
  const diffY = infNumMul(createInfNum((mouseDragY - newY).toString()), windowCalc.eachPixUnits);
  historyParams.centerX = infNumAdd(historyParams.centerX, diffX);
  historyParams.centerY = infNumSub(historyParams.centerY, diffY);
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

    const newCenterX = calculateNewZoomCenterX(createInfNum(midX.toString()), createInfNum(dCanvas.width.toString()),  historyParams.centerX, oldScale, historyParams.scale);
    const newCenterY = calculateNewZoomCenterY(createInfNum(midY.toString()), createInfNum(dCanvas.height.toString()), historyParams.centerY, oldScale, historyParams.scale);
    historyParams.centerX = newCenterX;
    historyParams.centerY = newCenterY;
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

  const newCenterX = calculateNewZoomCenterX(createInfNum(e.pageX.toString()), createInfNum(dCanvas.width.toString()),  historyParams.centerX, oldScale, historyParams.scale);
  const newCenterY = calculateNewZoomCenterY(createInfNum(e.pageY.toString()), createInfNum(dCanvas.height.toString()), historyParams.centerY, oldScale, historyParams.scale);

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

  const edge = infNumSub(oldCenter, infNumDiv(infNumDiv(canvasSize, infNum(2n, 0n)), oldScale));
  // calculate the X position using the given pixelPosition
  // pixelX = (xPos - leftEdge) * oldScale
  // xPos = (pixelX / oldScale) + leftEdge
  const pos = infNumAdd(infNumDiv(pixelPosition, oldScale), edge);
  const scaleRatio = infNumDiv(oldScale, newScale);
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

  const edge = infNumAdd(oldCenter, infNumDiv(infNumDiv(canvasSize, infNum(2n, 0n)), oldScale));
  // calculate the Y position using the given pixelPosition
  // pixelY = (topEdge - yPos) * oldScale
  // pixelY / oldScale = topEdge - yPos
  // yPos = topEdge - (pixelY / oldScale)
  const pos = infNumSub(edge, infNumDiv(pixelPosition, oldScale));
  const scaleRatio = infNumDiv(oldScale, newScale);

  return infNumAdd(infNumSub(infNumMul(oldCenter, scaleRatio), infNumMul(pos, scaleRatio)), pos);
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

// build a gradient here just so the global one isn't left null
buildGradient("roygbv");
parseUrlParams();
start();
