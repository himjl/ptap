class TaskStreamerClass{
    constructor(Game, taskSequence, ImageBags, IB, CheckPointer){
        this.game = Game
        this.taskSequence = taskSequence
        this.imageBags = ImageBags
        this.IB = IB 
        this.CheckPointer = CheckPointer
        
        // State info
        this.taskNumber = CheckPointer.get_task_number()  
        this.trialNumberTask = CheckPointer.get_trial_number_task() 
        this.trialNumberSession = 0
        this.taskReturnHistory = CheckPointer.get_task_return_history()  
        this.taskActionHistory = CheckPointer.get_task_action_history() 

        this.TERMINAL_STATE = false
        this.monitoring = true

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

             
            var idAlphabetized = (this.imageBags[bag]).sort()
            this.id2idx[bag] = {}
            for (var i_id in idAlphabetized){
                this.id2idx[bag][idAlphabetized[i_id]] = parseInt(i_id)
            }
        }
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

    async get_trial(i){
        // called at the beginning of each trial 
        // returns images, reward maps, and other necessary things for runtrial()
        var trial_idx = i || this.trialNumberTask
        var tP = {}

        var tk = this.taskSequence[this.taskNumber]

        // Select sample bag
        var samplePool = tk['sampleBagNames']
        var sampleBag = np.choice(samplePool)
        var sampleId = np.choice(this.imageBags[sampleBag])
        var sampleIdx = this.get_image_idx(sampleBag, sampleId)

        // SR - select choice
        if (tk['taskType'] == 'SR'){
            var rewardMap = tk['rewardMap'][sampleBag]

            // if custom tokens are specified, use those 

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
                    console.log(potentialSampleBag)
                    continue
                }
                distractorBagIdxPool.push(this.bag2idx[tk['choiceMap'][potentialSampleBag]])
            }

            var distractorBagIdx = np.choice(distractorBagIdxPool, tk['nway']-1, false)
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
            console.log(choiceId)
            console.log(rewardMap)
            console.log(choiceIdx)
        }
        
        // Construct image request 

        var _this = this 
        var imageRequests = []
        imageRequests.push(this.IB.get_by_name(sampleId))
        for (var i in choiceId){
            imageRequests.push(this.IB.get_by_name(choiceId[i]))
        }
    
        var images = await Promise.all(imageRequests)        
        tP['sampleImage'] = images[0]
        tP['choiceImage'] = images.slice(1)
        
        tP['fixationXCentroid'] = tk['fixationXCentroid']
        tP['fixationYCentroid'] = tk['fixationYCentroid']
        tP['fixationRadiusDegrees'] = tk['fixationRadiusDegrees']

        tP['i_sampleBag'] = sampleIdx['bag']
        tP['i_sampleId'] = sampleIdx['id']
        tP['sampleXCentroid'] = tk['sampleXCentroid']
        tP['sampleYCentroid'] = tk['sampleYCentroid'] 
        tP['sampleRadiusDegrees'] = tk['sampleRadiusDegrees']

        tP['i_choiceBag'] = choiceIdx['bag']
        tP['i_choiceId'] = choiceIdx['id']
        tP['choiceXCentroid'] = tk['choiceXCentroid']
        tP['choiceYCentroid'] = tk['choiceYCentroid']
        tP['choiceRadiusDegrees'] = tk['choiceRadiusDegrees']

        tP['actionXCentroid'] = tk['actionXCentroid']
        tP['actionYCentroid'] = tk['actionYCentroid']
        tP['actionRadiusDegrees'] = tk['actionRadiusDegrees']

        tP['choiceRewardMap'] = rewardMap

        tP['sampleOnMsec'] = tk['sampleOnMsec'] 
        tP['sampleOffMsec'] = tk['sampleOffMsec']
        tP['choiceTimeLimitMsec'] = tk['choiceTimeLimitMsec'] 
        tP['punishTimeOutMsec'] = tk['punishTimeOutMsec']
        tP['rewardTimeOutMsec'] = tk['rewardTimeOutMsec']

        return tP
    }

    get_image_id(i_bag, i_id){
        var id = []

        return id
    }

    update_state(current_trial_outcome){
       // trial_behavior: the just-finished trial's behavior. 
        // called at the end of every trial. 
        // Update trial object 

        var tk = this.taskSequence[this.taskNumber]
        var b = current_trial_outcome
        var r = b['return']
        var action = current_trial_outcome['action']

        this.taskReturnHistory.push(r)
        this.taskActionHistory.push(action)
        this.trialNumberTask++
        this.trialNumberSession++
        // TODO - probability repeat if wrong
        //var probabilityRepeatWhenWrong = tk['probabilityRepeatWhenWrong'] || 0
        
        if (this.monitoring == false){
            return
        }

        // Check transition criterion 
        var averageReturnCriterion = tk['averageReturnCriterion']
        var minTrialsCriterion = tk['minTrialsCriterion']

        if(averageReturnCriterion > 1){
            // Assume percent if user specified above 1
            averageReturnCriterion = averageReturnCriterion / 100 
        }

        var transition = false
        if (this.taskReturnHistory.length >= minTrialsCriterion ){
            var averageReturn = np.mean(this.taskReturnHistory.slice(-1 * minTrialsCriterion))
            if(averageReturn >= averageReturnCriterion){
                transition = true
                this.taskNumber++
                this.taskReturnHistory = []
                this.taskActionHistory = []
                this.trialNumberTask = 0
            }
        }

        // Check termination condition
        if(transition == true){
            if(this.taskNumber >= this.taskSequence.length){
                var onFinish = this.game['onFinish']
                if(onFinish == 'loop'){
                    this.taskNumber = 0
                }
                else if(onFinish == 'terminate'){
                    this.TERMINAL_STATE = true 
                }
                else if(onFinish == 'continue'){
                    this.monitoring = false
                }
            }
        }

        // Update checkpoint 
        var checkpointPackage = {
            'taskNumber': this.taskNumber, 
            'trialNumberTask': this.trialNumberTask, 
            'return':r, 
            'action':action
        }
        this.CheckPointer.update(checkpointPackage)
        this.CheckPointer.request_checkpoint_save()
        return 
    }

}




