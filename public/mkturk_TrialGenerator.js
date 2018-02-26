class TrialGeneratorClass{
    constructor(IB, imageBags, taskSequence, onFinish){
        this.IB = IB 
        this.taskSequence = taskSequence
        this.imageBags = imageBags

        this.trialBuffer = {} // taskNumber : {bagName: [tP] }

        this.maxTrialsInQueuePerTask = 50 
        this.numTrialsInQueue = 0

        this.taskNumber = 0
        this.onFinish = onFinish

    }

    async build(taskNumber, num_trials_per_stage_to_prebuffer){
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
        for (var t = taskNumber; t<this.taskSequence.length; t++){
            for (var i_trial = 0; i_trial < num_trials_per_stage_to_prebuffer; i_trial++){
                var sampleBagName = np.choice(this.taskSequence[t]['sampleBagNames'])
                trial_requests.push(this.buffer_trial(t, sampleBagName))
            }
        }
        console.log('Prebuffering ', this.taskSequence.length * num_trials_per_stage_to_prebuffer, ' trials')
        await Promise.all(trial_requests)

        this.taskNumber = taskNumber
    }


    async get_trial(taskNumber, bagSamplingWeights){
        this.taskNumber = taskNumber
        // Selects the imagebag for the trialPackage based on bagSamplingWeights (if supplied). 
        // Otherwise, select among the bags with uniform probability. 

        // returns a trialPackage on demand
        var tk = this.taskSequence[taskNumber]
        var sampleBagName = np.choice(tk['sampleBagNames'], 1, undefined, bagSamplingWeights)

        if (this.trialBuffer[taskNumber] == undefined){
            await this.buffer_trial(taskNumber, sampleBagName)
        }
        if (this.trialBuffer[taskNumber][sampleBagName] == undefined){
            await this.buffer_trial(taskNumber, sampleBagName)
        }

        var tP = this.trialBuffer[taskNumber][sampleBagName].shift() // .shift() removes first element and returns

        return tP 
    }


    async buffer_trial(taskNumber, sampleBagName){
        // Seed 
        // Math.seedrandom(trialSeed)

        if (sampleBagName == undefined){
            var sampleBagName = np.choice(this.taskSequence[taskNumber]['sampleBagNames'])
        }

        // Assemble
        var tP = {}
        var tk = this.taskSequence[taskNumber]
        var punishTimeOutMsec = tk['punishTimeOutMsec'] 

        // Select sample bag
        var sampleBag = sampleBagName
        var sampleId = np.choice(this.imageBags[sampleBag])
        var sampleIdx = this.get_image_idx(sampleBag, sampleId)
    
        
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
            var rewardMap = np.zeros(choiceId.length)
            rewardMap[choiceId.indexOf(correctId)] = 1 

        }
        
        // Construct image request 
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

        if(this.trialBuffer[taskNumber] == undefined){
            this.trialBuffer[taskNumber] = {}
        }
        if(this.trialBuffer[taskNumber][sampleBagName] == undefined){
            this.trialBuffer[taskNumber][sampleBagName] = []
        }
        this.trialBuffer[taskNumber][sampleBagName].push(tP)
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

    async start_buffering_continuous(){
        var _this = this 

        this.currently_buffering = false
        var bufferTrials = async function(){
      
            if (_this.currently_buffering == true){
                console.log('Currently buffering. Skipping...')
                return 
            }

            var numTrialsInTaskQueue = 0 
            for (var bg in _this.trialBuffer[_this.taskNumber]){
                if(! _this.trialBuffer[_this.taskNumber].hasOwnProperty(bg)){
                    continue
                }
                numTrialsInTaskQueue+=_this.trialBuffer[_this.taskNumber][bg].length
            }
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
                console.log('Trial buffer is FILLED with ', numTrialsInTaskQueue, 'trials. Continuing...')
            }

            // Manage queues for other tasks 
            if (_this.onFinish != 'loop'){
                // Delete queues for previous taskNumbers
                for(var t = 0; t<_this.taskNumber; t++){
                    console.log('Clearing queue for tasks before taskNumber', _this.taskNumber)
                    _this.trialBuffer[t] = undefined
                }
            } 
        }

        window.setInterval(bufferTrials, 10000)
    }
}