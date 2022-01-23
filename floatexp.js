/**
 * some parts of this file (as commented below) are based on floatexp.h
 *   by Claude Heiland-Allen, from:
 *   https://code.mathr.co.uk/mandelbrot-perturbator/blob/5349b42b919caa56e6acbcb8c3ee7fba8c5bb8d2:/c/lib/floatexp.h
 *   which may made available under the GPL3+ license (http://www.gnu.org/licenses/gpl.html)
 *
 * at the time of writing the floatexp.h file, in particular though other
 *   files in the same directory do, does NOT contain a GPL3+ notice
 */

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
  if (a.v === 0 && b.v === 0) {
    return true;
  }
  if (a.e !== b.e) {
    return false;
  } else {
    return a.v === b.v;
  }
}

// ported from floatexp.h
function floatExpGt(a, b) {
  if (a.v > 0) {
    if (b.v < 0) {
      return true;
    } else if (a.e > b.e) {
      return true;
    } else if (a.e < b.e) {
      return false;
    } else {
      return a.v > b.v;
    }
  } else {
    if (b.v > 0) {
      return false;
    } else if (a.e > b.e) {
      return false;
    } else if (a.e < b.e) {
      return true;
    } else {
      return a.v > b.v;
    }
  }
}

// ported from floatexp.h
function floatExpGe(a, b) {
  return floatExpEq(a, b) || floatExpGt(a, b);
}

// ported from floatexp.h
function floatExpLt(a, b) {
  if (a.v > 0) {
    if (b.v < 0) {
      return false;
    } else if (a.e > b.e) {
      return false;
    } else if (a.e < b.e) {
      return true;
    } else {
      return a.v < b.v;
    }
  } else {
    if (b.v > 0) {
      return true;
    } else if (a.e > b.e) {
      return true;
    } else if (a.e < b.e) {
      return false;
    } else {
      return a.v < b.v;
    }
  }
}

// ported from floatexp.h
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

// remove starting here for minify
if (doUnitTests) {

  let a = createFloatExpFromInfNum({v:123n, e:-2n});
  let b = createFloatExpFromInfNum({v:10n, e:0n});
  let c = floatExpMul(a, b);
  console.log(a, "*", b, "=", c, " // 1.23 * 10 = 12.3");

  a = createFloatExpFromInfNum({v:123n, e:0n});
  b = createFloatExpFromInfNum({v:1n, e:-2n});
  c = floatExpMul(a, b);
  console.log(a, "*", b, "=", c, " // 123 * 0.01 = 1.23");

  a = createFloatExpFromString("1.23");
  b = createFloatExpFromString("10");
  c = floatExpMul(a, b);
  console.log(a, "*", b, "=", c, " // 1.23 * 10 = 12.3");

  a = createFloatExpFromString("123");
  b = createFloatExpFromString("0.01");
  c = floatExpMul(a, b);
  console.log(a, "*", b, "=", c, " // 123 * 0.01 = 1.23");

  a = createFloatExpFromString("100");
  b = createFloatExpFromString("0.25");
  c = floatExpDiv(a, b);
  console.log(a, "/", b, "=", c, " // 100 / 0.25 = 400");

  a = createFloatExpFromString("0.123");
  b = createFloatExpFromString("10");
  c = floatExpDiv(a, b);
  console.log(a, "/", b, "=", c, " // 0.123 / 10 = 0.0123");

  a = createFloatExpFromString("123");
  b = createFloatExpFromString("432");
  c = floatExpAdd(a, b);
  console.log(a, "+", b, "=", c, " // 123 + 432 = 555");

  a = createFloatExpFromString("123");
  b = createFloatExpFromString("0.456");
  c = floatExpAdd(a, b);
  console.log(a, "+", b, "=", c, " // 123 + 0.456 = 123.456");

  a = createFloatExpFromString("123");
  b = createFloatExpFromString("23");
  c = floatExpSub(a, b);
  console.log(a, "-", b, "=", c, " // 123 - 23 = 100");

  a = createFloatExpFromString("1");
  b = createFloatExpFromString("0.25");
  c = floatExpSub(a, b);
  console.log(a, "-", b, "=", c, " // 11 - 0.25 = 0.75");

  a = createFloatExpFromString("1");
  b = createFloatExpFromString("-0.5");
  c = floatExpSub(a, b);
  console.log(a, "-", b, "=", c, " // 1 - -0.5 = 1.5");

  a = createFloatExpFromString("2.00");
  b = createFloatExpFromString("100");
  c = floatExpGt(a, b);
  console.log(a, ">", b, "=", c, " // 2 > 100 = false");

  a = createFloatExpFromString("2.00");
  b = createFloatExpFromString("100");
  c = floatExpGe(a, b);
  console.log(a, ">=", b, "=", c, " // 2 >= 100 = false");

  a = createFloatExpFromString("2.00");
  b = createFloatExpFromString("100");
  c = floatExpLt(a, b);
  console.log(a, "<", b, "=", c, " // 2 < 100 = true");

  a = createFloatExpFromString("2.00");
  b = createFloatExpFromString("100");
  c = floatExpLe(a, b);
  console.log(a, "<=", b, "=", c, " // 2 <= 100 = true");

  a = createFloatExpFromInfNum({v:2n, e:7n});
  c = floatExpSqrt(a);
  console.log("sqrt(", a, ") =", c, " // sqrt({v:2, e:7}) = {v:Math.sqrt(2)*Math.sqrt(10), e:3}");

  a = createFloatExpFromInfNum({v:2n, e:10n});
  c = floatExpSqrt(a);
  console.log("sqrt(", a, ") =", c, " // sqrt({v:2, e:10}) = {v:Math.sqrt(2), e:5}");
}
// remove ending here for minify
