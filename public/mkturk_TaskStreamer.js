class TaskStreamerClass{
    constructor(gamePackage, IB, CheckPointer){
        this.game = gamePackage['GAME']
        this.imageBags = gamePackage['IMAGEBAGS']
        this.taskSequence = gamePackage['TASK_SEQUENCE']

        this.TG = new TrialGeneratorClass(IB, gamePackage['IMAGEBAGS'], gamePackage['TASK_SEQUENCE'], this.game['onFinish'])

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
        
        
        this.onLoadState = {
            'taskNumber': this.taskNumber,
            'trialNumberTask': this.trialNumberTask,
            'trialNumberSession': this.trialNumberSession,
            'taskReturnHistory': this.taskReturnHistory,
            'taskActionHistory': this.taskActionHistory,
            'taskBagHistory': this.taskBagHistory,
            'TERMINAL_STATE': this.TERMINAL_STATE,
            'monitoring': this.monitoring,
        }

        this.onLoadState = JSON.parse(JSON.stringify(this.onLoadState))

        this.bagSamplingWeights = undefined
    }
    
    async build(num_trials_per_stage_to_prebuffer){
        console.log(this.taskNumber)
        await this.TG.build(this.taskNumber, num_trials_per_stage_to_prebuffer)
    }

    async get_trial(){
        if (this.taskSequence[this.taskNumber]['taskType'] == 'SR'){
            console.log('Executing with sampling weights')
            var tP = await this.TG.get_trial(this.taskNumber, this.bagSamplingWeights)
        }
        else{
            var tP = await this.TG.get_trial(this.taskNumber)
        }
        

        return tP 
    }

    update_state(current_trial_outcome){

        var tk = this.taskSequence[this.taskNumber]
        var r = current_trial_outcome['return']
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

        var viewingWindowWidth = tk['correctionLoopViewingWindowLength'] || 20
        var performanceModulationFactor = tk['correctionLoopPerformanceModulationFactor'] || 0.5 
        if (performanceModulationFactor > 1){
            performanceModulationFactor = 1
        }
        if (performanceModulationFactor < 0){
            performanceModulationFactor = 0 
        }

        
        var freturn = get_sampling_weights(tk['sampleBagNames'], this.TG.idx2bag, viewingWindowWidth, this.taskReturnHistory, this.taskBagHistory, performanceModulationFactor)

        this.bagSamplingWeights = freturn['samplingWeights']
        this.performancePerBag = freturn['performancePerBag']
        this.tStatistic = freturn['tStatistic']
        this.empiricalEffectSize = freturn['empiricalEffectSize']
        this.a = freturn['a']
        this.b = freturn['b']
        this.c = freturn['c']
        this.d = freturn['d']
        this.tStatistic_criticalUb = freturn['tStatistic_criticalUb']
        this.tStatistic_criticalLb = freturn['tStatistic_criticalLb']

        if (tk['repeatSampleBagIfWrong'] != undefined){
            if (tk['repeatSampleBagIfWrong'] == true){
                // Indexes tk['sampleBagNames']
                if (r < 1){
                    var lastBag = current_trial_outcome['sampleBag']
                    var lastBagIdx = tk['sampleBagNames'].indexOf(lastBag)
                    this.bagSamplingWeights = np.xvec(tk['sampleBagNames'].length, 0) // probability = 1 of repeating last bag     
                    this.bagSamplingWeights[lastBagIdx] = 1
                }
            }
        }

        console.log(this.bagSamplingWeights)   
        console.log('t-statistic = ', freturn['tStatistic'], '. ', this.performancePerBag,'abcd = ', this.a, this.b, this.c, this.d)

        // ***************************************

        // Update checkpoint 
        var sampleBag = this.TG.get_bag_from_idx(current_trial_outcome['i_sampleBag'])
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
                }
            }

            // Execute transition 
            this.taskNumber = nextTaskNumber
            this.taskReturnHistory = nextTaskReturnHistory
            this.taskActionHistory = nextTaskActionHistory
            this.trialNumberTask = nextTrialNumberTask
        }

        return 
    }

    async start_buffering_continuous(){
        this.TG.start_buffering_continuous()
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
}




