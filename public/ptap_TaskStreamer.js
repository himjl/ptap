class TaskStreamerClass2{
    constructor(
        ImageBuffer, 
        taskSequence,
        imageBags, 
        ){

        this.IB = ImageBuffer
        this.imageBags = imageBags
        this.taskSequence = taskSequence 
        
        var initialState = undefined
        // Viewing information (for rendering canvases of appropriate size)
        this.TERMINAL_STATE = false 

        this.tasks = []

        this.assetId2Hash = {} // key: generator provided asset id. value: hash
        this.hash2assetId = {} // key: hash. value: generator provided asset id
        this.currentHashCounter = 0 

        for (var tkNumber = 0; tkNumber < this.taskSequence.length; tkNumber ++){
            var taskType = this.taskSequence[tkNumber]['taskType']
            if (taskType == 'SR'){
                this.tasks.push(new StimulusResponseGenerator(this.IB, this.imageBags, this.taskSequence[tkNumber], initialState))    
            }
            else if (taskType == 'MTS'){
                throw "MTS not implemented yet"
                //this.tasks.push(new MTSGenerator(this.IB, this.imageBags, this.taskSequence[tkNumber], this.canvasBank))  
            }
        }

        // TaskStreamer state 

        // Data objects

        // dataframe 1: agent behavior 
        this.AB = {}
        this.AB.actionX = [] // x (playspace proportion?) action; current action ()
        this.AB.actionY = [] // y (playspace proportion?)
        this.AB.actionIndex = [] // indexes action region
        this.AB.reward = [] // reward; reflective of past actions
        this.AB.stateHash = []  // retrieved from generator
        this.AB.timestampStartFrames = [] // first kickoff of frame 
        this.AB.timestampEndFrames = [] // last frame concluded at 
        this.AB.timestampAction = [] // action initiated at...
        this.AB.taskNumber = [] // indexes stateTableSequence
        this.AB.stepNumber = []
        this.AB.taskType = []

        // frame data
        this.AB.assetIdHash = [] // entry is a list of lists
        this.AB.frameTimestamp = [] // list of arrays of timestamps 
        this.AB.actionRegionsX = [] // list of action regions 
        this.AB.actionRegionsY = [] 
        this.AB.actionRegionsDiameter = [] 

        // dataframe 2: environment state history 
        this.stateTableSequence = []

        this.taskNumber = 0
    }

    async get_step(){
        var stepPackage = await this.tasks[this.taskNumber].get_step()
        this.lastStepPackage = stepPackage 

        this.lastReward = stepPackage['reward']
        this.lastStateHash = stepPackage['stateHash']
        this.lastStepNumber = stepPackage['stepNumber']
        return stepPackage
    }

    deposit_step_outcome(stepOutcomePackage){

        var action = stepOutcomePackage['action']
        var frameTimestamps = stepOutcomePackage['frameTimestamps']
        this.tasks[this.taskNumber].deposit_action(action)


        // Update behavior ledger 
        this.AB.actionX.push(action['x']) // x (playspace proportion?) action; current action ()
        this.AB.actionY.push(action['y'])// y (playspace proportion?)
        this.AB.actionIndex.push(action['actionIndex']) // indexes action region
        this.AB.timestampAction.push(action['timestamp']) // action initiated at...
        this.AB.reward.push(this.lastReward) // reward; reflective of past actions
        this.AB.stateHash.push(this.lastStateHash)  // retrieved from generator
        this.AB.timestampStartFrames.push(frameTimestamps[0]) // first kickoff of frame 
        this.AB.timestampEndFrames.push(frameTimestamps[frameTimestamps.length-1]) // last frame concluded at 
        this.AB.frameTimestamp.push(frameTimestamps) // list of arrays of timestamps 
        this.AB.taskNumber.push(this.taskNumber)
        this.AB.stepNumber.push(this.lastStepNumber)
        this.AB.taskType.push(this.taskSequence[this.taskNumber]['taskType'])

        // Update frame ledger
        var assetId = this.lastStepPackage['assetId']
        if (this.assetId2Hash[assetId] == undefined){
            this.assetId2Hash[assetId] = this.currentHashCounter + 1 
            this.currentHashCounter += 1 
            this.hash2assetId[this.currentHashCounter] = assetId
        }

        this.AB.assetIdHash.push(this.assetId2Hash[assetId])
        this.AB.actionRegionsX.push(this.lastStepPackage['actionRegions']['x']) // list of action regions 
        this.AB.actionRegionsY.push(this.lastStepPackage['actionRegions']['y'])
        this.AB.actionRegionsDiameter.push(this.lastStepPackage['actionRegions']['diameter'])


        // Check if current generator determined that the transition criterion was met
        if(this.tasks[this.taskNumber].can_transition()){
            this.taskNumber+=1
            this.stateHashSequence.push(this.tasks[this.taskNumber].get_state_table())
            if(this.taskNumber > this.taskSequence.length){
                this.TERMINAL_STATE = true

            }
        }

    }
}

class StimulusResponseGenerator{
    constructor(IB, imageBags, taskParams, initialState){
        // taskParams: entry of TASK_SEQUENCE

        this.IB = IB // Imagebuffer
        this.imageBags = imageBags
        this.taskParams = taskParams 
        this.state = initialState 

        // Canvases needed to run the task
        this.canvasFixation = Playspace2.get_new_canvas('SR_fixation')
        this.canvasStimulus = Playspace2.get_new_canvas('SR_stimulus')
        this.canvasDelay = Playspace2.get_new_canvas('SR_delay')
        this.canvasChoice = Playspace2.get_new_canvas('SR_choice')
        this.canvasPunish = Playspace2.get_new_canvas('SR_punish')
        this.canvasReward = Playspace2.get_new_canvas("SR_reward")

        // Fill out what you can
        Playspace2.fill_gray(this.canvasFixation)
        Playspace2.fill_gray(this.canvasStimulus)
        Playspace2.fill_gray(this.canvasDelay)
        Playspace2.fill_gray(this.canvasChoice)
        Playspace2.draw_reward(this.canvasReward)
        Playspace2.draw_punish(this.canvasPunish)

        // Initiation button and eye fixation dot
        Playspace2.draw_circle(this.canvasFixation, 
            this.taskParams['fixationXCentroid'], 
            this.taskParams['fixationYCentroid'], 
            Playspace2.deg2propX(this.taskParams['fixationDiameterDegrees']), 'white')

        Playspace2.draw_eye_fixation_dot(this.canvasFixation, 0.5, 0.5)

        // Choice screen 
        for (var a in this.taskParams['actionXCentroid']){
            Playspace2.draw_circle(this.canvasChoice, this.taskParams['choiceXCentroid'][a], 
                this.taskParams['choiceYCentroid'][a], Playspace2.deg2propX(this.taskParams['choiceDiameterDegrees'][a]), 'white')    
        }
        
        this.currentStepNumber = 0 

        this.stateTable = {} // stateHash to meta 
    }

    can_transition(){
        return false
    }

    get_state_table(){
        // Return whatever you want (JSON-like)
        // Hopefully, with key: stateHash, value: whatever state info 
        return this.stateTable
    }

    async deposit_action(action){
        this.currentStepNumber+=1
        if (this.currentStepNumber > 2){
            this.currentStepNumber = 0
        }
        if (this.actionHistory == undefined){
            this.actionHistory = []
        }

        this.actionHistory.push(action)

    }

    async buffer_trial(){

        // Called before fixation is presented. 

        var sampleBag = np.choice(this.taskParams['sampleBagNames'])
        var sampleId = np.choice(this.imageBags[sampleBag])
        var sampleImage = await this.IB.get_by_name(sampleId)
        Playspace2.draw_image(this.canvasStimulus, sampleImage, 0.5, 0.5, Playspace2.deg2propX(8))

        this.rewardMap = this.taskParams['rewardMap'][sampleBag]
        this.currentSampleBag = sampleBag
        this.currentSampleId = sampleId 
        


    }

    async update_state_hash_table(stepNumber, reward){
        var stateHash = 'SR'
        var latentString = ''

        var stateMetaData = {} 

        if (stepNumber == 0){
            // fixation
            stateHash+='_F'

        }
        else if (stepNumber == 1){
            // stimulus and choice screen
            stateHash+='_SC'

        }
        else if (stepNumber == 2){
            // reward or punish screen 
            if (reward > 0){
                stateHash+='_R'
            }
            else{
                stateHash+='_P'
            }
        }
        
        //var hash = latentString.hashCode()
        //stateHash = stateHash + '_' + hash


        // Update hash code 

        return stateHash
    }
    async get_step(){
        if (this.currentStepNumber == undefined){
            this.currentStepNumber = 0
        }

        var frameData = {}
        var actionRegions = {}
        var soundData = {}
        var reward = 0
        var actionTimeoutMsec = 0

        var assetId = undefined 

        if (this.currentStepNumber == 0){

            await this.buffer_trial() // Buffer before presenting the fixation
            // Run fixation

            frameData['canvasSequence'] = [this.canvasFixation]
            frameData['durationSequence'] = [0]
            actionRegions['x'] = this.taskParams['fixationXCentroid']  // playspace units
            actionRegions['y'] = this.taskParams['fixationYCentroid']  // playspace units
            actionRegions['diameter'] = Playspace2.deg2propX(this.taskParams['fixationDiameterDegrees'])
            actionTimeoutMsec = undefined
            reward = 0 
            assetId = 'fxdot'
        }
        else if(this.currentStepNumber == 1){
            // Run stimulus, (optionally) delay, and choice

            frameData['canvasSequence'] = [this.canvasStimulus, this.canvasChoice]
            frameData['durationSequence'] = [200, 0]

            actionRegions['x'] = this.taskParams['actionXCentroid']  // playspace units
            actionRegions['y'] = this.taskParams['actionYCentroid']  // playspace units
            actionRegions['diameter'] = Playspace2.deg2propX(this.taskParams['actionDiameterDegrees'])
            actionTimeoutMsec = 5000
            reward = 0
            assetId = this.currentSampleId
        }

        else if(this.currentStepNumber == 2){
            // Run reinforcement screen (based on user action)
            var reward = this.rewardMap[this.actionHistory[this.actionHistory.length-1]['actionIndex']]
            if (reward >= 1){
                // Reward screen
                frameData['canvasSequence'] = [this.canvasReward, this.canvasReward]
                frameData['durationSequence'] = [200, 0]
                actionRegions['x'] = 0
                actionRegions['y'] = 0
                actionRegions['diameter'] = 0
                actionTimeoutMsec = 0
                soundData['soundName'] = 'reward_sound'
                reward = 1
                assetId = 'Rgn'
            }

            else{
                // Punish screen screen
                frameData['canvasSequence'] = [this.canvasPunish, this.canvasPunish]
                frameData['durationSequence'] = [2000, 0]
                actionRegions['x'] = 0
                actionRegions['y'] = 0
                actionRegions['diameter'] = 0
                actionTimeoutMsec = 0
                soundData['soundName'] = 'punish_sound'
                reward = 0
                assetId = 'Pbk'
            }
        }

        var stateHash = this.update_state_hash_table(this.currentStepNumber, reward)


        var stepPackage = {
            'frameData':frameData, 
            'soundData':soundData,
            'actionRegions':actionRegions, 
            'actionTimeoutMsec':actionTimeoutMsec,
            'reward':reward, 
            'stateHash':stateHash, 
            'assetId':assetId,
            'stepNumber':this.currentStepNumber}

        return stepPackage
    }

}



