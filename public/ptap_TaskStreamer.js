class TaskStreamerClass{
    constructor(sessionPackage){

        var taskSequence = sessionPackage['GAME_PACKAGE']['TASK_SEQUENCE']
        var imageBags = sessionPackage['GAME_PACKAGE']['IMAGEBAGS']

        this.IB = new ImageBuffer(S3_IO)
        this.imageBags = imageBags
        this.taskSequence = taskSequence 
        this.behavioral_data = []
        var initialState = undefined
        // Viewing information (for rendering canvases of appropriate size)
        this.TERMINAL_STATE = false 

        this.tasks = []

        for (var tkNumber = 0; tkNumber < this.taskSequence.length; tkNumber ++){
            var taskType = this.taskSequence[tkNumber]['taskType']
            if (taskType == 'SR'){
                this.tasks.push(new StimulusResponseGenerator(this.IB, this.imageBags, this.taskSequence[tkNumber], initialState))  

            }
            else if (taskType == 'MTS'){
                throw "MTS not implemented yet"
                //this.tasks.push(new MTSGenerator(this.IB, this.imageBags, this.taskSequence[tkNumber], this.canvasBank))  
            }
            else if (taskType == 'StimulusTrainMTS'){
                this.tasks.push(new StimulusTrainMTSGenerator(this.IB, this.imageBags, this.taskSequence[tkNumber]))
            }
        }

        // TaskStreamer state 
        this.taskNumber = 0
        this.stepNumber = 0
        this.totalSteps = sessionPackage['GAME_PACKAGE']['GAME']['minimumSteps']
        // assumes one step to each 'trial' - todo: change
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

        this.tasks[this.taskNumber].deposit_step_outcome(stepOutcomePackage)
        this.behavioral_data[this.taskNumber] = this.tasks[this.taskNumber].behavioral_data
        // Check if current generator determined that the transition criterion was met
        this.stepNumber+=1
        if(this.tasks[this.taskNumber].can_transition()){
            this.taskNumber+=1

            // Check terminal state
            console.log(this.taskNumber)
            console.log(this.taskSequence.length)
            if(this.taskNumber >= this.taskSequence.length){
                this.TERMINAL_STATE = true
            }
        }
        else if(this.stepNumber >= this.totalSteps){
            this.TERMINAL_STATE = true
        }

        updateProgressbar(this.stepNumber/this.totalSteps*100, 'MechanicalTurk_TrialBar', '', 100, '')

    }
}


class StimulusTrainMTSGenerator{
    constructor(IB, imageBags, taskParams){
        this.IB = IB // Imagebuffer
        this.imageBags = imageBags
        this.taskParams = taskParams 
        
        this.actionHistory = []
        this.rewardHistory = []
        this.totalTrialsToRun = taskParams['numTrials']

        this.initialize_canvases()
        

        this.sequenceNames = []
        for (var k in this.taskParams['sequenceIdDict']){
            if (this.taskParams['sequenceIdDict'].hasOwnProperty(k)){
                this.sequenceNames.push(k)
            }
        }
        this.sequenceNames = shuffle(this.sequenceNames)
        this.sequenceCounter = 0

        this.trialNumber = 0

        this.behavioral_data = {} // "agent behavior"
        this.behavioral_data['trialNumberTask'] = []
        this.behavioral_data['return'] = []
        this.behavioral_data['stimulusSequenceName'] = []
        this.behavioral_data['choiceId'] = []
        this.behavioral_data['action'] = []
        this.behavioral_data['responseChoice'] = []
        this.behavioral_data['responseX'] = []
        this.behavioral_data['responseY'] = []
        this.behavioral_data['fixationX'] = []
        this.behavioral_data['fixationY'] = []
        this.behavioral_data['timestampStart'] = []
        this.behavioral_data['timestampFixationOnset'] = []
        this.behavioral_data['timestampFixationAcquired'] = []
        this.behavioral_data['timestampResponse'] = []
        this.behavioral_data['timestampStimulusOn'] = []
        this.behavioral_data['timestampStimulusOff'] = []
        this.behavioral_data['timestampChoiceOn'] = []
        this.behavioral_data['reactionTime'] = []
        this.behavioral_data['stimulusTrainFrameDurations'] = []


        this.build()
    }

    async build(){
        var imageRequests = []
        var totalImages = 0
        var imageUrls = []
        for (var i =0; i < this.totalTrialsToRun; i ++){
            if(i >=this.sequenceNames.length){
                break
            }
            var stimulusSequenceName = this.sequenceNames[i]
            var sequenceIds = this.taskParams['sequenceIdDict'][stimulusSequenceName] 
            

            for (var k = 0; k < sequenceIds.length; k++){
                imageUrls.push(this.imageBags[sequenceIds[k]])
                totalImages+=1
            }
        }
        
        console.log('Requesting', totalImages, 'images')

        var imageCounter = 0
        var imageChunkSize = 10 
        for (var i = 0; i < imageUrls.length; i++){
            imageCounter+=1
            await this.IB.get_by_name(imageUrls[i])
             $("#LoadStatusTextBox").html('Loaded ' + imageCounter + ' images out of ' + totalImages)

        }
        $("#LoadStatusTextBox").html('Done loading. Start playing!')
        $("#LoadStatusTextBox").css('opacity', 0.1)
        $("#LoadStatusTextBox").css('font-size', 10)
       

        wdm('Loading images...')
        await Promise.all(imageRequests)
    }

    initialize_canvases(){

        // Get number of canvases needed to run the task 
        var seq = this.taskParams['sequenceIdDict']
        var numStimulusFrames = 0
        for (var k in seq){
            if (!seq.hasOwnProperty(k)){
                continue
            }
            if (seq[k].length > numStimulusFrames){
                numStimulusFrames = seq[k].length
            }
        }
        console.log('Preallocating', numStimulusFrames, 'frames')

        this.stimulusFrames = []
        for (var i = 0; i < numStimulusFrames; i++){
            this.stimulusFrames.push(Playspace.get_new_canvas('frame_stimulus'+i))
            Playspace.fill_gray(this.stimulusFrames[i])
        }


        this.canvasFixation = Playspace.get_new_canvas('frame_fixation')
        this.canvasChoice = Playspace.get_new_canvas('frame_choice')
        this.canvasPunish = Playspace.get_new_canvas('frame_punish')
        this.canvasReward = Playspace.get_new_canvas("frame_reward")

        // Fill out what you can
        Playspace.fill_gray(this.canvasFixation)
        Playspace.fill_gray(this.canvasChoice)
        Playspace.draw_reward(this.canvasReward)
        Playspace.draw_punish(this.canvasPunish)

        // Initiation button and eye fixation dot
        Playspace.draw_circle(this.canvasFixation, 
            this.taskParams['fixationXCentroid'], 
            this.taskParams['fixationYCentroid'], 
            Playspace.deg2propX(this.taskParams['fixationDiameterDegrees']), 'white')

        Playspace.draw_eye_fixation_cross(this.canvasFixation, 0.5, 0.5)
    }

    can_transition(){
        if (this.trialNumber >= this.totalTrialsToRun){
            return true
        }
        return false
    }

    async deposit_step_outcome(stepOutcomePackage){
        var action = stepOutcomePackage['action']
        this.lastStepOutcomePackage = stepOutcomePackage
        this.currentStepNumber+=1
        if (this.currentStepNumber > 2){ 
            this.currentStepNumber = 0 // back to fixation
        }
  
        this.actionHistory.push(action)

        // Update internal behavior

    }

    async buffer_trial(){

        if (this.sequenceCounter < this.sequenceNames.length){
            // Sample without replacement first
            var stimulusSequenceName = this.sequenceNames[this.sequenceCounter]
            
        }
        else{
            // then start sampling with replacement
            var stimulusSequenceName = np.choice(this.sequenceNames)
             
        }
        
        this.sequenceCounter+=1
        console.log('Running', stimulusSequenceName)


        var stimulusIdSeq = this.taskParams['sequenceIdDict'][stimulusSequenceName]
        var msecSeq = this.taskParams['sequenceMsecDict'][stimulusSequenceName]
        var choiceIds = this.taskParams['sequenceChoiceDict'][stimulusSequenceName]
        var correctChoice = this.taskParams['sequenceRewardDict'][stimulusSequenceName]

        // Download stimulus images
        var stimulusImageRequests = []
        for (var i = 0; i < stimulusIdSeq.length; i++){
            var stimulusUrl = this.imageBags[stimulusIdSeq[i]]
            stimulusImageRequests.push(this.IB.get_by_name(stimulusUrl))
        }
        var stimulusImages = await Promise.all(stimulusImageRequests)

        // Download choice images (in order of placement on screen)
        var choiceIds = shuffle(choiceIds)

        var choiceImageRequests = []
        for (var i = 0; i < choiceIds.length; i++){
            var choiceUrl = this.imageBags[choiceIds[i]]
            choiceImageRequests.push(this.IB.get_by_name(choiceUrl))
        }
        var choiceImages = await Promise.all(choiceImageRequests)

        // Draw stimulus frame sequence
        var numFrames = stimulusImages.length 
        var stimulusDegrees = this.taskParams['sampleDiameterDegrees']
        for (var i = 0; i < numFrames; i++){
            Playspace.draw_image(this.stimulusFrames[i], stimulusImages[i], 0.5, 0.5, Playspace.deg2propX(stimulusDegrees))
        }

        // Draw choice frame
        var numChoices = choiceImages.length 
        for (var i = 0; i < numChoices; i++){
            var xLoc = this.taskParams['choiceXCentroid'][i]
            var yLoc = this.taskParams['choiceYCentroid'][i]
            var choiceDegrees = this.taskParams['choiceDiameterDegrees'][i]
            Playspace.draw_image(this.canvasChoice, choiceImages[i], xLoc, yLoc, Playspace.deg2propX(choiceDegrees))
        }

        this.numFrames = numFrames
        this.stimulusSequenceName = stimulusSequenceName
        this.choiceIds = choiceIds
        if (correctChoice == 'random'){
            this.correctChoice = 'random'
            this.correctActionIndex = np.choice(np.arange(numChoices))
        }
        else if(correctChoice == 'any'){
            this.correctChoice = 'any'
            this.correctActionIndex = 'any'
        }
        else{
            this.correctChoice = correctChoice    
            this.correctActionIndex = choiceIds.indexOf(correctChoice)
        }
        console.log('CORRECT CHOICE', this.correctActionIndex, this.correctChoice)
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



            await this.buffer_trial() // Buffer whole trial before presenting the fixation

            frameData['canvasSequence'] = [this.canvasFixation]
            frameData['durationSequence'] = [0]
            actionRegions['x'] = this.taskParams['fixationXCentroid']  // playspace units
            actionRegions['y'] = this.taskParams['fixationYCentroid']  // playspace units
            actionRegions['diameter'] = Playspace.deg2propX(this.taskParams['fixationDiameterDegrees'])
            actionTimeoutMsec = undefined
            reward = 0 
        }

        else if(this.currentStepNumber == 1){
            var lastActionPackage = this.actionHistory[this.actionHistory.length-1]
            this.lastFixationX = lastActionPackage['x']
            this.lastFixationY = lastActionPackage['y']
            this.lastFixationFrameOnTime = this.lastStepOutcomePackage['frameTimestamps'][0]
            this.lastFixationTouchTime = this.lastStepOutcomePackage['action']['timestamp']

            // Run stimulus train
            frameData['canvasSequence'] = this.stimulusFrames.slice(0, this.numFrames)
            frameData['canvasSequence'].push(this.canvasChoice)
            
            var durSeq = JSON.parse(JSON.stringify(this.taskParams['sequenceMsecDict'][this.stimulusSequenceName]))
            durSeq.push(0) // for choice

            frameData['durationSequence'] = durSeq
            actionRegions['x'] = this.taskParams['actionXCentroid']  // playspace units
            actionRegions['y'] = this.taskParams['actionYCentroid']  // playspace units
            actionRegions['diameter'] = Playspace.deg2propX(this.taskParams['actionDiameterDegrees'])
            actionTimeoutMsec = 5000
            reward = 0
        }

        else if(this.currentStepNumber == 2){
            // Run reinforcement screen (based on user action)
            var lastAction = this.actionHistory[this.actionHistory.length-1]['actionIndex']
            var lastActionX = this.actionHistory[this.actionHistory.length-1]['x']
            var lastActionY = this.actionHistory[this.actionHistory.length-1]['y']

            var lastActionTime = this.lastStepOutcomePackage['action']['timestamp']

            var frameTimestamps = this.lastStepOutcomePackage['frameTimestamps']
            var stimulusTrainTimeOn = frameTimestamps[0]
            var stimulusTrainTimeOff = frameTimestamps[frameTimestamps.length - 1] // is equal to when choice pops up
            var choiceTimeOn = frameTimestamps[frameTimestamps.length - 1] // when choice pops up

            var stimulusTrainFrameDurations = []
            for (var i = 1; i < frameTimestamps.length; i ++){
                stimulusTrainFrameDurations.push(frameTimestamps[i] - frameTimestamps[i - 1])
            }

            var reward = 1
            if (this.correctActionIndex == 'any'){
                var reward = 1
            }
            else{
                if (lastAction == this.correctActionIndex){
                var reward = 1 
                }
                else if(lastAction != this.correctActionIndex){
                    reward = 0
                }
            }
            
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
                frameData['durationSequence'] = [this.taskParams['punishTimeOutMsec'], 0]
                actionRegions['x'] = 0
                actionRegions['y'] = 0
                actionRegions['diameter'] = 0
                actionTimeoutMsec = 0
                soundData['soundName'] = 'punish_sound'
                reward = 0
            }

            this.behavioral_data['trialNumberTask'].push(this.trialNumber)
            this.behavioral_data['return'].push(reward)
            this.behavioral_data['stimulusSequenceName'].push(this.stimulusSequenceName)
            this.behavioral_data['choiceId'].push(this.choiceIds)
            this.behavioral_data['action'].push(lastAction)
            this.behavioral_data['responseChoice'].push(this.choiceIds[lastAction])
            this.behavioral_data['responseX'].push(lastActionX)
            this.behavioral_data['responseY'].push(lastActionY)
            this.behavioral_data['fixationX'].push(this.lastFixationX)
            this.behavioral_data['fixationY'].push(this.lastFixationY)
            this.behavioral_data['timestampStart'].push(this.lastFixationTouchTime)
            this.behavioral_data['timestampFixationOnset'].push(this.lastFixationFrameOnTime)
            this.behavioral_data['timestampFixationAcquired'].push(this.lastFixationTouchTime)
            this.behavioral_data['timestampResponse'].push(lastActionTime)
            this.behavioral_data['timestampStimulusOn'].push(stimulusTrainTimeOn)
            this.behavioral_data['stimulusTrainFrameDurations'].push(stimulusTrainFrameDurations)
            this.behavioral_data['timestampStimulusOff'].push(stimulusTrainTimeOff)
            this.behavioral_data['timestampChoiceOn'].push(choiceTimeOn)
            this.behavioral_data['reactionTime'].push(lastActionTime - choiceTimeOn)

            this.trialNumber+=1

            updateProgressbar(this.trialNumber/this.totalTrialsToRun*100, 'MechanicalTurk_TrialBar', '', 100, '')

            

        }

        var stepPackage = {
            'frameData':frameData, 
            'soundData':soundData,
            'actionRegions':actionRegions, 
            'actionTimeoutMsec':actionTimeoutMsec,
            'reward':reward, 
        }

        return stepPackage
    }
}



class StimulusResponseGenerator{
    constructor(IB, imageBags, taskParams, initialState){
        // taskParams: entry of TASK_SEQUENCE

        this.IB = IB // Imagebuffer
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
        //$("#LoadStatusTextBox").css('opacity', 0.1)
        //$("#LoadStatusTextBox").css('font-size', 10)

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



