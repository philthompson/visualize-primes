
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

//const floatMath = {
//  complexMul: function(a, b) { ... }
//};

//const floatExpMath = {
//  complexMul: function(a, b) { ... }
//};

//const infNumMath = {
//  complexMul: function(a, b) { ... }
//};

function complexFloatMul(a, b) {
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

function complexFloatAbs(a) {
  //return a.x * a.x + a.y * a.y;
  return Math.hypot(a.x, a.y);
}

function complexFloatExpMul(a, b) {
  return {
    x: floatExpSub(floatExpMul(a.x, b.x), floatExpMul(a.y, b.y)),
    y: floatExpAdd(floatExpMul(a.x, b.y), floatExpMul(a.y, b.x))
  };
}

function complexFloatExpRealMul(a, realFloatExp) {
  return {
    x: floatExpMul(a.x, realFloatExp),
    y: floatExpMul(a.y, realFloatExp)
  };
}

function complexFloatExpRealAdd(a, realFloatExp) {
  return {
    x: floatExpAdd(a.x, realFloatExp),
    y: structuredClone(a.y)
  };
}

function complexFloatExpAdd(a, b) {
  return {
    x: floatExpAdd(a.x, b.x),
    y: floatExpAdd(a.y, b.y)
  };
}

// this is the SQUARED absolute value (to get actual hypotenuse,
//   need to take square root of this)
function complexFloatExpAbsSquared(a) {
  return floatExpAdd(floatExpMul(a.x, a.x), floatExpMul(a.y, a.y));
}

function complexFloatExpAbsHypot(a) {
  return floatExpSqrt(complexFloatExpAbsSquared(a));
}

function complexInfNumRealMul(a, realInfNum) {
  return {
    x: infNumMul(a.x, realInfNum),
    y: infNumMul(a.y, realInfNum)
  };
}

function complexInfNumRealAdd(a, realInfNum) {
  return {
    x: infNumAdd(a.x, realInfNum),
    y: copyInfNum(a.y)
  };
}

function complexInfNumMul(a, b) {
  return {
    x: infNumSub(infNumMul(a.x, b.x), infNumMul(a.y, b.y)),
    y: infNumAdd(infNumMul(a.x, b.y), infNumMul(a.y, b.x))
  };
}

function complexInfNumAdd(a, b) {
  return {
    x: infNumAdd(a.x, b.x),
    y: infNumAdd(a.y, b.y)
  };
}

function complexInfNumAbsSquared(a) {
  return infNumAdd(infNumMul(a.x, a.x), infNumMul(a.y, a.y));
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
  "computeReferenceOrbit": function(n, precis, algorithm, x, y) {
    // rather than re-write the loop below (once for float, once
    //   for floatexp), or string checking the algorithm name inside
    //   the loop, use a boolean check inside the loop
    let useFloatExp = false;
    if (algorithm.includes("floatexp")) {
      useFloatExp = true;
    } else if (!algorithm.includes("float")) {
      console.log("unexpected/unknown reference orbit algorithm [" + algorithm + "], falling back to float");
    }
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
    try {
      while (iter < maxIter) {
        ixSq = infNumMul(ix, ix);
        iySq = infNumMul(iy, iy);
        if (infNumGt(infNumAdd(ixSq, iySq), bailoutSquared)) {
          break;
        }
        if (useFloatExp) {
          // (it seems more efficient to let JavaScript truncate by using
          //   the full exponential notation with parseFloat(), but maybe
          //   some precision is lost and it would be better to truncate
          //   first, then call parseFloat()?
          orbit.push({
            x: createFloatExpFromInfNum(ix),
            y: createFloatExpFromInfNum(iy),
            xap: copyInfNum(ix), // include arbitrary precision x and y as well
            yap: copyInfNum(iy)
          });
        } else {
          orbit.push({
            x: parseFloat(infNumExpString(ix)),
            y: parseFloat(infNumExpString(iy)),
            xap: copyInfNum(ix), // include arbitrary precision x and y as well
            yap: copyInfNum(iy)
          });
        }
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
  "computeSaCoefficientsInfNum": function(precision, algorithm, referenceX, referenceY, referenceOrbit, leftEdge, rightEdge, topEdge, bottomEdge) {
    let nTerms = 5;
    // parse out number of series approximation terms from the algorithm name
    const algoSplit = algorithm.split("-");
    for (let i = 0; i < algoSplit.length; i++) {
      if (algoSplit[i].startsWith("sapx")) {
        nTerms = parseInt(algoSplit[i].substring(4));
        break;
      }
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
    const termShrinkCutoff = infNum(1000n*1000n, 0n);

    // calculate test points
    const testPoints = [];
    // divisions per dimension
    // 1 -> test 4 corners only
    // 2 -> test 4 corners, 4 edge middles, and image center
    // 3 -> test 4 points along top edge, 4 points across at 1/3 down from top,
    //           4 points across at 2/3 down from top, and 4 points along bottom edge
    // 4 -> test 5 points along top edge ...
    const dimDiv = 2;
    let px = leftEdge;
    let py = topEdge;
    let xStep = infNumDiv(infNumSub(rightEdge, leftEdge), infNum(BigInt(dimDiv), 0n), precision);
    let yStep = infNumDiv(infNumSub(topEdge, bottomEdge), infNum(BigInt(dimDiv), 0n), precision);
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

    let one = infNum(1n, 0n); // NOT a complex number
    let two = infNum(2n, 0n); // NOT a complex number
    let twoRefIter = null;

    // initialize terms to 0, at 0th iteration ...
    const terms = new Array(nTerms).fill({x:infNum(0n, 0n), y:infNum(0n, 0n)});
    // ... except for 'A' term, which is initialized to 1
    terms[0] = {x:infNum(1n, 0n), y:infNum(0n, 0n)};

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

      twoRefIter = complexInfNumRealMul({x:referenceOrbit[i].xap, y:referenceOrbit[i].yap}, two);

      // compute next iteration of all terms
      for (let k = 0; k < nTerms; k++) {

        // special case for 0th term (A)
        if (k === 0) {
          nextTerms[k] = complexInfNumRealAdd(complexInfNumMul(twoRefIter, terms[k]), one);

        } else if (k % 2 === 0) {
          nextTerms[k] = complexInfNumMul(twoRefIter, terms[k]);
          // notice continue condition is "up<dn" here
          for (let up = 0, dn = k-1; up<dn; up++, dn--) {
            nextTerms[k] = complexInfNumAdd(nextTerms[k],
              complexInfNumRealMul(complexInfNumMul(terms[up], terms[dn]), two)
            );
          }

        // odd (B=1, D=3) terms end in squared term
        } else {
          nextTerms[k] = complexInfNumMul(twoRefIter, terms[k]);
          // notice continue condition is "up<=dn" here
          for (let up = 0, dn = k-1; up<=dn; up++, dn--) {
            if (up===dn) {
              nextTerms[k] = complexInfNumAdd(nextTerms[k],
                complexInfNumMul(terms[up], terms[dn]) // since up=dn here, we are squaring that coefficient
              );
            } else {
              nextTerms[k] = complexInfNumAdd(nextTerms[k],
                complexInfNumRealMul(complexInfNumMul(terms[up], terms[dn]), two)
              );
            }
          }
        }
      }

      let validTestPoints = 0;
      // check for iters to skip for all calculated test points
      for (let p = 0; p < testPoints.length; p++) {

        let deltaC = {
          x: infNumSub(testPoints[p].x, referenceX),
          y: infNumSub(testPoints[p].y, referenceY)
        };

        let coefTermsAreValid = false;
        // check validity of iteration coefficients
        // splitting terms into two groups, so start from one
        for (let j = 1; j < nTerms; j++) {
          //let deltaCpower = {x:one, y:one};
          let deltaCpower = structuredClone(deltaC);
          let firstSmallest = null;
          let secondLargest = null;
          // find smallest term in 1st group for test point
          for (let k = 0; k < j; k++) {
            // no need to actually take square root of sum of squares
            //   to do the size comparison
            let wholeTerm = complexInfNumAbsSquared(complexInfNumMul(deltaCpower, nextTerms[k]));
            if (firstSmallest === null || infNumLt(wholeTerm, firstSmallest)) {
              firstSmallest = copyInfNum(wholeTerm);
            }
            // for the A term, 1 is multiplied by deltaC to get deltaC^1
            // for the B term, that result is again multiplied by deltaC to get deltaC^2
            // for the C term, ... we get deltaC^3
            deltaCpower = complexInfNumMul(deltaCpower, deltaC);
          }
          // find largest term in 2nd group for test point
          for (let k = j; k < nTerms; k++) {
            // no need to actually take square root of sum of squares
            //   to do the size comparison
            let wholeTerm = complexInfNumAbsSquared(complexInfNumMul(deltaCpower, nextTerms[k]));
            if (secondLargest === null || infNumGt(wholeTerm, secondLargest)) {
              secondLargest = copyInfNum(wholeTerm);
            }
            deltaCpower = complexInfNumMul(deltaCpower, deltaC);
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
          let ratio = infNumDiv(firstSmallest, secondLargest, 8);
          //if (secondLargest.v === 0n || infNumGt(infNumDiv(firstSmallest, secondLargest, 8), termShrinkCutoff)) {
          if (infNumGt(ratio, termShrinkCutoff)) {
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
        terms[j] = {
          x: infNumTruncateToLen(nextTerms[j].x, precision),
          y: infNumTruncateToLen(nextTerms[j].y, precision)
        };
      }
    }

    // convert coefficients to the algorithm's number type
    // (necesssary? can we just evaluate each pixel's starting
    //   iteration's position delta using arbitrary precision?)
    if (algorithm.includes("floatexp")) {
      for (let i = 0; i < terms.length; i++) {
        terms[i] = {
          x: createFloatExpFromInfNum(terms[i].x),
          y: createFloatExpFromInfNum(terms[i].y)
        };
      }
    } else {
      for (let i = 0; i < terms.length; i++) {
        terms[i] = {
          x: parseFloat(infNumExpString(terms[i].x)),
          y: parseFloat(infNumExpString(terms[i].y))
        };
      }
    }

    if (itersToSkip < 0) {
      console.log("skipping ALL [" + referenceOrbit.length + "] iterations of the reference orbit with [" + terms.length + "]-term SA... hmm...");
      return {itersToSkip:referenceOrbit.length, coefficients:terms};
    } else {
      console.log("skipping [" + itersToSkip + "] iterations with [" + terms.length + "]-term SA");
      return {itersToSkip:itersToSkip, coefficients:terms};
    }

  },
  "computeSaCoefficients": function(precision, algorithm, referenceX, referenceY, referenceOrbit, leftEdge, rightEdge, topEdge, bottomEdge) {
    let nTerms = 5;
    // parse out number of series approximation terms from the algorithm name
    const algoSplit = algorithm.split("-");
    for (let i = 0; i < algoSplit.length; i++) {
      if (algoSplit[i].startsWith("sapx")) {
        nTerms = parseInt(algoSplit[i].substring(4));
        break;
      }
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
    const termShrinkCutoff = createFloatExpFromNumber(1000*1000);

    // calculate test points
    const testPoints = [];
    // divisions per dimension
    // 1 -> test 4 corners only
    // 2 -> test 4 corners, 4 edge middles, and image center
    // 3 -> test 4 points along top edge, 4 points across at 1/3 down from top,
    //           4 points across at 2/3 down from top, and 4 points along bottom edge
    // 4 -> test 5 points along top edge ...
    const dimDiv = 3;
    let px = leftEdge;
    let py = topEdge;
    let xStep = infNumDiv(infNumSub(rightEdge, leftEdge), infNum(BigInt(dimDiv), 0n), precision);
    let yStep = infNumDiv(infNumSub(topEdge, bottomEdge), infNum(BigInt(dimDiv), 0n), precision);
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

    let zero = createFloatExpFromNumber(0); // NOT a complex number
    let one = createFloatExpFromNumber(1); // NOT a complex number
    let two = createFloatExpFromNumber(2); // NOT a complex number
    let twoRefIter = null;

    // initialize terms to 0, at 0th iteration ...
    const terms = new Array(nTerms).fill({x:zero, y:zero});
    // ... except for 'A' term, which is initialized to 1
    terms[0] = {x:one, y:zero};

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

      //twoRefIter = complexFloatExpRealMul({x:referenceOrbit[i].xap, y:referenceOrbit[i].yap}, two);
      // this only works if the reference orbit is floatexp... have to convert if using "...-float" algo
      twoRefIter = complexFloatExpRealMul(referenceOrbit[i], two);

      // compute next iteration of all terms
      for (let k = 0; k < nTerms; k++) {

        // special case for 0th term (A)
        if (k === 0) {
          nextTerms[k] = complexFloatExpRealAdd(complexFloatExpMul(twoRefIter, terms[k]), one);

        } else if (k % 2 === 0) {
          nextTerms[k] = complexFloatExpMul(twoRefIter, terms[k]);
          // notice continue condition is "up<dn" here
          for (let up = 0, dn = k-1; up<dn; up++, dn--) {
            nextTerms[k] = complexFloatExpAdd(nextTerms[k],
              complexFloatExpRealMul(complexFloatExpMul(terms[up], terms[dn]), two)
            );
          }

        // odd (B=1, D=3) terms end in squared term
        } else {
          nextTerms[k] = complexFloatExpMul(twoRefIter, terms[k]);
          // notice continue condition is "up<=dn" here
          for (let up = 0, dn = k-1; up<=dn; up++, dn--) {
            if (up===dn) {
              nextTerms[k] = complexFloatExpAdd(nextTerms[k],
                complexFloatExpMul(terms[up], terms[dn]) // since up=dn here, we are squaring that coefficient
              );
            } else {
              nextTerms[k] = complexFloatExpAdd(nextTerms[k],
                complexFloatExpRealMul(complexFloatExpMul(terms[up], terms[dn]), two)
              );
            }
          }
        }
      }

      let validTestPoints = 0;
      // check for iters to skip for all calculated test points
      for (let p = 0; p < testPoints.length; p++) {

        let deltaC = {
          x: createFloatExpFromInfNum(infNumSub(testPoints[p].x, referenceX)),
          y: createFloatExpFromInfNum(infNumSub(testPoints[p].y, referenceY))
        };

        let coefTermsAreValid = false;
        // check validity of iteration coefficients
        // splitting terms into two groups, so start from one
        for (let j = 1; j < nTerms; j++) {
          //let deltaCpower = {x:one, y:one};
          let deltaCpower = structuredClone(deltaC);
          let firstSmallest = null;
          let secondLargest = null;
          // find smallest term in 1st group for test point
          for (let k = 0; k < j; k++) {
            // no need to actually take square root of sum of squares
            //   to do the size comparison
            let wholeTerm = complexFloatExpAbsSquared(complexFloatExpMul(deltaCpower, nextTerms[k]));
            if (firstSmallest === null || floatExpLt(wholeTerm, firstSmallest)) {
              firstSmallest = structuredClone(wholeTerm);
            }
            // for the A term, 1 is multiplied by deltaC to get deltaC^1
            // for the B term, that result is again multiplied by deltaC to get deltaC^2
            // for the C term, ... we get deltaC^3
            deltaCpower = complexFloatExpMul(deltaCpower, deltaC);
          }
          // find largest term in 2nd group for test point
          for (let k = j; k < nTerms; k++) {
            // no need to actually take square root of sum of squares
            //   to do the size comparison
            let wholeTerm = complexFloatExpAbsSquared(complexFloatExpMul(deltaCpower, nextTerms[k]));
            if (secondLargest === null || floatExpGt(wholeTerm, secondLargest)) {
              secondLargest = structuredClone(wholeTerm);
            }
            deltaCpower = complexFloatExpMul(deltaCpower, deltaC);
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
          let ratio = floatExpDiv(firstSmallest, secondLargest);
          //if (secondLargest.v === 0n || infNumGt(infNumDiv(firstSmallest, secondLargest, 8), termShrinkCutoff)) {
          if (floatExpGt(ratio, termShrinkCutoff)) {
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
    //   iteration's position delta using arbitrary precision?)
    if (!algorithm.includes("floatexp") && algorithm.includes("float")) {
      for (let i = 0; i < terms.length; i++) {
        terms[i] = {
          x: parseFloat(floatExpToString(terms[i].x)),
          y: parseFloat(floatExpToString(terms[i].y))
        };
      }
    }

    if (itersToSkip < 0) {
      console.log("skipping ALL [" + referenceOrbit.length + "] iterations of the reference orbit with [" + terms.length + "]-term SA... hmm...");
      return {itersToSkip:referenceOrbit.length, coefficients:terms};
    } else {
      console.log("skipping [" + itersToSkip + "] iterations with [" + terms.length + "]-term SA");
      return {itersToSkip:itersToSkip, coefficients:terms};
    }

  },
  "computeBlaTables": function(algorithm, referenceOrbit) {

    // since we are using JavaScript float, which is a double-precision
    //   float, we will use 2^-53 for epsilon here (based on discussion
    //   here: https://fractalforums.org/index.php?topic=4360.msg31806#msg31806)
    // actually using 3^-53 for more accuracy
    const epsilonFloat = 3 ** -53;

    // BLA equation and criteria: https://fractalforums.org/index.php?topic=4360.msg31806#msg31806

    if (algorithm.includes("floatexp")) {

      let two = createFloatExpFromNumber(2);
      let blaTable = new Map();

      // compute coefficients for each possible number of iterations to skip, from 1 to n
      let a = {x:createFloatExpFromNumber(1), y:createFloatExpFromNumber(0)};
      let b = {x:createFloatExpFromNumber(0), y:createFloatExpFromNumber(0)};
      let refDoubled = null;
      for (let l = 1; l < referenceOrbit.length - 2; l++) {
        refDoubled = complexFloatExpRealMul(referenceOrbit[l], two);
        a = complexFloatExpMul(refDoubled, a);
        b = complexFloatExpAdd(complexFloatExpMul(refDoubled, b), {x:createFloatExpFromNumber(1), y:createFloatExpFromNumber(0)});
        blaTable.set(l, {
          a:    a,
          aAbs: complexFloatExpAbsHypot(a),
          b:    b,
          bAbs: complexFloatExpAbsHypot(b)
        });
      }

      let epsilon = createFloatExpFromNumber(epsilonFloat);
      let epsilonRefAbsTable = new Map();
      for (let i = 0; i < referenceOrbit.length; i++) {
        epsilonRefAbsTable.set(i, floatExpMul(epsilon, complexFloatExpAbsHypot(referenceOrbit[i])));
      }

      return {coefTable: blaTable, epsilonRefAbsTable: epsilonRefAbsTable};
    } else if (!algorithm.includes("float")) {
      console.log("unexpected/unknown reference orbit algorithm [" + algorithm + "], falling back to float");
    }

    let blaTable = new Map();

    // compute coefficients for each possible number of iterations to skip, from 1 to n
    let a = {x:1, y:0};
    let b = {x:0, y:0};
    let refDoubled = null;
    for (let l = 1; l < referenceOrbit.length - 2; l++) {
      refDoubled = complexFloatRealMul(referenceOrbit[l], 2);
      a = complexFloatMul(refDoubled, a);
      b = complexFloatAdd(complexFloatMul(refDoubled, b), {x:1, y:0});
      blaTable.set(l, {
        a:    a,
        aAbs: complexFloatAbs(a),
        b:    b,
        bAbs: complexFloatAbs(b)
      });
    }

    let epsilonRefAbsTable = new Map();
    for (let i = 0; i < referenceOrbit.length; i++) {
      epsilonRefAbsTable.set(i, epsilonFloat * complexFloatAbs(referenceOrbit[i]));
    }

    return {coefTable: blaTable, epsilonRefAbsTable: epsilonRefAbsTable};
  },
  // x, y, referenceX, and referenceY must be infNum objects of a coordinate in the abstract plane being computed upon
  // referenceOrbit is array of pre-converted InfNum->float: [{x: ,y: },{x: , y: }]
  "computeBoundPointColorPerturbOrBlaFloat": function(n, precis, x, y, algorithm, referenceX, referenceY, referenceOrbit, blaTables, saCoefficients) {

    // this function is used for both:
    //   "bla-float"    : BLA+perturb, and for
    //   "perturb-float": perturb only
    const useBla = algorithm.includes("bla-");
    // this function can also use series approximation:
    //   "bla-sapx6-float"      : BLA+perturb, with 6-term series approximation
    //   "bla-sapx17-float"     : BLA+perturb, with 17-term series approximation
    //   "perturb-sapx9-float" : perturb, with 9-term series approximation
    const useSa = algorithm.includes("sapx");

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

    const deltaCabs = complexFloatAbs(deltaC);

    let iter = 0;

    // since the last reference orbit may have escaped, use the one before
    //   the last as the last? (i don't think it really matters)
    const maxReferenceIter = referenceOrbit.length - 2;
    let referenceIter = 0;

    let deltaZ = {x: 0.0, y: 0.0};
    let z = null;
    let zAbs = null;
    let deltaZAbs = null;

    // saCoefficients: {itersToSkip:itersToSkip, coefficients:terms};
    if (useSa && saCoefficients.itersToSkip > 0) {
      let deltaCpower = structuredClone(deltaC);
      for (let i = 0; i < saCoefficients.coefficients.length; i++) {
        deltaZ = complexFloatAdd(deltaZ, complexFloatMul(saCoefficients.coefficients[i], deltaCpower));
        deltaCpower = complexFloatMul(deltaCpower, deltaC);
      }
      iter += saCoefficients.itersToSkip;
      referenceIter += saCoefficients.itersToSkip;
    }

    try {
      while (iter < maxIter) {
        deltaZ = complexFloatAdd(
          complexFloatAdd(
            complexFloatMul(complexFloatRealMul(referenceOrbit[referenceIter], 2), deltaZ),
            complexFloatMul(deltaZ, deltaZ)
          ),
          deltaC);

        iter++;
        referenceIter++;

        z = complexFloatAdd(referenceOrbit[referenceIter], deltaZ);
        zAbs = complexFloatAbs(z);
        if (zAbs > 2) {
          iter--;
          break;
        }
        //deltaZAbs = (deltaZ.x*deltaZ.x) + (deltaZ.y*deltaZ.y);
        deltaZAbs = complexFloatAbs(deltaZ);
        if (zAbs < deltaZAbs || referenceIter == maxReferenceIter) {
          deltaZ = z;
          referenceIter = 0;
        } else if (useBla) {
          const epsilonRefAbs = blaTables.epsilonRefAbsTable.get(referenceIter);
/*
          let goodL = null;
          // TODO - use binary search to find maximum valid value of l
          //for (let l = 1; l < n; l++) { // we have to stop before maxReferenceIter, right? since maxReferenceIter might be < n
          for (let l = 1; referenceIter + l < maxReferenceIter - 1; l++) {
            let blaL = blaTables.coefTable.get(l);
            //let aCriterion = blaL.aAbs * deltaZAbs;
            //let bCriterion = blaL.bAbs * deltaCabs;
            if (blaL.aAbs * deltaZAbs < epsilonRefAbs && blaL.bAbs * deltaCabs < epsilonRefAbs) {
              goodL = l;

            // if we can't skip any more iterations, use the last value
            //   (which is the maximum valid number to skip)
            } else {
              break;
            }
          }
*/
          let goodL = null;
          if (referenceIter / maxReferenceIter < 0.95) {
            //let goodLbin = null;
            // only proceeed with binary search if first entry (for 1 iteration) in
            //   BLA table is valid
            let blaL = blaTables.coefTable.get(1);
            if (blaL.aAbs * deltaZAbs < epsilonRefAbs && blaL.bAbs * deltaCabs < epsilonRefAbs) {
              goodL = 1;
              //let goodLbin = null;
              let lo = 2;
              // this caused, for 2 pixels, us to skip beyond the end of the reference orbit, somehow
              //let hi = maxReferenceIter - referenceIter - 1;
              // this eliminated almost all the artifacts
              //let hi = maxReferenceIter - referenceIter - 10;
              let hi = maxReferenceIter - referenceIter - 15;
              let lCheck = null;
              //let blaL = null;
              while (lo <= hi) {
                lCheck = (lo + hi) >>1;
                blaL = blaTables.coefTable.get(lCheck);
                if (blaL.aAbs * deltaZAbs < epsilonRefAbs && blaL.bAbs * deltaCabs < epsilonRefAbs) {
                  // check the BLA at the subsequent l value, probably not necessary...
                  /*
                  blaL = blaTables.coefTable.get(lCheck+1);
                  if (blaL !== undefined && blaL.aAbs * deltaZAbs < epsilonRefAbs && blaL.bAbs * deltaCabs < epsilonRefAbs) {
                    //goodLbin = lCheck+1;
                    goodL = lCheck+1;
                    // continue binary search in upper half of remaining l's, above this valid value
                    lo = lCheck + 2;
                  } else {
                    // continue binary search in upper half of remaining l's, below this non-valid value
                    hi = lCheck - 1;
                  }
                  */
                  lo = lCheck + 1;
                } else {
                  // continue binary search in upper half of remaining l's, below this non-valid value
                  hi = lCheck - 1;
                }
              }
            }
            //goodL = goodLbin;
          }

          // if no iters were skippable, use regular perturbation for the next iteration
          // otherwise
          // if some iters are skippable, apply BLA function here to skip iterations
          // BLA equation and criteria: https://fractalforums.org/index.php?topic=4360.msg31806#msg31806
          // BLA+perturb algorithm: https://fractalforums.org/index.php?topic=4360.msg31574#msg31574
          if (goodL !== null) {
            deltaZ = complexFloatAdd(
              complexFloatMul(blaTables.coefTable.get(goodL).a, deltaZ),
              complexFloatMul(blaTables.coefTable.get(goodL).b, deltaC)
            );
            iter += goodL;
            referenceIter += goodL;
          }
        }

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
  "computeBoundPointColorPerturbOrBlaFloatExp": function(n, precis, x, y, algorithm, referenceX, referenceY, referenceOrbit, blaTables, saCoefficients) {

    // saCoefficients: {itersToSkip:itersToSkip, coefficients:terms};

    // this function is used for both:
    //   "bla-float"    : BLA+perturb, and for
    //   "perturb-float": perturb only
    const useBla = algorithm.includes("bla-");
    // this function can also use series approximation:
    //   "bla-sapx6-float"      : BLA+perturb, with 6-term series approximation
    //   "bla-sapx17-float"     : BLA+perturb, with 17-term series approximation
    //   "perturb-sapx9-float" : perturb, with 9-term series approximation
    const useSa = algorithm.includes("sapx");

    //const four = createFloatExpFromNumber(4);
    const two = createFloatExpFromNumber(2);
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
      x: createFloatExpFromInfNum(deltaCx),
      y: createFloatExpFromInfNum(deltaCy)
    };

    const deltaCabs = complexFloatExpAbsHypot(deltaC);

    let iter = 0;

    // since the last reference orbit may have escaped, use the one before
    //   the last as the last? (i don't think it really matters)
    const maxReferenceIter = referenceOrbit.length - 2;
    let referenceIter = 0;

    let deltaZ = {x: createFloatExpFromNumber(0), y: createFloatExpFromNumber(0)};
    let z = null;
    let zAbs = null;
    let deltaZAbs = null;

    // saCoefficients: {itersToSkip:itersToSkip, coefficients:terms};
    if (useSa && saCoefficients.itersToSkip > 0) {
      let deltaCpower = structuredClone(deltaC);
      for (let i = 0; i < saCoefficients.coefficients.length; i++) {
        deltaZ = complexFloatExpAdd(deltaZ, complexFloatExpMul(saCoefficients.coefficients[i], deltaCpower));
        deltaCpower = complexFloatExpMul(deltaCpower, deltaC);
      }
      iter += saCoefficients.itersToSkip;
      referenceIter += saCoefficients.itersToSkip;
    }

    try {
      while (iter < maxIter) {

        deltaZ = complexFloatExpAdd(
          complexFloatExpAdd(
            complexFloatExpMul(complexFloatExpRealMul(referenceOrbit[referenceIter], two), deltaZ),
            complexFloatExpMul(deltaZ, deltaZ)
          ),
          deltaC);

        iter++;
        referenceIter++;

        z = complexFloatExpAdd(referenceOrbit[referenceIter], deltaZ);
        zAbs = complexFloatExpAbsHypot(z);
        if (floatExpGt(zAbs, two)) {
          iter--;
          break;
        }
        deltaZAbs = complexFloatExpAbsHypot(deltaZ);
        if (floatExpLt(zAbs, deltaZAbs) || referenceIter == maxReferenceIter) {
          deltaZ = z;
          referenceIter = 0;
        } else if (useBla) {
          const epsilonRefAbs = blaTables.epsilonRefAbsTable.get(referenceIter);

          let goodL = null;
          if (referenceIter / maxReferenceIter < 0.95) {
            //let goodLbin = null;
            // only proceeed with binary search if first entry (for 1 iteration) in
            //   BLA table is valid
            let blaL = blaTables.coefTable.get(1);
            if (floatExpLt(floatExpMul(blaL.aAbs, deltaZAbs), epsilonRefAbs) &&
                floatExpLt(floatExpMul(blaL.bAbs, deltaCabs), epsilonRefAbs)) {
              goodL = 1;
              //let goodLbin = null;
              let lo = 2;
              // this caused, for 2 pixels, us to skip beyond the end of the reference orbit, somehow
              //let hi = maxReferenceIter - referenceIter - 1;
              // this eliminated almost all the artifacts
              //let hi = maxReferenceIter - referenceIter - 10;
              let hi = maxReferenceIter - referenceIter - 15;
              let lCheck = null;
              //let blaL = null;
              while (lo <= hi) {
                lCheck = (lo + hi) >>1;
                blaL = blaTables.coefTable.get(lCheck);
                if (floatExpLt(floatExpMul(blaL.aAbs, deltaZAbs), epsilonRefAbs) &&
                    floatExpLt(floatExpMul(blaL.bAbs, deltaCabs), epsilonRefAbs)) {
                  /*
                  // check the BLA at the subsequent l value, probably not necessary...
                  blaL = blaTables.coefTable.get(lCheck+1);
                  if (blaL !== undefined &&
                      floatExpLt(floatExpMul(blaL.aAbs, deltaZAbs), epsilonRefAbs) &&
                      floatExpLt(floatExpMul(blaL.bAbs, deltaCabs), epsilonRefAbs)) {
                    //goodLbin = lCheck+1;
                    goodL = lCheck+1;
                    // continue binary search in upper half of remaining l's, above this valid value
                    lo = lCheck + 2;
                  } else {
                    // continue binary search in upper half of remaining l's, below this non-valid value
                    hi = lCheck - 1;
                  }
                  */
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
            deltaZ = complexFloatExpAdd(
              complexFloatExpMul(blaTables.coefTable.get(goodL).a, deltaZ),
              complexFloatExpMul(blaTables.coefTable.get(goodL).b, deltaC)
            );
            iter += goodL;
            referenceIter += goodL;
          //} else {
          //  console.log("NOT skipping any iters at pixel", {x:x, y:y});
          }
        }
      }

      if (iter == maxIter) {
        return -1.0; // background color
      } else {
        //console.log("point (" + infNumToString(x) + ", " + infNumToString(y) + ") exploded on the [" + iter + "]th iteration");
        return iter / maxIter;
      }

    } catch (e) {
      console.log("ERROR CAUGHT when processing perturb-floatexp point",
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
      if (infNumGe(precisScale, createInfNum("1e304"))) {
        // looks like floatexp (with perturbation) can handle very
        //   large scales, where only full arbitrary precision could
        //   before, yet is much faster
        //ret.algorithm = "basic-arbprecis";
        //ret.algorithm = "perturb-floatexp";
        //ret.algorithm = "bla-floatexp";
        //ret.algorithm = "bla-sapx16-floatexp";
        ret.algorithm = "perturb-sapx8-floatexp";
      } else if (infNumGe(precisScale, createInfNum("3e150"))) {
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
          //ret.precision = Math.floor(infNumMagnitude(precisScale) * 1.1);
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

