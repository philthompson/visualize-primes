
// this script file is loaded both by the main script, and
//   by subworkers.  for subworkers, infnum.js needs to be
//   loaded explicitly here
if (typeof importScripts === 'function') {
  let scriptAppVersion = null;
  if (!appVersion) {
    scriptAppVersion = (function() {
      let urlParams = new URLSearchParams(self.location.search);
      return urlParams.has("v") ? urlParams.get('v') : "unk";
    })();
  }
  importScripts("infnum.js?v=" + (appVersion || scriptAppVersion));
  importScripts("floatexp.js?v=" + (appVersion || scriptAppVersion));
}

// does linear search after first checking the worst/smallest
//   (last) element in the array
function searchForBestBLA(sortedArray, deltaZAbs, math) {
  let hi = sortedArray.length - 1;
  // we want the lowest-indexed (closest to start of array)
  //   BLA found to be valid
  let lowestValid = null;
  //let validityTestsPerformed = 0;
  // special case for arrays larger than 1 BLA: test the smallest
  //   first, because many times the smallest (least iterations
  //   skipped) is not valid, in which case we don't need to test
  //   the rest of the BLAs in the array
  if (hi > 0) {
    //++validityTestsPerformed;
    if (math.lt(deltaZAbs, sortedArray[hi].r2)) {
      lowestValid = hi;
      hi--;
    } else {
      return {
        //validityTestsPerformed: validityTestsPerformed,
        bestValidBLA: false
      };
    }
  }
  for (let x = 0; x <= hi; x++) {
    //++validityTestsPerformed;
    if (math.lt(deltaZAbs, sortedArray[x].r2)) {
      lowestValid = x;
      break;
    }
  }
  return {
    //validityTestsPerformed: validityTestsPerformed,
    bestValidBLA: lowestValid === null ? false : sortedArray[lowestValid]
  };
}

const windowCalcBackgroundColor = -1;
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
    "<br/>- To see more detail when zoomed in, increase the <code>n</code> (iterations) parameter with the M key.  Calculations will be slower." +
    "<br/>- <a target='_blank' href='https://philthompson.me/very-plotter-tips.html'>More tips</a>",
  "gradientType": "mod",
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeBoundPointColor": function(n, precis, algorithm, x, y, useSmooth) {

    const maxIter = n;

    // for absolute fastest speed, we'll keep a separate version of the
    //   regular floating point basic algorithm
    if (algorithm.includes("basic") && algorithm.includes("float") && !algorithm.includes("floatexp")) {
      // a squared bailout of 16 or 32 looks ok for smooth coloring, but
      //   when slope coloring is then applied, banding occurs.  using
      //   even larger squared bailout (64? 128? higher?) seems to
      //   reduce banding artifacts for smooth+slope coloring
      const bailoutSquared = useSmooth ? (32*32) : 4;
      // truncating to 15 decimal digits here is equivalent to truncating
      //   to 16 significant digits, but it's more efficient to do both at once
      //let xFloat = typeof x == "number" ? x : parseFloat(infNumExpStringTruncToLen(x, 18));
      //let yFloat = typeof y == "number" ? y : parseFloat(infNumExpStringTruncToLen(y, 18));
      let ix = 0;
      let iy = 0;
      let ixSq = 0;
      let iySq = 0;
      let ixTemp = 0;
      let iter = 0;
      while (iter < maxIter) {
        ixSq = ix * ix;
        iySq = iy * iy;
        if (ixSq + iySq > bailoutSquared) {
          break;
        }
        ixTemp = x + (ixSq - iySq);
        iy = y + (2 * ix * iy);
        ix = ixTemp;
        iter++;
      }


      if (iter >= maxIter) {
        return windowCalcBackgroundColor;
      } else {
        // smooth coloring (adding fractional component to integer iteration count)
        //   based on pseudocode on wikipedia:
        //   https://en.wikipedia.org/wiki/Plotting_algorithms_for_the_Mandelbrot_set#Continuous_(smooth)_coloring
        if (useSmooth) {
          let fracIter = Math.log(ixSq + iySq) / 2;
          fracIter = Math.log(fracIter / Math.LN2) / Math.LN2;
          iter += 1 - fracIter; 
        }
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return iter;
      }
    }

    const math = selectMathInterfaceFromAlgorithm(algorithm);
    const bailoutSquared = useSmooth ? math.createFromNumber(32*32) : math.four;

    // the coords used for iteration
    const xConv = typeof x.v == "bigint" ? math.createFromInfNum(x) : math.createFromExpString(floatExpToString(x));
    const yConv = typeof y.v == "bigint" ? math.createFromInfNum(y) : math.createFromExpString(floatExpToString(y));
    var ix = structuredClone(math.zero);
    var iy = structuredClone(math.zero);
    var ixSq = structuredClone(math.zero);
    var iySq = structuredClone(math.zero);
    var ixTemp = structuredClone(math.zero);
    var iter = 0;
    try {
      while (iter < maxIter) {
        ixSq = math.mul(ix, ix);
        iySq = math.mul(iy, iy);
        if (math.gt(math.add(ixSq, iySq), bailoutSquared)) {
          break;
        }
        ixTemp = math.add(xConv, math.sub(ixSq, iySq));
        iy = math.add(yConv, math.mul(math.two, math.mul(ix, iy)));
        ix = ixTemp;
        ix = math.truncateToSigDig(ix, precis);
        iy = math.truncateToSigDig(iy, precis);
        iter++;
      }

      if (iter == maxIter) {
        return windowCalcBackgroundColor;
      } else {
        // smooth coloring (adding fractional component to integer iteration count)
        //   based on pseudocode on wikipedia:
        //   https://en.wikipedia.org/wiki/Plotting_algorithms_for_the_Mandelbrot_set#Continuous_(smooth)_coloring
        if (useSmooth) {
          // math.log() returns a float
          let fracIter = math.log(math.add(ixSq, iySq)) / 2;
          fracIter = Math.log(fracIter / Math.LN2) / Math.LN2;
          iter += 1 - fracIter;
        }
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return iter;
      }
    } catch (e) {
      console.log("ERROR CAUGHT when processing point (x, y, iter, maxIter): [" + math.toExpString(x) + ", " + math.toExpString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return windowCalcIgnorePointColor; // special color value that will not be displayed
    }
  },
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeBoundPointColorStripes": function(n, precis, algorithm, x, y, useSmooth) {
    // odd stripeDensity values create the weird swooping artifacts!
    let stripeDensity = 6.0; // anywhere from -10 to +10?
    // for stripe average we need to skip the first (0th) iteration
    const stripeSkipFirstIters = 0;
    const maxIter = n;
    // this scales up the final result, increasing the number of
    //   colors.  a mixFactor of 1000 works ok, but in some areas
    //   there are rather abrupt color boundaries where a smooth
    //   gradient is expected.
    const mixFactor = 100000;

    // use user-provided coloring params
    let userStripeDensity;
    try {
      userStripeDensity = parseFloat(algorithm.split("-").find(e => e.startsWith("stripedensity")).substring(13));
    } catch (e) {}
    if (userStripeDensity !== undefined && userStripeDensity >= 0.1 && userStripeDensity <= 100.0) {
      stripeDensity = userStripeDensity;
    }

    // TODO: consider allowing bailout (integer) to be specified by user in algorithm string
    const bailoutSquared = useSmooth ? (64*64) : 4;
    const logBailoutSquared = Math.log(bailoutSquared);
    // truncating to 15 decimal digits here is equivalent to truncating
    //   to 16 significant digits, but it's more efficient to do both at once
    //let xFloat = typeof x == "number" ? x : parseFloat(infNumExpStringTruncToLen(x, 18));
    //let yFloat = typeof y == "number" ? y : parseFloat(infNumExpStringTruncToLen(y, 18));
    let ix = 0;
    let iy = 0;
    let ixSq = 0;
    let iySq = 0;
    let ixTemp = 0;
    let iter = 0;
    let avgCount = 0;
    let avg = 0;
    let lastAdded = 0;
    let lastZ2 = 0; // last squared length
    //let triPrevZ2 = 0; // before last squared length, for triangle inequality average
    while (iter < maxIter) {
      ixSq = ix * ix;
      iySq = iy * iy;
      if (iter > stripeSkipFirstIters) {
        // comment this out for TIA
        avgCount++;

        // stripe addend function
        lastAdded = (0.5 * Math.sin(stripeDensity * Math.atan(iy / ix))) + 0.5;

        // dbyrne addend function (https://www.fractalforums.com/programming/faster-alternative-to-tia-coloring/)
        //lastAdded = Math.min(Math.abs(iy / ix), 2.0);

        // "atan(value)" from "mandelbrowser" android app author:
        //lastAdded = Math.abs(Math.atan(iy / ix));
        //lastAdded = 1 / (1 + Math.atan(iy / ix));
        //lastAdded = 1 / (1 + Math.abs(Math.atan(iy / ix)));

        // "log(abs(value))" from "mandelbrowser" android app author:
        //lastAdded = Math.log(Math.abs(ixSq + iySq));
        //lastAdded = 1 / (1 + Math.log(Math.abs(ixSq + iySq)));

        // similar to above, but sqrt
        //lastAdded = 1 / (1 + Math.log(Math.sqrt(ixSq + iySq)));

        // comment this out for TIA
        avg += lastAdded;
      }
      // for testing triangle inequality average
      //triPrevZ2 = lastZ2;
      lastZ2 = ixSq + iySq;
      if (lastZ2 > bailoutSquared /*&& iter > stripeSkipFirstIters*/) {
        break;
      }
      // trying triangle here, since the |z| is not escaped
      //let zOldMag = Math.sqrt(triPrevZ2);
      //let cMag = Math.sqrt(x*x + y*y); // this can be calculated once, outside the loop
      //let triMin = Math.abs(zOldMag - cMag);
      //let triMax = zOldMag + cMag;
      //let fracNum = Math.sqrt(lastZ2) - triMin;
      //let fracDen = triMax - triMin;
      //if (fracDen != 0) {
      //  avgCount++;
      //  lastAdded = fracNum / fracDen;
      //  avg += lastAdded;
      //}
      ixTemp = x + (ixSq - iySq);
      iy = y + (2 * ix * iy);
      ix = ixTemp;
      iter++;
    }


    if (iter >= maxIter) {
      return windowCalcBackgroundColor;
    } else {
      if (!useSmooth) {
        return avg / avgCount;
      }
      let prevAvg = (avg - lastAdded) / (avgCount - 1);
      avg = avg / avgCount;
      let frac = 1.0 + Math.log2(logBailoutSquared/Math.log(lastZ2));
      let mix = frac * avg + ((1.0 - frac) * prevAvg);
      return mix * mixFactor;
    }

  },
  "computeBoundPointColorCurvature": function(n, precis, algorithm, x, y, useSmooth) {

    // for curvature average, we must skip the first 2 iterations
    //   to avoid divide-by-zero -- for stripe average we need
    //   to skip the first (0th)
    const skipFirstIters = 1;
    const maxIter = n;
    // this scales up the final result, increasing the number of
    //   colors.  a mixFactor of 1000 works ok, but in some areas
    //   there are rather abrupt color boundaries where a smooth
    //   gradient is expected.
    const mixFactor = 100000;

    // TODO: consider allowing bailout (integer) to be specified by user in algorithm string
    const bailoutSquared = useSmooth ? (64*64) : 4;
    const logBailoutSquared = Math.log(bailoutSquared);
    // truncating to 15 decimal digits here is equivalent to truncating
    //   to 16 significant digits, but it's more efficient to do both at once
    //let xFloat = typeof x == "number" ? x : parseFloat(infNumExpStringTruncToLen(x, 18));
    //let yFloat = typeof y == "number" ? y : parseFloat(infNumExpStringTruncToLen(y, 18));
    let ix = 0;
    let iy = 0;
    let ixSq = 0;
    let iySq = 0;
    let ixTemp = 0;
    let iter = 0;
    let avgCount = 0;
    let avg = 0;
    let lastAdded = 0;
    let lastZ2 = 0; // last squared length
    let currentZ = {x: 0, y: 0};
    let oneZ = {x: 0, y: 0}; // z (coord. at iteration) one iteration ago
    let twoZ = {x: 0, y: 0}; // z (coord. at iteration) two iterations ago
    while (iter < maxIter) {
      ixSq = ix * ix;
      iySq = iy * iy;

      lastZ2 = ixSq + iySq;

      // curvature average (https://en.wikibooks.org/wiki/Fractals%2FIterations_in_the_complex_plane%2Ftriangle_ineq#CAA)
      twoZ = oneZ;
      oneZ = currentZ;
      currentZ = {x: ix, y: iy};

      if (iter > skipFirstIters) {
        let curveNum = {x: currentZ.x - oneZ.x, y: currentZ.y - oneZ.y};
        let curveDen = {x: oneZ.x - twoZ.x, y: oneZ.y - twoZ.y};
        let curveQuot = floatMath.complexDiv(curveNum, curveDen);
          if (curveQuot.x != 0) {
            avgCount++;
            // the 1.2 here may be a parameter that could be exposed to the user
            //   in the algorithm string, similar to -stripedensity# used with
            //   stripe average coloring
            lastAdded = Math.abs(1.2 * Math.atan(curveQuot.y / curveQuot.x));
            avg += lastAdded;
          }
      }

      if (lastZ2 > bailoutSquared /*&& iter > skipFirstIters*/) {
        break;
      }

      ixTemp = x + (ixSq - iySq);
      iy = y + (2 * ix * iy);
      ix = ixTemp;
      iter++;
    }

    if (iter >= maxIter) {
      return windowCalcBackgroundColor;
    } else {
      if (!useSmooth) {
        return avg / avgCount;
      }
      let prevAvg = (avg - lastAdded) / (avgCount - 1);
      avg = avg / avgCount;
      let frac = 1.0 + Math.log2(logBailoutSquared/Math.log(lastZ2));
      let mix = frac * avg + ((1.0 - frac) * prevAvg);
      return mix * mixFactor;
    }

  },
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeReferenceOrbit": function(n, precis, algorithm, x, y, period, useSmooth, fnContext) {

    const outputMath = selectMathInterfaceFromAlgorithm(algorithm);
    const outputIsFloatExp = outputMath.name == "floatexp";

    const useStripes = algorithm.includes("stripes");

    const periodLessThanN = period !== null && period > 0 && period < n;
    // add two exta iterations to periodic orbits for debugging below
    const maxIter = periodLessThanN ? (period+2) : n;
    const two = infNum(2n, 0n);
    const four = infNum(4n, 0n);
    const sixteen = infNum(16n, 0n);
    // try using slightly larger bailout (4) for ref orbit
    //   than for perturb orbit (which uses smallest possible
    //   bailout of 2)
    // for smooth coloring, our bailout is much larger (32*32)
    //   so our ref orbit bailout must be larger than than (32*32*2)
    // for stripes coloring, out bailout must be even larger (64*64)
    //   with larger ref orbit bailout
    const bailoutSquared = useStripes ?
      (useSmooth ? infNum(64n*64n*2n, 0n) : sixteen)
      :
      (useSmooth ? infNum(32n*32n*2n, 0n) : sixteen);

    // fnContext allows the loop to be done piecemeal
    if (fnContext === null) {
      fnContext = {
        // the coords used for iteration
        ix: infNum(0n, 0n),
        iy: infNum(0n, 0n),
        iter: 0,
        orbit: [],
        status: "",
        done: false
      };
    }
    var ixSq = infNum(0n, 0n);
    var iySq = infNum(0n, 0n);
    var ixTemp = infNum(0n, 0n);
    var statusIterCounter = 0;
    try {
      while (fnContext.iter < maxIter) {
        ixSq = infNumMul(fnContext.ix, fnContext.ix);
        iySq = infNumMul(fnContext.iy, fnContext.iy);
        if (infNumGt(infNumAdd(ixSq, iySq), bailoutSquared)) {
          break;
        }
        fnContext.orbit.push({
          x: outputMath.createFromInfNum(fnContext.ix),
          y: outputMath.createFromInfNum(fnContext.iy),
          // if needed, include floatexp x and y as well, for SA coefficients calc
          //   (if outputMath is floatexp, x and y are already floatexp, then we
          //   don't need another floatexp version of those here)
          xfxp: outputIsFloatExp ? null : floatExpMath.createFromInfNum(fnContext.ix),
          yfxp: outputIsFloatExp ? null : floatExpMath.createFromInfNum(fnContext.iy)
        });
        ixTemp = infNumAdd(x, infNumSub(ixSq, iySq));
        fnContext.iy = infNumAdd(y, infNumMul(two, infNumMul(fnContext.ix, fnContext.iy)));
        fnContext.ix = copyInfNum(ixTemp);
        fnContext.ix = infNumTruncateToLen(fnContext.ix, precis);
        fnContext.iy = infNumTruncateToLen(fnContext.iy, precis);
        fnContext.iter++;
        statusIterCounter++;
        if (statusIterCounter >= 5000) {
          statusIterCounter = 0;
          fnContext.status = "computed " + (Math.round(fnContext.iter * 10000.0 / maxIter)/100.0) + "% of reference orbit";
          console.log(fnContext.status);
          return fnContext;
        }
      }
      // debug... to see if we actually have a periodic orbit here
      if (periodLessThanN) {
        // remove the two extra iterations we computed
        const periodPlusTwoIter = fnContext.orbit.pop(); // (period+2)th iteration should be equal to the 2nd (index 1) iter
        const periodPlusOneIter = fnContext.orbit.pop(); // (period+1)th iteration should be zero
        const firstIter = fnContext.orbit[0];
        const secondIter = fnContext.orbit[1];
        console.log("the full period of [" + period + "] iters has been computed, " +
          "where the orbit has [" + fnContext.orbit.length + "] iters, where the first orbit iter is (should be zero):\n",
          {x:outputMath.toExpString(firstIter.x), y:outputMath.toExpString(firstIter.y)},
          " and where the last orbit iter is:\n",
          {x:outputMath.toExpString(fnContext.orbit[fnContext.orbit.length-1].x), y:outputMath.toExpString(fnContext.orbit[fnContext.orbit.length-1].y)},
          " and where the next [" + (period+1) + "]th iteration (should be (~0, ~0)) would be at:\n",
          {x:outputMath.toExpString(periodPlusOneIter.x), y:outputMath.toExpString(periodPlusOneIter.y)},
          " and where the next [" + (period+2) + "]th iteration would be at:\n",
          {x:outputMath.toExpString(periodPlusTwoIter.x), y:outputMath.toExpString(periodPlusTwoIter.y)},
          " which should be equal to, or close to, the 1th (2nd) iter:\n",
          {x:outputMath.toExpString(secondIter.x), y:outputMath.toExpString(secondIter.y)});
      }
      // fill out reference orbit with repeat data
      //if (periodLessThanN && fnContext.iter >= maxIter) {
      //  for (let i = 0; i < n - period; i++) {
      //    // use mod to keep looping back over the ref orbit iterations
      //    fnContext.orbit.push(structuredClone(fnContext.orbit[i % period]));
      //  }
      //}

      fnContext.done = true;
      return fnContext;
    } catch (e) {
      console.log("ERROR CAUGHT when computing reference orbit at point (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + fnContext.iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      fnContext.done = true;
      return fnContext;
    }
  },
  // based on garrit's matlab code: https://fractalforums.org/index.php?topic=3805.msg24312#msg24312
  "findPeriodBallArithmetic1stOrder": function(n, precis, algorithm, x, y, width, height, doCont) {
    // in ball centered on (x+yi) find period (up to n) of nucleus
    // doCont = false normally
    //
    // i believe:
    // x = center coordinate of screen
    // y = center coordinate of screen
    // width = half screen width (half rendered window width, in plane units, not in pixels)
    // height = half screen height (half rendered window height, in plane units, not in pixels)
    //const math = selectMathInterfaceFromAlgorithm(algorithm);
    // infnum is likely more accurate at very large scales, but is much
    //   slower than float and floatexp... but infnum if the only way
    //   to do full-precision computations
    const math = infNumMath;
    const c0 = {
      x: math.createFromInfNum(x),
      y: math.createFromInfNum(y)
    };
    const r0 = math.min(math.createFromInfNum(width), math.createFromInfNum(height));
    let z = math.complexRealMul(c0, math.zero);
    let r = r0;
    //let p = []; // this doesn't appear to be used
    const maxR = math.createFromNumber(1e5);
    let az = math.complexAbs(z);

    for (let k = 1; k < n; k++) {
      // r = (az+r).^mpow - az.^mpow + r0;
      r = math.add(az, r);
      r = math.mul(r, r);
      r = math.sub(r, math.mul(az, az));
      r = math.add(r, r0);
      // z = z.^mpow + c0;
      z = math.complexAdd(math.complexMul(z, z), c0);
      az = math.complexAbs(z);

      // what all needs to be truncated?
      z.x = math.truncateToSigDig(z.x, precis);
      z.y = math.truncateToSigDig(z.y, precis);
      r = infNumTruncateToLen(r, precis);
      az = infNumTruncateToLen(az, precis);

      if (math.gt(r, az)) {
        //p = [p k];
        console.log("period found with 1st-order ball arithmetic:", k);
        if (!doCont) {
          break;
        }
      }
      if (math.gt(az, maxR) || math.gt(r, maxR)) {
        console.log("1st-order ball arithmetic escaped at iteration:", k);
        break;
      }
    }
  },
  "findMinibrotWithBallArithmetic1stOrderAndNewton": function(n, precis, algorithm, x, y, viewWidth, viewHeight, getNthIterationAndDerivative, newtonsMethod) {
    // in ball centered on (x+yi) find period (up to n) of nucleus
    // doCont = false normally
    //
    // i believe:
    // x = center coordinate of screen
    // y = center coordinate of screen
    // width = half screen width (half rendered window width, in plane units, not in pixels)
    // height = half screen height (half rendered window height, in plane units, not in pixels)
    //const math = selectMathInterfaceFromAlgorithm(algorithm);
    // infnum is likely more accurate at very large scales, but is much
    //   slower than float and floatexp... but infnum if the only way
    //   to do full-precision computations
    const math = infNumMath;
    const c0 = {
      x: math.createFromInfNum(x),
      y: math.createFromInfNum(y)
    };
    const r0 = math.min(math.createFromInfNum(viewWidth), math.createFromInfNum(viewHeight));
    const r0sq = math.mul(r0, r0);
    let z = math.complexRealMul(c0, math.zero);
    let r = r0;
    //let p = []; // this doesn't appear to be used
    const maxR = math.createFromNumber(1e5);
    let az = math.complexAbs(z);

    const nthIterToLog = 100;
    let nthIterToLogCount = 0;
    for (let k = 1; k < n; k++) {
      nthIterToLogCount++;
      if (nthIterToLogCount >= nthIterToLog) {
        nthIterToLogCount = 0;
        console.log("1st-order ball arithmetic at iteration:", k);
      }
      // r = (az+r).^mpow - az.^mpow + r0;
      r = math.add(az, r);
      r = math.mul(r, r);
      r = math.sub(r, math.mul(az, az));
      r = math.add(r, r0);
      // z = z.^mpow + c0;
      z = math.complexAdd(math.complexMul(z, z), c0);
      az = math.complexAbs(z);

      // what all needs to be truncated?
      z.x = math.truncateToSigDig(z.x, precis);
      z.y = math.truncateToSigDig(z.y, precis);
      r = infNumTruncateToLen(r, precis);
      az = infNumTruncateToLen(az, precis);

      //if (math.gt(r, az)) {
      //  //p = [p k];
      //  console.log("period found with 1st-order ball arithmetic:", k);
      //  if (!doCont) {
      //    break;
      //  }
      //}
      if (math.gt(r, az)) {
        //p = [p k];
        console.log("period found with 1st-order ball arithmetic:", k);
        // use newton's method to find minibrot nucleus
        const foundMinibrotNucleus = newtonsMethod(k, x, y, precis, getNthIterationAndDerivative);
        // if the nucleus is within the original radius, we're done!
        if (math.lt(math.complexAbsSquared(math.complexSub(foundMinibrotNucleus, c0)), r0sq)) {
          console.log("found on-screen ref x/y/period!");
          foundMinibrotNucleus.period = k;
          return foundMinibrotNucleus;
        // otherwise, proceed to try to find a deeper higher-period
        } else {
          console.log("newton nucleus with period [" + k + "] is off screen!");
        }
      }
      if (math.gt(az, maxR) || math.gt(r, maxR)) {
        console.log("1st-order ball arithmetic escaped at iteration:", k);
        //break;
        return null;
      }
    }
    return null;
  },
  // based on garrit's matlab code: https://fractalforums.org/index.php?topic=3805.msg24312#msg24312
  "findPeriodBallArithmetic2ndOrder": function(n, precis, algorithm, x, y, width, height, doCont) {
    // in ball centered on (x+yi) find period (up to n) of nucleus
    // doCont = false normally
    //
    // i believe:
    // x = center coordinate of screen
    // y = center coordinate of screen
    // width = half screen width (half rendered window width, in plane units, not in pixels)
    // height = half screen height (half rendered window height, in plane units, not in pixels)

    //const math = selectMathInterfaceFromAlgorithm(algorithm);
    // infnum is likely more accurate at very large scales, but is much
    //   slower than float and floatexp... but infnum if the only way
    //   to do full-precision computations
    const math = infNumMath;
    //const math = floatExpMath;

    const c0 = {
      x: math.createFromInfNum(x),
      y: math.createFromInfNum(y)
    };
    const r0 = math.min(math.createFromInfNum(width), math.createFromInfNum(height));
    const r0sq = math.mul(r0, r0);
    let z = math.complexRealMul(c0, math.zero);
    //let c1 = c0;
    let dz = math.complexRealMul(c0, math.zero);
    let r = r0;
    //let p = []; // this doesn't appear to be used
    const maxR = math.createFromNumber(1e5);
    let az = math.complexAbs(z);
    let adz = math.complexAbs(dz);
    let minz = math.createFromNumber(1e16);
    let minIter = -1;

    let rsq;
    let r0sqadzsq;
    const nthIterToLog = 100;
    let nthIterToLogCount = 0;
    for (let k = 1; k < n; k++) {
      nthIterToLogCount++;
      if (nthIterToLogCount >= nthIterToLog) {
        nthIterToLogCount = 0;
        console.log("2nd-order ball arithmetic at iteration:", k);
      }
      // r = r.^2+2*(az+r0.*adz)*r + r0.^2.*adz.^2;
      rsq = math.mul(r, r);
      r = math.mul(r, math.mul(math.two, math.add(az, math.mul(r0, adz))));
      r0sqadzsq = math.mul(r0sq, math.mul(adz, adz));
      r = math.add(rsq, math.add(r, r0sqadzsq));
      // dz = 2*z.*dz + 1;
      dz = math.complexRealMul(math.complexMul(z, dz), math.two);
      dz = math.complexRealAdd(dz, math.one);
      // z = z.^2 + c0;
      z = math.complexAdd(math.complexMul(z, z), c0);
      az = math.complexAbs(z);
      adz = math.complexAbs(dz);

      // what all needs to be truncated?
      z.x = math.truncateToSigDig(z.x, precis);
      z.y = math.truncateToSigDig(z.y, precis);
      r = math.truncateToSigDig(r, precis);
      az = math.truncateToSigDig(az, precis);
      adz = math.truncateToSigDig(adz, precis);

      if (math.lt(az, minz)) {
        minz = az;
        minIter = k;
      }

      if (math.gt(math.add(r, math.mul(r0, adz)), az)) {
        //p = [p k];
        console.log("period found with 2nd-order ball arithmetic:", k, "atom:", minIter);
        if (!doCont) {
          //break;
          return k;
        }
      }
      if (math.gt(az, maxR) || math.gt(r, maxR)) {
        console.log("2nd-order ball arithmetic escaped at iteration:", k);
        //break;
        return -1;
      }

    }
    return -1;
  },
  "findMinibrotWithBallArithmetic2ndOrderAndNewton": function(n, precis, algorithm, x, y, viewWidth, viewHeight, getNthIterationAndDerivative, newtonsMethod) {
    // in ball centered on (x+yi) find period (up to n) of nucleus
    // doCont = false normally
    //
    // i believe:
    // x = center coordinate of screen
    // y = center coordinate of screen
    // viewWidth = half screen width in the x/real dimension (half rendered window width, in plane units, not in pixels)
    // viewHeight = half screen height in the y/imag dimension (half rendered window height, in plane units, not in pixels)

    //const math = selectMathInterfaceFromAlgorithm(algorithm);
    // infnum is likely more accurate at very large scales, but is much
    //   slower than float and floatexp... but infnum if the only way
    //   to do full-precision computations
    const math = infNumMath;
    //const math = floatExpMath;

    const c0 = {
      x: math.createFromInfNum(x),
      y: math.createFromInfNum(y)
    };
    const r0 = math.min(math.createFromInfNum(viewWidth), math.createFromInfNum(viewHeight));
    const r0sq = math.mul(r0, r0);
    let z = math.complexRealMul(c0, math.zero);
    //let c1 = c0;
    let dz = math.complexRealMul(c0, math.zero);
    let r = r0;
    //let p = []; // this doesn't appear to be used
    const maxR = math.createFromNumber(1e5);
    let az = math.complexAbs(z);
    let adz = math.complexAbs(dz);
    let minz = math.createFromNumber(1e16);
    let minIter = -1;

    let rsq;
    let r0sqadzsq;
    const nthIterToLog = 20;
    let nthIterToLogCount = 0;
    for (let k = 1; k < n; k++) {
      nthIterToLogCount++;
      if (nthIterToLogCount >= nthIterToLog) {
        nthIterToLogCount = 0;
        console.log("2nd-order ball arithmetic at iteration:", k);
      }
      // r = r.^2+2*(az+r0.*adz)*r + r0.^2.*adz.^2;
      rsq = math.mul(r, r);
      r = math.mul(r, math.mul(math.two, math.add(az, math.mul(r0, adz))));
      r0sqadzsq = math.mul(r0sq, math.mul(adz, adz));
      r = math.add(rsq, math.add(r, r0sqadzsq));
      // dz = 2*z.*dz + 1;
      dz = math.complexRealMul(math.complexMul(z, dz), math.two);
      dz = math.complexRealAdd(dz, math.one);
      // z = z.^2 + c0;
      z = math.complexAdd(math.complexMul(z, z), c0);
      az = math.complexAbs(z);
      adz = math.complexAbs(dz);

      // what all needs to be truncated?
      z.x = math.truncateToSigDig(z.x, precis);
      z.y = math.truncateToSigDig(z.y, precis);
      r = math.truncateToSigDig(r, precis);
      az = math.truncateToSigDig(az, precis);
      adz = math.truncateToSigDig(adz, precis);

      if (math.lt(az, minz)) {
        minz = az;
        minIter = k;
      }

      if (math.gt(math.add(r, math.mul(r0, adz)), az)) {
        //p = [p k];
        console.log("period found with 2nd-order ball arithmetic:", k, "atom:", minIter);
        // use newton's method to find minibrot nucleus
        const foundMinibrotNucleus = newtonsMethod(k, x, y, precis, getNthIterationAndDerivative);
        // if the nucleus is within the original radius, we're done!
        if (math.lt(math.complexAbsSquared(math.complexSub(foundMinibrotNucleus, c0)), r0sq)) {
          console.log("found on-screen ref x/y/period!");
          foundMinibrotNucleus.period = k;
          return foundMinibrotNucleus;
        // otherwise, proceed to try to find a deeper higher-period
        } else {
          console.log("newton nucleus with period [" + k + "] is off screen!");
        }
      }
      if (math.gt(az, maxR) || math.gt(r, maxR)) {
        console.log("2nd-order ball arithmetic escaped at iteration:", k);
        //break;
        //return -1;
        return null;
      }

    }
    //return -1;
    return null;
  },
  // this is largely the same as "computeReferenceOrbit" above, but also
  //   performs iterations of the derivative mandelbrot function
  // x and y must be infNum objects
  // for newton's method for finding minibrots/periodic ref orbit locations: https://www.fractalforums.com/index.php?topic=18289.msg90972#msg90972
  "getNthIterationAndDerivative": function(n, x, y, precis, fnContext) {

    //const two = infNum(2n, 0n);
    //const four = infNum(4n, 0n);
    //const sixteen = infNum(16n, 0n);

    // we are just using a large bailout here, as large
    //   or larger than any algorithm would use
    const bailoutSquared = infNum(64n*64n*2n, 0n);

    // fnContext allows the loop to be done piecemeal
    if (fnContext === null) {
      fnContext = {
        // the coords used for iteration
        //ix: infNum(0n, 0n),
        //iy: infNum(0n, 0n),
        z: {x:infNum(0n, 0n), y:infNum(0n, 0n)}, // the nth iteration of the mandelbrot equation
        //z1: {x:infNum(0n, 0n), y:infNum(0n, 0n)}, // the 1th iteration of the mandelbrot equation
        //znplus1: {x:infNum(0n, 0n), y:infNum(0n, 0n)}, // the n+1th iteration of the mandelbrot equation
        //zsave: {x:infNum(0n, 0n), y:infNum(0n, 0n)}, // save the nth iteration of the mandelbrot equation
        dz: {x:infNum(0n, 0n), y:infNum(0n, 0n)}, // the nth iteration of the derivative of the mandelbrot equation
        c: {x: copyInfNum(x), y: copyInfNum(y)},
        iter: 0,
        status: "",
        done: false
      };
    }
    var ixSq = infNum(0n, 0n);
    var iySq = infNum(0n, 0n);
    var ixTemp = infNum(0n, 0n);
    var statusIterCounter = 0;
    try {
      //while (fnContext.iter < n+2) {
      while (fnContext.iter < n) {
        // dz = 2 * z * dz + 1
        fnContext.dz = infNumMath.complexRealAdd(
          infNumMath.complexRealMul(
            infNumMath.complexMul(
              fnContext.z,
              fnContext.dz),
            infNumMath.two),
          infNumMath.one);

        // z = z * z + c
        //fnContext.z = infNumMath.complexAdd(
        //  infNumMath.complexMul(fnContext.z, fnContext.z),
        //  fnContext.c
        //  );

        ixSq = infNumMul(fnContext.z.x, fnContext.z.x);
        iySq = infNumMul(fnContext.z.y, fnContext.z.y);
        if (infNumGt(infNumAdd(ixSq, iySq), bailoutSquared)) {
          break;
        }

        //fnContext.z.x = infNumTruncateToLen(fnContext.z.x, precis);
        //fnContext.z.y = infNumTruncateToLen(fnContext.z.y, precis);
        fnContext.dz.x = infNumTruncateToLen(fnContext.dz.x, precis);
        fnContext.dz.y = infNumTruncateToLen(fnContext.dz.y, precis);

        ixTemp = infNumAdd(x, infNumSub(ixSq, iySq));
        fnContext.z.y = infNumAdd(y, infNumMul(infNumMath.two, infNumMul(fnContext.z.x, fnContext.z.y)));
        fnContext.z.x = copyInfNum(ixTemp);
        fnContext.z.x = infNumTruncateToLen(fnContext.z.x, precis);
        fnContext.z.y = infNumTruncateToLen(fnContext.z.y, precis);

        //if (fnContext.iter === 1) {
        //  fnContext.z1 = structuredClone(fnContext.z); // use index 1th iter for period detection
        //} else if (fnContext.iter === n-1) {
        //  fnContext.zsave = structuredClone(fnContext.z); // save the nth iter
        //} else if (fnContext.iter === n+1) {
        //  fnContext.znplus1 = structuredClone(fnContext.z); // use n+1th iter for period detection
        //}

        fnContext.iter++;
        statusIterCounter++;
        if (statusIterCounter >= 5000) {
          statusIterCounter = 0;
          fnContext.status = "at " + (Math.round(fnContext.iter * 10000.0 / n)/100.0) + "% of orbit";
          console.log(fnContext.status);
          return fnContext;
        }
      }

      //fnContext.z = structuredClone(fnContext.zsave);

      fnContext.done = true;
      return fnContext;
    } catch (e) {
      console.log("ERROR CAUGHT when computing Nth iteration and derivative (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + fnContext.iter + ", " + n + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      fnContext.done = true;
      return fnContext;
    }
  },
  // newton's method for finding minibrots/periodic ref orbit locations: https://www.fractalforums.com/index.php?topic=18289.msg90972#msg90972
  "newtonsMethod": function(period, x, y, precis, getNthIterationAndDerivative) {
    const maxSteps = 32;
    // experimentation is needed to see when z/dz is considered
    //   small enough to be ignored (thus, when we can stop
    //   iterating newton's method)
    const magnitudeDifference = infNum(1000000n, 0n);
    const magnitudeDifferenceSq = infNumMul(magnitudeDifference, magnitudeDifference);
    let nthIterationState = null;
    let c = {x: copyInfNum(x), y: copyInfNum(y)};
    let step;
    let cAbsSq;
    let stepAbsSq;
    let cPrev;
    for (let i = 0; i < maxSteps; i++) {
      // calculate the Nth iteration of regular+deriviative
      nthIterationState = null;
      while (nthIterationState === null || !nthIterationState.done) {
        nthIterationState = getNthIterationAndDerivative(period, c.x, c.y, precis, nthIterationState);
        sendStatusMessage("for " + (i+1) + "th newton iteration, " + nthIterationState.status);
      }
      // if dz is zero, stop
      //if (nthIterationState.dz.x.v == 0n) {
      //  console.log("newton's method stopped during the [" + (i+1) + "]th iteration because dz was zero");
      //  break;
      //}

      // if the 1th (2nd iter) and n+1th (2nd after period) are ~equal, then we've found a periodic point
      //if (
      //    infNumApproxEq(nthIterationState.z1.x, nthIterationState.znplus1.x, precis) &&
      //    infNumApproxEq(nthIterationState.z1.y, nthIterationState.znplus1.y, precis)) {
      //  console.log("newton's method stopped during the [" + (i+1) + "]th iteration because we found a periodic point with period [" + period + "]");
      //  break;
      //}

      step = infNumMath.complexDiv(nthIterationState.z, nthIterationState.dz, precis);

      // if z/dz is tiny, stop
      // how to determine this?  try seeing if |c| > 1000000*|z/dz| (didn't work)
      // another way would be to compare c to its previous value:
      //   if the exponents of the infnum is the same, the difference is
      //   tiny if the mantissa only differs by 1 or 2 least-significant
      //   digits (maybe <= Math.ceil(precision*0.05) digits)
      //cAbsSq = infNumMath.complexAbsSquared(c);
      //stepAbsSq = infNumMath.complexAbsSquared(step);
      //if (i > 10 && infNumGt(cAbsSq, infNumMul(stepAbsSq, magnitudeDifferenceSq))) {
      //  console.log("newton's method stopped during the [" + (i+1) + "]th iteration because z/dz got tiny");
      //  break;
      //}

      // c = c - z / dz
      cPrev = c;
      c = infNumMath.complexSub(c, step);

      //if (infNumEq(c.x, cPrev.x, precis) && infNumEq(c.y, cPrev.y, precis)) {
      if (infNumApproxEq(c.x, cPrev.x, precis) && infNumApproxEq(c.y, cPrev.y, precis)) {
        console.log("newton's method stopped during the [" + (i+1) + "]th iteration because z/dz got tiny enough to be negligible");
        break;
      }

      if ( (i+1) % 10 === 1) {
        console.log("after the [" + (i+1) + "]th iteration of newton's method, c is:", {x:infNumExpString(c.x), y:infNumExpString(c.y)});
      }
    }
    return c;
  },
  "computeSaCoefficients": function(precision, algorithm, referenceX, referenceY, referenceOrbit, windowEdges, fnContext) {
    // always use FloatExp for SA coefficients
    const math = floatExpMath;

    const algoMath = selectMathInterfaceFromAlgorithm(algorithm);
    const algoMathIsFloatExp = algoMath.name == "floatexp";

    // fnContext allows the loop to be done piecemeal
    if (fnContext === null) {
      // parse out number of series approximation terms, and number of test
      //   point divisions, from the algorithm name using format:
      //   "sapx<terms>[.<test-point-divisions>]"
      let nTerms = 3;
      let dimDiv = 3;
      try {
        let sapx = algorithm.split("-").find(e => e.startsWith("sapx")).substring(4).split(".");
        // use BigInt() here because it throws exception for non-integer strings
        nTerms = Math.max(3, Math.min(128, parseInt(BigInt(sapx[0]).toString())));
        // 1 division (4 test points) - 7 divisions (64 test points)
        dimDiv = Math.max(1, Math.min(7, parseInt(BigInt(sapx[1]).toString())));
      } catch {}

      // calculate test points
      let testPoints = [];
      // divisions per dimension
      // 1 -> test 4 corners only
      // 2 -> test 4 corners, 4 edge middles, and image center
      // 3 -> test 4 points along top edge, 4 points across at 1/3 down from top,
      //           4 points across at 2/3 down from top, and 4 points along bottom edge
      // 4 -> test 5 points along top edge ...
      let py = windowEdges.top;
      let xStep = infNumDiv(infNumSub(windowEdges.right, windowEdges.left), infNum(BigInt(dimDiv), 0n), precision);
      let yStep = infNumDiv(infNumSub(windowEdges.top, windowEdges.bottom), infNum(BigInt(dimDiv), 0n), precision);
      // note <= in loop conditions here -- we want to span edge to edge
      //   inclusive of both edges
      for (let i = 0; i <= dimDiv; i++) {
        let px = windowEdges.left;
        for (let j = 0; j <= dimDiv; j++) {
          testPoints.push({
            x: copyInfNum(px),
            y: copyInfNum(py)
          });
          px = infNumAdd(px, xStep);
        }
        py = infNumAdd(py, yStep);
      }

      // initialize terms to 0, at 0th iteration ...
      let terms = new Array(nTerms).fill({x:math.zero, y:math.zero});
      // ... except for 'A' term, which is initialized to 1
      terms[0] = {x:math.one, y:math.zero};

      fnContext = {
        nTerms: nTerms,
        // for coefficients to be valid at an iteration, they
        //   need to be getting much smaller (one example is,
        ///  when read from left to right, from the Nth term
        //   to the N+1th term)
        // this is spelled out in a more exact fashion here:
        // https://www.fractalforums.com/index.php?topic=18482.msg74200#msg74200
        // this is the "several orders of magnitude" the smallest term in
        //   the first group must be than the largest term in the second group
        //
        // since the values being compared are squared, we must
        //   square this also
        termShrinkCutoff: math.createFromNumber(1000*1000),
        testPoints: testPoints,

        terms: terms,

        // start this negative, so we can tell when all iterations are valid
        itersToSkip: -1,

        refOrbitIter: 0,

        saCoefficients: {itersToSkip:0, coefficients:[]},

        status: "",
        done: false
      };
    }

    if (fnContext.nTerms <= 0) {
      console.log("series approximation has 0 or fewer terms in the algorithm name [" + algorithm + "], so NOT doing SA");
      fnContext.done = true;
      return fnContext;
    }

    let twoRefIter = null;
    const nextTerms = new Array(fnContext.nTerms);

    // from sft_maths.pdf (original K. I. Martin perturbation theory and series approximation document)
    // An+1 = 2XnAn + 1
    // Bn+1 = 2XnBn + An^2
    // Cn+1 = 2XnCn + 2AnBn
    // from "Botond Kosa" (Mandel Machine author) https://www.fractalforums.com/index.php?topic=18482.msg71342#msg71342
    // Dn+1 = 2XnDn + 2AnCn + Bn^2
    // En+1 = 2XnEn + 2AnDn + 2BnCn
    // my guesses for subsequent F and G terms:
    // Fn+1 = 2XnFn + 2AnEn + 2BnDn + Cn^2
    // Gn+1 = 2XnGn + 2AnFn + 2BnEn + 2CnDn

    // iterate through ref orbit, stopping once SA is no longer valid for any
    //   single test point
    let i = fnContext.refOrbitIter;
    let statusIterCounter = 0;
    // go to ref orbit length - 3, because IF the entire orbit can
    //   be skipped (when max iterations for the image is too low)
    //   we end up trying to access an index of the ref orbit that
    //   doesn't exist after skipping the entire ref orbit
    for (; i < referenceOrbit.length - 3; i++) {

      // this only works if the reference orbit is floatexp... have to use pre-converted
      //   values if using "...-float" or "...-arbprecis" algo
      twoRefIter = algoMathIsFloatExp ?
        math.complexRealMul(referenceOrbit[i], math.two)
        :
        math.complexRealMul({x:referenceOrbit[i].xfxp, y:referenceOrbit[i].yfxp}, math.two);

      // compute next iteration of all terms
      for (let k = 0; k < fnContext.nTerms; k++) {

        // special case for 0th term (A)
        if (k === 0) {
          nextTerms[k] = math.complexRealAdd(math.complexMul(twoRefIter, fnContext.terms[k]), math.one);

        } else if (k % 2 === 0) {
          nextTerms[k] = math.complexMul(twoRefIter, fnContext.terms[k]);
          // notice continue condition is "up<dn" here
          for (let up = 0, dn = k-1; up<dn; up++, dn--) {
            nextTerms[k] = math.complexAdd(nextTerms[k],
              math.complexRealMul(math.complexMul(fnContext.terms[up], fnContext.terms[dn]), math.two)
            );
          }

        // odd (B=1, D=3) terms end in squared term
        } else {
          nextTerms[k] = math.complexMul(twoRefIter, fnContext.terms[k]);
          // notice continue condition is "up<=dn" here
          for (let up = 0, dn = k-1; up<=dn; up++, dn--) {
            if (up === dn) {
              nextTerms[k] = math.complexAdd(nextTerms[k],
                math.complexMul(fnContext.terms[up], fnContext.terms[dn]) // since up=dn here, we are squaring that coefficient
              );
            } else {
              nextTerms[k] = math.complexAdd(nextTerms[k],
                math.complexRealMul(math.complexMul(fnContext.terms[up], fnContext.terms[dn]), math.two)
              );
            }
          }
        }
      }

      let validTestPoints = 0;
      // check for iters to skip for all calculated test points
      for (let p = 0; p < fnContext.testPoints.length; p++) {

        let deltaC = {
          x: math.createFromInfNum(infNumSub(fnContext.testPoints[p].x, referenceX)),
          y: math.createFromInfNum(infNumSub(fnContext.testPoints[p].y, referenceY))
        };

        let coefTermsAreValid = false;
        // check validity of iteration coefficients
        // splitting terms into two groups, so start from one
        for (let j = 1; j < fnContext.nTerms; j++) {
          let deltaCpower = structuredClone(deltaC);
          let firstSmallest = null;
          let secondLargest = null;
          // find smallest term in 1st group for test point
          for (let k = 0; k < j; k++) {
            // no need to actually take square root of sum of squares
            //   to do the size comparison
            let wholeTerm = math.complexAbsSquared(math.complexMul(deltaCpower, nextTerms[k]));
            if (firstSmallest === null || math.lt(wholeTerm, firstSmallest)) {
              firstSmallest = structuredClone(wholeTerm);
            }
            // for the A term, 1 is multiplied by deltaC to get deltaC^1
            // for the B term, that result is again multiplied by deltaC to get deltaC^2
            // for the C term, ... we get deltaC^3
            deltaCpower = math.complexMul(deltaCpower, deltaC);
          }
          // find largest term in 2nd group for test point
          for (let k = j; k < fnContext.nTerms; k++) {
            // no need to actually take square root of sum of squares
            //   to do the size comparison
            let wholeTerm = math.complexAbsSquared(math.complexMul(deltaCpower, nextTerms[k]));
            if (secondLargest === null || math.gt(wholeTerm, secondLargest)) {
              secondLargest = structuredClone(wholeTerm);
            }
            deltaCpower = math.complexMul(deltaCpower, deltaC);
          }
          // take square root of the comparison terms
          //firstSmallest = infNumRoughSqrt(firstSmallest);
          //secondLargest = infNumRoughSqrt(secondLargest);

          // divide smallest from 1st by largest from 2nd
          // ratio should be >100? >1000?
          // (can use small value for division precision here)
          if (secondLargest.v === 0n) {
            coefTermsAreValid = true;
            // once we have a valid point at which to create two comparison groups,
            //   we don't need to test any other groupings
            break;
          }
          let ratio = math.div(firstSmallest, secondLargest);
          //if (secondLargest.v === 0n || infNumGt(infNumDiv(firstSmallest, secondLargest, 8), termShrinkCutoff)) {
          if (math.gt(ratio, fnContext.termShrinkCutoff)) {
            coefTermsAreValid = true;
            // once we have a valid point at which to create two comparison groups,
            //   we don't need to test any other groupings
            break;
          }

          // if ratio is not > 100, continue and test the next grouping (we'll
          //   move the group split one term to the right)
        }

        // if no valid groupings have been found, we cannot skip this many iterations for this test point
        if (coefTermsAreValid) {
          validTestPoints++;
        } else {
          console.log("SA test point [" + p + "] is not valid at iteration [" + i + "]");
          // if the coefficients at this iteration were not valid for any single test point
          //   we don't need to keep trying the other points
          break;
        }
      }

      // if the coefficients at this iteration were not valid for any single test point
      //   we will return the previous iteration (since that was the last one where
      //   coefficients were valid for ALL test points)
      if (validTestPoints < fnContext.testPoints.length) {
        // at i=0, if none are valid, we'll return 0 (we can skip 0 iterations)
        // at i=1, if none are valid, we'll return 1 (we can skip 1 iteration)
        // ...
        fnContext.itersToSkip = i;
        fnContext.done = true;
        console.log("SA stopping with [" + i + "] valid iterations");
        // break before copying nextTerms into terms (since the previous
        //   terms are the last valid terms)
        break;
      }

      // if the coefficients are valid for all test points, we can skip i+1 iterations,
      //   so continue on and test the next iteration
      for (let j = 0; j < fnContext.nTerms; j++) {
        // out of desperation, seeing if cloning this is needed
        fnContext.terms[j] = nextTerms[j];
        //fnContext.terms[j] = structuredClone(nextTerms[j]);
      }

      statusIterCounter++;
      if (statusIterCounter >= 5000) {
        fnContext.status = "can skip " + (Math.round(i * 10000.0 / referenceOrbit.length)/100.0) + "% of reference orbit";
        console.log("all test points are valid for skipping [" + (i).toLocaleString() + "] iterations");
        // resume this loop later, which means WE NEED TO INCREMENT
        //   i here
        fnContext.refOrbitIter = i+1;
        return fnContext;
      }
    }

    // convert coefficients to the algorithm's number type
    // (necesssary? can we just evaluate each pixel's starting
    //   iteration's position delta using floatexp?)
    //if (algoMath.name != math.name) {
    //  for (let i = 0; i < terms.length; i++) {
    //    terms[i] = {
    //      x: algoMath.createFromExpString(math.toExpString(terms[i].x)),
    //      y: algoMath.createFromExpString(math.toExpString(terms[i].y))
    //    };
    //  }
    //}

    fnContext.done = true;
    if (fnContext.itersToSkip < 0) {
      console.log("able to skip ALL [" + i + "/" + referenceOrbit.length + "] iterations of the reference orbit with [" + fnContext.nTerms + "]-term SA... hmm... perhaps N is set too low");
      fnContext.saCoefficients = {itersToSkip:i, coefficients:fnContext.terms};
    } else {
      console.log("able to skip [" + fnContext.itersToSkip + "] iterations with [" + fnContext.nTerms + "]-term SA");
      fnContext.saCoefficients = {itersToSkip:fnContext.itersToSkip, coefficients:fnContext.terms};
    }
    return fnContext;
  },
  "computeBlaTables": function(algorithm, referenceOrbit, referencePx, referencePy, windowEdges, fnContext) {
    //
    // this will attempt to use the standard "merging" idea:
    //
    // at every ref orbit iteration, we need to calculate BLAs, but
    //   for example the BLA that skips 10 iterations from the
    //   7th ref orbit iteration will involve re-computing all of
    //   the BLAs involved in skipping 11 iterations from the 6th
    //   ref orbit iteration ...
    // in big-O notation this involves O(n^2) computations (over
    //   the number of iterations in the reference orbit) and also
    //   memory, since the BLAs have to be stored for looking up
    //   later.
    //
    // to avoid re-computing and keeping so many overlapping BLAs
    //   in memory, instead we'll first calculate the 1-iteration
    //   BLAs at every ref orbit iteration, and call that "level 0".
    //   then, we'll merge every adjacent pair (not overlapping) of
    //    those level 0 BLAs to create our 2-iteration "level 1" BLAs.
    //   there are half as many BLAs contained by each "level" compared
    //   to the previous level,  each skipping twice the iterations.
    //   in total then, we'll end up computing about 2 BLAs for every
    //   ref orbit iteration, which scales linearly with the number of
    //   ref orbit iterations, which is O(n) time/space complexity.
    //
    //

    //
    // !! T O D O !!
    //
    // - re-compute validity radius when the window changes, even if the
    //     reference orbit can remain the same -- might need to create
    //     a separate function to do that
    //

    const math = selectMathInterfaceFromAlgorithm(algorithm);

    const minIter = 1; // start from 2nd ref orbit iteration
    const maxIter = referenceOrbit.length - 3; // how many of the final iterations of the ref orbit can used in BLA?
    let calcsDoneThisStatusUpdate = 0;
    const calcsPerStatusUpdate = 10000;

    // since the two lowest "level" BLAs only skip 1 and 2 iterations each, respectively,
    //   we will delete them after using them to compute the higher-level BLAs
    // we'll then just use normal perturbation, as needed, to move 1 or 2 iterations
    //   until we reach a ref orbit iteration with a matching BLA
    // IMPORTANT -- when changing this, also change the BLA lookup skip bitwise check in the perturb loop:
    // lowLevelsToDelete = 1 -- use: ((referenceIter & 1) == 1) (checking for odd-numbered ref iter)
    // lowLevelsToDelete = 2 -- use: ((referenceIter & 3) == 1) (checking for ref iter 1 more than a multiple of 4)
    // lowLevelsToDelete = 3 -- use: ???
    const lowLevelsToDelete = 2;

    if (fnContext === null) {

      // compute max |c| here, across the entire image
      // this is giving a relatively large value, which is subtracted from
      //   other stuff, creating a negative value, which is creating
      //   validity radius of 0 quite often
      // SO INSTEAD we'll try computing max |dc| here
      // subtraction order doesn't matter because we're taking abs
      let refDeltaCX = math.createFromInfNum(infNumSub(windowEdges.left, referencePx));
      let refDeltaCY = math.createFromInfNum(infNumSub(windowEdges.bottom, referencePy));
      let maxAbsC = math.complexAbs({x: refDeltaCX, y: refDeltaCY});
      refDeltaCX = math.createFromInfNum(infNumSub(windowEdges.right, referencePx));
      maxAbsC = math.max(maxAbsC, math.complexAbs({x: refDeltaCX, y: refDeltaCY}));
      refDeltaCY = math.createFromInfNum(infNumSub(windowEdges.top, referencePy));
      maxAbsC = math.max(maxAbsC, math.complexAbs({x: refDeltaCX, y: refDeltaCY}));
      refDeltaCX = math.createFromInfNum(infNumSub(windowEdges.left, referencePx));
      maxAbsC = math.max(maxAbsC, math.complexAbs({x: refDeltaCX, y: refDeltaCY}));
      // this was computing max |c| (not max |deltaC|)
      //let maxAbsC = math.complexAbs({x: edgesM.left, y: edgesM.top});
      //maxAbsC = math.max(maxAbsC, math.complexAbs({x: edgesM.right, y: edgesM.top}));
      //maxAbsC = math.max(maxAbsC, math.complexAbs({x: edgesM.left, y: edgesM.bottom}));
      //maxAbsC = math.max(maxAbsC, math.complexAbs({x: edgesM.right, y: edgesM.bottom}));

      fnContext = {
        // fractalzoomer uses this for epsilon (error factor):
        // 1 / ((double)(1L << 23)); // 23 is called "ThreadDraw.BLA_BITS" ... so 1 / 10^23 ?
        //epsilon: math.createFromInfNum(infNum(1n, -23n)), // this resulted in a wrong image for my "Mitosis: Four" location
        //epsilon: math.createFromInfNum(infNum(2n, -24n)), // this also resulted in wrong "Mitosis: Four" image
        //epsilon: math.createFromInfNum(infNum(2n, -53n)), // Zhuoran's other suggested epsilon from https://fractalforums.org/index.php?topic=4360.msg31806#msg31806
        //epsilon: math.createFromInfNum(infNum(1n, -53n)), // a bit smaller (better for cerebral spin location!)
        epsilon: math.createFromInfNum(infNum(1n, -54n)), // smaller by factor of 10, works maybe perfectly for "cerebral spin 2" location w/"bla-float" algo

        // each entry here will be:
        // - blas: another Map, of either "level" or itersToSkip
        // - orderedItersToSkip: an ordered array, from large to small, of available BLAs by itersToSkip
        blasByRefIter: new Map(),
        blas: {
          byNthIter: [],
          iterToNthDivisor: lowLevelsToDelete ** 2,
        },

        maxAbsC: maxAbsC,

        calcTotalBlas: maxIter * 2, // estimate of total BLAs we will calculate
        calcBLAsDone: 0,
        calcLevel: 0,
        calcRefIterBLA: minIter,

        status: "",
        done: false
      };
      console.log("using epsilon: " + math.toExpString(fnContext.epsilon));
    }

    const totalLevels = Math.floor(Math.log2(maxIter)) + 1;
    let level = fnContext.calcLevel;
    let refIter = fnContext.calcRefIterBLA;

    // loop here to increment the level, stopping once we would skip
    //   from the 0th ref iter beyond the maxIter
    for (; level < totalLevels; level++) {

      console.log("computing BLAs at level [" + level + "] of [" + totalLevels + "] for [" + maxIter + "] ref iters");

      let levelItersToSkip = 2 ** level; // skip 1 iter at level 0, 2 at level 1, ...
      let prevLevelItersToSkip = 2 ** (level - 1);

      if (levelItersToSkip > maxIter) {
        console.log("stopping computing BLAs at level [" + level + "] because levelItersToSkip [" + levelItersToSkip + "] > [" + maxIter + "] ref iters");
        break;
      }

      for (; refIter < maxIter - levelItersToSkip; refIter += levelItersToSkip) {
        // for the 1st level (skipping 1 iter) we use the intial special case
        //   A and B coefficients from Zhuoran's post: https://fractalforums.org/index.php?topic=4360.msg31806#msg31806
        //
        // and the special case radius r from claude: https://fractalforums.org/index.php?topic=4360.msg32142#msg32142
        if (level == 0) {

          // in each BLA we have:
          // a: the "A" coefficient, which is a complex number
          // b: the "B" coefficient, which is a complex number
          // r: the validity radius (not a complex number)
          // r2:the validity radius squared
          let bla = {
            a: math.complexRealMul(referenceOrbit[refIter], math.two), // 2 Z (where big Z = ref orbit Z)
            b: {x: math.one, y: math.zero}, // (1+0i),
            r: null, // computed here, below
            r2: null, // computed here, below
            itersToSkip: levelItersToSkip
          }

          // claude's orig line, then does Zhouran's correction apply here?
          //   r = max(0,  epsilon (|Z| - |B| |c|)  / (|A| + 1))
          //   r = max(0, (epsilon (|Z| - |B| |c|)) / (|A| + 1))
          // where |c| is max value of |c| in the image

          // from claude: https://fractalforums.org/index.php?topic=4360.msg32142#msg32142
          //let r;
          //let absA = math.complexAbs(bla.a);
          //let absB = math.complexAbs(bla.b);
          //let absZ = math.complexAbs(referenceOrbit[refIter]);
          //r = math.sub(absZ, math.mul(absB, fnContext.maxAbsC));
          //r = math.mul(fnContext.epsilon, r);
          //r = math.div(r, math.add(absA, math.one));
          //r = math.max(math.zero, r);
          // claude's with Zhouran's fix: https://fractalforums.org/index.php?topic=4360.msg34393#msg34393
          let r;
          let absA = math.complexAbs(bla.a);
          let absB = math.complexAbs(bla.b);
          let absZ = math.complexAbs(referenceOrbit[refIter]);
          r = math.mul(fnContext.epsilon, absZ);
          r = math.sub(r, math.mul(absB, fnContext.maxAbsC));
          r = math.div(r, absA);
          r = math.max(math.zero, r);

          // from fractalzoomer
          // getting a lot of r=0, which doesn't seem right
          //let absA =  math.complexAbs(bla.a);
          //let r = math.mul(fnContext.epsilon, absA);
          //r = math.sub(r, math.div(fnContext.maxAbsC, absA));
          //r = math.max(math.zero, r);

          // keep both to avoid doing square root in merging step?
          bla.r = r;
          bla.r2 = math.mul(r, r);

          // store our initial 1-iteration BLA in a new map
          fnContext.blasByRefIter.set(refIter, [bla]);
          calcsDoneThisStatusUpdate++;

        // for all subsequent levels, we calculate A and B by merging the
        //   previous level according to claude: https://fractalforums.org/index.php?topic=4360.msg32142#msg32142
        } else if (refIter + levelItersToSkip < maxIter) {

          // we'll call the BLAs we are merging x and y
          let x = fnContext.blasByRefIter.get(refIter).find(e => e.itersToSkip == prevLevelItersToSkip);
          let y = fnContext.blasByRefIter.get(refIter + prevLevelItersToSkip).find(e => e.itersToSkip == prevLevelItersToSkip);

          if (x === undefined) {
            console.log("bah");
          }
          if (y === undefined) {
            console.log("gah");
          }

          let bla = {
            a: math.complexMul(x.a, y.a),
            b: math.complexAdd(math.complexMul(x.b, y.a), y.b),
            r: null, // computed here, below
            r2: null, // computed here, below
            itersToSkip: levelItersToSkip
          }

          // this is an attempt to implement claude's merging: https://fractalforums.org/index.php?topic=4360.msg32142#msg32142
          // with this enabled, plus checking Δz and not Z, i was getting
          //   BLAs found to be valid but the overall image doesn't look
          //   right... might be a problem with the perturb/BLA sequence
          //   in the iteration loop
          //let r = math.sub(y.r, math.mul(math.complexAbs(bla.b), fnContext.maxAbsC));
          //r = math.div(r, math.complexAbs(bla.a));
          //r = math.max(math.zero, r);
          //r = math.min(x.r, r);

          // this is the merging from fractalzoomer
          // with this enabled, plus checking Δz and not Z, i was getting
          //   BLAs found to be valid but the overall image doesn't look
          //   right... might be a problem with the perturb/BLA sequence
          //   in the iteration loop
          //double r = Math.min(Math.sqrt(x.r2), Math.max(        0, (                 Math.sqrt(y.r2) - xB * blaSize) / xA));
          let r =      math.min(          x.r,   math.max(math.zero, math.div(math.sub(y.r,     math.mul(math.complexAbs(x.b), fnContext.maxAbsC)), math.complexAbs(x.a))));

          // this is from forum user "GBy": https://fractalforums.org/index.php?topic=4360.msg33007#msg33007
          //let absAx = math.complexAbs(x.a);
          //let absBx = math.complexAbs(x.b);
          //let r = math.max(math.zero, math.div(math.sub(y.r, math.mul(absBx, fnContext.maxAbsC)), math.add(absAx, math.one)));
          //r = math.min(x.r, r);

          // keep both to avoid doing square root in merging step?
          bla.r = r;
          bla.r2 = math.mul(r, r);

          // delete the merged BLAs' r properties, since they're not needed anymore
          //   (the BLA "r2" property is needed later, when testing the validity
          //   radius)
          delete x.r;
          delete y.r;

          // add this new BLA for the ref orbit iteration to the front of the array
          fnContext.blasByRefIter.get(refIter).unshift(bla);
          calcsDoneThisStatusUpdate++;

          //console.log("merged [" + prevLevelItersToSkip + "]-iteration BLAs at " +
          //  "ref iters [" + refIter + "] and [" + (refIter + prevLevelItersToSkip) + "], " +
          //  "creating new [" + levelItersToSkip + "]-iteration BLA at ref iter [" + refIter + "]");
        }

        if (calcsDoneThisStatusUpdate >= calcsPerStatusUpdate) {
          fnContext.calcLevel = level;
          fnContext.calcBLAsDone = fnContext.calcBLAsDone + calcsDoneThisStatusUpdate;
          fnContext.calcRefIterBLA = refIter + levelItersToSkip; // we want to resume at the next refIter
          fnContext.status = "computed " + (Math.round(fnContext.calcBLAsDone * 10000.0 / fnContext.calcTotalBlas)/100.0) + "% of BLAs";
          console.log(fnContext.status);
          return fnContext;
        }
      }

      // reset reference orbit iteration to 0 upon moving to the next level,
      //   but we're doing it here to allow us to resume the loop above
      //   using the fnContext
      refIter = minIter;
    }

    // if we reach this point, we are done calculating the BLAs
    fnContext.done = true;

    // finally:
    // delete the 0th level (skipping 1 iter) and 1th level (skipping 2 iters)
    //   since those levels don't provide much/any acceleration and they
    //   require lots of the overall memory required for BLA -- i think since
    //   we have to pass all the BLA data to each worker thread, it's faster
    //   possibly to even drop the levels 0, 1, and 2, and possibly 3

    console.log("before deleting the lowest [", lowLevelsToDelete, "] levels, we have BLAs at [", fnContext.blasByRefIter.size , "] iterations");
    let totalDeletedBLAs = 0;
    let blasAtRefIter;
    let bla;
    for (let deleteLevel = 0; deleteLevel < lowLevelsToDelete; deleteLevel++) {
      let levelItersToSkip = 2 ** deleteLevel; // skip 1 iter at level 0, 2 at level 1, ...
      // IMPORTANT here to start at index 1 (the 2nd ref orbit iter) since that's
      //   where all the BLAs start
      for (let deleteRefIter = 1; deleteRefIter < maxIter; deleteRefIter += levelItersToSkip) {
        blasAtRefIter = fnContext.blasByRefIter.get(deleteRefIter);
        if (blasAtRefIter === undefined) {
          //console.log("when deleting low-level BLAs, we didn't find any BLAs at ref iter [" + deleteRefIter + "]");
          continue;
        }
        if (blasAtRefIter.length > 0) {
          bla = blasAtRefIter.pop();
          if (bla.itersToSkip != levelItersToSkip) {
            console.log("somehow, for ref iter " + deleteRefIter + ", was going to remove a " + bla.itersToSkip + "-iter BLA when trying to remove BLAs with ", levelItersToSkip, " iters");
            blasAtRefIter.push(bla);
          }
          totalDeletedBLAs++;
        }
        if (blasAtRefIter.length == 0) {
          fnContext.blasByRefIter.delete(deleteRefIter);
        }
      }
    }
    console.log("deleted [" + totalDeletedBLAs + "] total BLAs in the lowest [" + lowLevelsToDelete + "] levels");
    console.log("after deleting the lowest [", lowLevelsToDelete, "] levels, we have BLAs at [", fnContext.blasByRefIter.size , "] iterations");

    // convert the map, by reference iter, to an array
    //   where the Nth reference iter is converted to
    //   the corresponding array index
    for (const kv of fnContext.blasByRefIter) {
      // to convert ref iteration to Nth index:
      // (iter - 1) / (2 ** lowestLevel)
      if (kv[0] < 20) {
        let index = (kv[0] - 1) / fnContext.blas.iterToNthDivisor;
        console.log("iteration", kv[0], "becomes array index", index);
      }
      fnContext.blas.byNthIter[(kv[0] - 1) / fnContext.blas.iterToNthDivisor] = kv[1];
    }
    delete fnContext.blasByRefIter;

    return fnContext;
  },
  // x, y, referenceX, and referenceY must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeBoundPointColorPerturbOrBla": function(n, precis, dx, dy, algorithm, referenceX, referenceY, referenceOrbit, blaTables, saCoefficients, useSmooth) {

    const math = selectMathInterfaceFromAlgorithm(algorithm);

    const useStripes = algorithm.includes("stripes");
    const oneHalf = math.createFromNumber(0.5);

    let stripeDensity = math.createFromNumber(6.0);
    // use user-provided coloring params
    let userStripeDensity;
    try {
      userStripeDensity = parseFloat(algorithm.split("-").find(e => e.startsWith("stripedensity")).substring(13));
    } catch (e) {}
    if (userStripeDensity !== undefined && userStripeDensity >= 1.0 && userStripeDensity <= 10.0) {
      stripeDensity = math.createFromNumber(userStripeDensity);
    }
    // this scales up the final result, increasing the number of
    //   colors.  a mixFactor of 1000 works ok, but in some areas
    //   there are rather abrupt color boundaries where a smooth
    //   gradient is expected.
    const mixFactor = 100000;

    const bailoutSquared = useStripes ?
      (useSmooth ? math.createFromNumber(64*64) : math.four)
      :
      (useSmooth ? math.createFromNumber(32*32) : math.four);

    // this is a float, for now, the stripes coloring won't work for perturb-floatexp or perturb-infnum
    const logBailoutSquared = math.log(bailoutSquared);

    // this function is used for both:
    //   "bla-float"    : BLA+perturb, and for
    //   "perturb-float": perturb only
    const useBla = algorithm.includes("bla-");

    // this function can also use series approximation:
    //   "bla-sapx6-float"      : BLA+perturb, with 6-term series approximation
    //   "bla-sapx17-float"     : BLA+perturb, with 17-term series approximation
    //   "perturb-sapx9-float" : perturb, with 9-term series approximation
    const useSa = algorithm.includes("sapx");

    //const four = math.createFromNumber(4);
    //const two = math.createFromNumber(2);
    const maxIter = n;

    //  from https://fractalwiki.org/wiki/Perturbation_theory
    //
    //  The escape time formula for the Mandelbrot set involves iterating 𝑧→𝑧^2+𝑐 starting from 𝑧=0 with 𝑐 being the coordinates of the pixel. Perturbation works by replacing each variable with an unevaluated sum of a high precision reference (upper case) and a low precision delta (lower case). Thus:
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

    // we used to always use InfNum to calcualte delta from the reference point,
    //   but now deltas are used everywhere and just provided to this function
    //   as arguments
    //const deltaCx = infNumSub(x, referenceX);
    //const deltaCy = infNumSub(y, referenceY);

    let deltaC = {
      x: dx,
      y: dy
    };

    const deltaCAbs = math.complexAbs(deltaC);

    let iter = 0;

    // since the last reference orbit may have escaped, use the one before
    //   the last as the last?
    // maybe if we have a periodic ref orbit we can use the full orbit
    //   (until length-1) and if we have an escaped ref orbit we must
    //   use the iteration before it escapes (length-2)
    //const maxReferenceIter = referenceOrbit.length - 2;
    const maxReferenceIter = referenceOrbit.length - 1;
    let referenceIter = 0;

    let deltaZ = {x: math.zero, y: math.zero};
    let z = null;
    let zAbs = null;
    let deltaZAbs = null;

    // saCoefficients: {itersToSkip:itersToSkip, coefficients:terms};
    // always use floatexp math for SA
    if (useSa && saCoefficients !== null && saCoefficients.itersToSkip > 0) {
      // since series approximation math is always done with floatexp, we
      //   may have to convert the delta
      let deltaCFloatExp = {
        x: math.name == "floatexp" ? structuredClone(deltaC.x) : floatExpMath.createFromExpString(math.toExpString(deltaC.x)),
        y: math.name == "floatexp" ? structuredClone(deltaC.y) : floatExpMath.createFromExpString(math.toExpString(deltaC.y))
      };
      let deltaZFloatExp = {x: floatExpMath.zero, y: floatExpMath.zero};
      let deltaCpower = structuredClone(deltaCFloatExp);
      for (let i = 0; i < saCoefficients.coefficients.length; i++) {
        deltaZFloatExp = floatExpMath.complexAdd(deltaZFloatExp, floatExpMath.complexMul(saCoefficients.coefficients[i], deltaCpower));
        deltaCpower = floatExpMath.complexMul(deltaCpower, deltaCFloatExp);
      }
      iter += saCoefficients.itersToSkip;
      referenceIter += saCoefficients.itersToSkip;
      // convert to algorithm number type, if it's not floatexp
      if (math.name == "floatexp") {
        deltaZ = deltaZFloatExp;
      } else {
        deltaZ = {
          x: math.createFromExpString(floatExpMath.toExpString(deltaZFloatExp.x)),
          y: math.createFromExpString(floatExpMath.toExpString(deltaZFloatExp.y))
        };
      }
      deltaZAbs = math.complexAbsSquared(deltaZ);
    }
    let blaItersSkipped = 0;
    let blaSkips = 0;
    //let blaRadiusTests = 0;
    try {
      let lastZ2 = math.zero; // last squared z
      let lastAdded = math.zero; // last addend for the average summation
      let avg = math.zero;
      let avgCount = 0;
      let foundBLA;
      let blasAtRefIter;
      let blaItersToSkip;
      let blaTestResult;
      let foundValidBLA;
      while (iter < maxIter) {

        foundValidBLA = false;

        // - if we drop the first 2 levels of BLA, all BLAs will be for a ref iter of one more than a multiple of 4
        //   - to easily test, do binary & with all zeroes ending with 101
        // - if we drop only the first level of BLA, all BLAs will be for a ref iter of one more than a multiple of 2
        //   - to easily test, do binary & with all zeroes ending with 11
        if (useBla && (referenceIter & 3) === 1) {

          // see if any BLAs, for this ref orbit iteration, can be used
          //   (we're looking to see if the ref orbit iter and BLA
          //   coefficients create a negligible squared iteration term)
          blasAtRefIter = blaTables.byNthIter[(referenceIter - 1) / blaTables.iterToNthDivisor];

          // right near the end of the ref orbit, depending on how many of the lowest
          //   BLA levels are deleted, we could have ref iterations without any
          //   associated BLAs... is there a better way to avoid doing this
          //   check for an undefined set of BLAs for a ref iter?
          if (blasAtRefIter === undefined) {
            //console.log("strange!  undefined BLAs for ref iter ", referenceIter);
          } else {

            blaTestResult = searchForBestBLA(blasAtRefIter, deltaZAbs, math);

            //blaRadiusTests += blaTestResult.validityTestsPerformed;
            foundBLA = blaTestResult.bestValidBLA;
            foundValidBLA = foundBLA !== false;

            if (foundValidBLA) {
              blaItersToSkip = foundBLA.itersToSkip;
              deltaZ = math.complexAdd(
                math.complexMul(foundBLA.a, deltaZ),
                math.complexMul(foundBLA.b, deltaC)
              );

              iter += blaItersToSkip;
              referenceIter += blaItersToSkip;
              blaItersSkipped += blaItersToSkip;
              blaSkips++;
            }
          }
        }

        // do a 1-iteration regular perturbation step if BLA isn't
        //   being used or if a valid BLA at this ref orbit iter
        //   wasn't found
        if (!foundValidBLA) {
          deltaZ = math.complexAdd(
            math.complexAdd(
              math.complexMul(math.complexRealMul(referenceOrbit[referenceIter], math.two), deltaZ),
              math.complexMul(deltaZ, deltaZ)
            ),
            deltaC);

          iter++;
          referenceIter++;
        }

        // since we use the ref orbit iteration here, after incrementing
        //   above, we must ensure it wraps around to the beginning again
        //   before we use the ref orbit here (for non-periodic ref orbit
        //   this happens when the ref orbit escapes)
        if (referenceIter > maxReferenceIter) {
          referenceIter = 0;
          z = math.complexAdd(referenceOrbit[referenceIter], deltaZ);
          deltaZ = z; // do this here?
        } else {
          z = math.complexAdd(referenceOrbit[referenceIter], deltaZ);
        }

        if (useStripes) {
          avgCount++;
          lastAdded =
            math.add(
              math.mul(
                oneHalf
                ,
                math.sin(
                  math.mul(stripeDensity, math.atan(z.y, z.x))
                )
              )
              ,
              oneHalf
            );
          avg = math.add(avg, lastAdded);
        }
        zAbs = math.complexAbsSquared(z);
        lastZ2 = zAbs;
        if (math.gt(zAbs, bailoutSquared)) {
          //if (foundValidBLA) {
          //  console.log("skipped ahead with a BLA and ended up beyond the bailout... should we backtrack?");
          //}
          iter--;
          break;
        }
        deltaZAbs = math.complexAbsSquared(deltaZ);

        if (math.lt(zAbs, deltaZAbs)) {
          //console.log("re-basing to beginning of ref orbit");
          deltaZ = z;
          referenceIter = 0;
        }
      }

      //if (useBla && Math.random() >= 0.9985) {
      //  console.log("for this pixel, did", blaSkips, "BLA skips averaging", (Math.round(blaRadiusTests * 100.0 / blaSkips) / 100.0), "radius tests per skip");
      //}

      // apparently, with BLA, we can skip along with the ref orbit beyond
      //   the image's upper limit of n iterations, so we now have to check
      //   for >= here
      if (iter >= maxIter) {
        return {colorpct: windowCalcBackgroundColor, blaItersSkipped: blaItersSkipped, blaSkips: blaSkips};
      } else {
        if (useStripes) {
          if (!useSmooth) {
            avg = math.div(avg, math.createFromNumber(avgCount));
            avg = parseFloat(math.toExpString(avg));
            return {colorpct: avg, blaItersSkipped: blaItersSkipped, blaSkips: blaSkips};
          }
          let prevAvg = math.div(math.sub(avg, lastAdded), math.createFromNumber(avgCount - 1));
          avg = math.div(avg, math.createFromNumber(avgCount));
          // logs become regular floats
          let frac = 1.0 + Math.log2(logBailoutSquared / math.log(lastZ2));
          frac = math.createFromNumber(frac);
          let mix = math.sub(math.one, frac);
          mix = math.mul(mix, prevAvg);
          mix = math.add(mix, math.mul(frac, avg));
          mix *= mixFactor;
          return {colorpct: mix, blaItersSkipped: blaItersSkipped, blaSkips: blaSkips};
        }

        // smooth coloring (adding fractional component to integer iteration count)
        //   based on pseudocode on wikipedia:
        //   https://en.wikipedia.org/wiki/Plotting_algorithms_for_the_Mandelbrot_set#Continuous_(smooth)_coloring
        if (useSmooth) {
          // math.log() always return the natural log as a floating point value,
          //   so we can use regular floating point math to find the fractional
          //   part to add to the iteration count
          let fracIter = math.log(math.complexAbsSquared(z)) / 2;
          fracIter = Math.log(fracIter / Math.LN2) / Math.LN2;
          iter += 1 - fracIter;
        }
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return {colorpct: iter, blaItersSkipped: blaItersSkipped, blaSkips: blaSkips};
      }

    } catch (e) {
      console.log("ERROR CAUGHT when calculating [" + algorithm + "] pixel color",
        {dx:math.toExpString(dx), dy:math.toExpString(dy), iter:iter, maxIter:maxIter, refIter:referenceIter, maxRefIter:maxReferenceIter});
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return {colorpct: windowCalcIgnorePointColor, blaItersSkipped: blaItersSkipped, blaSkips: blaSkips}; // special color value that will not be displayed
    }
  },
  // these settings are auto-applied when this plot is activated
  "forcedDefaults": {
    "n": 100,
    "mag": infNum(1n, 0n),
    "centerX": createInfNum("-0.65"),
    "centerY": infNum(0n, 0n)
  },
  "magnificationFactor": infNum(3n, 0n),
  "privContext": {
    "usesImaginaryCoordinates": true,
    "adjustPrecision": function(scale, usingWorkers, algorithm) {
      const precisScale = infNumTruncateToLen(scale, 8); // we probably only need 1 or 2 significant digits for this...
      // this window plot can define its own "algorithm", which it can use
      //   later, when the pixels are being calculated?
      // "basic-float" (basic escape time algorithm with regular JavaScript numbers (64-bit floats))
      // "perturb-float" (perturbation theory with arbitrary precision reference orbit and float delta orbit)
      // "perturb-floatexp" (with port of floatexp)
      // "basic-arbprecis" (super-slow basic escape time algorithm with arbitrary precision)
      //
      // future methods that may be implemented:
      // "perturb-double" (with something like double.js)
      // "sa-float" (series approximation)
      // "sa-double"
      // "sa-floatexp"
      const ret = {
        roughScale: infNumExpString(precisScale),
        precision: 12,
        algorithm: "basic-float"
      };
      if (algorithm == "auto-stripes") {
        // for stripes coloring, we don't yet have a floatexp implementation
        //   of sin() and atan() functions, so we cannot use floatexp
        // also, we don't have series approximation working for stripes
        if (infNumGe(precisScale, createInfNum("3e13"))) {
          ret.algorithm = "perturb-stripes-stripedensity6-float";
        } else {
          ret.algorithm = "basic-stripes-stripedensity6-float";
        }
      } else {
        if (infNumGe(precisScale, createInfNum("1e800"))) {
          ret.algorithm = "perturb-sapx32-floatexp";
        } else if (infNumGe(precisScale, createInfNum("1e500"))) {
          ret.algorithm = "perturb-sapx16-floatexp";
        } else if (infNumGe(precisScale, createInfNum("1e304"))) {
          // looks like floatexp (with perturbation) can handle very
          //   large scales, where only full arbitrary precision could
          //   before, yet is much faster
          //ret.algorithm = "basic-arbprecis";
          //ret.algorithm = "perturb-floatexp";
          //ret.algorithm = "bla-floatexp";
          //ret.algorithm = "bla-sapx16-floatexp";
          ret.algorithm = "perturb-sapx8-floatexp";
        } else if (infNumGe(precisScale, createInfNum("1e200"))) {
          ret.algorithm = "perturb-sapx6-float";
        } else if (infNumGe(precisScale, createInfNum("1e100"))) {
          // it seems like BLA, at least my code, isn't working until
          //   scale is beyond ~1e300, but hopefully series approximation
          //    would be useful at 3e150 and perhaps smaller scales also
          ret.algorithm = "perturb-sapx4-float";
        } else if (infNumGe(precisScale, createInfNum("3e13"))) {
          ret.algorithm = "perturb-float";
          //ret.algorithm = "bla-float";
        }
      }
      // these values need more testing to ensure they create pixel-identical images
      //   to higher-precision images
      if (infNumLt(precisScale, createInfNum("1e3"))) {
        ret.precision = 12;
      } else if (infNumLt(precisScale, createInfNum("2e6"))) {
        ret.precision = 12;
      } else if (infNumLt(precisScale, createInfNum("3e13"))) {
        ret.precision = 20;
      // for scales at/larger than 1e24, use the magnitude as
      //   basis for the precision -- more research is needed on this
      } else if (infNumLt(precisScale, createInfNum("1e40"))) {
        ret.precision = Math.floor(infNumMagnitude(precisScale) * 1.7);
      } else if (infNumLt(precisScale, createInfNum("1e60"))) {
        ret.precision = Math.floor(infNumMagnitude(precisScale) * 1.5);
      } else if (infNumLt(precisScale, createInfNum("1e100"))) {
        ret.precision = Math.floor(infNumMagnitude(precisScale) * 1.4);
      } else if (infNumLt(precisScale, createInfNum("1e150"))) {
        ret.precision = Math.floor(infNumMagnitude(precisScale) * 1.25);
      } else if (infNumLt(precisScale, createInfNum("1e200"))) {
        ret.precision = Math.floor(infNumMagnitude(precisScale) * 1.1);
      } else {
        ret.precision = Math.floor(infNumMagnitude(precisScale) * 1.01);
      }
      // for non-worker mode, use only perturb or basic (no SA, no BLA)
      if (!usingWorkers) {
        if (algorithm == "auto-stripes") {
          // for stripes coloring, we don't yet have a floatexp implementation
          //   of sin() and atan() functions, so we cannot use floatexp
          if (infNumGe(precisScale, createInfNum("3e13"))) {
            ret.algorithm = "perturb-stripes-stripedensity6-float";
          } else {
            ret.algorithm = "basic-stripes-stripedensity6-float";
          }
        } else {
          if (infNumGe(precisScale, createInfNum("1e304"))) {
            ret.algorithm = "perturb-floatexp";
          } else if (infNumGe(precisScale, createInfNum("3e13"))) {
            ret.algorithm = "perturb-float";
          } else {
            ret.algorithm = "basic-float";
          }
        }
      }
      console.log("default mandelbrot settings for scale:", ret);
      return ret;
    },
    "listAlgorithms": function() {
      return [
        {algorithm: "auto",                              name: "automatic"},
        {algorithm: "auto-stripes",                      name: "automatic with stripes coloring"},
        {algorithm: "basic-float",                       name: "basic escape time, floating point"},
        {algorithm: "basic-floatexp",                    name: "basic escape time, floatexp"},
        {algorithm: "perturb-float",                     name: "perturbation theory, floating point"},
        {algorithm: "perturb-floatexp",                  name: "perturbation theory, floatexp"},
        {algorithm: "perturb-sapx4-float",               name: "perturb. w/series approx., floating point"},
        {algorithm: "perturb-sapx8-floatexp",            name: "perturb. w/series approx., floatexp"},
        {algorithm: "basic-stripes-stripedensity6-float",name: "esc. time w/stripes coloring, floating pt."},
        {algorithm: "basic-stripes-stripedensity2-float",name: "esc. time w/wide stripes coloring, floating pt."},
        {algorithm: "basic-stripes-stripedensity8-float",name: "esc. time w/narrow stripes coloring, floating pt."},
        {algorithm: "perturb-stripes-stripedensity6-float",name: "perturb. w/stripes coloring, floating pt."},
        {algorithm: "perturb-sapx6.4-floatexp-sigdig64", name: "custom"}
      ];
    },
    "minScale": createInfNum("20")
  }
//},{
//  "name": "3n-plus-one",
//  "pageTitle": "3n+1",
//  "calcFrom": "window",
//  "desc": "Iterate each pixel with the simple algorithm:<br/>" +
//    "If integer x<sub>n</sub> is odd: x<sub>n+1</sub> = 3x<sub>n</sub> + 1<br/> " +
//    "If integer x<sub>n</sub> is even: x<sub>n+1</sub> = x<sub>n</sub> / 2<br/>" +
//    "Repeat these steps until the number x<sub>n</sub> reaches 1, or, we reach the maximum number of iterations.<br/>" +
//    "<br/>" +
//    "Every (x,y) position on the plot represents an initial number x<sub>0</sub> = x<sup>y</sup>.  " +
//    "After raising x to the y power, we round the resulting value to an ineger, which allows the iteration " +
//    "to occur when the (x,y) positions are non-integers (which is nearly always the case).<br/>" +
//    "<br/>" +
//    "If that initial x<sub>0</sub> is negative or zero, we color the pixel the background color.  Otherwise, " +
//    "we color the pixel according to the number of iterations until it reaches 1.  If it does not reach " +
//    "1 before the maximum number of iterations, we color the pixel the background color.",
//  "gradientType": "pct",
//  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
//  "computeBoundPointColor": function(n, precis, algorithm, x, y) {
//    const maxIter = n;
//
//    let val = Math.round(x ** y);
//    if (val <= 0) {
//      return windowCalcBackgroundColor;
//    }
//    let iter = 0;
//    while (iter < maxIter) {
//      iter++;
//      if (val % 2 == 0) {
//        val = val / 2;
//      } else {
//        val = val * 3 + 1;
//      }
//      if (val == 1) {
//        break;
//      }
//    }
//
//    if (iter == maxIter) {
//      return windowCalcBackgroundColor;
//    } else {
//      return iter / maxIter;
//    }
//
//  },
//  "forcedDefaults": {
//    "n": 2000,
//    "mag": infNum(12n, -3n),
//    "centerX": infNum(50n, 0n),
//    "centerY": infNum(50n, 0n)
//  },
//  "magnificationFactor": infNum(3n, 0n),
//  "privContext": {
//    "usesImaginaryCoordinates": false,
//    "minScale": createInfNum("0.000000001")
//  }
},{
  "name": "Primes-1-Step-90-turn",
  "pageTitle": "Primes",
  "calcFrom": "sequence",
  "desc": "Drawn with a simple <a target=\"blank\" href=\"https://en.wikipedia.org/wiki/Turtle_graphics\">" +
    "turtle graphics</a> pattern: move 1 step forward per integer, but for primes, turn 90 degrees clockwise before moving.",
  "gradientType": "pct",
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
    "mag": infNum(1n, 0n),
    "centerX": createInfNum("-240"),
    "centerY": createInfNum("288")
  },
  "magnificationFactor": infNum(850n, 0n),
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
  "desc": "Drawn with a simple <a target=\"blank\" href=\"https://en.wikipedia.org/wiki/Turtle_graphics\">" +
    "turtle graphics</a> pattern: move 1 step forward per integer, but for primes, turn 45 degrees " +
    "clockwise before moving. When moving diagonally, we move 1 step on both the x and y axes, so we're " +
    "actually moving ~1.414 steps diagonally.",
  "gradientType": "pct",
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
    "mag": infNum(1n, 0n),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(415n, 0n)
  },
  "magnificationFactor": infNum(1600n, 0n),
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
  "desc": "Drawn with a simple <a target=\"blank\" href=\"https://en.wikipedia.org/wiki/Turtle_graphics\">" +
    "turtle graphics</a> pattern: move 1 step forward per integer, but for perfect squares, turn 90 " +
    "degrees clockwise before moving.",
  "gradientType": "pct",
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
    "mag": infNum(1n, 0n),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
  },
  "magnificationFactor": infNum(175n, 0n),
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
  "desc": "Drawn with a simple <a target=\"blank\" href=\"https://en.wikipedia.org/wiki/Turtle_graphics\">" +
    "turtle graphics</a> pattern: move 1 step forward per integer, but for perfect squares, turn 45 " +
    "degrees clockwise before moving.  When moving diagonally, we move 1 step on both the x and y axes, " +
    "so we're actually moving ~1.414 steps diagonally.",
  "gradientType": "pct",
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
    "mag": infNum(1n, 0n),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
  },
  "magnificationFactor": infNum(500n, 0n),
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
  "gradientType": "pct",
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
    "mag": infNum(1n, 0n),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
  },
  "magnificationFactor": infNum(12000n, 0n),
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
  "gradientType": "pct",
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
    "mag": infNum(1n, 0n),
    "centerX": infNum(0n, 0n),
    "centerY": infNum(0n, 0n)
  },
  "magnificationFactor": infNum(60n, 0n),
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
      if (!privContext.boardPoints.hasOwnProperty(id)) {
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

