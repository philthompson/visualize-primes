
// this script file is loaded both by the main script, and
//   by subworkers.  for subworkers, infnum.js needs to be
//   loaded explicitly here
if (typeof importScripts === 'function') {
  importScripts("infnum.js");
}

function complexFloatMul(a, b) {
  //return {x:a.x*b.x-a.y*b.y, y:a.x*b.y+a.y*b.x};
  return {
    x: (a.x*b.x) - (a.y*b.y),
    y: (a.x*b.y) + (a.y*b.x) 
  };
}

function complexFloatRealMul(a, real) {
  return {x:a.x*real, y:a.y*real};
}

function complexFloatAdd(a, b) {
  return {x:a.x+b.x, y:a.y+b.y};
}

const windowCalcIgnorePointColor = -2;

// each "plot" has its own "privContext" that can contain whatever data/functions
//   it needs to compute points
const plots = [{
  "name": "Mandelbrot-set",
  "pageTitle": "Mandelbrot set",
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
  "computeBoundPointColor": function(n, precis, algorithm, x, y) {
    const maxIter = n;
    const four = infNum(4n, 0n);

    if (algorithm == "basic-float") {
      // truncating to 15 decimal digits here is equivalent to truncating
      //   to 16 significant digits, but it's more efficient to do both at once
      let xFloat = parseFloat(infNumExpStringTruncToLen(x, 15));
      let yFloat = parseFloat(infNumExpStringTruncToLen(y, 15));
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
        return iter / maxIter;
      }
    }

    if (algorithm != "basic-arbprecis") {
      console.log("unexpected/unknown algorithm [" + algorithm + "]");
      return windowCalcIgnorePointColor;
    }

    const two = infNum(2n, 0n);

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
        if (infNumGt(infNumAdd(ixSq, iySq), four)) {
          break;
        }
        ixTemp = infNumAdd(x, infNumSub(ixSq, iySq));
        iy = infNumAdd(y, infNumMul(two, infNumMul(ix, iy)));
        ix = ixTemp;
        ix = infNumTruncateToLen(ix, precis);
        iy = infNumTruncateToLen(iy, precis);
        iter++;
      }

      if (iter == maxIter) {
        return -1.0; // background color
      } else {
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return iter / maxIter;
      }
    } catch (e) {
      console.log("ERROR CAUGHT when processing point (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return windowCalcIgnorePointColor; // special color value that will not be displayed
    }
  },
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeReferenceOrbitFloat": function(n, precis, x, y) {
    let orbit = [];

    const maxIter = n;
    const two = infNum(2n, 0n);
    const four = infNum(4n, 0n);

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
        if (infNumGt(infNumAdd(ixSq, iySq), four)) {
          break;
        }
        // (it seems more efficient to let JavaScript truncate by using
        //   the full exponential notation with parseFloat(), but maybe
        //   some precision is lost and it would be better to truncate
        //   first, then call parseFloat()?
        orbit.push({
          x: parseFloat(infNumExpString(ix)),
          y: parseFloat(infNumExpString(iy))
        });
        ixTemp = infNumAdd(x, infNumSub(ixSq, iySq));
        iy = infNumAdd(y, infNumMul(two, infNumMul(ix, iy)));
        ix = copyInfNum(ixTemp);
        ix = infNumTruncateToLen(ix, precis);
        iy = infNumTruncateToLen(iy, precis);
        iter++;
      }

      return orbit;
    } catch (e) {
      console.log("ERROR CAUGHT when computing reference orbit at point (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return orbit;
    }
  },
  // x, y, referenceX, and referenceY must be infNum objects of a coordinate in the abstract plane being computed upon
  // referenceOrbit is array of pre-converted InfNum->float: [{x: ,y: },{x: , y: }]
  "computeBoundPointColorPerturb": function(n, precis, x, y, referenceX, referenceY, referenceOrbit) {

    const maxIter = n;

    //  from https://fractalwiki.org/wiki/Perturbation_theory
    //
    //  The escape time formula for the Mandelbrot set involves iterating 𝑧→𝑧2+𝑐 starting from 𝑧=0 with 𝑐 being the coordinates of the pixel. Perturbation works by replacing each variable with an unevaluated sum of a high precision reference (upper case) and a low precision delta (lower case). Thus:
    //
    //  𝑍+𝑧→(𝑍+𝑧)^2+(𝐶+𝑐)
    //
    //  which can be re-arranged (using 𝑍→𝑍2+𝐶) to give:
    //
    //  𝑧→2𝑍𝑧+𝑧^2+𝑐
    //
    //  in which most of the high precision 𝑍,𝐶 have cancelled out, and 𝑧 can be iterated with low precision numerics. 

    // the below algorithm for perturbation glitch avoidance (re-basing the
    //   delta orbit back to the same reference orbit when the absolute
    //   value of the delta exceeds the reference, or when the reference
    //   orbit has been followed to the end) is from Zhuoran's post here:
    // https://fractalforums.org/fractal-mathematics-and-new-theories/28/another-solution-to-perturbation-glitches/4360

    const deltaCx = infNumSub(x, referenceX);
    const deltaCy = infNumSub(y, referenceY);

    // (it seems more efficient to let JavaScript truncate by using
    //   the full exponential notation with parseFloat(), but maybe
    //   some precision is lost and it would be better to truncate
    //   first, then call parseFloat()?
    let deltaC = {
      x: parseFloat(infNumExpString(deltaCx)),
      y: parseFloat(infNumExpString(deltaCy))
    };

    let iter = 0;

    // since the last reference orbit may have escaped, use the one before
    //   the last as the last? (i don't think it really matters)
    const maxReferenceIter = referenceOrbit.length - 2;
    let referenceIter = 0;

    let deltaZ = {x: 0.0, y: 0.0};
    let z = null;
    let zAbs = null;
    let deltaZAbs = null;

    try {
      while (iter < maxIter) {
        deltaZ = complexFloatAdd(
          complexFloatAdd(
            complexFloatMul(complexFloatRealMul(referenceOrbit[referenceIter], 2), deltaZ),
            complexFloatMul(deltaZ, deltaZ)
          ),
          deltaC);

        referenceIter++;

        z = complexFloatAdd(referenceOrbit[referenceIter], deltaZ);
        zAbs = (z.x*z.x) + (z.y*z.y);
        if (zAbs > 4) {
          break;
        }
        deltaZAbs = (deltaZ.x*deltaZ.x) + (deltaZ.y*deltaZ.y);
        if (zAbs < deltaZAbs || referenceIter == maxReferenceIter) {
          deltaZ = z;
          referenceIter = 0;
        }

        iter++;
      }

      if (iter == maxIter) {
        return -1.0; // background color
      } else {
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return iter / maxIter;
      }

    } catch (e) {
      console.log("ERROR CAUGHT when processing perturb point",
        {x:infNumToString(x), y:infNumToString(y), iter:iter, maxIter:maxIter, refIter:referenceIter, maxRefIter:maxReferenceIter});
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return windowCalcIgnorePointColor; // special color value that will not be displayed
    }
  },
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 40,
    "scale": infNum(400n, 0n),
    "centerX": createInfNum("-0.65"),
    "centerY": infNum(0n, 0n)
  },
  "privContext": {
    "usesImaginaryCoordinates": true,
    "adjustPrecision": function(scale) {
      const precisScale = infNumTruncateToLen(scale, 8); // we probably only need 1 or 2 significant digits for this...
      // this window plot can define its own "algorithm", which it can use
      //   later, when the pixels are being calculated?
      // "basic-float" (basic escape time algorithm with regular JavaScript numbers (64-bit floats))
      // "perturb-float" (perturbation theory with arbitrary precision reference orbit and float delta orbit)
      // "basic-arbprecis" (super-slow basic escape time algorithm with arbitrary precision)
      //
      // future methods that may be implemented:
      // "perturb-double" (with something like double.js)
      // "perturb-floatexp" (with port of floatexp)
      // "sa-float" (series approximation)
      // "sa-double"
      // "sa-floatexp"
      const ret = {
        roughScale: infNumExpString(precisScale),
        precision: 12,
        algorithm: "basic-float"
      };
      if (infNumGe(precisScale, createInfNum("1e304"))) {
        ret.algorithm = "basic-arbprecis";
      } else if (infNumGe(precisScale, createInfNum("3e13"))) {
        ret.algorithm = "perturb-float";
      }
      // these values need more testing to ensure they create pixel-identical images
      //   to higher-precision images
      if (infNumLt(precisScale, createInfNum("1e3"))) {
        ret.precision = 12;
      } else if (infNumLt(precisScale, createInfNum("2e6"))) {
        ret.precision = 12;
      } else if (infNumLt(precisScale, createInfNum("3e13"))) {
        ret.precision = 20;
      } else {
        // if the scale is <1e32, set precision to 32
        // if the scale is <1e48, set precision to 48
        // ...
        ret.precision = -1;
        for (let i = 32; i <= 304; i+=16) {
          if (infNumLt(precisScale, createInfNum("1e" + i))) {
            ret.precision = i;
            break;
          }
        }
        // for scales at/larger than 1e304, use the magnitude as
        //   the precision -- more research is needed on this
        if (ret.precision < 0) {
          ret.precision = Math.floor(infNumMagnitude(precisScale) * 1.01);
        }
      }
      console.log("mandelbrot settings for scale:", ret);
      return ret;
    },
    "minScale": createInfNum("20")
  }
},{
  "name": "Primes-1-Step-90-turn",
  "pageTitle": "Primes",
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

    resultPoints.push(getPoint(0.0, 0.0));
    var nextPoint = getPoint(0.0, 0.0);
    privContext.direction = 0;

    for (var i = 1; i < params.n; i++) {
      if (isPrime(i)) {
        //console.log(i + " is prime");
        // only add points right before we change direction, and once at the end
        nextPoint.v = {prime: i.toLocaleString()};
        resultPoints.push(nextPoint);
        privContext.direction = privContext.changeDirection(privContext.direction);
      }
      // find the next point according to direction and current location
      nextPoint = privContext.computeNextPoint(privContext.direction, i, nextPoint.x, nextPoint.y, {last: (i+1).toLocaleString()});
      resultLength += 1;
    }
    // add the last point (if the last point is a prime, rename it "prime")
    if (isPrime(parseInt(nextPoint.v.last))) {
      nextPoint.v = {prime: nextPoint.v.last};
    }
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
    "computeNextPoint": function(dir, n, x, y, v) {
      return computeNextPointDegrees(dir, 1, x, y, v);
    }
  }
},{
  "name": "Primes-1-Step-45-turn",
  "pageTitle": "Primes",
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

    resultPoints.push(getPoint(0.0, 0.0));
    var nextPoint = getPoint(0.0, 0.0);
    privContext.direction = 315;

    for (var i = 1; i < params.n; i++) {
      if (isPrime(i)) {
        //console.log(i + " is prime");
        // only add points right before we change direction, and once at the end
        nextPoint.v = {prime: i.toLocaleString()};
        resultPoints.push(nextPoint);
        privContext.direction = privContext.changeDirection(privContext.direction);
      }
      // find the next point according to direction and current location
      nextPoint = privContext.computeNextPoint(privContext.direction, i, nextPoint.x, nextPoint.y, {last: (i+1).toLocaleString()});
      resultLength += 1;
    }
    // add the last point (if the last point is a prime, rename it "prime")
    if (isPrime(parseInt(nextPoint.v.last))) {
      nextPoint.v = {prime: nextPoint.v.last};
    }
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
    "computeNextPoint": function(dir, n, x, y, v) {
      return computeNextPointDegrees(dir, 1, x, y, v);
    }
  }
},{
  "name": "Squares-1-Step-90-turn",
  "pageTitle": "Squares",
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
      nextPoint = privContext.computeNextPoint(privContext.direction, i, nextPoint.x, nextPoint.y, {square: (i+1).toLocaleString()});
      resultLength += 1;
    }
    // add the last point (if the last point is not a square, rename it "last")
    if (!privContext.isSquare(parseInt(nextPoint.v.square))) {
      nextPoint.v = {last: nextPoint.v.square};
    }
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
    "computeNextPoint": function(dir, n, x, y, v) {
      return computeNextPointDegrees(dir, 1, x, y, v);
    },
    "isSquare": function(n) {
      const sqrt = Math.sqrt(n);
      return sqrt == Math.trunc(sqrt);
    }
  }
},{
  "name": "Squares-1-Step-45-turn",
  "pageTitle": "Squares",
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
      nextPoint = privContext.computeNextPoint(privContext.direction, i, nextPoint.x, nextPoint.y, {square: (i+1).toLocaleString()});
      resultLength += privContext.direction % 90 == 0 ? 1 : diagHypot;
    }
    // add the last point (if the last point is not a square, rename it "last")
    if (!privContext.isSquare(parseInt(nextPoint.v.square))) {
      nextPoint.v = {last: nextPoint.v.square};
    }
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
    "computeNextPoint": function(dir, n, x, y, v) {
      return computeNextPointDegrees(dir, 1, x, y, v);
    },
    "isSquare": function(n) {
      const sqrt = Math.sqrt(n);
      return sqrt == Math.trunc(sqrt);
    }
  }
},{
  "name": "Primes-X-Y-neg-mod-3",
  "pageTitle": "Primes",
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
        const nextPoint = getPoint(parseFloat(lastX), parseFloat(thisY), {prime: i.toLocaleString()});
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
  "pageTitle": "Trapped Knight",
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

