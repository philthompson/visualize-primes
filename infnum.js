
// remove starting here for minify
var doUnitTests = false;
//var heronsIterations = 0;
var doPerfTests = false;
// remove ending here for minify

function replaceAllEachChar(subject, replaceThese, replaceWith) {
  var s = subject;
  for (let i = 0; i < replaceThese.length; i++) {
    s = s.replaceAll(replaceThese.charAt(i), replaceWith);
  }
  return s;
}


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

// copies values from a and b, so the given objects are never modified
function infNumAdd(a, b) {
  const norm = normInfNum(a, b);
  return infNum(norm[0].v + norm[1].v, norm[0].e);
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

// assumes arguments have the same exponent
function infNumSubNorm(a, b) {
  return infNum(a.v - b.v, a.e);
}

function infNumDiv(argA, argB, precis) {
  // - multiply “top” value by 10^precision
  //   - divide (throw away remainder), then
  //   - subtract precision from exponent

  const p = BigInt(precis);

  // multiply “top” value by 10^precision
  let a = infNumMul(argA, infNum(10n ** p, 0n));

  const norm = normInfNum(a, argB);

  a = norm[0];
  let b = norm[1];

  // divide (throws away remainder)
  var truncated = infNum(a.v / b.v, a.e - b.e);

  // subtract precision from exponent
  truncated.e -= p;

  // divide then multiply the value portion by 10^(power-precis)
  // (power is n.v.toString().length)
  // i assume there's no better way to get log10(truncated.v)?
  const power = truncated.v.toString().length;

  if (power <= precis) {
    return truncated;
  }

  let truncPower = 10n ** BigInt(power-precis);

  truncated.v /= truncPower;
  truncated.v *= truncPower;

  return truncated;
}

function infNumEq(a, b) {
  const normalized = normInfNum(a, b);
  return normalized[0].v === normalized[1].v;
}
function infNumLt(a, b) {
  if (a.v < b.v && a.e <= b.e) {
    return true;
  } else if (a.v === 0n) {
    if (b.v <= 0n) {
      return false;
    } else {
      return true;
    }
  } else if (b.v === 0n) {
    if (a.v < 0n) {
      return true;
    } else {
      return false;
    }
  }
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
  } else if (a.v === 0n) {
    if (b.v < 0n) {
      return true;
    } else {
      return false;
    }
  } else if (b.v === 0n) {
    if (a.v < 0n) {
      return false;
    } else {
      return true;
    }
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

function infNumApproxEq(a, b, precis) {
//  if (a.v === 0n && b.v === 0n) {
//    return true;
//  }
//  if (a.v > 0n && b.v < 0n) {
//    return false;
//  }
//  if (a.v < 0n && b.v > 0n) {
//    return false;
//  }

  const norm = normInfNum(a, b);

  const diff = infNumAbs(infNumSubNorm(norm[0], norm[1]));

  return infNumLt(diff, infNum(1n, (BigInt(a.v.toString().length) + a.e) - BigInt(precis)));

  //return infNumLt(diff, infNum(1n, BigInt(-precis)));

//  const norm = normInfNum(a, b);
//
//  const aStr = norm[0].v.toString().substring(0, precis);
//  // after normalizing (ensuring exponents are the same)
//  //   if one of the values has fewer digits than the
//  //   requested precision, both values must be equal
//  if (aStr.length < precis) {
//    return norm[0].v === norm[1].v;
//  }
//  const bStr = norm[1].v.toString().substring(0, precis);
//  if (bStr.length < precis) {
//    return norm[0].v === norm[1].v;
//  }
//
//  return aStr === bStr;
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

function infNumExpString(n) {
  return infNumExpStringTruncToLen(n, -1);
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
  let finalExponent = n.e + BigInt(ad);
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

function createInfNumFromExpStr(s) {
  const split = s.split("e");
  const decSplit = split[0].split(".");
  let exp = BigInt(split[1]);
  exp -= BigInt(decSplit[1].length);
  let val = BigInt(decSplit[0] + decSplit[1]);
  return infNum(val, exp);
}

// this is not suitable for displaying to users (it's in base 16)
// divides the value portion of n as long as it's divisible by 10
function infNumFastStr(n) {
  let nCopy = copyInfNum(n);
  while (nCopy.v % 10n === 0n && nCopy.v !== 0n) {
    nCopy.v /= 10n;
    nCopy.e += 1n;
  }
  // using radix 16 because in testing it was 75% faster than
  //   radix 10 and 32
  return nCopy.v.toString(16) + "E" + nCopy.e.toString(16);
}

function createInfNumFromFastStr(s) {
  const split = s.split("E");
  let negative = false;
  if (split[0].startsWith("-")) {
    negative = true;
    split[0] = split[0].substring(1);
  }
  let val = BigInt("0x" + split[0]);
  if (negative) {
    val = val * -1n;
  }
  negative = false;
  if (split[1].startsWith("-")) {
    negative = true;
    split[1] = split[1].substring(1);
  }
  let exp = BigInt("0x" + split[1]);
  if (negative) {
    exp = exp * -1n;
  }
  return infNum(val, exp);
}

// TODO! unit test this with very small values
//   (like 5e-50, with say 5 significant digits, which should work)

function infNumTruncateToLen(n, len) {
  var truncatedExpString = infNumExpStringTruncToLen(n, len-1);
  return createInfNum(truncatedExpString);
}

function infNumTruncateToLenOldMaybeBad(n, len) {
  var a = copyInfNum(n);
  const orig = a.v.toString();
  if (orig.length <= len) {
    return a;
  }
  a.v = BigInt(a.v.toString().substring(0,len));
  a.e = a.e + BigInt(orig.length - len);
  return a;
}

// shortened version of infNumExpStringTruncToLen()
function infNumMagnitude(n) {
  var value = n.v.toString();
  // anything after 1st digit is "after decimal"
  let afterDecimal = n.v < 0 ? value.length - 2 : value.length - 1;
  let finalExponent = parseInt(n.e) + afterDecimal;
  return finalExponent;
}

function infNumAbs(n) {
  if (n.v < 0) {
    return infNum(-n.v, n.e);
  }
  return n;
}

//
// Math.sqrt(2*(10**7)) === Math.sqrt(2) * (10**3.5)
//
// 10**3.5 === 10**0.5 * 10**3
//
// Math.sqrt(2*(10**7)) === Math.sqrt(2) * 10**0.5 * 10**3
//
// use "var" here instead of "const" to keep the browser from complaining
//   about re-declaring it
var infNumSqrt10 = infNum(31622776601683795n, -16n);
function infNumRoughSqrt(a) {
  if (a.v === 0n) {
    return a;
  }
  // we want to keep exponent an integer, so we must
  //   check whether it's even before dividing by 2
  if (a.e % 2n === 0n) {
    return {
      v: bigIntRoughSqrt(a.v),
      e: a.e >> 1n
    };
  } else {
    return {
      v: bigIntRoughSqrt(a.v * 10n),
      e: a.e >> 1n
    };
  }
}

// rough but hopefully fast sqrt(BigInt)
// principal:
//   Math.sqrt(4000) === Math.sqrt(10**3)    * Math.sqrt(4)
//   Math.sqrt(4000) === (10**(3/2))         * Math.sqrt(4)
//   Math.sqrt(4000) === (10**1) * (10**0.5) * Math.sqrt(4)
function bigIntRoughSqrt(a) {
  if (a < 0n) {
    throw "cannot take rough square root of negative value";
  }
  let digits = a.toString().length;
  const mag = digits - 1;
  //const magMinusTwo = mag - 2;
  //let mantissa = null;
  //if (magMinusTwo < 0) {
  //  // get first three digits of value
  //  // 5 (v:5n,e:0n) is magnitude 0
  //  // (5n * (10n**(-2n*-1n))) / (10n**(0n*-1n)) => 500n
  //  // 0.054321 (v:54321n,e:-6n) is magnitude -2
  //  // (54321n * (10n**(-4n*-1n))) / (10n**(-6n*-1n)) => 543n
  //  mantissa = (a.v * (10n**BigInt(magMinusTwo*-1))) / (10n**(a.e*-1n));
  //} else {
  //  // get first three digits of value
  //  // 398765 is magnitude 5
  //  // 398765n / (10n**(5n-2n)) => 398n
  //  mantissa = a.v / (10n**BigInt(magMinusTwo));
  //}
  //const floatMantissa = parseFloat(mantissa) / 100.0;
  //return floatMantissa;

  // make a copy of the argument (necessary?)
  let mantissa = a * 10n;
  digits++;
  while (mantissa < 100n) {
    mantissa *= 10n;
    digits++;
  }
  // keep first 3 digits of mantissa
  mantissa = mantissa / (10n**BigInt(digits - 3));
  const floatMantissa = parseFloat(mantissa) / 100.0;

  // to perform square root, we are dividing magnitude in half
  // if magnitude is not an even number, multiply by 3, which is
  //   roughly the square root of 10, since:
  // 10**3.5 === 10**0.5 * 10**3
  const sqrt1000 = mag % 2 === 0 ?
    BigInt(Math.round(Math.sqrt(floatMantissa) * 1000.0)) * (10n**(BigInt(mag/2)))
    :
    BigInt(Math.round(Math.sqrt(floatMantissa) * 1000.0)) * (10n**(BigInt(Math.floor(mag/2)))) * 3n;

  return sqrt1000 / BigInt(1000n);
}

// using more digits of precision:
// - seems to decrease the error by 10^(digts/2)
// - exponentially slows down the computation
//
// testing on Apple M1 processor (single-core presumably)
//   where 4 million square roots of inputs of varying lengths are taken:
// - with 2 additional digits of precision:
//   - ~2e-3% average error
//   - this required, on average, 1.44 iterations of Heron's method per square root
//   - run time of 1.27s (about 22% faster than with 6 digits of precision)
// - with 6 additional digits of precision:
//   - ~2e-5% average error
//   - this required, on average, 1.65 iterations of Heron's method per square root
//   - run time of 1.56s
// - with 10 additional digits of precision:
//   - ~2e-7% average error
//   - this required, on average, 1.88 iterations of Heron's method per square root
//   - run time of 1.86s (about 18% slower than with 6 digits of precision)
// - with 14 additional digits of precision:
//   - ~2e-9% average error
//   - this required, on average, 2.16 iterations of Heron's method per square root
//   - run time of 2.24s (about 42% slower than with 6 digits of precision)
// - with 18 additional digits of precision:
//   - ~2e-11% average error
//   - this required, on average, 2.37 iterations of Heron's method per square root
//   - run time of 2.93s (about 88% slower than with 6 digits of precision)
// - with 22 additional digits of precision:
//   - ~2e-13% average error
//   - this required, on average, 2.58 iterations of Heron's method per square root
//   - run time of 3.70s (about 237% slower than with 6 digits of precision)
function infNumSqrtHerons(a) {
  if (a.v === 0n) {
    return a;
  }
  // we want to keep exponent an integer, so we must
  //   check whether it's even before dividing by 2
  if (a.e % 2n === 0n) {
    return {
      v: bigIntSqrtHerons(a.v * 10000000000n), // increase by 10^10, and reduce exponent accordingly before halving
      e: (a.e - 10n) >> 1n
    };
  } else {
    return {
      v: bigIntSqrtHerons(a.v * 100000000000n), // increase by 10^11 here, and reduce exponent accordingly before halving
      e: (a.e - 11n) >> 1n
    };
  }
}
function infNumSqrtHeronsLessPrecis(a) {
  if (a.v === 0n) {
    return a;
  }
  // we want to keep exponent an integer, so we must
  //   check whether it's even before dividing by 2
  if (a.e % 2n === 0n) {
    return {
      v: bigIntSqrtHerons(a.v * 1000000n), // increase by 10^6, and reduce exponent accordingly before halving
      e: (a.e - 6n) >> 1n
    };
  } else {
    return {
      v: bigIntSqrtHerons(a.v * 10000000n), // increase by 10^7 here, and reduce exponent accordingly before halving
      e: (a.e - 7n) >> 1n
    };
  }
}
function infNumSqrtHeronsMorePrecis(a) {
  if (a.v === 0n) {
    return a;
  }
  // we want to keep exponent an integer, so we must
  //   check whether it's even before dividing by 2
  if (a.e % 2n === 0n) {
    return {
      v: bigIntSqrtHerons(a.v * 100000000000000n), // increase by 10^14, and reduce exponent accordingly before halving
      e: (a.e - 14n) >> 1n
    };
  } else {
    return {
      v: bigIntSqrtHerons(a.v * 1000000000000000n), // increase by 10^15 here, and reduce exponent accordingly before halving
      e: (a.e - 15n) >> 1n
    };
  }
}

// based on Heron's method: https://en.wikipedia.org/wiki/Methods_of_computing_square_roots
// also thanks to: https://stackoverflow.com/a/9236307/259456
//
// sqrt(n) = sqrt(f * 2^2m) = sqrt(f)*2^m
//
// to begin Heron's method iterations, we just need a
//   decent starting guess.  the better the guess, the
//   fewer iterations need to be done.
//
// to convert the bigint into f * 2^2m:
//   123456789   ~= 1234 * 10^5
//   since the power 10 is raised to is odd,
//     we move one multiple of 10:
//   1234 * 10^5  = 12340 * 10^4
//
// since we can use ~17 decimal digits with built-in
//   JavaScript floats without losing precision, and
//   since we may need to multiply the float value
//   by 10, we'll use the first 16 decimal digits to
//   create a float value, upon which JavaSript's
//   Math.sqrt() can be used.
//
// then by:
// sqrt(n) = sqrt(f * 2^2m) = sqrt(f)*2^m
//
// we just need to multiply that square root by 2^m
//
// that gives us our starting guess for Heron's method
//   iterations
//
function bigIntSqrtHerons(a) {
  if (a < 0n) {
    throw "cannot take square root of negative value";
  }
  const decimalStr = a.toString(10);
  const tenPowerInitial = decimalStr.length - 16;
  const roughFloatInitial = tenPowerInitial <= 0 ? Number(a) : parseFloat(decimalStr.substring(0,16));

  const oddInitialPower = (tenPowerInitial & 1) === 1;
  let tenPower = 0;
  if (tenPowerInitial > 0) {
    //tenPower = oddInitialPower ? (tenPowerInitial - 1) / 2 : (tenPowerInitial / 2);
    tenPower = tenPowerInitial >> 1;
  }
  const roughFloat = (tenPowerInitial > 0 && oddInitialPower) ? roughFloatInitial * 10 : roughFloatInitial;
  let nextGuess = BigInt(Math.floor(Math.sqrt(roughFloat))) * (10n ** BigInt(tenPower));
  let currentGuess;
  let guessDiff;
  do {
    currentGuess = nextGuess;
    // average of currentGuess and (a/currentGuess)
    nextGuess = (currentGuess + (a/currentGuess)) >> 1n;
    guessDiff = currentGuess - nextGuess;
    //++heronsIterations;
  } while (guessDiff > 1n || guessDiff < -1n)

  return nextGuess;
}

// remove starting here for minify
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

  console.log(createInfNum("0.0"));
  console.log(createInfNum("0"));
  console.log(createInfNum("123"));
  console.log(createInfNum("123.456"));
  console.log(createInfNum("  3 "));
  console.log(createInfNum("  123456789.000000000012345"));
  console.log(createInfNum("  -4.00321"));
  console.log(createInfNum("  -0.009 "));
  
  unitTest = "123e4";
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

  console.log("100 * 1.5 = ... // 150 (1500, -1)");
  console.log(infNumMul(createInfNum("100"), createInfNum("1.5")));

  console.log("123.5 * 1.5 = ... // 185.25 (18525, -2)");
  console.log(infNumMul(createInfNum("123.5"), createInfNum("1.5")));

  console.log("123.5 * 1.5 = ... // 185.25 (18525, -2)");
  console.log(infNumMul(createInfNum("123.5"), createInfNum("1.5")));

  console.log("15000 * 0.0006 = ... // 9 (9, 0)");
  console.log(infNumMul(createInfNum("15000"), createInfNum("0.0006")));

  console.log("100 and 123.456"); // (100000, -3) and (123456, -3)
  console.log(normInfNum(createInfNum("100"), createInfNum("123.456")));

  console.log("0.0321 and 5"); // (321, -4) and (50000, -4)
  console.log(normInfNum(createInfNum("0.0321"), createInfNum("5")));

  console.log("22 and 5"); // (22, 0) and (5, 0)
  console.log(normInfNum(createInfNum("22"), createInfNum("5")));

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

  console.log("100 + 1.5 = ... // 101.5 (1015, -1)");
  console.log(infNumAdd(createInfNum("100"), createInfNum("1.5")));

  console.log("123 + 0.456 = ... // 123.456 (123456, -3)");
  console.log(infNumAdd(createInfNum("123"), createInfNum("0.456")));

  console.log("0.00001 + 5.05 = ... // 5.05001 (505001, -5)");
  console.log(infNumAdd(createInfNum("0.00001"), createInfNum("5.05")));

  console.log("100 - 1.5 = ... // 98.5 (985, -1)");
  console.log(infNumSub(createInfNum("100"), createInfNum("1.5")));

  console.log("123 - 0.01 = ... // 122.99 (12299, -2)");
  console.log(infNumSub(createInfNum("123"), createInfNum("0.01")));

  console.log("0.00001 - 50 = ... // -49.99999 (-4999999, -5)");
  console.log(infNumSub(createInfNum("0.00001"), createInfNum("50")));

  unitTest = infNumDiv(createInfNum("50000"), createInfNum("20"), 8);
  console.log("50000 / 20 (8 sig.dig.) = [" + infNumToString(unitTest) + "] // 2500");
  console.log(unitTest);

  unitTest = infNumDiv(createInfNum("100"), createInfNum("7"), 8);
  console.log("100 / 7 (8 sig.dig.) = [" + infNumToString(unitTest) + "] // 14.285714");
  console.log(unitTest);

  unitTest = infNumDiv(createInfNum("100"), createInfNum("64"), 8);
  console.log("100 / 64 (8 sig.dig.) = [" + infNumToString(unitTest) + "] // 1.5625");
  console.log(unitTest);

  unitTest = infNumDiv(createInfNum("1302"), createInfNum("10.5"), 8);
  console.log("1302 / 10.5 (8 sig.dig.) = [" + infNumToString(unitTest) + "] // 124");
  console.log(unitTest);

  unitTest = infNumToString(infNumDiv(createInfNum("1"), createInfNum("7"), 12));
  console.log("1 / 7 (12 sig.dig.) = [" + unitTest + "] // 0.142857142857");

  unitTest = infNumToString(infNumDiv(createInfNum("1000000"), createInfNum("7"), 12));
  console.log("1000000 / 7 (12 sig.dig.) = [" + unitTest + "] // 142857.142857");

  unitTest = infNumToString(infNumDiv(createInfNum("10"), createInfNum("3"), 5));
  console.log("10 / 3 (5 sig.dig.) = [" + unitTest + "] // 3.3333");

  unitTest = infNumToString(infNumDiv(createInfNum("100000"), createInfNum("3"), 3));
  console.log("100000 / 3 (3 sig.dig.) = [" + unitTest + "] // 33300");

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

  unitTest = "22";
  console.log("infNumExpString(\"" + unitTest + "\") = [" + infNumExpString(createInfNum(unitTest)) + "]// 2.2e1");

  unitTest = "123456789";
  console.log("infNumExpStringTruncToLen(\"" + unitTest + "\", 5) = [" + infNumExpStringTruncToLen(createInfNum(unitTest), 5) + "]// 1.23456e8");

  unitTest = "5.0e0";
  console.log("createInfNumFromExpStr(\"" + unitTest + "\") = ... // (50n, -1n)");
  console.log(createInfNumFromExpStr(unitTest));

  unitTest = "-5.0e2";
  console.log("createInfNumFromExpStr(\"" + unitTest + "\") = ... // (-50n, 1n)");
  console.log(createInfNumFromExpStr(unitTest));

  unitTest = "3.21e-4";
  console.log("createInfNumFromExpStr(\"" + unitTest + "\") = ... // (321n, -6n)");
  console.log(createInfNumFromExpStr(unitTest));

  for (let unitTest of [infNum(5n, -22n),infNum(5n, 2n),infNum(12345n,4321n),infNum(-123n,99n),infNum(-123n,-99n)]) {
    console.log(unitTest, " -> infNumFastStr() -> createInfNumFromFastStr() -> ...");
    console.log(createInfNumFromFastStr(infNumFastStr(unitTest)));
  }

  const runUnitTest = function(testFn) {
    if (!testFn()) {
      console.log("unit test FAILED:\n" + testFn.toString());
    }
  }

  runUnitTest(function() {
    return infNumApproxEq(infNum(12345678n, -3n), infNum(12345123n, -3n), 5) === true;
  });

  runUnitTest(function() {
    return infNumApproxEq(infNum(12345678n, -3n), infNum(12344123n, -3n), 5) === false;
  });

  runUnitTest(function() {
    return infNumApproxEq(infNum(123n, -3n), infNum(123n, -3n), 5) === true;
  });

  runUnitTest(function() {
    return infNumApproxEq(infNum(123n, -3n), infNum(122n, -3n), 5) === false;
  });

  runUnitTest(function() {
    return infNumApproxEq(infNum(123456789n, -3n), infNum(1234567n, -1n), 6) === true;
  });

  runUnitTest(function() {
    return infNumApproxEq(infNum(123456n, 2n), infNum(12345600n, 0n), 8) === true;
  });

  runUnitTest(function() {
    return infNumApproxEq(infNum(0n, 0n), infNum(123456789n, -30n), 20) === true;
  });
}

if (doPerfTests) {
  // thanks to https://stackoverflow.com/a/47593316/259456 for
  //   the seed-able prng
  const sfc32 = function(a, b, c, d) {
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
  const seed = 1337 ^ 0xDEADBEEF; // 32-bit seed with optional XOR value
  // Pad seed with Phi, Pi and E.
  // https://en.wikipedia.org/wiki/Nothing-up-my-sleeve_number
  const sfc32Rand = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, seed);
  for (const sqrtFunction of [infNumRoughSqrt, infNumSqrtHerons, infNumSqrtHeronsLessPrecis, infNumSqrtHeronsMorePrecis]) {
    //heronsIterations = 0;
    let perfTestDurationMs = 0;
    const perfTestOverallStartMs = Date.now();
    let totalSqrtsTaken = 0;
    let powerPositive;
    let power;
    let mantissa;
    let valRounds;
    let testInfnum;
    let result;
    let perfTestStartMs;
    let percentageDifference;
    let totalPercentageDifference;
    let percentageDifferenceCount;
    const oneHundred = infNum(100n, 0n);
    for (let powerRange = 10; powerRange <= 10000; powerRange *= 10) {
      totalPercentageDifference = 0;
      percentageDifferenceCount = 0;
      for (let i = 0; i < 10000; i++) {
        powerPositive = sfc32Rand() > 0.5 ? 1 : -1;
        power = Math.round(sfc32Rand() * powerRange) * powerPositive;
        valRounds = (sfc32Rand() * 10) + 1;
        mantissa = Math.round(sfc32Rand() * 100).toString();
        for (let j = 0; j < valRounds; j++) {
          mantissa += Math.round(sfc32Rand() * 100).toString();
        }
        //console.log("mantissa: " + mantissa);
        testInfnum = infNum(BigInt(mantissa), BigInt(power));
        //console.log("taking sqrt of " + infNumToString(testInfnum));
        perfTestStartMs = Date.now();
        for (let k = 0; k < 100; k++) {
          result = sqrtFunction(testInfnum);
        }
        perfTestDurationMs += Date.now() - perfTestStartMs;
        totalSqrtsTaken += 100;
        //console.log("sqrt is " + infNumToString(result));
        // get percentage difference
        percentageDifference = infNumMul(result, result);
        percentageDifference = infNumSub(percentageDifference, testInfnum);
        percentageDifference = infNumAbs(percentageDifference);
        percentageDifference = infNumMul(oneHundred, percentageDifference);
        percentageDifference = infNumDiv(percentageDifference, testInfnum, 18);
        // for computing the average percentage inaccuracy, float values have enough precision
        totalPercentageDifference += parseFloat(infNumExpStringTruncToLen(percentageDifference, 18));
        ++percentageDifferenceCount;
      }
      let avgPctDifference = totalPercentageDifference / percentageDifferenceCount;
      console.log("for " + sqrtFunction.name + "(), power range 0-" + powerRange + ", sqrt average inaccuracy of " + avgPctDifference + "% (x100 so it's an actual percentage)");
    }
    const perfTestOverallDurationMs = Date.now() - perfTestOverallStartMs;
    console.log("for " + sqrtFunction.name + "(), perf test time: " + perfTestDurationMs + "ms, overall: " + perfTestOverallDurationMs + "ms, for " + totalSqrtsTaken + " sqrts");
    //console.log("total of " + heronsIterations + " herons iterations, for avg. of " + (heronsIterations/totalSqrtsTaken) + " iterations per square root");
  }
  perfTestsDone = true;
}
// remove ending here for minify
