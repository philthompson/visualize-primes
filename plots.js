
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

function infNumComplexMul(a, b) {
  return {
    x: infNumSub(infNumMul(a.x, b.x), infNumMul(a.y, b.y)),
    y: infNumAdd(infNumMul(a.x, b.y), infNumMul(a.y, b.x))
  };
}

function complexFloatToInfNum(a) {
  return {
    x: createInfNum(a.x.toString()),
    y: createInfNum(a.y.toString())
  };
}

function complexInfNumToFloat(a) {
  return {
    x: parseFloat(infNumExpStringTruncToLen(a.x, 15)),
    y: parseFloat(infNumExpStringTruncToLen(a.y, 15))
    //x: parseFloat(infNumExpString(a.x)),
    //y: parseFloat(infNumExpString(a.y))
  };
}

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
  "computeBoundPointColor": function(n, precis, useFloat, x, y) {
    const maxIter = n;
    const four = infNum(4n, 0n);

    if (useFloat) {
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
        //return privContext.applyColorCurve(iter / maxIter);
        return iter / maxIter;
      }
    }

    // circle heuristics to speed up zoomed-out viewing
    //if (mandelbrotCircleHeuristic) {
    if (false) {
      for (var i = 0; i < privContext.circles.length; i++) {
        const xDist = infNumSub(x, privContext.circles[i].centerX);
        const yDist = infNumSub(y, privContext.circles[i].centerY);
        if (infNumLe(infNumAdd(infNumMul(xDist, xDist), infNumMul(yDist, yDist)), privContext.circles[i].radSq)) {
          return -1.0; // background color
        }
      }
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
        //return privContext.applyColorCurve(iter / maxIter);
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
        // floats can handle 16 significant digits?  if so, truncate
        //   the exponential notation string to 15 decimal places
        //   (plus the done digit before decimal point totals to
        //   16 significant digits)
        // (it's more efficient to just truncate using the
        //   exponential notation function than to truncate then
        //   convert to string)
        orbit.push({
          //x: parseFloat(infNumExpStringTruncToLen(ix, 15)),
          //y: parseFloat(infNumExpStringTruncToLen(iy, 15))
          //x: parseFloat(infNumToString(ix)),
          //y: parseFloat(infNumToString(iy))
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
      return orbit; // special color value that will not be displayed
    }
  },
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeReferenceOrbit": function(n, precis, x, y) {
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
        // store full (at specified precision) reference orbit points
        orbit.push({
          x: copyInfNum(ix),
          y: copyInfNum(iy)
        });
        ixTemp = infNumAdd(x, infNumSub(ixSq, iySq));
        iy = infNumAdd(y, infNumMul(two, infNumMul(ix, iy)));
        ix = ixTemp;
        ix = infNumTruncateToLen(ix, precis);
        iy = infNumTruncateToLen(iy, precis);
        iter++;
      }

      return orbit;
    } catch (e) {
      console.log("ERROR CAUGHT when computing reference orbit at point (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return orbit; // special color value that will not be displayed
    }
  },
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeBoundPointColorPerturb": function(n, precis, x, y, referenceX, referenceY, referenceOrbit) {
    //if (infNumToString(x) == "-0.05125" && infNumToString(y) == "1.0875") {
    //  let schmoop = "boop";
    //}
    const maxIter = n;
    //  const four = infNum(4n, 0n);

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


    //const deltaCx = infNumSub(referenceX, x);
    //const deltaCy = infNumSub(referenceY, y);
    const deltaCx = infNumSub(x, referenceX);
    const deltaCy = infNumSub(y, referenceY);

    //console.log("deltaCx: [" + infNumExpString(deltaCx) + "], deltaCy: [" + infNumExpString(deltaCy) + "]");

    // if this point is the reference point, it doesn't need to be re-computed;
    // since deltaCx is always zero, for now, check deltaCy first
//    if (infNumEq(deltaCy, infNum(0n, 0n)) && infNumEq(deltaCx, infNum(0n, 0n))) {
//      return referenceOrbit.length >= maxIter ? -1 : (referenceOrbit.length / maxIter);
//    }

    // floats can handle 16 significant digits?  if so, truncate
    //   the exponential notation string to 15 decimal places
    //   (plus the done digit before decimal point totals to
    //   16 significant digits)
    // (it's more efficient to just truncate using the
    //   exponential notation function than to truncate then
    //   convert to string)
    let deltaC = {
      //x: parseFloat(infNumExpStringTruncToLen(deltaCx, 15)),
      //y: parseFloat(infNumExpStringTruncToLen(deltaCy, 15))
      //x: parseFloat(infNumToString(deltaCx)),
      //y: parseFloat(infNumToString(deltaCy))
      x: parseFloat(infNumExpString(deltaCx)),
      y: parseFloat(infNumExpString(deltaCy))
    };
    //if (parseFloat(infNumToString(deltaCx)) !== parseFloat(infNumExpString(deltaCx))) {
    //  console.log("different toString() implementations result in different floats:\n" +
    //    " infNumToString: " + parseFloat(infNumToString(deltaCx)) + "\n" +
    //    "infNumExpString: " + parseFloat(infNumExpString(deltaCx)));
    //}
    //if (parseFloat(infNumToString(deltaCx)) !== parseFloat(infNumExpStringTruncToLen(deltaCx, 15))) {
    //  console.log("different toString() implementations result in different floats:\n" +
    //    "                  infNumToString: " + parseFloat(infNumToString(deltaCx)) + "\n" +
    //    "infNumExpStringTruncToLen(n ,15): " + parseFloat(infNumExpStringTruncToLen(deltaCx, 15)));
    //}
    // logged these, and as expected, the dx is always the same (in a
    //   chunk) and dy moves a little bit
    //console.log("deltaC = {x:" + deltaC.x + ", y:" +  deltaC.y + "}");

    let iter = 0;

    // since the last reference orbit may have escaped, use the one before
    //   the last as the last? (i don't think it really matters)
    const maxReferenceIter = referenceOrbit.length - 2;
    //if (referenceOrbit.length < 2) {
    //  let hello = "world";
    //}
    let referenceIter = 0;

    let deltaZ = {x: 0.0, y: 0.0};
    let z = null;
    let zAbs = null;
    let deltaZAbs = null;

    // referenceOrbit is array of pre-converted InfNum->float: [{x: ,y: },{x: , y: }]

    // tmp, for debugging
    //let deltaOrbit = [];
    //let rebaseIters = {};

    try {
      while (iter < maxIter) {
        // this is the fully floating point calc
        //let twiceRefZ = complexFloatRealMul(referenceOrbit[referenceIter], 2);
        //let firstAddTerm = complexFloatMul(twiceRefZ, deltaZ);
        //let secondAddTerm = complexFloatMul(deltaZ, deltaZ);
        //let firstTwoAddTerms = complexFloatAdd(firstAddTerm, secondAddTerm);
        //let finalSum = complexFloatAdd(firstTwoAddTerms, deltaC);
        //deltaZ = structuredClone(finalSum);
        deltaZ = complexFloatAdd(
          complexFloatAdd(
            complexFloatMul(complexFloatRealMul(referenceOrbit[referenceIter], 2), deltaZ),
            complexFloatMul(deltaZ, deltaZ)
          ),
          deltaC);
        // this is the calc with arb-prec ref orbit
        //deltaZ = complexFloatAdd(
        //  complexFloatAdd(
        //    complexInfNumToFloat(
        //      infNumComplexMul(
        //        complexFloatToInfNum(complexFloatRealMul(deltaZ, 2)),
        //        referenceOrbit[referenceIter]),
        //    ),
        //    complexFloatMul(deltaZ, deltaZ)
        //  ),
        //  deltaC);

        referenceIter++;

        // for calc with arb-prec ref orbit
        //z = complexFloatAdd(complexInfNumToFloat(referenceOrbit[referenceIter]), deltaZ);
        z = complexFloatAdd(referenceOrbit[referenceIter], deltaZ);
        //deltaOrbit.push(z);

        zAbs = (z.x*z.x) + (z.y*z.y);
        if (zAbs > 4) {
          break;
        }
        deltaZAbs = (deltaZ.x*deltaZ.x) + (deltaZ.y*deltaZ.y);
        if (zAbs < deltaZAbs || referenceIter == maxReferenceIter) {
          //const refIterName = "refIter: " + referenceIter;
          //if (!rebaseIters.hasOwnProperty(refIterName)) {
          //  rebaseIters[refIterName] = 0;
          //}
          //rebaseIters[refIterName] += 1;
          deltaZ = z;
          referenceIter = 0;
        }

        iter++;
      }

      //console.log("point (" + infNumExpString(x) + ", " + infNumExpString(y) + ") " +
      //  "exploded on the [" + iter + "]th/[" + maxIter + "] iteration,\n" +
      //  "rebase counts: ", rebaseIters);


      // temporary: log the actual orbits of the reference point and this inferred delta orbit
      //console.log({reflen: referenceOrbit.length, iter: iter, x:infNumToString(x), y:infNumToString(y)});
      if (false && infNumToString(x) == "-0.05125" && infNumToString(y) == "1.0875") {
        console.log("// reference orbit:");
        const tmpStr = [];
        for (let i = 0; i < 100 && i < referenceOrbit.length; i++) {
          tmpStr.push("{x:\"" + referenceOrbit[i].x + "\",y:\"" + referenceOrbit[i].y + "\"}");
        }
        //console.log(referenceOrbit.slice(0, 100));
        console.log("const refOrbit = [" + tmpStr.join(",\n") + "];");
        console.log("// delta orbit:");
        tmpStr.length = 0;
        for (let i = 0; i < 100 && i < deltaOrbit.length; i++) {
          tmpStr.push("{x:\"" + deltaOrbit[i].x + "\",y:\"" + deltaOrbit[i].y + "\"}");
        }
        //console.log(deltaOrbit.slice(0, 100));
        console.log("const deltaOrbit = [" + tmpStr.join(",\n") + "];");
      }

      if (iter == maxIter) {
        return -1.0; // background color
      } else {
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        //return privContext.applyColorCurve(iter / maxIter);
        return iter / maxIter;
      }

    } catch (e) {
      console.log("ERROR CAUGHT when processing perturb point",
        {x:infNumToString(x), y:infNumToString(y), iter:iter, maxIter:maxIter, refIter:referenceIter, maxRefIter:maxReferenceIter});
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
    "n": 40,
    "scale": infNum(400n, 0n),
    "centerX": createInfNum("-0.65"),
    "centerY": infNum(0n, 0n)
  },
  "privContext": {
    "usesImaginaryCoordinates": true,
    "two": infNum(2n, 0n),
    //"black": getColor(0, 0, 0),
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
    "adjustPrecision": function(scale) {
      const precisScale = infNumTruncateToLen(scale, 8); // we probably only need 1 or 2 significant digits for this...
      // these values need more testing to ensure they create pixel-identical images
      //   to higher-precision images
      if (infNumLt(precisScale, createInfNum("3e13"))) {
        mandelbrotFloat = true;
      } else {
        mandelbrotFloat = false;
      }
      if (infNumLt(precisScale, createInfNum("1e3"))) {
        precision = 12;
      } else if (infNumLt(precisScale, createInfNum("2e6"))) {
        precision = 12;
      } else if (infNumLt(precisScale, createInfNum("3e13"))) {
        precision = 20;
      } else {
        // if the scale is <1e32, set precision to 32
        // if the scale is <1e48, set precision to 48
        // ...
        precision = -1;
        for (let i = 32; i < 300; i+=16) {
          if (infNumLt(precisScale, createInfNum("1e" + i))) {
            precision = i;
            break;
          }
        }
        if (precision < 0) {
          precision = 300;
        }
      }
      //console.log("set precision to [" + precision + "], using floats for mandelbrot [" + mandelbrotFloat + "]");
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
},{
  "name": "Debug-Orbits-Ref",
  "pageTitle": "Debug Reference Orbit",
  "calcFrom": "sequence",
  "desc": "none",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    let lastX = null;
    let lastY = null;
    let x = null;
    let y = null;

    for (let i = 0; i < refOrbit.length; i++) {
      x = parseFloat(refOrbit[i].x.trim());
      y = parseFloat(refOrbit[i].y.trim());
      if (lastX !== null) {
        resultLength += Math.hypot(x - lastX, y - lastY);
      }
      resultPoints.push(getPoint(x, y, {iter: i}));
      lastX = x;
      lastY = y;
    }

    return {
      "points": resultPoints,
      "length": resultLength
    };
  },
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 2016,
    "scale": infNum(300n, 0n),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
  },
  "privContext": {}  
},{
  "name": "Debug-Orbits-Delta",
  "pageTitle": "Debug Delta Orbits",
  "calcFrom": "sequence",
  "desc": "none",
  "computePointsAndLength": function(privContext) {
    var resultPoints = [];
    var resultLength = 0;

    let lastX = null;
    let lastY = null;
    let x = null;
    let y = null;

    for (let i = 0; i < deltaOrbit.length; i++) {
      x = parseFloat(deltaOrbit[i].x.trim());
      y = parseFloat(deltaOrbit[i].y.trim());
      if (lastX !== null) {
        resultLength += Math.hypot(x - lastX, y - lastY);
      }
      resultPoints.push(getPoint(x, y, {iter: i}));
      lastX = x;
      lastY = y;
    }

    return {
      "points": resultPoints,
      "length": resultLength
    };
  },
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 2016,
    "scale": infNum(300n, 0n),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
  },
  "privContext": {}  
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

const refOrbit = [{x:"0",y:"0"},
{x:"-1.6275225344483426",y:"0.022209173212710594"},
{x:"1.020813818314022",y:"-0.05008268653759538"},
{x:"-0.5879699582783127",y:"-0.08004102373902341"},
{x:"-1.2882204280917329",y:"0.11633260798948465"},
{x:"0.01845606122286977",y:"-0.27751491091777275"},
{x:"-1.7041964340341798",y:"0.011965508840395265"},
{x:"1.276619777924662",y:"-0.018573981781701533"},
{x:"0.0018905301408437024",y:"-0.02521465178195447"},
{x:"-1.6281547390086144",y:"0.022113835094341266"},
{x:"1.0228762980052872",y:"-0.049800317600302894"},
{x:"-0.5837266850604328",y:"-0.07966995580026015"},
{x:"-1.2931329934539164",y:"0.1152201316091047"},
{x:"0.03139472558272463",y:"-0.27578073417496096"},
{x:"-1.7025919189960086",y:"0.004893052271860137"},
{x:"1.2712727662216332",y:"0.005547430698122333"},
{x:"-0.011418862298889705",y:"0.03631376835076016"},
{x:"-1.6287108338039744",y:"0.021379849372008375"},
{x:"1.024719347742925",y:"-0.04743401138186368"},
{x:"-0.579722778245432",y:"-0.07500392519539707"},
{x:"-1.2970696236264572",y:"0.10917214099988687"},
{x:"0.04294851771563748",y:"-0.260998562461725"},
{x:"-1.6937982088814592",y:"-0.00020982955457602489"},
{x:"1.2414297939332548",y:"0.022919991060133125"},
{x:"-0.08689992717337605",y:"0.0791162927701768"},
{x:"-1.626230324887301",y:"0.008458773052798869"},
{x:"1.017030984293155",y:"-0.005302653286891511"},
{x:"-0.5931986295679199",y:"0.01142324782924538"},
{x:"-1.2757684109180527",y:"0.008656663297664442"},
{x:"-0.000012433971418306991",y:"0.0001213780544826013"},
{x:"-1.6275225490263712",y:"0.022209170194288072"},
{x:"1.0208138659002353",y:"-0.05008267736002587"},
{x:"-0.5879698602057077",y:"-0.0800410097683338"},
{x:"-1.2882205411827576",y:"0.11633257586113241"},
{x:"0.018456360070368192",y:"-0.2775148544533138"},
{x:"-1.7041963916635396",y:"0.011965345055378229"},
{x:"1.2766196374283914",y:"-0.018573422524058913"},
{x:"0.0018901921951976878",y:"-0.025213218644226227"},
{x:"-1.6281546680162096",y:"0.022113857554516333"},
{x:"1.022876065838689",y:"-0.04980038759775198"},
{x:"-0.5837271669875946",y:"-0.0796700758737502"},
{x:"-1.2931324499587087",y:"0.11522034857965244"},
{x:"0.031393269961052614",y:"-0.2757811700750941"},
{x:"-1.702592250817483",y:"0.004893827768025802"},
{x:"1.2712738885451778",y:"0.005544786743358294"},
{x:"-0.011415979411595036",y:"0.036307058421476295"},
{x:"-1.6287104123536373",y:"0.02138021194984029"},
{x:"1.0247179593977922",y:"-0.047435174429354486"},
{x:"-0.5797257339091105",y:"-0.07500617707714234"},
{x:"-1.2970665344916135",y:"0.10917519532023669"},
{x:"0.042939837176529334",y:"-0.26100581128021827"},
{x:"-1.6938027383536407",y:"-0.00020592086429043746"},
{x:"1.241445139602547",y:"0.022906751860349177"},
{x:"-0.08686121908634697",y:"0.07908412473493476"},
{x:"-1.6262319618522671",y:"0.008470486243004272"},
{x:"1.0170361101643377",y:"-0.00534077770889636"},
{x:"-0.5931886089766716",y:"0.011345645640093879"},
{x:"-1.2757785323036548",y:"0.00874895770233154"},
{x:"0.000011784777647449821",y:"-0.00011429162062398275"},
{x:"-1.6275225473720363",y:"0.02220917051890792"},
{x:"1.0208138605008814",y:"-0.050082678343195304"},
{x:"-0.5879698713276577",y:"-0.08004101123477157"},
{x:"-1.288220528338765",y:"0.11633257936599908"},
{x:"0.018456326163118115",y:"-0.27751486049504676"},
{x:"-1.7041963962684885",y:"0.011965363651892982"},
{x:"1.2766196526788387",y:"-0.018573486018485373"},
{x:"0.0018902287746169304",y:"-0.02521338132719753"},
{x:"-1.628154676081473",y:"0.02211385509493048"},
{x:"1.022876092210464",y:"-0.04980037994528773"},
{x:"-0.5837271122752882",y:"-0.07967006284535395"},
{x:"-1.2931325117568784",y:"0.11522032465172898"},
{x:"0.031393435301460916",y:"-0.27578112243195596"},
{x:"-1.702592214158145",y:"0.004893739563846829"},
{x:"1.2712737645766738",y:"0.005545087453664015"},
{x:"-0.011416297942263197",y:"0.03630782161696326"},
{x:"-1.6287104605002054",y:"0.021380171394283"},
{x:"1.0247181179655995",y:"-0.04743504438160137"},
{x:"-0.5797253965968668",y:"-0.07500592559594789"},
{x:"-1.297066887863453",y:"0.10917485313916254"},
{x:"0.04294082858548311",y:"-0.2610050007756156"},
{x:"-1.693802230118614",y:"-0.00020636878380859866"},
{x:"1.2414434177183724",y:"0.022908269025194335"},
{x:"-0.08686556384179989",y:"0.07908781279800896"},
{x:"-1.626231790399962",y:"0.008469158309283062"},
{x:"1.0170355750166549",y:"-0.005336455748261619"},
{x:"-0.5931896513588379",y:"0.011354442531742214"},
{x:"-1.2757774953343295",y:"0.008738497599154342"},
{x:"0.000009321812902218735",y:"-0.0000875839473577631"},
{x:"-1.6275225420323944",y:"0.02220917157982825"},
{x:"1.0208138430729818",y:"-0.05008268155936078"},
{x:"-0.5879699072310886",y:"-0.08004101605531228"},
{x:"-1.2882204868901745",y:"0.11633259078215866"},
{x:"0.018456216717126467",y:"-0.27751488026446514"},
{x:"-1.7041964112810335",y:"0.011965423667933852"},
{x:"1.276619702411258",y:"-0.01857369093598943"},
{x:"0.0018903481412802807",y:"-0.025213906378052413"},
{x:"-1.6281547021070886",y:"0.02211384709059826"},
{x:"1.0228761773119335",y:"-0.04980035503175884"},
{x:"-0.5837269356973578",y:"-0.07967002035461461"},
{x:"-1.2931327111330202",y:"0.11522024690980122"}];

const deltaOrbit = [{x:"-1.6275225344483426",y:"0.04441834642542119"},
{x:"1.020813818314022",y:"-0.10016537307519076"},
{x:"-0.5879699582783127",y:"-0.16008204747804683"},
{x:"-1.2882204280917329",y:"0.2326652159789693"},
{x:"0.01845606122286977",y:"-0.5550298218355455"},
{x:"-1.7041964340341798",y:"0.02393101768079053"},
{x:"1.276619777924662",y:"-0.037147963563403066"},
{x:"0.0018905301408437024",y:"-0.05042930356390894"},
{x:"-1.6281547390086144",y:"0.04422767018868253"},
{x:"1.0228762980052872",y:"-0.09960063520060579"},
{x:"-0.5837266850604328",y:"-0.1593399116005203"},
{x:"-1.2931329934539164",y:"0.2304402632182094"},
{x:"0.03139472558272463",y:"-0.5515614683499219"},
{x:"-1.7025919189960086",y:"0.009786104543720274"},
{x:"1.2712727662216332",y:"0.011094861396244667"},
{x:"-0.011418862298889705",y:"0.07262753670152032"},
{x:"-1.6287108338039744",y:"0.04275969874401675"},
{x:"1.024719347742925",y:"-0.09486802276372736"},
{x:"-0.579722778245432",y:"-0.15000785039079415"},
{x:"-1.2970696236264572",y:"0.21834428199977374"},
{x:"0.04294851771563748",y:"-0.52199712492345"},
{x:"-1.6937982088814592",y:"-0.00041965910915204977"},
{x:"1.2414297939332548",y:"0.04583998212026625"},
{x:"-0.08689992717337605",y:"0.1582325855403536"},
{x:"-1.626230324887301",y:"0.016917546105597737"},
{x:"1.017030984293155",y:"-0.010605306573783021"},
{x:"-0.5931986295679199",y:"0.02284649565849076"},
{x:"-1.2757684109180527",y:"0.017313326595328884"},
{x:"-0.000012433971418306991",y:"0.0002427561089652026"},
{x:"-1.6275225490263712",y:"0.044418340388576144"},
{x:"1.0208138659002353",y:"-0.10016535472005174"},
{x:"-0.5879698602057077",y:"-0.1600820195366676"},
{x:"-1.2882205411827576",y:"0.23266515172226482"},
{x:"0.018456360070368192",y:"-0.5550297089066276"},
{x:"-1.7041963916635396",y:"0.023930690110756457"},
{x:"1.2766196374283914",y:"-0.03714684504811783"},
{x:"0.0018901921951976878",y:"-0.050426437288452454"},
{x:"-1.6281546680162096",y:"0.044227715109032666"},
{x:"1.022876065838689",y:"-0.09960077519550396"},
{x:"-0.5837271669875946",y:"-0.1593401517475004"},
{x:"-1.2931324499587087",y:"0.23044069715930487"},
{x:"0.031393269961052614",y:"-0.5515623401501882"},
{x:"-1.702592250817483",y:"0.009787655536051603"},
{x:"1.2712738885451778",y:"0.011089573486716587"},
{x:"-0.011415979411595036",y:"0.07261411684295259"},
{x:"-1.6287104123536373",y:"0.04276042389968058"},
{x:"1.0247179593977922",y:"-0.09487034885870897"},
{x:"-0.5797257339091105",y:"-0.15001235415428468"},
{x:"-1.2970665344916135",y:"0.21835039064047337"},
{x:"0.042939837176529334",y:"-0.5220116225604365"},
{x:"-1.6938027383536407",y:"-0.0004118417285808749"},
{x:"1.241445139602547",y:"0.045813503720698354"},
{x:"-0.08686121908634697",y:"0.15816824946986952"},
{x:"-1.6262319618522671",y:"0.016940972486008544"},
{x:"1.0170361101643377",y:"-0.01068155541779272"},
{x:"-0.5931886089766716",y:"0.022691291280187757"},
{x:"-1.2757785323036548",y:"0.01749791540466308"},
{x:"0.000011784777647449821",y:"-0.0002285832412479655"},
{x:"-1.6275225473720363",y:"0.04441834103781584"},
{x:"1.0208138605008814",y:"-0.10016535668639061"},
{x:"-0.5879698713276577",y:"-0.16008202246954314"},
{x:"-1.288220528338765",y:"0.23266515873199817"},
{x:"0.018456326163118115",y:"-0.5550297209900935"},
{x:"-1.7041963962684885",y:"0.023930727303785964"},
{x:"1.2766196526788387",y:"-0.037146972036970746"},
{x:"0.0018902287746169304",y:"-0.05042676265439506"},
{x:"-1.628154676081473",y:"0.04422771018986096"},
{x:"1.022876092210464",y:"-0.09960075989057546"},
{x:"-0.5837271122752882",y:"-0.1593401256907079"},
{x:"-1.2931325117568784",y:"0.23044064930345795"},
{x:"0.031393435301460916",y:"-0.5515622448639119"},
{x:"-1.702592214158145",y:"0.009787479127693658"},
{x:"1.2712737645766738",y:"0.01109017490732803"},
{x:"-0.011416297942263197",y:"0.07261564323392652"},
{x:"-1.6287104605002054",y:"0.042760342788566"},
{x:"1.0247181179655995",y:"-0.09487008876320274"},
{x:"-0.5797253965968668",y:"-0.15001185119189578"},
{x:"-1.297066887863453",y:"0.2183497062783251"},
{x:"0.04294082858548311",y:"-0.5220100015512312"},
{x:"-1.693802230118614",y:"-0.0004127375676171973"},
{x:"1.2414434177183724",y:"0.04581653805038867"},
{x:"-0.08686556384179989",y:"0.15817562559601792"},
{x:"-1.626231790399962",y:"0.016938316618566124"},
{x:"1.0170355750166549",y:"-0.010672911496523238"},
{x:"-0.5931896513588379",y:"0.022708885063484428"},
{x:"-1.2757774953343295",y:"0.017476995198308684"},
{x:"0.000009321812902218735",y:"-0.0001751678947155262"},
{x:"-1.6275225420323944",y:"0.0444183431596565"},
{x:"1.0208138430729818",y:"-0.10016536311872155"},
{x:"-0.5879699072310886",y:"-0.16008203211062455"},
{x:"-1.2882204868901745",y:"0.2326651815643173"},
{x:"0.018456216717126467",y:"-0.5550297605289303"},
{x:"-1.7041964112810335",y:"0.023930847335867703"},
{x:"1.276619702411258",y:"-0.03714738187197886"},
{x:"0.0018903481412802807",y:"-0.05042781275610483"},
{x:"-1.6281547021070886",y:"0.04422769418119652"},
{x:"1.0228761773119335",y:"-0.09960071006351769"},
{x:"-0.5837269356973578",y:"-0.15934004070922922"},
{x:"-1.2931327111330202",y:"0.23044049381960244"},
{x:"0.03139396885593654",y:"-0.5515619346301277"}];

/*
const refOrbit = [
{ x:" 0", y:" 0 "},
{ x:" -1.5226107289230135", y:" -6.739230917951109e-13 "},
{ x:" 0.7957327029084569", y:" 1.3783219682772984e-12 "},
{ x:" -0.889420194445015", y:" 1.519628638795687e-12 "},
{ x:" -0.7315424466364051", y:" -3.377099890598858e-12 "},
{ x:" -0.9874563776922357", y:" 4.267060741213338e-12 "},
{ x:" -0.547540631077942", y:" -9.10099577761765e-12 "},
{ x:" -1.2228099862417823", y:" 9.292406851233797e-12 "},
{ x:" -0.027346466470385473", y:" -2.33996188796156e-11 "},
{ x:" -1.5218628996945975", y:" 6.058706944273029e-13 "},
{ x:" 0.7934559565438352", y:" -2.51802735551734e-12 "},
{ x:" -0.893038373948121", y:" -4.66981069974622e-12 "},
{ x:" -0.7250931915791093", y:" 7.666717216098692e-12 "},
{ x:" -0.9968505924486345", y:" -1.1792092002106121e-11 "},
{ x:" -0.5288996252578199", y:" 2.2835984705221472e-11 "},
{ x:" -1.2428759153251512", y:" -2.4829810597764994e-11 "},
{ x:" 0.022129811972318857", y:" 6.10468240562995e-11 "},
{ x:" -1.5221210003450831", y:" 2.027986383951168e-12 "},
{ x:" 0.7942416107685034", y:" -6.84760441864703e-12 "},
{ x:" -0.8917909926468665", y:" -1.1551227818538589e-11 "},
{ x:" -0.72731955435693", y:" 1.992863875337414e-11 "},
{ x:" -0.9936169947730502", y:" -2.966290040588376e-11 "},
{ x:" -0.5353359966211857", y:" 5.827320082329791e-11 "},
{ x:" -1.2360260996446153", y:" -6.306540716988849e-11 "},
{ x:" 0.0051497900796670494", y:" 1.5522705540159854e-10 "},
{ x:" -1.5225842085851489", y:" 9.248504082110484e-13 "},
{ x:" 0.7956519433098505", y:" -3.490248345486453e-12 "},
{ x:" -0.8895487140302719", y:" -6.227968849235684e-12 "},
{ x:" -0.7313138142901029", y:" 1.040624026992128e-11 "},
{ x:" -0.9877908339514744", y:" -1.5894377620225913e-11 "},
{ x:" -0.5468799972844641", y:" 3.07267179574501e-11 "},
{ x:" -1.223532997493158", y:" -3.4281577958056724e-11 "},
{ x:" -0.025577732968421526", y:" 8.321536058383791e-11 "},
{ x:" -1.5219565084992095", y:" -4.9308436355637436e-12 "},
{ x:" 0.7937408848400911", y:" 1.4335136035281176e-11 "},
{ x:" -0.8925861366562827", y:" 2.2082844030099202e-11 "},
{ x:" -0.7259007175720252", y:" -4.0095603970214116e-11 "},
{ x:" -0.9956788771514323", y:" 5.753693229512923e-11 "},
{ x:" -0.5312343025174764", y:" -1.1525053937649962e-10 "},
{ x:" -1.2404008447517838", y:" 1.2177615670908036e-10 "},
{ x:" 0.01598352673792531", y:" -3.0277641839693285e-10 "},
{ x:" -1.5223552557960314", y:" -1.0352793049916384e-11 "},
{ x:" 0.794954795926787", y:" 3.084733473162256e-11 "},
{ x:" -0.890657601356014", y:" 4.8370550281129485e-11 "},
{ x:" -0.7293397660697651", y:" -8.683711967111761e-11 "},
{ x:" -0.9906742345523137", y:" 1.2599360600241513e-10 "},
{ x:" -0.5411752899172007", y:" -2.503111614616519e-10 "},
{ x:" -1.2297400345060472", y:" 2.702505076552463e-10 "},
{ x:" -0.010350176456079177", y:" -6.653496603102738e-10 "},
{ x:" -1.5225036027703414", y:" 1.309904968661224e-11 "},
{ x:" 0.7954064915256562", y:" -4.0560623773264804e-11 "},
{ x:" -0.8899392421618596", y:" -6.519828999096447e-11 "},
{ x:" -0.7306188741833884", y:" 1.1537111047782104e-10 "},
{ x:" -0.9888067896100113", y:" -1.69258544792981e-10 "},
{ x:" -0.5448718617441561", y:" 3.340540734898246e-10 "},
{ x:" -1.2257253832024706", y:" -3.6470725298303485e-10 "},
{ x:" -0.020208013896169878", y:" 8.933879517469065e-10 "},
{ x:" -1.5222023650973857", y:" -3.6781115378939573e-11 "},
{ x:" 0.7944893113850611", y:" 1.1130267854968817e-10 "},
{ x:" -0.8913974630179049", y:" 1.7618365378071401e-10 "},
{ x:" -0.7280212918482563", y:" -3.1477324710250185e-10 "},
{ x:" -0.9925957275386095", y:" 4.576493288978725e-10 "},
{ x:" -0.537364450595112", y:" -9.091954602416754e-10 "},
{ x:" -1.2338501761596268", y:" 9.764647148608806e-10 "},
{ x:" -0.00022447171387116703", y:" -2.4102962439813097e-9 "},
{ x:" -1.5226106785354632", y:" 4.081635658523314e-13 "},
{ x:" 0.79573254946721", y:" -1.916871499706856e-12 "},
{ x:" -0.8894204386414277", y:" -3.724557182720652e-12 "},
{ x:" -0.7315420122499037", y:" 5.951471474605854e-12 "},
{ x:" -0.9874570132363751", y:" -9.381425928557247e-12 "},
{ x:" -0.5475393759333106", y:" 1.7853586562827745e-11 "},
{ x:" -1.2228113607255742", y:" -2.0225006381359198e-11 "},
{ x:" -0.027343105003483217", y:" 4.878881205595141e-11 "},
{ x:" -1.521863083531782", y:" -3.341998313877285e-12 "},
{ x:" 0.79345651609385", y:" 9.498204626435492e-12 "},
{ x:" -0.8930374859912233", y:" 1.4398901612280875e-11 "},
{ x:" -0.7250947775374889", y:" -2.6391440885527684e-11 "},
{ x:" -0.9968482925108729", y:" 3.759866882377586e-11 "},
{ x:" -0.5289042106411705", y:" -7.563426072712062e-11 "},
{ x:" -1.2428710648890537", y:" 7.933263484281733e-11 "},
{ x:" 0.022117755015436873", y:" -1.9787439578688874e-10 "},
{ x:" -1.5221215338360905", y:" -9.426997911479109e-12 "},
{ x:" 0.7942432348445195", y:" 2.80241499491853e-11 "},
{ x:" -0.8917884128267268", y:" 4.38420599270225e-11 "},
{ x:" -0.7273241556710007", y:" -7.88696051665424e-11 "},
{ x:" -0.9936103015004792", y:" 1.1405361487992619e-10 "},
{ x:" -0.5353492976751402", y:" -2.2732361642792112e-10 "},
{ x:" -1.2360118584017477", y:" 2.4272115370752594e-10 "},
{ x:" 0.005114585186728427", y:" -6.006863716267059e-10 "},
{ x:" -1.5225845699413811", y:" -6.8184463281783036e-12 "},
{ x:" 0.7956530437005671", y:" 2.0089399248720393e-11 "},
{ x:" -0.8895469629730369", y:" 3.129446022492542e-11 "},
{ x:" -0.7313169295884598", y:" -5.634970719372093e-11 "},
{ x:" -0.987786277420321", y:" 8.174506660444637e-11 "},
{ x:" -0.546888999063118", y:" -1.6216723316915967e-10 "},
{ x:" -1.2235231516267544", y:" 1.767010285656389e-10 "},
{ x:" -0.025601826356347782", y:" -4.330695218244344e-10 "},
{ x:" -1.5219552754102328", y:" 2.150081830415636e-11 "},
{ x:" 0.7937371314260243", y:" -6.612049077909045e-11 "},
{ x:" -0.8925920951185997", y:" -1.0563850045074739e-10 "}
];

const deltaOrbit = [
{ x:" -1.5226107289230135", y:" -1.3478461835902218e-12 "},
{ x:" 0.7957327029084569", y:" 2.756643936554597e-12 "},
{ x:" -0.889420194445015", y:" 3.039257277591374e-12 "},
{ x:" -0.7315424466364051", y:" -6.754199781197716e-12 "},
{ x:" -0.9874563776922357", y:" 8.534121482426677e-12 "},
{ x:" -0.547540631077942", y:" -1.82019915552353e-11 "},
{ x:" -1.2228099862417823", y:" 1.8584813702467595e-11 "},
{ x:" -0.027346466470385473", y:" -4.67992377592312e-11 "},
{ x:" -1.5218628996945975", y:" 1.2117413888546058e-12 "},
{ x:" 0.7934559565438352", y:" -5.03605471103468e-12 "},
{ x:" -0.893038373948121", y:" -9.33962139949244e-12 "},
{ x:" -0.7250931915791093", y:" 1.5333434432197384e-11 "},
{ x:" -0.9968505924486345", y:" -2.3584184004212242e-11 "},
{ x:" -0.5288996252578199", y:" 4.5671969410442944e-11 "},
{ x:" -1.2428759153251512", y:" -4.965962119552999e-11 "},
{ x:" 0.022129811972318857", y:" 1.22093648112599e-10 "},
{ x:" -1.5221210003450831", y:" 4.055972767902336e-12 "},
{ x:" 0.7942416107685034", y:" -1.369520883729406e-11 "},
{ x:" -0.8917909926468665", y:" -2.3102455637077177e-11 "},
{ x:" -0.72731955435693", y:" 3.985727750674828e-11 "},
{ x:" -0.9936169947730502", y:" -5.932580081176752e-11 "},
{ x:" -0.5353359966211857", y:" 1.1654640164659583e-10 "},
{ x:" -1.2360260996446153", y:" -1.2613081433977697e-10 "},
{ x:" 0.0051497900796670494", y:" 3.104541108031971e-10 "},
{ x:" -1.5225842085851489", y:" 1.849700816422097e-12 "},
{ x:" 0.7956519433098505", y:" -6.980496690972906e-12 "},
{ x:" -0.8895487140302719", y:" -1.2455937698471368e-11 "},
{ x:" -0.7313138142901029", y:" 2.081248053984256e-11 "},
{ x:" -0.9877908339514744", y:" -3.1788755240451826e-11 "},
{ x:" -0.5468799972844641", y:" 6.14534359149002e-11 "},
{ x:" -1.223532997493158", y:" -6.856315591611345e-11 "},
{ x:" -0.025577732968421526", y:" 1.6643072116767583e-10 "},
{ x:" -1.5219565084992095", y:" -9.861687271127487e-12 "},
{ x:" 0.7937408848400911", y:" 2.8670272070562353e-11 "},
{ x:" -0.8925861366562827", y:" 4.4165688060198405e-11 "},
{ x:" -0.7259007175720252", y:" -8.019120794042823e-11 "},
{ x:" -0.9956788771514323", y:" 1.1507386459025846e-10 "},
{ x:" -0.5312343025174764", y:" -2.3050107875299923e-10 "},
{ x:" -1.2404008447517838", y:" 2.435523134181607e-10 "},
{ x:" 0.01598352673792531", y:" -6.055528367938657e-10 "},
{ x:" -1.5223552557960314", y:" -2.0705586099832768e-11 "},
{ x:" 0.794954795926787", y:" 6.169466946324511e-11 "},
{ x:" -0.890657601356014", y:" 9.674110056225897e-11 "},
{ x:" -0.7293397660697651", y:" -1.7367423934223523e-10 "},
{ x:" -0.9906742345523137", y:" 2.5198721200483026e-10 "},
{ x:" -0.5411752899172007", y:" -5.006223229233038e-10 "},
{ x:" -1.2297400345060472", y:" 5.405010153104926e-10 "},
{ x:" -0.010350176456079177", y:" -1.3306993206205476e-9 "},
{ x:" -1.5225036027703414", y:" 2.619809937322448e-11 "},
{ x:" 0.7954064915256562", y:" -8.112124754652961e-11 "},
{ x:" -0.8899392421618596", y:" -1.3039657998192895e-10 "},
{ x:" -0.7306188741833884", y:" 2.3074222095564208e-10 "},
{ x:" -0.9888067896100113", y:" -3.38517089585962e-10 "},
{ x:" -0.5448718617441561", y:" 6.681081469796492e-10 "},
{ x:" -1.2257253832024706", y:" -7.294145059660697e-10 "},
{ x:" -0.020208013896169878", y:" 1.786775903493813e-9 "},
{ x:" -1.5222023650973857", y:" -7.356223075787915e-11 "},
{ x:" 0.7944893113850611", y:" 2.2260535709937634e-10 "},
{ x:" -0.8913974630179049", y:" 3.5236730756142803e-10 "},
{ x:" -0.7280212918482563", y:" -6.295464942050037e-10 "},
{ x:" -0.9925957275386095", y:" 9.15298657795745e-10 "},
{ x:" -0.537364450595112", y:" -1.8183909204833507e-9 "},
{ x:" -1.2338501761596268", y:" 1.952929429721761e-9 "},
{ x:" -0.00022447171387116703", y:" -4.820592487962619e-9 "},
{ x:" -1.5226106785354632", y:" 8.163271317046628e-13 "},
{ x:" 0.79573254946721", y:" -3.833742999413712e-12 "},
{ x:" -0.8894204386414277", y:" -7.449114365441304e-12 "},
{ x:" -0.7315420122499037", y:" 1.1902942949211708e-11 "},
{ x:" -0.9874570132363751", y:" -1.8762851857114495e-11 "},
{ x:" -0.5475393759333106", y:" 3.570717312565549e-11 "},
{ x:" -1.2228113607255742", y:" -4.0450012762718395e-11 "},
{ x:" -0.027343105003483217", y:" 9.757762411190281e-11 "},
{ x:" -1.521863083531782", y:" -6.68399662775457e-12 "},
{ x:" 0.79345651609385", y:" 1.8996409252870985e-11 "},
{ x:" -0.8930374859912233", y:" 2.879780322456175e-11 "},
{ x:" -0.7250947775374889", y:" -5.278288177105537e-11 "},
{ x:" -0.9968482925108729", y:" 7.519733764755172e-11 "},
{ x:" -0.5289042106411705", y:" -1.5126852145424125e-10 "},
{ x:" -1.2428710648890537", y:" 1.5866526968563466e-10 "},
{ x:" 0.022117755015436873", y:" -3.957487915737775e-10 "},
{ x:" -1.5221215338360905", y:" -1.8853995822958218e-11 "},
{ x:" 0.7942432348445195", y:" 5.60482998983706e-11 "},
{ x:" -0.8917884128267268", y:" 8.7684119854045e-11 "},
{ x:" -0.7273241556710007", y:" -1.577392103330848e-10 "},
{ x:" -0.9936103015004792", y:" 2.2810722975985237e-10 "},
{ x:" -0.5353492976751402", y:" -4.5464723285584225e-10 "},
{ x:" -1.2360118584017477", y:" 4.854423074150519e-10 "},
{ x:" 0.005114585186728427", y:" -1.2013727432534117e-9 "},
{ x:" -1.5225845699413811", y:" -1.3636892656356607e-11 "},
{ x:" 0.7956530437005671", y:" 4.0178798497440786e-11 "},
{ x:" -0.8895469629730369", y:" 6.258892044985084e-11 "},
{ x:" -0.7313169295884598", y:" -1.1269941438744185e-10 "},
{ x:" -0.987786277420321", y:" 1.6349013320889274e-10 "},
{ x:" -0.546888999063118", y:" -3.2433446633831934e-10 "},
{ x:" -1.2235231516267544", y:" 3.534020571312778e-10 "},
{ x:" -0.025601826356347782", y:" -8.661390436488688e-10 "},
{ x:" -1.5219552754102328", y:" 4.300163660831272e-11 "},
{ x:" 0.7937371314260243", y:" -1.322409815581809e-10 "},
{ x:" -0.8925920951185997", y:" -2.1127700090149477e-10 "},
{ x:" -0.7258900806548021", y:" 3.758205155864888e-10 "}
];
*/
