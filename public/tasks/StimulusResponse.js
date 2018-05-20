class StimulusResponseGenerator{
    constructor(ImageBuffer, imageBags, taskParams, initialState){

        this.IB = ImageBuffer // Imagebuffer
        this.imageBags = imageBags
        this.taskParams = taskParams 
        this.state = initialState 
        
        this.actionHistory = []
        this.rewardHistory = []

        this.initialize_canvases()
        
        this.behavioral_data = {} 
        this.behavioral_data['trialNumberTask'] = []
        this.behavioral_data['return'] = []
        this.behavioral_data['sampleBag'] = []
        this.behavioral_data['sampleId'] = []
        this.behavioral_data['action'] = []
        this.behavioral_data['responseX'] = []
        this.behavioral_data['responseY'] = []
        this.behavioral_data['fixationX'] = []
        this.behavioral_data['fixationY'] = []
        this.behavioral_data['timestampStart'] = []
        this.behavioral_data['timestampFixationOnset'] = []
        this.behavioral_data['timestampFixationAcquired'] = []
        this.behavioral_data['timestampResponse'] = []
        this.behavioral_data['timestampReinforcementOn'] = []
        this.behavioral_data['timestampReinforcementOff'] = []
        this.behavioral_data['timestampStimulusOn'] = []
        this.behavioral_data['timestampStimulusOff'] = []
        this.behavioral_data['timestampChoiceOn'] = []
        this.behavioral_data['reactionTime'] = []

        this.trialNumberTask = 0
        this.lastActionIndex = undefined

    }

    initialize_canvases(){
        // Canvases needed to run the task
        this.canvasFixation = Playspace.get_new_canvas('SR_fixation')
        this.canvasStimulus = Playspace.get_new_canvas('SR_stimulus')
        this.canvasDelay = Playspace.get_new_canvas('SR_delay')
        this.canvasChoice = Playspace.get_new_canvas('SR_choice')
        this.canvasPunish = Playspace.get_new_canvas('SR_punish')
        this.canvasReward = Playspace.get_new_canvas("SR_reward")

        // Fill out what you can
        Playspace.fill_gray(this.canvasFixation)
        Playspace.fill_gray(this.canvasStimulus)
        Playspace.fill_gray(this.canvasDelay)
        Playspace.fill_gray(this.canvasChoice)
        Playspace.draw_reward(this.canvasReward)
        Playspace.draw_punish(this.canvasPunish)

        // Initiation button and eye fixation dot
        Playspace.draw_circle(this.canvasFixation, 
            this.taskParams['fixationXCentroid'], 
            this.taskParams['fixationYCentroid'], 
            Playspace.deg2propX(this.taskParams['fixationDiameterDegrees']), 'white')

        Playspace.draw_eye_fixation_cross(this.canvasFixation, 0.5, 0.5)

        // Choice screen 
        for (var a in this.taskParams['actionXCentroid']){
            Playspace.draw_circle(this.canvasChoice, this.taskParams['choiceXCentroid'][a], 
                this.taskParams['choiceYCentroid'][a], Playspace.deg2propX(this.taskParams['choiceDiameterDegrees'][a]), 'white')    
        }
    }

    can_transition(){
        var minTrialsCriterion = this.taskParams['minTrialsCriterion']
        var averageReturnCriterion = this.taskParams['averageReturnCriterion']

        if (minTrialsCriterion == undefined){
            return false 
        }
        if (averageReturnCriterion == undefined){
            averageReturnCriterion = 0
        }
        var nstepsPerTrial = 3 
        if(this.rewardHistory.length < minTrialsCriterion * nstepsPerTrial){
            return false
        }
        var sumReward = np.sum(this.rewardHistory.slice(-1 * minTrialsCriterion * nstepsPerTrial))
        var averageReward = sumReward / ( minTrialsCriterion * nstepsPerTrial)

        if(averageReward < averageReturnCriterion / nstepsPerTrial){
            return false
        }

        return true
    }

    async deposit_step_outcome(stepOutcomePackage){
        var action = stepOutcomePackage['action']


        this.currentStepNumber+=1
        if (this.currentStepNumber > 2){
            this.currentStepNumber = 0
        }
        console.log(stepOutcomePackage)
        this.lastStepOutcomePackage = stepOutcomePackage
        this.actionHistory.push(action)
        this.lastActionIndex = action['actionIndex']
        this.lastActionPackage = action
        // Update internal behavior
    }

    async buffer_trial(){

        // Called before fixation is presented. 

        var sampleBag = np.choice(this.taskParams['sampleBagNames'])
        var sampleId = np.choice(this.imageBags[sampleBag])
        var sampleURL = this.imageId_2_url[sampleId]
        var sampleImage = await this.IB.get_by_name(sampleURL)
        Playspace.draw_image(this.canvasStimulus, sampleImage, 0.5, 0.5, Playspace.deg2propX(8))

        this.rewardMap = this.taskParams['rewardMap'][sampleBag]
        this.currentSampleBag = sampleBag
        this.currentSampleId = sampleId 
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

        if (this.currentStepNumber == 0){

            if (this.trialNumberTask > 0){
                this.timestampReinforcementOn =  this.lastStepOutcomePackage['reinforcementTimestamps'][0]
                this.timestampReinforcementOff = this.lastStepOutcomePackage['reinforcementTimestamps'][1]

                // Record results of previous trial
                this.behavioral_data['trialNumberTask'].push(this.trialNumberTask-1)
                this.behavioral_data['return'].push(this.lastTrialReward)
                this.behavioral_data['sampleBag'].push(this.currentSampleBag)
                this.behavioral_data['sampleId'].push(this.currentSampleId)
                this.behavioral_data['action'].push(this.lastChoiceIndex)
                this.behavioral_data['responseX'].push(this.lastChoiceX)
                this.behavioral_data['responseY'].push(this.lastChoiceY)
                this.behavioral_data['fixationX'].push(this.lastFixationX)
                this.behavioral_data['fixationY'].push(this.lastFixationY)
                this.behavioral_data['timestampStart'].push(this.lastFixationT)
                this.behavioral_data['timestampFixationOnset'].push(this.lastFixationOnsetT)
                this.behavioral_data['timestampFixationAcquired'].push(this.lastFixationT)
                this.behavioral_data['timestampResponse'].push(this.timestampResponse)
                this.behavioral_data['timestampReinforcementOn'].push(this.timestampReinforcementOn)
                this.behavioral_data['timestampReinforcementOff'].push(this.timestampReinforcementOff)
                this.behavioral_data['timestampStimulusOn'].push(this.timestampStimulusOn)
                this.behavioral_data['timestampStimulusOff'].push(this.timestampStimulusOff)
                this.behavioral_data['timestampChoiceOn'].push(this.timestampChoiceOn)
                this.behavioral_data['reactionTime'].push(this.timestampResponse - this.timestampChoiceOn)
            }
            this.trialNumberTask+=1
            await this.buffer_trial() // Buffer upcoming trial
            // Run fixation

            frameData['canvasSequence'] = [this.canvasFixation]
            frameData['durationSequence'] = [0]
            actionRegions['x'] = this.taskParams['fixationXCentroid']  // playspace units
            actionRegions['y'] = this.taskParams['fixationYCentroid']  // playspace units
            actionRegions['diameter'] = Playspace.deg2propX(this.taskParams['fixationDiameterDegrees'])
            actionTimeoutMsec = undefined
            reward = 0 
        }
        else if(this.currentStepNumber == 1){

            this.lastFixationX = this.lastActionPackage['x']
            this.lastFixationY = this.lastActionPackage['y']
            this.lastFixationT = this.lastActionPackage['timestamp']
            this.lastFixationOnsetT = this.lastStepOutcomePackage['frameTimestamps'][0]
            // Run stimulus, (optionally) delay, and choice

            frameData['canvasSequence'] = [this.canvasStimulus, this.canvasChoice]
            frameData['durationSequence'] = [200, 0]

            actionRegions['x'] = this.taskParams['actionXCentroid']  // playspace units
            actionRegions['y'] = this.taskParams['actionYCentroid']  // playspace units
            actionRegions['diameter'] = Playspace.deg2propX(this.taskParams['actionDiameterDegrees'])
            actionTimeoutMsec = 5000
            reward = 0
        }

        else if(this.currentStepNumber == 2){

            this.timestampStimulusOn = this.lastStepOutcomePackage['frameTimestamps'][0]
            this.timestampStimulusOff = this.lastStepOutcomePackage['frameTimestamps'][1]
            this.timestampChoiceOn = this.lastStepOutcomePackage['frameTimestamps'].slice(-1)[0]

            this.timestampResponse = this.lastActionPackage['timestamp']
            this.lastChoiceIndex = this.lastActionPackage['actionIndex']
            this.lastChoiceX = this.lastActionPackage['x']
            this.lastChoiceY = this.lastActionPackage['y']
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
            }
            this.lastTrialReward = reward
        }

        var stepPackage = {
            'frameData':frameData, 
            'soundData':soundData,
            'actionRegions':actionRegions, 
            'actionTimeoutMsec':actionTimeoutMsec,
            'reward':reward, 
            }

        this.rewardHistory.push(reward)
        return stepPackage
    }

}

