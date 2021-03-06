function selectMathInterfaceFromAlgorithm(algorithm) {
  if (algorithm.includes("arbprecis")) {
    return infNumMath;
  }
  // since "floatexp" contains "float" we must check for
  //   "floatexp" first
  if (algorithm.includes("floatexp")) {
    return floatExpMath;
  }
  return floatMath;
}

const floatMath = {
  name: "float",
  zero: 0, one: 1, two: 2, four:4, // these are NOT complex numbers
  mul: function(a, b) { return a * b; },
  div: function(a, b, precision = 0) { return a / b; },
  add: function(a, b) { return a + b; },
  sub: function(a, b) { return a - b; },
  complexMul: function(a, b) {
    return {
      x: (a.x*b.x) - (a.y*b.y),
      y: (a.x*b.y) + (a.y*b.x)
    };
  },
  complexRealMul: function(a, real) {
    return {x:a.x*real, y:a.y*real};
  },
  complexAdd: function(a, b) {
    return {x:a.x+b.x, y:a.y+b.y};
  },
  complexRealAdd: function(a, real) {
    return {
      x: a.x + real,
      y: a.y
    };
  },
  complexAbsSquared: function(a) {
    return a.x * a.x + a.y * a.y;
  },
  complexAbs: function(a) {
    return Math.hypot(a.x, a.y);
  },
  gt: function(a, b) {
    return a > b;
  },
  lt: function(a, b) {
    return a < b;
  },
  // (it seems more efficient to let JavaScript truncate by using
  //   the full exponential notation with parseFloat(), but maybe
  //   some precision is lost and it would be better to truncate
  //   first, then call parseFloat()?
  createFromInfNum: function(a) {
    return parseFloat(infNumExpStringTruncToLen(a, 18));
  },
  createFromNumber: function(a) {
    return a;
  },
  createFromExpString: function(a) {
    return parseFloat(a);
  },
  toExpString: function(a) {
    return a.toExponential();
  },
  // do nothing for float here
  truncateToSigDig: function(a, precision = 0) {
    return a;
  },
  // returns a float
  log: function(a) {
    return Math.log(a);
  }
};

const floatExpMath = {
  name: "floatexp",
  // these are NOT complex numbers
  zero: createFloatExpFromNumber(0), one: createFloatExpFromNumber(1), two: createFloatExpFromNumber(2), four: createFloatExpFromNumber(4),
  mul: function(a, b) { return floatExpMul(a, b); },
  div: function(a, b, precision = 0) { return floatExpDiv(a, b); },
  add: function(a, b) { return floatExpAdd(a, b); },
  sub: function(a, b) { return floatExpSub(a, b); },
  complexMul: function(a, b) {
    return {
      x: floatExpSub(floatExpMul(a.x, b.x), floatExpMul(a.y, b.y)),
      y: floatExpAdd(floatExpMul(a.x, b.y), floatExpMul(a.y, b.x))
    };
  },
  complexRealMul: function(a, real) {
    return {
      x: floatExpMul(a.x, real),
      y: floatExpMul(a.y, real)
    };
  },
  complexAdd: function(a, b) {
    return {
      x: floatExpAdd(a.x, b.x),
      y: floatExpAdd(a.y, b.y)
    };
  },
  complexRealAdd: function(a, real) {
    return {
      x: floatExpAdd(a.x, real),
      y: structuredClone(a.y)
    };
  },
  complexAbsSquared: function(a) {
    return floatExpAdd(floatExpMul(a.x, a.x), floatExpMul(a.y, a.y));
  },
  complexAbs: function(a) {
    return floatExpSqrt(floatExpAdd(floatExpMul(a.x, a.x), floatExpMul(a.y, a.y)));
  },
  gt: function(a, b) {
    return floatExpGt(a, b);
  },
  lt: function(a, b) {
    return floatExpLt(a, b);
  },
  createFromInfNum: function(a) {
    return createFloatExpFromInfNum(a);
  },
  createFromNumber: function(a) {
    return createFloatExpFromNumber(a);
  },
  createFromExpString: function(a) {
    return createFloatExpFromString(a);
  },
  toExpString: function(a) {
    return floatExpToString(a);
  },
  // do nothing for floatexp here
  truncateToSigDig: function(a, precision = 0) {
    return structuredClone(a);
  },
  // returns a float
  log: function(a) {
    return parseFloat(floatExpToString(floatExpLn(a)));
  }
};

const infNumMath = {
  name: "arbprecis",
  // these are NOT complex numbers
  zero: infNum(0n, 0n), one: infNum(1n, 0n), two: infNum(2n, 0n), four: infNum(4n, 0n),
  mul: function(a, b) { return infNumMul(a, b); },
  div: function(a, b, precision = 0) { return infNumDiv(a, b, precision); },
  add: function(a, b) { return infNumAdd(a, b); },
  sub: function(a, b) { return infNumSub(a, b); },
  complexMul: function(a, b) {
    return {
      x: infNumSub(infNumMul(a.x, b.x), infNumMul(a.y, b.y)),
      y: infNumAdd(infNumMul(a.x, b.y), infNumMul(a.y, b.x))
    };
  },
  complexRealMul: function(a, real) {
    return {
      x: infNumMul(a.x, real),
      y: infNumMul(a.y, real)
    };
  },
  complexAdd: function(a, b) {
    return {
      x: infNumAdd(a.x, b.x),
      y: infNumAdd(a.y, b.y)
    };
  },
  complexRealAdd: function(a, real) {
    return {
      x: infNumAdd(a.x, real),
      y: structuredClone(a.y)
    };
  },
  complexAbsSquared: function(a) {
    return infNumAdd(infNumMul(a.x, a.x), infNumMul(a.y, a.y));
  },
  complexAbs: function(a) {
    return infNumRoughSqrt(infNumAdd(infNumMul(a.x, a.x), infNumMul(a.y, a.y)));
  },
  gt: function(a, b) {
    return infNumGt(a, b);
  },
  lt: function(a, b) {
    return infNumLt(a, b);
  },
  createFromInfNum: function(a) {
    return structuredClone(a);
  },
  createFromNumber: function(a) {
    return createInfNum(a.toString());
  },
  createFromExpString: function(a) {
    return createInfNum(a);
  },
  toExpString: function(a) {
    return infNumExpString(a);
  },
  truncateToSigDig: function(a, precision = 0) {
    return infNumTruncateToLen(a, precision);
  }
};