class StimulusResponseGenerator{
    constructor(ImageBuffer, imageBags, taskParams, initialState){
        // taskParams: entry of TASK_SEQUENCE

        this.IB = ImageBuffer // Imagebuffer
        this.imageBags = imageBags
        this.taskParams = taskParams 
        this.state = initialState 
        
        this.actionHistory = []
        this.rewardHistory = []

        this.initialize_canvases()
        
        this.behavioral_data = {} // "agent behavior"
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

        this.stateTable = {} // stateHash to meta 
        this.trialNumberTask = 0

        $("#LoadStatusTextBox").html('Done loading. Start playing!')
        $("#LoadStatusTextBox").css('opacity', 0.1)
        $("#LoadStatusTextBox").css('font-size', 10)

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

        console.log(averageReward)
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
  
        this.actionHistory.push(action)

        // Update internal behavior

    }

    async buffer_trial(){

        // Called before fixation is presented. 

        var sampleBag = np.choice(this.taskParams['sampleBagNames'])
        var sampleId = np.choice(this.imageBags[sampleBag])
        var sampleImage = await this.IB.get_by_name(sampleId)
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

        var assetId = undefined 

        if (this.currentStepNumber == 0){

            await this.buffer_trial() // Buffer before presenting the fixation
            // Run fixation

            frameData['canvasSequence'] = [this.canvasFixation]
            frameData['durationSequence'] = [0]
            actionRegions['x'] = this.taskParams['fixationXCentroid']  // playspace units
            actionRegions['y'] = this.taskParams['fixationYCentroid']  // playspace units
            actionRegions['diameter'] = Playspace.deg2propX(this.taskParams['fixationDiameterDegrees'])
            actionTimeoutMsec = undefined
            reward = 0 
            assetId = 'fixationDot'
        }
        else if(this.currentStepNumber == 1){
            // Run stimulus, (optionally) delay, and choice

            frameData['canvasSequence'] = [this.canvasStimulus, this.canvasChoice]
            frameData['durationSequence'] = [200, 0]

            actionRegions['x'] = this.taskParams['actionXCentroid']  // playspace units
            actionRegions['y'] = this.taskParams['actionYCentroid']  // playspace units
            actionRegions['diameter'] = Playspace.deg2propX(this.taskParams['actionDiameterDegrees'])
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
                assetId = 'rewardScreenGreen'
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
                assetId = 'punishScreenBlack'
            }


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

