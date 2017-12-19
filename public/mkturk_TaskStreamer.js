class TaskStreamerClass{
    constructor(Game, taskSequence, ImageBags, IB, CheckPointer){
        this.Game = Game
        this.taskSequence = taskSequence
        this.imageBags = ImageBags
        this.IB = IB 
        this.CheckPointer = CheckPointer
        
        // State info
        this.taskNumber = CheckPointer.getTaskNumber() || 0 
        this.trialNumberTask = CheckPointer.getTrialNumberTask() || 0
        this.taskReturnHistory = CheckPointer.getTaskReturnHistory() || [] 

        this.TERMINAL_STATE = false
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
            var choiceId = rewardMap.map(function(entry){return 'dot'})
            var choiceIdx = rewardMap.map(function(entry){return {'bag':undefined, 'id':undefined}})
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
        tP['sampleImage'] = await this.IB.get_by_name(sampleId)
        tP['choiceImage'] = await Promise.all(choiceId.map(function(entry){_this.IB.get_by_name(entry)})) 

        tP['choiceImage'] = [await this.IB.get_by_name(choiceId[0]), 
        await this.IB.get_by_name(choiceId[1])]

        //await Promise.all(choiceId.map(function(entry){_this.IB.get_by_name(entry)})) 

        
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
    async update_state(trialOutcome){
        var rewardAmount = trialOutcome['return']
        // update counters 
        this.taskReturnHistory.push(rewardAmount)


        // Check if transition criterion is met
        var transitionCriterionMet = false
        var averageReturnCriterion = this.Game[this.taskNumber]['averageReturnCriterion']
        var minTrialsCriterion = this.Game[this.taskNumber]['minTrialsCriterion']
        
        if (this.taskReturnHistory.length < minTrialsCriterion){
            return 
        }

        var lastNreturns = this.taskReturnHistory.slice(-1 * minTrialsCriterion) 
        if(averageReturn >= np.mean(lastNreturns)){
            transitionCriterionMet = true
        }

        if (transitionCriterionMet == true){
            this.taskNumber++ 
            this.trialNumberTask = 0
            this.taskReturnHistory = []
        }
        
        // Check if at the end of the game (then repeat, continue, or terminate).
        if (this.taskNumber > this.Game['taskSequence'].length){
            var endBehavior = this.Game['onFinish']

            // Terminate task
            if (endBehavior == 'terminate'){
                this.TERMINAL_STATE = true
            }
            // Continue current stage
            else if (endBehavior == 'continue'){
                this.taskNumber--
                this.trialNumberTask = 0 
                this.taskReturnHistory = []
            }
            // Start over from beginning (default behavior)
            else{
                this.taskNumber = 0 
                this.trialNumberTask = 0 
                this.taskReturnHistory = []
            }
        }

        return
    }

    async get_checkpoint(){
        var checkpoint
        return checkpoint
    }


    selectSampleImage(SampleBagNames, RNGseed){
    
        Math.seedrandom(RNGseed)

        // Select sample class 
        var num_classes = SampleBagNames.length
        var selected_bag_index = Math.floor(Math.random()*num_classes)

        var selected_bag_name = SampleBagNames[selected_bag_index]

        // Select image inside of that class
        var num_bag_images = this.ImageBags[selected_bag_name].length
        var selected_image_index = Math.floor(Math.random() * num_bag_images)
        var selected_image_name = this.ImageBags[selected_bag_name][selected_image_index]

        var sample = {'bag_name':selected_bag_name, 
                        'bag_index':selected_bag_index,
                        'image_index':selected_image_index, 
                        'image_name': selected_image_name}

        return sample
    }

    selectTestImagesSR(){
        
        Math.seedrandom(RNGseed)

        // Select distractor (SR)
        var num_classes = E['TestImageBagNames'].length

        var test = {}
        test['bag_name'] = []
        test['bag_index'] = []
        test['image_index'] = []
        test['image_name'] = []

        for (var i_choice_class = 0; i_choice_class<num_classes; i_choice_class++){
            // Get name of class
            var bag_name = E['TestImageBagNames'][i_choice_class]

            // Select image inside of that class 
            var test_image_index = Math.floor(Math.random()*this.ImageBags[bag_name].length)
            var test_image_name = this.ImageBags[bag_name][test_image_index]

            test['bag_name'].push(bag_name)
            test['bag_index'].push(i_choice_class)
            test['image_index'].push(test_image_index)
            test['image_name'].push(test_image_name)
        }


        return test 
    }

    selectTestImagesMTS(sample_bag_index, nway, RNGseed){
        // Guarantees one of the images is from E['TestImageBagNames'][sample_bag_index]
        // returns nway images 

        Math.seedrandom(RNGseed)

        // Select distractor (SR)
        var num_distractors = nway - 1

        var test = {}
        test['bag_name'] = []
        test['bag_index'] = []
        test['image_index'] = []
        test['image_name'] = []

        // Randomly select the token for the sample class
        var samplebag_name = E['TestImageBagNames'][sample_bag_index]


        var sample_image_index = Math.floor(Math.random()*this.ImageBags[samplebag_name].length)
        test['bag_name'].push(E['TestImageBagNames'][sample_bag_index])
        test['bag_index'].push(sample_bag_index)
        test['image_index'].push(sample_image_index)
        test['image_name'].push(this.ImageBags[samplebag_name][sample_image_index])

        // Randomly select distractors

        var DistractorBagNames = JSON.parse(JSON.stringify(E['TestImageBagNames']))// so it doesn't overwrite input arg
        DistractorBagNames.splice(sample_bag_index, 1)
        DistractorBagNames = shuffle(DistractorBagNames, RNGseed) // random order

        var _cnt = 0 // num distractors added 
        for (var i_choice_class = 0; i_choice_class<DistractorBagNames.length; i_choice_class++){
            if(DistractorBagNames[i_choice_class] == samplebag_name){
                continue 
                // If test image the match of sample, continue.
            }
            
            if(_cnt == nway-1){
                break 
            }

            var bag_name = DistractorBagNames[i_choice_class]

            // Select image inside of that class that is not same as sample
            var test_image_index = Math.floor(Math.random()*this.ImageBags[bag_name].length)
            var test_image_name = this.ImageBags[bag_name][test_image_index]

            test['bag_name'].push(bag_name)
            test['bag_index'].push(Object.keys(this.ImageBags).indexOf(bag_name)) // todo: possibly performance heavy with many imagebags
            test['image_index'].push(test_image_index)
            test['image_name'].push(test_image_name)
            _cnt++
        }


        return test 
    }


    

    _check_transition_criterion(){
        var min_trials = this.Game[this.state['current_stage']]['MinTrialsCriterion']
        var average_return_criterion = this.Game[this.state['current_stage']]['AverageReturnCriterion']
        if (average_return_criterion > 1){
            // assume user meant percent
            average_return_criterion = average_return_criterion / 100
            console.log('User specified averageReturnCriterion as >1. Assuming percent..', average_return_criterion)

        }
   

        if(min_trials == undefined 
            || min_trials <=0 
            || average_return_criterion == undefined
            || average_return_criterion < 0){
            return false
        }

        if(this.state['returns_in_stage'].length < min_trials){
            // Haven't reached minimum number of trials
            return false 
        }

        var average_return_for_last_min_trials = (this.state['returns_in_stage'].slice(-1 * min_trials).reduce(add, 0)) / min_trials
        wdm('Average return for last '+min_trials+': '+average_return_for_last_min_trials)
        if(average_return_for_last_min_trials >= average_return_criterion){
            return true
        }
        else if(average_return_for_last_min_trials < average_return_criterion){
            return false
        }
    }

    update_state(current_trial_outcome){
       // trial_behavior: the just-finished trial's behavior. 
        // called at the end of every trial. 
        // Update trial object 

        return 
        var Return = current_trial_outcome['Return']

        var action = current_trial_outcome['Response_GridIndex']
        this.lastActions.push(action)
        this.lastReturns.push(Return)

        if(this.actionReturns[action] == undefined){
            this.actionReturns[action] = []
        }
        this.actionReturns[action].push(Return)

        
        

        this.trial_behavior = this.update_behavior_records(this.trial_behavior, current_trial_outcome)

        var _repeat_if_wrong_probability = this.Game[this.state.current_stage]['probability_repeat_trial_if_wrong'] || 0
        if(Return == 0){

            var repeat_rng_seed = cantor(this.state['current_stage'], this.Game[this.state.current_stage]['samplingRNGseed'])
            var repeat_rng_seed = cantor(repeat_rng_seed, Math.round(performance.now()/100))
            Math.seedrandom(repeat_rng_seed)

            if(Math.random() < _repeat_if_wrong_probability){
                console.log('repeating TRIAL because of wrong response')
                this.state['current_stage_trial_number'] = this.state['current_stage_trial_number'] // Repeat trial
            }
            else{
                this.state['current_stage_trial_number']++
            }
        }
        else{
            this.state['current_stage_trial_number']++ // Equivalent to number of trials completed
        }
        
            
        this.state['returns_in_stage'].push(Return) 

        // Check transition criterion, if monitoring 
        if(this._done_monitoring == false){
            var transition_criterion_met = this._check_transition_criterion()
            if(transition_criterion_met == true){
                updateProgressbar(this.state['current_stage_trial_number']+1 / this.Game.length*100, 'StageBar', 'Stages finished:')
                
                if(this.state['current_stage'] + 1 >= this.Game.length){
                    // Out of stages; start looping or continue current stage 
                    if (this.on_finish == 'loop'){
                        this.state['current_stage'] = 0 
                        this.state['current_stage_trial_number'] = 0
                        this.state['returns_in_stage'] = [] 
                    }
                    else if(this.on_finish == 'terminate' ){
                        this.TERMINAL_STATE = true
                        return 
                    }
                    else if(this.on_finish == 'continue'){
                        this._done_monitoring = true
                    }
                    else{
                        // just loop (default)
                        this.state['current_stage'] = 0 
                        this.state['current_stage_trial_number'] = 0
                        this.state['returns_in_stage'] = [] 
                    }
                }
                else{
                    this.state['current_stage']++
                    this.state['current_stage_trial_number'] = 0 
                    this.state['returns_in_stage'] = []
                }            
            }
        }
    }

    

    
    
    _generate_default_state(){
        this.state['current_stage'] = 0
        this.state['current_stage_trial_number'] = 0
        this.state['returns_in_stage'] = []
    }
}




