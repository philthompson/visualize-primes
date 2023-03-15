
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
    "<br/>- To see more detail when zoomed in, increase the <code>n</code> (iterations) parameter with the M key.  Calculations will be slower.",
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
    // for curvature average, we must skip the first 2 iterations
    //   to avoid divide-by-zero -- for stripe average we don't need
    //   to skip any
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
// for testing curvature average coloring
//    let ixOneAgo = 0; // nth iteration of x, from 1 iteration ago
//    let iyOneAgo = 0; // nth iteration of y, from 1 iteration ago
//    let ixTwoAgo = 0; // nth iteration of x, from 2 iterations ago
//    let iyTwoAgo = 0; // nth iteration of y, from 2 iterations ago
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

        // curvature average (https://en.wikibooks.org/wiki/Fractals%2FIterations_in_the_complex_plane%2Ftriangle_ineq#CAA)
        // stripeSkipFirstIters = 2
        //let numx = ix - ixOneAgo;
        //let numy = iy - iyOneAgo;
        //let denx = ixOneAgo - ixTwoAgo;
        //let deny = iyOneAgo - iyTwoAgo;
        //if (denx != 0 && deny != 0) {
        //  let quotx = (numx*denx + numy*deny) / (denx*denx + deny*deny);
        //  let quoty = (numy*denx - numx*deny) / (denx*denx + deny*deny);
        //  if (quotx != 0) {
        //    lastAdded = Math.abs(1.0 * Math.atan(quoty / quotx));
        //  } else {
        //    lastAdded = 0;
        //  }
        //} else {
        //  lastAdded = 0;
        //}

        // comment this out for TIA
        avg += lastAdded;
      }
// for testing curvature average coloring
//      ixTwoAgo = ixOneAgo;
//      iyTwoAgo = iyOneAgo;
//      ixOneAgo = ix;
//      iyOneAgo = iy;
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
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeReferenceOrbit": function(n, precis, algorithm, x, y, period, useSmooth, fnContext) {

    const outputMath = selectMathInterfaceFromAlgorithm(algorithm);
    const outputIsFloatExp = outputMath.name == "floatexp";

    const useStripes = algorithm.includes("stripes");

    const periodLessThanN = period !== null && period > 0 && period < n;
    const maxIter = periodLessThanN ? period : n;
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
      // fill out reference orbit will repeat data
      if (periodLessThanN && fnContext.iter >= maxIter) {
        for (let i = 0; i < n - period; i++) {
          // use mod to keep looping back over the ref orbit iterations
          fnContext.orbit.push(structuredClone(fnContext.orbit[i % period]));
        }
      }

      fnContext.done = true;
      return fnContext;
    } catch (e) {
      console.log("ERROR CAUGHT when computing reference orbit at point (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      fnContext.done = true;
      return fnContext;
    }
  },
  "computeReferencePeriod": function(n, precis, algorithm, x, y, boxDelta, fnContext) {
    // - find the 4 points in a square surrounding the given x,y location
    // - iterate the 4 points until one escapes, or, exactly 1 edge of
    //     that square crosses the positive x (real) axis
    // - the number of iterations until this occurs is the period
    // - after that number of iterations, i believe, any point inside
    //     the square will be at its "smallest" (lowest distance from the origin)
    //
    // This method is explained here: http://www.mrob.com/pub/muency/period.html
    //

    const outputMath = selectMathInterfaceFromAlgorithm(algorithm);
    const outputIsFloatExp = outputMath.name == "floatexp";

    const maxIter = n;
    const two = infNum(2n, 0n);
    const four = infNum(4n, 0n);
    const sixteen = infNum(16n, 0n);
    // try using slightly larger bailout (4) for ref orbit
    //   than for perturb orbit (which uses smallest possible
    //   bailout of 2)
    const bailoutSquared = four;

    // fnContext allows the loop to be done piecemeal
    if (fnContext === null) {
      fnContext = {

        // the coords used for iteration, clockwise from top right
        //   corner of the square
        x: [infNumAdd(x, boxDelta), infNumAdd(x, boxDelta), infNumSub(x, boxDelta), infNumSub(x, boxDelta)],
        y: [infNumAdd(y, boxDelta), infNumSub(y, boxDelta), infNumSub(y, boxDelta), infNumAdd(y, boxDelta)],
        ix: [infNum(0n, 0n), infNum(0n, 0n), infNum(0n, 0n), infNum(0n, 0n)],
        iy: [infNum(0n, 0n), infNum(0n, 0n), infNum(0n, 0n), infNum(0n, 0n)],
        iter: 0,
        period: -1,
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
        for (let i = 0; i < 4; i++) {
          ixSq = infNumMul(fnContext.ix[i], fnContext.ix[i]);
          iySq = infNumMul(fnContext.iy[i], fnContext.iy[i]);
          if (infNumGt(infNumAdd(ixSq, iySq), bailoutSquared)) {
            // if any point escapes, we can't find the period
            fnContext.done = true;
            fnContext.period = -1;
            return fnContext;
          }
          ixTemp = infNumAdd(fnContext.x[i], infNumSub(ixSq, iySq));
          fnContext.iy[i] = infNumAdd(fnContext.y[i], infNumMul(two, infNumMul(fnContext.ix[i], fnContext.iy[i])));
          fnContext.ix[i] = copyInfNum(ixTemp);
          fnContext.ix[i] = infNumTruncateToLen(fnContext.ix[i], precis);
          fnContext.iy[i] = infNumTruncateToLen(fnContext.iy[i], precis);
        }
        fnContext.iter++;
        // check that exactly 1 or 3 edges of the box crosses the positive x (real) axis
        // (i believe that if the box becomes "twisted" then we could have 3 edges
        // cross that half of the axis, BUT i don't think the box would "twist" before
        // the points surround the origin)
        let edgesMeetingCriterion = 0;
        for (let a = 0; a < 4; a++) {
          let b = a == 3 ? 0 : a + 1;
          // infNumGt() is slow, but we don't need to use it because
          //   we can just check the sign on the "v"alue of the InfNum
          if (fnContext.ix[a].v > 0n && fnContext.ix[b].v > 0n &&
              (
                fnContext.iy[a].v > 0n && fnContext.iy[b].v < 0n ||
                fnContext.iy[a].v < 0n && fnContext.iy[b].v > 0n
              )) {
            edgesMeetingCriterion++;
          }
        }
        if (edgesMeetingCriterion == 1 || edgesMeetingCriterion == 3) {
          fnContext.done = true;
          fnContext.period = fnContext.iter;
          return fnContext;
        }
        statusIterCounter++;
        if (statusIterCounter >= 1000) {
          statusIterCounter = 0;
          fnContext.status = "computed " + (Math.round(fnContext.iter * 10000.0 / maxIter)/100.0) + "% of period orbit";
          console.log(fnContext.status);
          return fnContext;
        }
      }

    } catch (e) {
      console.log("ERROR CAUGHT when computing reference period at point (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
    }
    fnContext.done = true;
    fnContext.period = -1;
    return fnContext;
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
          console.log("SA test point [" + p + "] is not valid at iteraition [" + i + "]");
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
  "computeBlaTables": function(algorithm, referenceOrbit, fnContext) {
    // we'll call this BLA attempt "four"
    // this is to check stopping criteria: |AlΔzm+BlΔc|<ϵ|2Zn|
    //  from Zhuoran's post: https://fractalforums.org/index.php?topic=4360.msg31806#msg31806
    // this attempt will take square roots for the |values| on both
    //   sides of the inequality, but unlike attempt "three" we will
    //   increment both n and l when calculating coefficients

    const math = selectMathInterfaceFromAlgorithm(algorithm);

    if (fnContext === null) {
      fnContext = {
        // try 1 for algo four with floatexp: too many skips, all one solid color
        //epsilon: math.createFromNumber(2**-53),
        // try 2 for algo four with floatexp: large circular artifacts and other distortions
        //epsilon: math.createFromInfNum(infNum(1n, -323n)),
        // try 3 for algo four with floatexp: fewer skips, too few? large circular artifact?
        //epsilon: math.createFromInfNum(infNum(1n, -324n)),
        // try 4 for algo four with floatexp: smaller large circular artifact?
        //epsilon: math.createFromInfNum(infNum(1n, -322n)),
        // try 5 for algo four with floatexp: only 1,800 iters skipped per pixel, almost no artifact?
        //epsilon: math.createFromInfNum(infNum(1n, -321n)),
        // try 6 for algo four with floatexp: 18,000 iters skipped per pixel, all one solid color
        //epsilon: math.createFromInfNum(infNum(1n, -320n)),
        // try 7 for algo four with floatexp: 13,000 iters skipped per pixel, all one solid color
        //epsilon: math.createFromInfNum(infNum(1n, -324n)),
        // try 8 for algo four with floatexp: behaves like try 5, ONLY when l goes up to 256
        //epsilon: math.createFromInfNum(infNum(1n, -321n)),
        // try 9 for algo four with floatexp: appears to create a large donut artifact around center of image
        //epsilon: math.createFromInfNum(infNum(1n, -323n)),
        // try 10 for algo four with floatexp: smaller artifacts but image is "zoomed out", and image is rotated 30 deg (problem elsewhere)
        epsilon: math.createFromInfNum(infNum(1n, -340n)),

        blaTables: {
          coefTable: new Map(),
          epsilonRefAbsTable: new Map()
        },

        //a: {x:math.one, y:math.zero},
        //b: {x:math.zero, y:math.zero},

        blaCoeffIterM: 0,
        epsRefOrbitIter: 0,

        status: "",
        done: false
      };
      console.log("using epsilon: " + math.toExpString(fnContext.epsilon));
    }

    // BLA equation and criteria: https://fractalforums.org/index.php?topic=4360.msg31806#msg31806
    // not much point in skipping only 1 iteration, so we'll
    //   stop at n = m + l =
    let maxIter = referenceOrbit.length - 3;
    let m = fnContext.blaCoeffIterM;
    let statusIterCounter = 0;
    // compute coefficients for each possible starting mth iteration
    for (; m < maxIter; m++) {

      fnContext.blaTables.coefTable.set(m, new Map());

      // compute coefficients for each possible number of iterations to skip l, from 1 to n
      //let a = {x:math.one, y:math.zero};
      //let b = {x:math.zero, y:math.zero};
      //let refDoubled = null;
      //let l = 1;
      //for (; l < maxIter - m - 2 /*&& l < 257*/; l++) {
      //  refDoubled = math.complexRealMul(referenceOrbit[m+l], math.two);
      //  a = math.complexMul(refDoubled, a);
      //  b = math.complexAdd(math.complexMul(refDoubled, b), {x:math.one, y:math.zero});
      //  if (l == 2 || l == 4 || l == 8 || l == 16 || l == 32 || l == 64 ||
      //      l == 128 || l == 256 || l == 512 || l == 1024 || l % 2048 == 0) {
      //    fnContext.blaTables.coefTable.get(m).set(l, {
      //      a: structuredClone(a),
      //      b: structuredClone(b)
      //    });
      //  }
      //}

      let a = {x:math.one, y:math.zero};
      let b = {x:math.zero, y:math.zero};
      let refDoubled = null;
      let l = 1;
      // try only skipping up to 512 iters from each m
      for (; l < maxIter - m - 2 && l < 513; l++) {
        refDoubled = math.complexRealMul(referenceOrbit[m+l], math.two);
        if (l == 1) {
          a = refDoubled;
          b = {x:math.one, y:math.zero};
        } else {
          a = math.complexMul(refDoubled, a);
          b = math.complexAdd(math.complexMul(refDoubled, b), {x:math.one, y:math.zero});
        }
        if (l == 2 || l == 4 || l == 8 || l == 16 || l == 32 || l == 64 ||
            l == 128 || l == 256 || l == 512 || l == 1024 || l % 2048 == 0) {
          fnContext.blaTables.coefTable.get(m).set(l, {
            a: structuredClone(a),
            b: structuredClone(b)
          });
        }
      }

      statusIterCounter++;
      if (statusIterCounter >= 1000) {
        // resume this loop later, which means WE NEED TO INCREMENT
        //   m here
        fnContext.blaCoeffIterM = m+1;
        let doneIters = (maxIter*m)-(((m-1)/2)*(m-1))+((m-1)/2);
        let totalIters = ((maxIter/2)*maxIter)+(maxIter/2);
        fnContext.status = "computed " + (Math.round(doneIters * 10000.0 / totalIters)/100.0) + "% of BLA coefficients (m [" + m + "] of [" + maxIter + "])";
        console.log(fnContext.status);
        return fnContext;
      }
    }
    fnContext.blaCoeffIterM = m;
    //fnContext.a = a;
    //fnContext.b = b;

    statusIterCounter = 0;
    maxIter = referenceOrbit.length;
    let i = fnContext.epsRefOrbitIter;
    for (; i < maxIter; i++) {
      fnContext.blaTables.epsilonRefAbsTable.set(i,
        math.mul(math.complexAbs(math.complexRealMul(referenceOrbit[i], math.two)), fnContext.epsilon));
      statusIterCounter++;
      if (statusIterCounter >= 10000) {
        // resume this loop later, which means WE NEED TO INCREMENT
        //   i here
        fnContext.epsRefOrbitIter = i+1;
        fnContext.status = "computed " + (Math.round(i * 10000.0 / maxIter)/100.0) + "% of BLA epsilon criteria";
        console.log(fnContext.status);
        return fnContext;
      }
    }
    fnContext.epsRefOrbitIter = i;
    fnContext.done = true;

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
    //   the last as the last? (i don't think it really matters)
    const maxReferenceIter = referenceOrbit.length - 2;
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
    }
    let blaItersSkipped = 0;
    let blaSkips = 0;
    try {
      let lastZ2 = math.zero; // last squared z
      let lastAdded = math.zero; // last addend for the average summation
      let avg = math.zero;
      let avgCount = 0;
      while (iter < maxIter) {

        deltaZ = math.complexAdd(
          math.complexAdd(
            math.complexMul(math.complexRealMul(referenceOrbit[referenceIter], math.two), deltaZ),
            math.complexMul(deltaZ, deltaZ)
          ),
          deltaC);

        iter++;
        referenceIter++;

        z = math.complexAdd(referenceOrbit[referenceIter], deltaZ);
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
          iter--;
          break;
        }
        deltaZAbs = math.complexAbsSquared(deltaZ);
        if (math.lt(zAbs, deltaZAbs) || referenceIter == maxReferenceIter) {
          //console.log("re-basing to beginning of ref orbit");
          deltaZ = z;
          referenceIter = 0;
        } else if (useBla) {
          let goodL = null;
          if (referenceIter / maxReferenceIter < 0.95) {

            let blaL = null;
            let epsilonRefAbs = null;
            let coefTable =  blaTables.coefTable.get(referenceIter);
            for (const entry of coefTable) {
              epsilonRefAbs = blaTables.epsilonRefAbsTable.get(referenceIter+entry[0]);
              if (math.lt(
                  math.complexAbs(math.complexAdd(
                    math.complexMul(entry[1].a, deltaZ),
                    math.complexMul(entry[1].b, deltaC))),
                  epsilonRefAbs)) {
                goodL = entry[0];
              } else {
                break;
              }
            }
          }

          // if no iters were skippable, use regular perturbation for the next iteration
          // otherwise
          // if some iters are skippable, apply BLA function here to skip iterations
          // BLA equation and criteria: https://fractalforums.org/index.php?topic=4360.msg31806#msg31806
          // BLA+perturb algorithm: https://fractalforums.org/index.php?topic=4360.msg31574#msg31574
          if (goodL !== null) {
            //console.log("skipping " + goodL + " iters at pixel", {x:x, y:y});
            //skippedIters += goodL;
            deltaZ = math.complexAdd(
              math.complexMul(blaTables.coefTable.get(referenceIter).get(goodL).a, deltaZ),
              math.complexMul(blaTables.coefTable.get(referenceIter).get(goodL).b, deltaC)
            );
            iter += goodL;
            referenceIter += goodL;
            blaItersSkipped += goodL;
            blaSkips++;

            if (referenceIter >= maxReferenceIter) {
              console.log("somehow we have to re-base to beginning of ref orbit");
              deltaZ = math.complexAdd(referenceOrbit[referenceIter], deltaZ);
              referenceIter = 0;
            }
          }
        }
      }

      if (iter == maxIter) {
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
        {x:infNumToString(x), y:infNumToString(y), iter:iter, maxIter:maxIter, refIter:referenceIter, maxRefIter:maxReferenceIter});
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

