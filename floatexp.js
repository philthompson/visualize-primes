
// remove starting here for minify
var doUnitTests = false;
// remove ending here for minify

function createFloatExpFromInfNum(infNum) {
  // for now, use basically same code as infNumExpStringTruncToLen()
  var value = infNum.v.toString();
  let negative = false;
  if (infNum.v < 0) {
    negative = true;
    value = value.substring(1);
  }
  let bd = value.length;
  let ad = value.length - 1;
  let finalExponent = parseInt(infNum.e) + ad;
  let decimal = trimZeroes(value.substring(0, 1) + "." + value.substring(1));
  if (!decimal.includes(".")) {
    decimal = decimal + ".0";
  }
  if (negative) {
    decimal = "-" + decimal;
  }
//  if (infNumGt(infNum, self.infNum(0n, 0n))) {
//    let testStr = parseFloat(decimal) + "e" + finalExponent;
//    let infNumStr = infNumExpString(infNum);
//    //if (testStr != infNumStr) {
//    //  console.log("mismatch!", testStr, infNumStr);
//    //}
//    let testInfNum = createInfNum(testStr);
//    let ratioDiff = infNumSub(testInfNum, infNum);
//    if (infNumLt(ratioDiff, self.infNum(0n, 0n))) {
//      ratioDiff = infNumMul(ratioDiff, self.infNum(-1n, 0n));
//    }
//    let ratio = infNumDiv(infNumSub(infNum, ratioDiff), infNum, 20);
//    if (infNumLt(ratio, createInfNum("0.9999999"))) {
//      console.log("mismatch!", testStr, infNumStr);
//    //} else {
//    //  console.log("ratio between infNum and floatExp created from it:", infNumToString(ratio));
//    }
//  }
  return {
    v: parseFloat(decimal),
    e: finalExponent
  };
}

function createFloatExpFromString(stringNum) {
  const split = replaceAllEachChar(stringNum, ", ", "").replaceAll("E", "e").split("e");
  if (split.length > 1) {
    let value = split[0];
    let exponent = 0;
    if (value.includes(".")) {
      let valSplit = value.split(".");
      exponent -= valSplit[1].length;
      value = valSplit[0] + valSplit[1];
    }
    exponent += parseInt(split[1]);
    return floatExpAlign({
      v: parseFloat(value),
      e: exponent
    });
  } else {
    return floatExpAlign({
      v: parseFloat(split[0]),
      e: 0
    });
  }
}

function createFloatExpFromNumber(n) {
  return floatExpAlign({
    v: n,
    e: 0
  });
}

// "align" the given value to ensure the mantissa is a decimal
//   value between 1 and 10.  This should happen after every
//   math operation, I belive, which will enforce that we keep
//   a set precision for the value
// JavaScript bitwise operations force the value down to a 32-bit
//   integer, which means we will lose 20 bits of precision (I
//   believe).  So for now, do this in base-10 fashion.
// this modifies the given argument
function floatExpAlign(a) {
  if (a.v === 0) {
    // should we set exponent to something large here?
    // since zeroes require special handling, as far as i can tell,
    //   it doesn't really matter what the exponent here is
    return {v:0, e:0};
  }

  let pwr = Math.floor(Math.log10(Math.abs(a.v)));

  a.v /= 10 ** pwr;
  a.e += pwr;

  return a;
}

// only reads values from a and b, so the given objects are never modified
function floatExpMul(a, b) {
  // the product of the values
  // the sum of the exponents
  return floatExpAlign({
    v: a.v * b.v,
    e: a.e + b.e
  });
}

function floatExpDiv(a, b) {
  return floatExpAlign({
    v: a.v / b.v,
    //e: a.v === 0 ? 1 : a.e - b.e // exponent for zero doesn't have meaning, so just set to 1
    e: a.e - b.e
  });
}

// TODO figure out what the max diff should be
function floatExpAdd(a, b) {
  if (b.v === 0) {
    return a;
  } else if (a.v === 0) {
    return b;
  }
  if (a.e > b.e) {
    let eDiff = a.e - b.e;
    // should we ignore if 2^1020 smaller?
    // which is about 10^307
    if (eDiff > 307) {
      return a;
    }
    return floatExpAlign({
      v: a.v + (b.v / (10 ** eDiff)),
      e: a.e
    });
  } else {
    let eDiff = b.e - a.e;
    if (eDiff > 307) {
      return b;
    }
    return floatExpAlign({
      v: b.v + (a.v / (10 ** eDiff)),
      e: b.e
    });
  }
}

// TODO figure out what the max diff should be
function floatExpSub(a, b) {
  if (b.v === 0) {
    return a;
  } else if (a.v === 0) {
    return {
      v: b.v *= -1,
      e: b.e
    };
  }
  if (a.e > b.e) {
    let eDiff = a.e - b.e;
    if (eDiff > 307) {
      return a;
    }
    return floatExpAlign({
      v: a.v - (b.v / (10 ** eDiff)),
      e: a.e
    });
  } else {
    let eDiff = b.e - a.e;
    if (eDiff > 307) {
      return b;
    }
    return floatExpAlign({
      //v: b.v - (a.v / (10 ** eDiff)),
      v: (a.v / (10 ** eDiff)) - b.v,
      e: b.e
    });
  }
}

function floatExpEq(a, b) {
  // if the numbers are BOTH nearly zero, due of
  //   floating-point imprecision we consider them equal
  //   regardless of exponent
  if (Math.abs(a.v) < 1e-15 && Math.abs(b.v) < 1e-15) {
    return true;
  }
  if (a.e !== b.e) {
    return false;
  } else {
    // if the numbers are nearly equal, we consider them
    //   equal because of floating-point imprecision
    return Math.abs(a.v - b.v) < 1e-15;
  }
}

// assuming a and b have both been aligned...
// ...but how much slower would it be to align
//   the given values only if needed?
function floatExpGt(a, b) {
  // if the numbers are nearly equal, we consider them
  //   equal because of floating-point imprecision
  if (Math.abs(a.v - b.v) < 1e-15) {
    return a.e > b.e;
  }
  if (a.v < 0) {
    if (b.v >= 0) {
      return false;
    }
  } else if (a.v > 0) {
    if (b.v <= 0) {
      return true;
    }
  } else {
    return b.v < 0;
  }
  if (a.e > b.e) {
    return true;
  }
  if (a.e < b.e) {
    return false;
  }
  return a.v > b.v;
}

// assuming a and b have both been aligned...
function floatExpGe(a, b) {
  return floatExpEq(a, b) || floatExpGt(a, b);
}

// assuming a and b have both been aligned...
// ...but how much slower would it be to align
//   the given values only if needed?
function floatExpLt(a, b) {
  // if the numbers are nearly equal, we consider them
  //   equal because of floating-point imprecision
  if (Math.abs(a.v - b.v) < 1e-15) {
    return a.e < b.e;
  }
  if (a.v < 0) {
    if (b.v >= 0) {
      return true;
    }
  } else if (a.v > 0) {
    if (b.v <= 0) {
      return false;
    }
  } else {
    return b.v > 0;
  }
  if (a.e > b.e) {
    return false;
  }
  if (a.e < b.e) {
    return true;
  }
  return a.v < b.v;
}

function floatExpLe(a, b) {
  return floatExpEq(a, b) || floatExpLt(a, b);
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
var sqrt10 = 10 ** 0.5;
function floatExpSqrt(a) {
  if (a.v === 0) {
    return a;
  }
  // we want to keep exponent an integer, so we must
  //   check whether it's even before dividing by 2
  if (a.e % 2 === 0) {
    return floatExpAlign({
      v: Math.sqrt(a.v),
      e: a.e / 2
    });
  } else {
    return floatExpAlign({
      v: Math.sqrt(a.v) * sqrt10,
      // >>1 is equivalent to Math.floor(a.e/2) BUT bitwise operations force
      //   JavaScript numbers down to unsigned 32-bit integers, so we cannot
      //   use bitwise operations here
      e: Math.floor(a.e/2)
    });
  }
}


function floatExpToString(n) {
  return n.v + "e" + n.e;
}

var FLOATEXP_LN10 = createFloatExpFromNumber(Math.LN10);
var FLOATEXP_LN_EPSILON = floatExpAlign({
  v: 1,
  e: -20
});
var FLOATEXP_ONE = createFloatExpFromNumber(1);
var FLOATEXP_KLIMIT = createFloatExpFromNumber(1000);
function floatExpLn(a) {
  // ensure mantissa is in range [1-10)
  let aligned = floatExpAlign(a);
  // divide mantissa by 10 to ensure it is in range [0-1)
  aligned.v /= 10;
  aligned.e += 1;

  // because ln(xy) = ln(x) + ln(y)
  //   and our aligned value is now v * 10^e
  //   (where 0 <= v < 1)
  // we can add ln(v) + ln(10^e) to find the ln of the given
  //   floatExp value
  // since ln(10^e) = log_10(10^e) * ln(10)
  // therefore
  // ln(10^e) = e * ln(10)
  // therefore the ln of the given floatExp value is
  // ln(v) + e * ln(10)

  // since the mantissa (v) is in the range [0-1) we can calculate
  //   it using a power series (from wikipedia)
  // https://en.wikipedia.org/wiki/Logarithm#Power_series
  const one = createFloatExpFromNumber(1);
  const aMinusOne = floatExpSub(createFloatExpFromNumber(aligned.v), one);
  let aMinusOnePower = one;
  let kthTerm = one;
  let ln = createFloatExpFromNumber(0);
  let doAdd = false;
  for (let k = one; floatExpGt(kthTerm, FLOATEXP_LN_EPSILON) && floatExpLt(k, FLOATEXP_KLIMIT); k = floatExpAdd(k, FLOATEXP_ONE)) {
    doAdd = !doAdd;
    aMinusOnePower = floatExpMul(aMinusOnePower, aMinusOne);
    let kthTerm = floatExpDiv(aMinusOnePower, k);
    if (doAdd) {
      ln = floatExpAdd(ln, kthTerm);
    } else {
      ln = floatExpSub(ln, kthTerm);
    }
  }
  return floatExpAdd(ln, floatExpMul(createFloatExpFromNumber(aligned.e), FLOATEXP_LN10));
}

// remove starting here for minify
if (doUnitTests) {

  const runUnitTest = function(testFn) {
    if (!testFn()) {
      console.log("unit test FAILED:\n" + testFn.toString());
    }
  }

  runUnitTest(function() {
    // 1.23 * 10 = 12.3
    const a = createFloatExpFromInfNum({v:123n, e:-2n});
    const b = createFloatExpFromInfNum({v:10n, e:0n});
    const c = floatExpMul(a, b);
    return floatExpEq(c, createFloatExpFromString("12.3"));
  });

  runUnitTest(function() {
    // 123 * 0.01 = 1.23
    const a = createFloatExpFromInfNum({v:123n, e:0n});
    const b = createFloatExpFromInfNum({v:1n, e:-2n});
    const c = floatExpMul(a, b);
    return floatExpEq(c, createFloatExpFromString("1.23"));
  });

  runUnitTest(function() {
    // 1.23 * 10 = 12.3
    const a = createFloatExpFromString("1.23");
    const b = createFloatExpFromString("10");
    const c = floatExpMul(a, b);
    return floatExpEq(c, createFloatExpFromString("12.3"));
  });

  runUnitTest(function() {
    // 123 * 0.01 = 1.23
    const a = createFloatExpFromString("123");
    const b = createFloatExpFromString("0.01");
    const c = floatExpMul(a, b);
    return floatExpEq(c, createFloatExpFromString("1.23"));
  });

  runUnitTest(function() {
    // 100 / 0.25 = 400
    const a = createFloatExpFromString("100");
    const b = createFloatExpFromString("0.25");
    const c = floatExpDiv(a, b);
    return floatExpEq(c, createFloatExpFromString("400"));
  });

  runUnitTest(function() {
    // 0.123 / 10 = 0.0123
    const a = createFloatExpFromString("0.123");
    const b = createFloatExpFromString("10");
    const c = floatExpDiv(a, b);
    return floatExpEq(c, createFloatExpFromString("0.0123"));
  });

  // with floating-point numbers' imperfect precision,
  //   we run into 5.55000...001e2 != 5.55e2
  runUnitTest(function() {
    // 123 + 432 = 555
    const a = createFloatExpFromString("123");
    const b = createFloatExpFromString("432");
    const c = floatExpAdd(a, b);
    return floatExpEq(c, createFloatExpFromString("555"));
  });

  // with floating-point numbers' imperfect precision,
  //   we run into 1.234559999...e2 != 1.23456e2
  runUnitTest(function() {
    // 123 + 0.456 = 123.456
    const a = createFloatExpFromString("123");
    const b = createFloatExpFromString("0.456");
    const c = floatExpAdd(a, b);
    return floatExpEq(c, createFloatExpFromString("123.456"));
  });

  runUnitTest(function() {
    // 123 - 23 = 100
    const a = createFloatExpFromString("123");
    const b = createFloatExpFromString("23");
    const c = floatExpSub(a, b);
    return floatExpEq(c, createFloatExpFromString("100"));
  });

  runUnitTest(function() {
    // 1 - 0.25 = 0.75
    const a = createFloatExpFromString("1");
    const b = createFloatExpFromString("0.25");
    const c = floatExpSub(a, b);
    return floatExpEq(c, createFloatExpFromString("0.75"));
  });

  runUnitTest(function() {
    // 1 - -0.5 = 1.5
    const a = createFloatExpFromString("1");
    const b = createFloatExpFromString("-0.5");
    const c = floatExpSub(a, b);
    return floatExpEq(c, createFloatExpFromString("1.5"));
  });

  runUnitTest(function() {
    // 2 > 100 = false
    const a = createFloatExpFromString("2.00");
    const b = createFloatExpFromString("100");
    return floatExpGt(a, b) === false;
  });

  runUnitTest(function() {
    // with floating-point numbers' imperfect precision,
    //   we run into 5.55000...001e2 > 5.55e2
    const a = createFloatExpFromString("123");
    const b = createFloatExpFromString("432");
    const c = floatExpAdd(a, b);
    const d = createFloatExpFromString("555")
    return floatExpGt(c, d) === false;
  });

  runUnitTest(function() {
    // 0 > -0.00123 = true
    const a = createFloatExpFromString("0");
    const b = createFloatExpFromString("-0.00123");
    return floatExpGt(a, b);
  });

  runUnitTest(function() {
    // 0 > -0.00123 = true
    const a = createFloatExpFromString("0");
    const b = createFloatExpFromString("0.00123");
    return floatExpGt(a, b) === false;
  });

  runUnitTest(function() {
    // 0 > -0.00123 = true
    const a = createFloatExpFromString("0.001");
    const b = createFloatExpFromString("0");
    return floatExpGt(a, b);
  });

  runUnitTest(function() {
    // 0 > -0.00123 = true
    const a = createFloatExpFromString("-0.001");
    const b = createFloatExpFromString("0");
    return floatExpGt(a, b) === false;
  });

  runUnitTest(function() {
    // 2 >= 100 = false
    const a = createFloatExpFromString("2.00");
    const b = createFloatExpFromString("100");
    return floatExpGe(a, b) === false;
  });

  runUnitTest(function() {
    // 2 < 100 = true
    const a = createFloatExpFromString("2.00");
    const b = createFloatExpFromString("100");
    return floatExpLt(a, b) ;
  });

  runUnitTest(function() {
    // 1.071*10^-709 < 0 = false
    const a = floatExpAlign({e:-709, v:1.071});
    const b = {e:0, v:0};
    return floatExpLt(a, b) === false;
  });

  runUnitTest(function() {
    // with floating-point numbers' imperfect precision,
    //   we run into 5.55e2 < 5.55000...001e2
    const a = createFloatExpFromString("123");
    const b = createFloatExpFromString("432");
    const c = floatExpAdd(a, b);
    const d = createFloatExpFromString("555")
    return floatExpLt(d, c) === false;
  });

  runUnitTest(function() {
    // 2 <= 100 = true
    const a = createFloatExpFromString("2.00");
    const b = createFloatExpFromString("100");
    return floatExpLe(a, b);
  });

  runUnitTest(function() {
    // sqrt({v:2, e:7}) = {v:Math.sqrt(2)*Math.sqrt(10), e:3}
    const a = createFloatExpFromInfNum({v:2n, e:7n});
    const b = {v:Math.sqrt(2)*Math.sqrt(10), e:3};
    return floatExpEq(floatExpSqrt(a), b);
  });

  runUnitTest(function() {
    // sqrt({v:2, e:10}) = {v:Math.sqrt(2), e:5}
    const a = createFloatExpFromInfNum({v:2n, e:10n});
    const b = {v:Math.sqrt(2), e:5};
    return floatExpEq(floatExpSqrt(a), b);
  });

}
// remove ending here for minify
