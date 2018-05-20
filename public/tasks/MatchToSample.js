class MatchToSampleGenerator{
    constructor(IB, image_table, taskParams, initialState){
        this.IB = IB // Imagebuffer
        this.image_table = image_table
        this.taskParams = taskParams 
        
        this.actionHistory = []
        this.rewardHistory = []
        this.totalTrialsToRun = taskParams['numTrials']

        this.initialize_canvases()
        

        this.sequenceNames = []
        for (var k in this.taskParams['sequenceIdKeyDict']){
            if (this.taskParams['sequenceIdKeyDict'].hasOwnProperty(k)){
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
        this.behavioral_data['choiceIdKeys'] = []
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
            var sequenceIdKeys = this.taskParams['sequenceIdKeyDict'][stimulusSequenceName] 
            
            for (var k = 0; k < sequenceIdKeys.length; k++){
                imageUrls.push(this.image_table[sequenceIdKeys[k]])
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
        var seq = this.taskParams['sequenceIdKeyDict']
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


        var stimulusIdSeq = this.taskParams['sequenceIdKeyDict'][stimulusSequenceName]
        console.log('STIMULUS ID SEQ', stimulusIdSeq)
        var msecSeq = this.taskParams['sequenceMsecDict'][stimulusSequenceName]
        var choiceIds = this.taskParams['sequenceChoiceDict'][stimulusSequenceName]
        var correctChoice = this.taskParams['sequenceRewardDict'][stimulusSequenceName]

        // Download stimulus images
        var stimulusImageRequests = []
        for (var i = 0; i < stimulusIdSeq.length; i++){
            var stimulusUrl = this.image_table[stimulusIdSeq[i]]
            stimulusImageRequests.push(this.IB.get_by_name(stimulusUrl))
        }
        var stimulusImages = await Promise.all(stimulusImageRequests)

        // Download choice images (in order of placement on screen)
        var choiceIds = shuffle(choiceIds)

        var choiceImageRequests = []
        for (var i = 0; i < choiceIds.length; i++){
            var choiceUrl = this.image_table[choiceIds[i]]
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
        this.choiceIdKeys = choiceIds
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
            this.behavioral_data['choiceIdKeys'].push(this.choiceIdKeys)
            this.behavioral_data['action'].push(lastAction)
            this.behavioral_data['responseChoice'].push(this.choiceIdKeys[lastAction])
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
