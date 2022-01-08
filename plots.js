
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
    return parseFloat(infNumExpString(a));
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

    const math = algorithm.includes("arbprecis") ?
      infNumMath
      :
      (algorithm.includes("floatexp") ?
        floatExpMath
        :
        floatMath
      );

    const maxIter = n;

    // for absolute fastest speed, we'll keep a separate version of the
    //   regular floating point basic algorithm
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

    // the coords used for iteration
    const xConv = math.createFromInfNum(x);
    const yConv = math.createFromInfNum(y);
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
        if (math.gt(math.add(ixSq, iySq), math.four)) {
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
        return -1.0; // background color
      } else {
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return iter / maxIter;
      }
    } catch (e) {
      console.log("ERROR CAUGHT when processing point (x, y, iter, maxIter): [" + math.toExpString(x) + ", " + math.toExpString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return windowCalcIgnorePointColor; // special color value that will not be displayed
    }
  },
  // x and y must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeReferenceOrbit": function(n, precis, algorithm, x, y) {

    const outputMath = algorithm.includes("arbprecis") ?
      infNumMath
      :
      (algorithm.includes("floatexp") ?
        floatExpMath
        :
        floatMath
      );
    const outputIsFloatExp = outputMath.name == "floatexp";

    let orbit = [];

    const maxIter = n;
    const two = infNum(2n, 0n);
    const four = infNum(4n, 0n);
    const sixteen = infNum(16n, 0n);
    // try using slightly larger bailout (4) for ref orbit
    //   than for perturb orbit (which uses smallest possible
    //   bailout of 2)
    const bailoutSquared = sixteen;

    // the coords used for iteration
    var ix = infNum(0n, 0n);
    var iy = infNum(0n, 0n);
    var ixSq = infNum(0n, 0n);
    var iySq = infNum(0n, 0n);
    var ixTemp = infNum(0n, 0n);
    var iter = 0;
    var statusIterCounter = 0;
    try {
      while (iter < maxIter) {
        ixSq = infNumMul(ix, ix);
        iySq = infNumMul(iy, iy);
        if (infNumGt(infNumAdd(ixSq, iySq), bailoutSquared)) {
          break;
        }
        orbit.push({
          x: outputMath.createFromInfNum(ix),
          y: outputMath.createFromInfNum(iy),
          // if needed, include floatexp x and y as well, for SA coefficients calc
          xfxp: outputIsFloatExp ? null : floatExpMath.createFromInfNum(ix),
          yfxp: outputIsFloatExp ? null : floatExpMath.createFromInfNum(iy)
        });
        ixTemp = infNumAdd(x, infNumSub(ixSq, iySq));
        iy = infNumAdd(y, infNumMul(two, infNumMul(ix, iy)));
        ix = copyInfNum(ixTemp);
        ix = infNumTruncateToLen(ix, precis);
        iy = infNumTruncateToLen(iy, precis);
        iter++;
        statusIterCounter++;
        if (statusIterCounter >= 5000) {
          statusIterCounter = 0;
          console.log("computed " + (Math.round(iter * 10000.0 / maxIter)/100.0) + "% of reference orbit");
        }
      }

      return orbit;
    } catch (e) {
      console.log("ERROR CAUGHT when computing reference orbit at point (x, y, iter, maxIter): [" + infNumToString(x) + ", " + infNumToString(y) + ", " + iter + ", " + maxIter + "]:");
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return orbit;
    }
  },
  "computeSaCoefficients": function(precision, algorithm, referenceX, referenceY, referenceOrbit, windowEdges) {
    // always use FloatExp for SA coefficients
    const math = floatExpMath;

    const algoMath = algorithm.includes("arbprecis") ?
      infNumMath
      :
      (algorithm.includes("floatexp") ?
        floatExpMath
        :
        floatMath
      );
    const algoMathIsFloatExp = algoMath.name == "floatexp";

    let nTerms = 0;
    // parse out number of series approximation terms from the algorithm name
    const algoSplit = algorithm.split("-");
    for (let i = 0; i < algoSplit.length; i++) {
      if (algoSplit[i].startsWith("sapx")) {
        nTerms = parseInt(algoSplit[i].substring(4));
        break;
      }
    }
    if (nTerms > 128) {
      nTerms = 128;
    }

    if (nTerms <= 0) {
      console.log("series approximation has 0 or fewer terms in the algorithm name [" + algorithm + "], so NOT doing SA");
      return {itersToSkip:0, coefficients:[]};
    }

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
    const termShrinkCutoff = math.createFromNumber(1000*1000);

    // calculate test points
    const testPoints = [];
    // divisions per dimension
    // 1 -> test 4 corners only
    // 2 -> test 4 corners, 4 edge middles, and image center
    // 3 -> test 4 points along top edge, 4 points across at 1/3 down from top,
    //           4 points across at 2/3 down from top, and 4 points along bottom edge
    // 4 -> test 5 points along top edge ...
    const dimDiv = 3;
    let px = windowEdges.left;
    let py = windowEdges.top;
    let xStep = infNumDiv(infNumSub(windowEdges.right, windowEdges.left), infNum(BigInt(dimDiv), 0n), precision);
    let yStep = infNumDiv(infNumSub(windowEdges.top, windowEdges.bottom), infNum(BigInt(dimDiv), 0n), precision);
    // note <= in loop conditions here -- we want to span edge to edge
    //   inclusive of both edges
    for (let i = 0; i <= dimDiv; i++) {
      for (let j = 0; j <= dimDiv; j++) {
        testPoints.push({
          x: copyInfNum(px),
          y: copyInfNum(py)
        });
        py = infNumAdd(py, yStep);
      }
      px = infNumAdd(px, xStep);
    }

    // ... do these need to be calculated with arbitrary precision?

    let twoRefIter = null;

    // initialize terms to 0, at 0th iteration ...
    const terms = new Array(nTerms).fill({x:math.zero, y:math.zero});
    // ... except for 'A' term, which is initialized to 1
    terms[0] = {x:math.one, y:math.zero};

    const nextTerms = new Array(nTerms);
    // start this negative, so we can tell when all iterations are valid
    let itersToSkip = -1;

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
    for (let i = 0; i < referenceOrbit.length; i++) {

      // this only works if the reference orbit is floatexp... have to use pre-converted
      //   values if using "...-float" or "...-arbprecis" algo
      twoRefIter = algoMathIsFloatExp ?
        math.complexRealMul(referenceOrbit[i], math.two)
        :
        math.complexRealMul({x:referenceOrbit[i].xfxp, y:referenceOrbit[i].yfxp}, math.two)

      // compute next iteration of all terms
      for (let k = 0; k < nTerms; k++) {

        // special case for 0th term (A)
        if (k === 0) {
          nextTerms[k] = math.complexRealAdd(math.complexMul(twoRefIter, terms[k]), math.one);

        } else if (k % 2 === 0) {
          nextTerms[k] = math.complexMul(twoRefIter, terms[k]);
          // notice continue condition is "up<dn" here
          for (let up = 0, dn = k-1; up<dn; up++, dn--) {
            nextTerms[k] = math.complexAdd(nextTerms[k],
              math.complexRealMul(math.complexMul(terms[up], terms[dn]), math.two)
            );
          }

        // odd (B=1, D=3) terms end in squared term
        } else {
          nextTerms[k] = math.complexMul(twoRefIter, terms[k]);
          // notice continue condition is "up<=dn" here
          for (let up = 0, dn = k-1; up<=dn; up++, dn--) {
            if (up===dn) {
              nextTerms[k] = math.complexAdd(nextTerms[k],
                math.complexMul(terms[up], terms[dn]) // since up=dn here, we are squaring that coefficient
              );
            } else {
              nextTerms[k] = math.complexAdd(nextTerms[k],
                math.complexRealMul(math.complexMul(terms[up], terms[dn]), math.two)
              );
            }
          }
        }
      }

      let validTestPoints = 0;
      // check for iters to skip for all calculated test points
      for (let p = 0; p < testPoints.length; p++) {

        let deltaC = {
          x: math.createFromInfNum(infNumSub(testPoints[p].x, referenceX)),
          y: math.createFromInfNum(infNumSub(testPoints[p].y, referenceY))
        };

        let coefTermsAreValid = false;
        // check validity of iteration coefficients
        // splitting terms into two groups, so start from one
        for (let j = 1; j < nTerms; j++) {
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
          for (let k = j; k < nTerms; k++) {
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
          if (math.gt(ratio, termShrinkCutoff)) {
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
          // if the coefficients at this iteration were not valid for any single test point
          //   we don't need to keep trying the other points
          break;
        }
      }

      // if the coefficients at this iteration were not valid for any single test point
      //   we will return the previous iteration (since that was the last one where
      //   coefficients were valid for ALL test points)
      if (validTestPoints < testPoints.length) {
        // at i=0, if none are valid, we'll return 0 (we can skip 0 iterations)
        // at i=1, if none are valid, we'll return 1 (we can skip 1 iteration)
        // ...
        itersToSkip = i;
        // break before copying nextTerms into terms (since the previous
        //   terms are the last valid terms)
        break;
      }

      if (i % 10000 === 0) {
        console.log("all test points are valid for skipping [" + (i).toLocaleString() + "] iterations");
      }

      // if the coefficients are valid for all test points, we can skip i+1 iterations,
      //   so continue on and test the next iteration
      for (let j = 0; j < terms.length; j++) {
        // out of desperation, seeing if cloning this is needed
        //terms[j] = nextTerms[j];
        terms[j] = structuredClone(nextTerms[j]);
        //terms[j] = {
        //  x: structuredClone(nextTerms[j].x),
        //  y: structuredClone(nextTerms[j].y)
        //};
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

    if (itersToSkip < 0) {
      console.log("skipping ALL [" + referenceOrbit.length + "] iterations of the reference orbit with [" + terms.length + "]-term SA... hmm...");
      return {itersToSkip:referenceOrbit.length, coefficients:terms};
    } else {
      console.log("skipping [" + itersToSkip + "] iterations with [" + terms.length + "]-term SA");
      return {itersToSkip:itersToSkip, coefficients:terms};
    }

  },
  "computeBlaTables": function(algorithm, referenceOrbit) {

    const math = algorithm.includes("arbprecis") ?
      infNumMath
      :
      (algorithm.includes("floatexp") ?
        floatExpMath
        :
        floatMath
      );

    // since we are using JavaScript float, which is a double-precision
    //   float, we will use 2^-53 for epsilon here (based on discussion
    //   here: https://fractalforums.org/index.php?topic=4360.msg31806#msg31806)
    // actually using 3^-53 for more accuracy
    // since we only use it when halved, just halve it right away here
    const epsilon = math.createFromNumber(2 ** -53);
    const epsilonSquared = math.mul(epsilon, epsilon);

    // BLA equation and criteria: https://fractalforums.org/index.php?topic=4360.msg31806#msg31806

    let blaTable = new Map();

    // compute coefficients for each possible number of iterations to skip, from 1 to n
    let a = {x:math.one, y:math.zero};
    let b = {x:math.zero, y:math.zero};
    let refDoubled = null;
    let statusIterCounter = 0;
    let maxIter = referenceOrbit.length - 2;
    for (let l = 1; l < maxIter; l++) {
      refDoubled = math.complexRealMul(referenceOrbit[l], math.two);
      a = math.complexMul(refDoubled, a);
      b = math.complexAdd(math.complexMul(refDoubled, b), {x:math.one, y:math.zero});
      blaTable.set(l, {
        a:    a,
        aas: math.complexAbsSquared(a),
        b:    b,
        bas: math.complexAbsSquared(b)
      });
      statusIterCounter++;
      if (statusIterCounter >= 5000) {
        statusIterCounter = 0;
        console.log("computed " + (Math.round(l * 10000.0 / maxIter)/100.0) + "% of BLA coefficients");
      }
    }

    let epsilonRefAbsTable = new Map();
    statusIterCounter = 0;
    maxIter = referenceOrbit.length;
    for (let i = 0; i < maxIter; i++) {
      epsilonRefAbsTable.set(i, math.mul(epsilonSquared, math.complexAbsSquared(referenceOrbit[i])));
      statusIterCounter++;
      if (statusIterCounter >= 5000) {
        statusIterCounter = 0;
        console.log("computed " + (Math.round(i * 10000.0 / maxIter)/100.0) + "% of BLA epsilon criteria");
      }
    }

    return {coefTable: blaTable, epsilonRefAbsTable: epsilonRefAbsTable};

  },
  // x, y, referenceX, and referenceY must be infNum objects of a coordinate in the abstract plane being computed upon
  "computeBoundPointColorPerturbOrBla": function(n, precis, x, y, algorithm, referenceX, referenceY, referenceOrbit, blaTables, saCoefficients) {

    const math = algorithm.includes("arbprecis") ?
      infNumMath
      :
      (algorithm.includes("floatexp") ?
        floatExpMath
        :
        floatMath
      );

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

    const deltaCx = infNumSub(x, referenceX);
    const deltaCy = infNumSub(y, referenceY);

    // (it seems more efficient to let JavaScript truncate by using
    //   the full exponential notation with parseFloat(), but maybe
    //   some precision is lost and it would be better to truncate
    //   first, then call parseFloat()?
    let deltaC = {
      x: math.createFromInfNum(deltaCx),
      y: math.createFromInfNum(deltaCy)
    };

    let deltaCFloatExp = {
      x: floatExpMath.createFromInfNum(deltaCx),
      y: floatExpMath.createFromInfNum(deltaCy)
    };

    const deltaCAbs = math.complexAbsSquared(deltaC);

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
    if (useSa && saCoefficients.itersToSkip > 0) {
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
    try {
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
        zAbs = math.complexAbsSquared(z);
        if (math.gt(zAbs, math.four)) {
          iter--;
          break;
        }
        deltaZAbs = math.complexAbsSquared(deltaZ);
        if (math.lt(zAbs, deltaZAbs) || referenceIter == maxReferenceIter) {
          deltaZ = z;
          referenceIter = 0;
        } else if (useBla) {
          let goodL = null;
          if (referenceIter / maxReferenceIter < 0.95) {
            //let goodLbin = null;
            // only proceeed with binary search if first entry (for 1 iteration) in
            //   BLA table is valid
            let blaL = blaTables.coefTable.get(1);
            let epsilonRefAbs = blaTables.epsilonRefAbsTable.get(referenceIter+1);
            if (math.lt(deltaZAbs, math.div(epsilonRefAbs, blaL.aas)) &&
                math.lt(deltaCAbs, math.div(epsilonRefAbs, blaL.bas))) {
              goodL = 1;
              //let goodLbin = null;
              let lo = 2;
              // this caused, for 2 pixels, us to skip beyond the end of the reference orbit, somehow
              //let hi = maxReferenceIter - referenceIter - 1;
              let hi = maxReferenceIter - referenceIter - 15;
              let lCheck = null;
              //let blaL = null;
              while (lo <= hi) {
                lCheck = (lo + hi) >>1;
                blaL = blaTables.coefTable.get(lCheck);
                epsilonRefAbs = blaTables.epsilonRefAbsTable.get(referenceIter+lCheck);
                if (math.lt(deltaZAbs, math.div(epsilonRefAbs, blaL.aas)) &&
                    math.lt(deltaCAbs, math.div(epsilonRefAbs, blaL.bas))) {
                  lo = lCheck + 1;
                } else {
                  // continue binary search in upper half of remaining l's, below this non-valid value
                  hi = lCheck - 1;
                }
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
              math.complexMul(blaTables.coefTable.get(goodL).a, deltaZ),
              math.complexMul(blaTables.coefTable.get(goodL).b, deltaC)
            );
            iter += goodL;
            referenceIter += goodL;
            blaItersSkipped += goodL;
          //} else {
          //  console.log("NOT skipping any iters at pixel", {x:x, y:y});
          }
        }
      }

      if (iter == maxIter) {
        return {colorpct: -1.0, blaItersSkipped: blaItersSkipped}; // background color
      } else {
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return {colorpct: iter / maxIter, blaItersSkipped: blaItersSkipped};
      }

    } catch (e) {
      console.log("ERROR CAUGHT when calculating [" + algorithm + "] pixel color",
        {x:infNumToString(x), y:infNumToString(y), iter:iter, maxIter:maxIter, refIter:referenceIter, maxRefIter:maxReferenceIter});
      console.log(e.name + ": " + e.message + ":\n" + e.stack.split('\n').slice(0, 5).join("\n"));
      return {colorpct: windowCalcIgnorePointColor, blaItersSkipped: blaItersSkipped}; // special color value that will not be displayed
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

