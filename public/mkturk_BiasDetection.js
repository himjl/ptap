
function get_sampling_weights(sampleBagNames, idx2bag, viewingWindowWidth, returnSamps, bagSamps, performanceModulationFactor){
    var numBags = sampleBagNames.length 


    returnSamps = returnSamps.slice(-1 * viewingWindowWidth)
    bagSamps = bagSamps.slice(-1 * viewingWindowWidth)

    var minLength = Math.min(returnSamps.length, bagSamps.length)
    if (minLength < viewingWindowWidth){
        var samplingWeights = np.xvec(numBags, 1 / numBags)
    }
    returnSamps = returnSamps.slice(-1 * minLength)
    bagSamps = bagSamps.slice(-1 * minLength)

    // Get outcomes: returns per bag; trials per bag 
    var returnsPerBag = {}
    var trialsPerBag = {}

    
    var ret 
    var bg 
    for (var i = 0; i < bagSamps.length; i++){
        bg = bagSamps[i]
        ret = returnSamps[i]

        if (returnsPerBag[bg] == undefined){
            returnsPerBag[bg] = 0
        }
        if(trialsPerBag[bg] == undefined){
            trialsPerBag[bg] = 0
        }
        returnsPerBag[bg]+=ret 
        trialsPerBag[bg]+=1
    }


    // Compress table
    var abcd_worstBag = compressTable(returnsPerBag, trialsPerBag)
    var a = abcd_worstBag[0] // num corrects | worst bag
    var b = abcd_worstBag[1] // num incorrects | rest bags
    var c = abcd_worstBag[2] // num incorrects | worst bag 
    var d = abcd_worstBag[3] // num corrects | rest bags
    var worstBag = abcd_worstBag[4]
    var performancePerBag = abcd_worstBag[5]

    // Get Welch's t 
    var t = get_welch_t(a, b, c, d)

    // Get Welch's df
    // var df = get_welch_df(a, b, c, d)

    // Get critical values 
    // preset
    var lb = -3.500 // For df = 49, alpha = 0.999 
    var ub = 3.500 // 

    var lb = - 3.8834 // for df = 19, alpha = 0.999
    var ub = 3.8834

    var lb = -2.09302 // for df = 19, alpha = 0.95
    var ub = 2.09302

    var lb = -1.7291 // for df = 19, alpha = 0.90
    var ub = 1.7291


    // Determine whether to enter correction loop 
    var rejectNull = t < lb || t > ub 
    var empiricalEffectSize = d / (b + d) - a / (a + c) 

    // Change sampling weights
    if (rejectNull == true && (minLength >= viewingWindowWidth)){
        console.log('REJECTING NULL. t = ', t, '. abcd = ', a, b, c, d, '. performance per bag = ', performancePerBag)
        var worstBagIdx = sampleBagNames.indexOf(idx2bag[worstBag])
        // Indexes tk['sampleBagNames']
        var h = performanceModulationFactor // Drop from balanced performance 
        var designProb = design_worstbag_sampling_rate(h, numBags) // todo: check for validity in multiclass case
        var samplingWeights = np.xvec(numBags, designProb['designPrest'])
        samplingWeights[worstBagIdx] = designProb['designPmin']

    }
    else{
        // Cannot reject null that success probability is same for all bags; maintain uniform sampling 

        // Indexes tk['sampleBagNames']
        var samplingWeights = np.xvec(numBags, 1 / numBags)
    }

    if (sampleBagNames.length == 1){
        var samplingWeights = [1]
    }

    var r = {
        'samplingWeights':samplingWeights, 
        'empiricalEffectSize':empiricalEffectSize, 
        'worstBag':worstBag, 
        'performancePerBag':performancePerBag, 
        'tStatistic':t, 
        'rejectNull':rejectNull, 
        'a':a, 
        'b':b,
        'c':c,
        'd':d,
        'numObservations':minLength,
        'viewingWindowWidth': viewingWindowWidth, 
        'tStatistic_criticalLb':lb, 
        'tStatistic_criticalUb':ub, 
    }

    return r
}


 


function compressTable(returnsPerBag, trialsPerBag){

    // Compress the n actions by k bags table into a 2x2 contingency table 
    // Where group 1 = the worst performing bag-action pair. 
    // Where group 2 = rest of the bags / actions.

    // For now, assume that each bag has one optimal action (TODO: remove assumption). 
    // Assume n == k


    // First, determine 'worst' task 
    var performancePerBag = {}
    var perf
    var worstBag = undefined 
    var worstPerf = 1 

    for (var bg in returnsPerBag){
        if(! returnsPerBag.hasOwnProperty(bg)){
            continue
        }

        perf = returnsPerBag[bg] / trialsPerBag[bg]
        performancePerBag[bg] = perf

        if (perf <= worstPerf){
            worstBag = bg
            worstPerf = perf
        }
    }

    // Now, pool the numTrials and returns for the other bags 
    var numRestTrials = 0 
    var numRestReturns = 0
    for (var bg in returnsPerBag){
        if (bg == worstBag){
            continue
        }
        if(! returnsPerBag.hasOwnProperty(bg)){
            continue
        }
        numRestTrials+=trialsPerBag[bg]
        numRestReturns+=returnsPerBag[bg]
    }

    var a = returnsPerBag[worstBag] // Num ac1, i1 
    var b = numRestTrials - numRestReturns // Num ac1, i'
    var c = trialsPerBag[worstBag] - a // Num ac', i1
    var d = numRestReturns // Num ac', i'
    
    // Get a, b, c, d 
    var abcd_worstBag_performancePerBag = [a, b, c, d, worstBag, performancePerBag]
    return abcd_worstBag_performancePerBag
}

function get_welch_t(a, b, c, d){
    var L = a + c 
    var N = a + b + c + d 
    var muL = a / L 
    var muR = d / (N - L)

    var var_ai = muL * (1 - muL)
    var var_di = muR * (1 - muR)

    var tnum = muL - muR 
    var tdenom = Math.sqrt(var_ai/L + var_di/(N-L))
    var t = tnum/tdenom

    return t
}

function get_welch_df(a, b, c, d){
    var L = a + c 
    var N = a + b + c + d 
    var muL = a / L 
    var muR = d / (N - L)

    var var_ai = muL * (1 - muL)
    var var_di = muR * (1 - muR)

    var df_num = Math.pow(var_ai / L + var_di / (N - L), 2)
    var df_denom = Math.pow(var_ai, 2)/(Math.pow(L, 2) * (L - 1)) + Math.pow(var_di, 2)/(Math.pow(N-L, 2) * (N - L - 1))

    var df = df_num / df_denom 

    return df
}

function student_df(a, b, c, d){

    return a + b + c + d - 1
}


function get_t_critical_values(alpha, df){
    var lb
    var ub 
    // todo: implement 
    lbub = [lb, ub]
    return lb, ub
}

function design_worstbag_sampling_rate(designProportionDropNewExpectedReturn, numBags){
    var h = designProportionDropNewExpectedReturn
        
    var designPmin = 1 - h*((numBags - 1)/numBags)
    var designPrest = (1 - designPmin) / (numBags - 1)

    var result = {'designPmin': designPmin, 'designPrest':designPrest}

    return result 
}

function expected_return(performancePerBag, samplingRatePerBag){
    var er = 0 

    for (var bg in performancePerBag){
        if (! performancePerBag.hasOwnProperty(bg)){
            continue
        }
        er+=samplingRatePerBag[bg]*performancePerBag[bg]
    } 
    return er
}
