class TaskStreamer{
    constructor(Game, ImageBags, checkpoint){
        this.Game = Game
        this.ImageBags = ImageBags
        
        // State info
        this.taskNumber = checkpoint['taskNumber'] || 0 
        this.trialNumberTask = checkpoint['trialNumberTask'] || 0
        this.taskReturnHistory = checkpoint['taskReturnHistory'] || [] 

    }

    get_trial(i){
        // called at the beginning of each trial 
        // returns images, reward maps, and other necessary things for runtrial()
        var trial_idx = i || this.state['trialNumberTask']
        var trialPackage = {}

        trialPackage['i_fixationBag'] = 0 
        trialPackage['i_fixationId'] = 0 
        trialPackage['fixationReward'] = undefined 
        trialPackage['fixationPlacement'] = undefined
        trialPackage['fixationRewardSoundName'] = undefined
        trialPackage['fixationRewardVisual'] = undefined

        trialPackage['i_sampleBag'] = 0
        trialPackage['i_sampleId'] = 0
        trialPackage['samplePlacement'] = 0 
        
        trialPackage['i_testBag'] = [0,1]
        trialPackage['i_testId'] = [0,1] // [0, 1,]
        trialPackage['testPlacement'] = [0,1] 
        
        trialPackage['choiceRewardAmounts'] = []
        trialPackage['choiceCentroids'] = []
        trialPackage['choiceScales'] = []

        trialPackage['sampleOn'] = 0 
        trialPackage['sampleOff'] = 0
        trialPackage['choiceTimeLimit'] = 0 
        trialPackage['punishTimeOut'] = 0
        return trialPackage
    }

    async update_state(rewardAmount){
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
                TERMINAL_STATE = true
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

    selectTestImagesSR(E['TestImageBagNames'], RNGseed){
        
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

    selectTestImagesMTS(E['TestImageBagNames'], sample_bag_index, nway, RNGseed){
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
                        TERMINAL_STATE = true
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

    

    async build(num_trials_per_stage_to_prebuffer){
        num_trials_per_stage_to_prebuffer = num_trials_per_stage_to_prebuffer || 10
        console.log('Constructing new trial queue')


        var Experiment = this.Game
        this.EXPERIMENT_hash = JSON.stringify(Experiment).hashCode()

    

        // Prebuffer stages of Game
        for (var i_stage = 0; i_stage < Experiment.length; i_stage++){

            var _tk = Experiment[i_stage]

            
            if(i_stage == this.state['current_stage']){
                var start_trial_number = this.state['current_stage_trial_number']                 
            }
            else{
                var start_trial_number = 0
            }

            updateProgressbar((i_stage+1)/Experiment.length*100, 'AutomatorLoadBar', 'Stages loaded:')
            
            var image_requests = new Set()
            for (var i_trial = start_trial_number; i_trial < start_trial_number + num_trials_per_stage_to_prebuffer; i_trial++){
                var _RNGseed = cantor(i_trial, _tk['samplingRNGseed'])
                var sample = this.selectSampleImage(_tk['SampleImageBagNames'], _RNGseed)

                // SR or MTS 
                if (_tk['Task'] == 'SR'){
                    var test = this.selectTestImagesSR(_tk['TestImageBagNames'], _RNGseed)
                }
                else if(_tk['Task'] == 'MTS'){
                    var nway = _tk['Nway'] || 2
                    var test = this.selectTestImagesMTS(_tk['TestImageBagNames'], sample['bag_index'], nway, _RNGseed)
                }
                
                image_requests.add(sample['image_name'])
                for (var i_test = 0; i_test<test['image_name'].length; i_test++){
                    image_requests.add(test['image_name'][i_test])
                }
                
                await this.IB.cache_these_images(image_requests)
            }

            wdm('Loaded stage '+(i_stage+1)+' of '+Experiment.length)
        }

        this._initial_state = JSON.parse(JSON.stringify(this.state))

        return 
    }

    
    _generate_default_state(){
        this.state['current_stage'] = 0
        this.state['current_stage_trial_number'] = 0
        this.state['returns_in_stage'] = []
    }
}




