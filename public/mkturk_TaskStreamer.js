class TaskStreamerClass{
    constructor(gamePackage, IB, CheckPointer){
        this.game = gamePackage['GAME']
        this.imageBags = gamePackage['IMAGEBAGS']
        this.taskSequence = gamePackage['TASK_SEQUENCE']
    


        this.IB = IB 
        this.CheckPointer = CheckPointer
        
        // State info
        this.taskNumber = CheckPointer.get_task_number()  
        this.trialNumberTask = CheckPointer.get_trial_number_task() 
        this.trialNumberSession = 0
        this.taskReturnHistory = CheckPointer.get_task_return_history()  
        this.taskActionHistory = CheckPointer.get_task_action_history() 
        this.taskBagHistory = CheckPointer.get_task_bag_history() 


        this.TERMINAL_STATE = false
        this.monitoring = true
        this.lastTrialPackage = undefined
        this.samplesSeen = CheckPointer.get_samples_seen_history() // {} // id: times seen
        this.eligibleSamplePool = this.calculate_eligible_sample_pool(this.samplesSeen) // 

        // Queue 
        this.trialq = {} // taskNumber : [trialPackage, trialPackage...]
        this.maxTrialsInQueuePerTask = 50 
        this.numTrialsInQueue = 0
        
        this.onLoadState = {
            'taskNumber': this.taskNumber,
            'trialNumberTask': this.trialNumberTask,
            'trialNumberSession': this.trialNumberSession,
            'taskReturnHistory': this.taskReturnHistory,
            'taskActionHistory': this.taskActionHistory,
            'taskBagHistory': this.taskBagHistory,
            'TERMINAL_STATE': this.TERMINAL_STATE,
            'monitoring': this.monitoring,
            'lastTrialPackage':this.lastTrialPackage,
            'samplesSeen':this.samplesSeen, 
            'eligibleSamplePool':this.eligibleSamplePool
        }

        this.onLoadState = JSON.parse(JSON.stringify(this.onLoadState))
    }

    calculate_eligible_sample_pool(samplesSeen){
        var eligibleSamplePool = JSON.parse(JSON.stringify(this.imageBags))

        for (var k in this.samplesSeen){
            if(!this.samplesSeen.hasOwnProperty(k)){
                continue
            }

            // alphabetize 
            eligibleSamplePool[k] = (eligibleSamplePool[k]).sort()

            for(var i in this.samplesSeen[k]){
                if(!this.samplesSeen[k].hasOwnProperty(i)){
                    continue
                } 
                if(i == -1){
                    continue
                }
                if(i == undefined){
                    continue
                }
                eligibleSamplePool[k].splice(i, 1)
            }
        }
        return eligibleSamplePool
    }
    async build(num_trials_per_stage_to_prebuffer){
        this.bag2idx = {}
        this.idx2bag = {}
        this.id2idx = {}

        var i_bag = 0
        var bagsAlphabetized = Object.keys(this.imageBags).sort()
        for (var i_bag in bagsAlphabetized){
            var bag = bagsAlphabetized[i_bag]
            this.bag2idx[bag] = parseInt(i_bag)
            this.idx2bag[parseInt(i_bag)] = bag
            i_bag++
             

            if (this.imageBags[bag].constructor != Array){
                var idAlphabetized = [this.imageBags[bag]]
            }
            else{
                var idAlphabetized = (this.imageBags[bag]).sort()
            }
            
            this.id2idx[bag] = {}
            for (var i_id in idAlphabetized){
                this.id2idx[bag][idAlphabetized[i_id]] = parseInt(i_id)
            }
        }

        // Prebuffer some trials 
        num_trials_per_stage_to_prebuffer = num_trials_per_stage_to_prebuffer || 5

        var trial_requests = []
        for (var t = this.taskNumber; t<this.taskSequence.length; t++){
            for (var i_trial = 0; i_trial < num_trials_per_stage_to_prebuffer; i_trial++){
                trial_requests.push(this.buffer_trial(t))
            }
        }
        console.log('Prebuffering ', this.taskSequence.length * num_trials_per_stage_to_prebuffer, ' trials')
        await Promise.all(trial_requests)
    }

    debug2record(){

        for (var k in this.onLoadState){
            if(!this.onLoadState.hasOwnProperty(k)){
                continue
            }
            this[k] = this.onLoadState[k]
        }
        
        console.log('debug2record: TaskStreamer reverted to state on load')
        this.CheckPointer.debug2record()
    }


    get_image_idx(bag_name, id){
        var i = {}

        if (bag_name.constructor == Array){
            var _this = this
            i['bag'] = bag_name.map(function(item){return _this.bag2idx[item]})
            var bagid = bag_name.map(function(item, idx){return [item, id[idx]]})
            i['id'] = bagid.map(function(item){return _this.id2idx[item[0]][item[1]]})
        }
        else{
            i['bag'] = this.bag2idx[bag_name]
            i['id'] = this.id2idx[bag_name][id]
        }

        return i
        // handle multiple bag names and return in order
    }

    get_bag_from_idx(bag_idx){
        var i = []
        if(bag_idx.constructor == Array){
            for (var j in bag_idx){
                i.push(this.idx2bag[bag_idx[j]])
            }
        }
        else{
            i = this.idx2bag[bag_idx]
        }

        return i
    }

    async get_trial(){
        
        if(this.trialq[this.taskNumber] == undefined || this.trialq[this.taskNumber].length == 0){
            await this.buffer_trial(this.taskNumber)
        }

        var tP = this.trialq[this.taskNumber].shift() // .shift() removes first element and returns
        this.lastTrialPackage = tP

        return tP 
    }

    async buffer_trial(taskNumber){

        // Seed 
        if(this.game['randomSeed'] == undefined || this.game['randomSeed'].constructor != Number){
            //console.log('no random seed specified')
            var trialSeed = undefined 
        }
        else{
            var trialSeed = cantor(trial_idx, this.game['randomSeed'])
            console.log('trialSeed', trialSeed)
        }
        
        Math.seedrandom(trialSeed)

        // Assemble
        var tP = {}
        var tk = this.taskSequence[taskNumber]
        var punishTimeOutMsec = tk['punishTimeOutMsec'] 

        // Select sample bag
        if(this.taskSequence[this.taskNumber]['sampleSampleWithReplacement'] == false){
            var samplePool = tk['sampleBagNames']
            var eligibleSampleBagNames = []
            for (var i_p in samplePool){
                if(!samplePool.hasOwnProperty(i_p)){
                    continue
                }
                var bag = samplePool[i_p]
                if(this.eligibleSamplePool[bag].length == 0){
                    continue
                    // Out of
                }
                eligibleSampleBagNames.push(bag)
            }
            if(eligibleSampleBagNames.length == 0){
                // reup
                console.log('Ran out of eligible samples, reupping')
                this.eligibleSamplePool = JSON.parse(JSON.stringify(this.imageBags))
                eligibleSampleBagNames = tk['sampleBagNames']
            }

            var samplingWeights = np.xvec(eligibleSampleBagNames.length, 1/eligibleSampleBagNames.length)  
            var sampleBag = np.choice(eligibleSampleBagNames, 1, undefined, samplingWeights)
            var sampleId = np.choice(this.eligibleSamplePool[sampleBag])
            var sampleIdx = this.get_image_idx(sampleBag, sampleId)
            this.eligibleSamplePool[sampleBag].splice(this.eligibleSamplePool[sampleBag].indexOf(sampleId), 1)

        }
        else{
            var samplePool = tk['sampleBagNames']

            var samplingWeights = np.xvec(samplePool.length, 1/samplePool.length)            
            var sampleBag = np.choice(samplePool, 1, undefined, samplingWeights)
            var sampleId = np.choice(this.imageBags[sampleBag])
            var sampleIdx = this.get_image_idx(sampleBag, sampleId)
        }
        
        // SR - use white dots 
        // TODO: use custom tokens 
        if (tk['taskType'] == 'SR'){
            var rewardMap = tk['rewardMap'][sampleBag]

            var choiceId = rewardMap.map(function(entry){return 'dot'})
            var choiceIdx = {'bag':np.nans(choiceId.length),
                            'id':np.nans(choiceId.length)}
        
        }

        // MTS - select choice
        else if(tk['taskType'] == 'MTS'){
            var correctBag = np.choice(tk['choiceMap'][sampleBag])
            var correctPool = this.imageBags[correctBag]
            var correctId = np.choice(correctPool)
            var correctIdx = this.get_image_idx(correctBag, choiceId) 

            // Select distractors
            var distractorBagIdxPool = [] 
            for (var potentialSampleBag in tk['choiceMap']){
                if (potentialSampleBag == sampleBag){
                    //console.log(potentialSampleBag)
                    continue
                }
                distractorBagIdxPool.push(this.bag2idx[tk['choiceMap'][potentialSampleBag]])
            }

            var nway = tk['choiceXCentroid'].length
            var distractorBagIdx = np.choice(distractorBagIdxPool, nway-1, false)
            var distractorBag = this.get_bag_from_idx(distractorBagIdx)
            if(distractorBag.constructor != Array){
                distractorBag = [distractorBag]
            }
            var distractorId = []
            for(var j in distractorBag){
                distractorId.push(np.choice(this.imageBags[distractorBag[j]]))
            }
            var distractorIdx = {'bag':distractorBagIdx, 'id':this.id2idx[distractorId]}

            // Shuffle arrangement of choices
            var choiceId = [correctId]
            var choiceBag = [correctBag]
            choiceId.push(...distractorId)
            choiceBag.push(...distractorBag) 
            var choice_shuffle = shuffle(np.arange(choiceId.length))
            choiceId = np.iloc(choiceId, choice_shuffle)
            choiceBag = np.iloc(choiceBag, choice_shuffle)

            var choiceIdx = this.get_image_idx(choiceBag, choiceId)
            // Construct reward map
            var rewardMap = np.zeros(choiceId.length)
            rewardMap[choiceId.indexOf(correctId)] = 1 
            //console.log(choiceId)
            //console.log(rewardMap)
            //console.log(choiceIdx)
        }
        
        // Construct image request 

        var _this = this 
        var imageRequests = []
        imageRequests.push(this.IB.get_by_name(sampleId))
        for (var i in choiceId){
            imageRequests.push(this.IB.get_by_name(choiceId[i]))
        }
    
        var images = await Promise.all(imageRequests)
        if(images[0] == undefined){
            console.log(this)
        }        
        tP['sampleImage'] = images[0]
        tP['choiceImage'] = images.slice(1)
        
        tP['fixationXCentroid'] = tk['fixationXCentroid']
        tP['fixationYCentroid'] = tk['fixationYCentroid']
        tP['fixationDiameterDegrees'] = tk['fixationDiameterDegrees']
        tP['drawEyeFixationDot'] = tk['drawEyeFixationDot'] || false

        tP['i_sampleBag'] = sampleIdx['bag']
        tP['i_sampleId'] = sampleIdx['id']
        tP['sampleXCentroid'] = tk['sampleXCentroid']
        tP['sampleYCentroid'] = tk['sampleYCentroid'] 
        tP['sampleDiameterDegrees'] = tk['sampleDiameterDegrees']

        tP['i_choiceBag'] = choiceIdx['bag']
        tP['i_choiceId'] = choiceIdx['id']
        tP['choiceXCentroid'] = tk['choiceXCentroid']
        tP['choiceYCentroid'] = tk['choiceYCentroid']
        tP['choiceDiameterDegrees'] = tk['choiceDiameterDegrees']

        tP['actionXCentroid'] = tk['actionXCentroid']
        tP['actionYCentroid'] = tk['actionYCentroid']
        tP['actionDiameterDegrees'] = tk['actionDiameterDegrees']
        tP['choiceRewardMap'] = rewardMap
        tP['sampleOnMsec'] = tk['sampleOnMsec'] 
        tP['sampleOffMsec'] = tk['sampleOffMsec']
        tP['choiceTimeLimitMsec'] = tk['choiceTimeLimitMsec'] 
        tP['punishTimeOutMsec'] = punishTimeOutMsec
        tP['rewardTimeOutMsec'] = tk['rewardTimeOutMsec']

        if(this.trialq[taskNumber] == undefined){
            this.trialq[taskNumber] = []
        }
        this.trialq[taskNumber].push(tP)
    }


    update_state(current_trial_outcome){
        // trial_behavior: the just-finished trial's behavior. 
        // called at the end of every trial. 
        // Update trial object 
        this.lastTrialTimestamp = performance.now()

        var tk = this.taskSequence[this.taskNumber]
        var b = current_trial_outcome
        var r = b['return']
        var action = current_trial_outcome['action']

        this.taskReturnHistory.push(r)
        this.taskActionHistory.push(action)
        this.taskBagHistory.push(current_trial_outcome['i_sampleBag'])

        this.trialNumberTask++
        this.trialNumberSession++



        // ************Correction Loop ***************************

        // Calculate biases via Welch's t-test
        // Null hypothesis: Pr(action correct | category i) is the same for all i 
        // The null is violated when, for example, the subject always chooses one option regardless of the category presented

        var viewingWindowWidth = 50 

        var returnSamps = this.taskReturnHistory.slice(-1 * viewingWindowWidth)
        var bagSamps = this.taskBagHistory.slice(-1 * viewingWindowWidth)

        var samplingWeights = get_sampling_weights(tk['sampleBagNames'], this.idx2bag, viewingWindowWidth, returnSamps, bagSamps)
    
        
        // ***************************************


        // Update checkpoint 
        var sampleBag = this.get_bag_from_idx(current_trial_outcome['i_sampleBag'])
        var checkpointPackage = {
            'taskNumber': this.taskNumber, 
            'trialNumberTask': this.trialNumberTask, 
            'return':r, 
            'action':action,
            'sampleBag':sampleBag,
            'i_sampleBag':current_trial_outcome['i_sampleBag'],
            'i_sampleId':current_trial_outcome['i_sampleId']
        }
        this.CheckPointer.update(checkpointPackage)
        this.CheckPointer.request_checkpoint_save()

        // If monitoring, check transition criterion.
        if (this.monitoring == false){
            return
        }

        var averageReturnCriterion = tk['averageReturnCriterion']
        var minTrialsCriterion = tk['minTrialsCriterion']

        if(averageReturnCriterion > 1){
            // Assume percent if user specified above 1
            averageReturnCriterion = averageReturnCriterion / 100 
        }

        var transition = false
        if (this.taskReturnHistory.length >= minTrialsCriterion){
            var averageReturn = np.mean(this.taskReturnHistory.slice(-1 * minTrialsCriterion))
            if(averageReturn >= averageReturnCriterion){
                transition = true
            }
        }

        // Perform transition
        if(transition == true){
            var nextTaskNumber = this.taskNumber + 1 
            var nextTaskReturnHistory = []
            var nextTaskActionHistory = []
            var nextTrialNumberTask = 0 
            var nextLastTrialPackage = undefined 
            var nextEligibleSamplePool = JSON.parse(JSON.stringify(this.imageBags))

            // Check termination condition
            if(this.taskNumber >= this.taskSequence.length-1){
                var onFinish = this.game['onFinish']
                if(onFinish == 'loop'){
                    console.log('Reached end of TASK_SEQUENCE: looping')
                    nextTaskNumber = 0
                }
                else if(onFinish == 'terminate'){
                    console.log('Reached end of TASK_SEQUENCE: terminating')
                    this.TERMINAL_STATE = true 
                }
                else if(onFinish == 'continue'){
                    console.log('Reached end of TASK_SEQUENCE: continuing')
                    this.monitoring = false
                    nextTaskNumber = this.taskNumber
                    nextTaskReturnHistory = this.taskReturnHistory 
                    nextTaskActionHistory = this.taskActionHistory 
                    nextTrialNumberTask = this.trialNumberTask
                    nextLastTrialPackage = this.lastTrialPackage
                    nextEligibleSamplePool = this.eligibleSamplePool
                }
            }

            // Execute transition 
            this.taskNumber = nextTaskNumber
            this.taskReturnHistory = nextTaskReturnHistory
            this.taskActionHistory = nextTaskActionHistory
            this.trialNumberTask = nextTrialNumberTask
            this.lastTrialPackage = nextLastTrialPackage
            this.eligibleSamplePool = nextEligibleSamplePool
        }

        
        return 
    }

    async start_buffering_continuous(){
        var _this = this 

        this.currently_buffering = false
        var bufferTrials = async function(){
      
            if (_this.currently_buffering == true){
                console.log('Currently buffering. Skipping...')
                return 
            }

            var numTrialsInTaskQueue = _this.trialq[_this.taskNumber].length
            if(numTrialsInTaskQueue < _this.maxTrialsInQueuePerTask){
                // Lock (only one buffer process at a time)
                _this.currently_buffering = true
                var trialRequests = []
                var numTrialsToBuffer = 5 // Math.min(Math.round((_this.maxTrialsInQueuePerTask - numTrialsInTaskQueue)/2), 10)
                for (var t = 0; t < numTrialsToBuffer; t++){
                    trialRequests.push(_this.buffer_trial(_this.taskNumber))
                }
                console.log('Buffering', trialRequests.length, 'trials')
                await Promise.all(trialRequests)
                
                // Unlock
                _this.currently_buffering = false
            }
            else{
                console.log('Trial buffer is FILLED with ', _this.trialq[_this.taskNumber].length, 'trials. Continuing...')
            }

            // Manage queues for other tasks 
            if (_this.game['onFinish'] != 'loop'){
                // Delete queues for previous taskNumbers
                for(var t = 0; t<_this.taskNumber; t++){
                    if(_this.trialq[t]== undefined){
                        continue
                    }

                    if(_this.trialq[t].length>0){
                        console.log('Clearing queue for taskNumber', _this.taskNumber)
                        _this.trialq[t] = undefined
                    }
                }
            } 
        }

        // when the task is inactive, buffer trials (up to a point)
        window.setInterval(bufferTrials, 10000)
    }
}




