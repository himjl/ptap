class TaskStreamerClass2{
    constructor(
        ImageBuffer, 
        taskSequence,
        imageBags, 
        ){

        this.IB = ImageBuffer
        this.imageBags = imageBags
        this.taskSequence = taskSequence 
        // Viewing information (for rendering canvases of appropriate size)
        this.TERMINAL_STATE = false 

        this.tasks = []
        for (var tkNumber = 0; tkNumber < this.taskSequence.length; tkNumber ++){
            var taskType = this.taskSequence[tkNumber]['taskType']
            if (taskType == 'SR'){
                this.tasks.push(new StimulusResponseGenerator(this.IB, this.imageBags, this.taskSequence[tkNumber], this.canvasBank))    
            }
            else if (taskType == 'MTS'){
                throw "MTS not implemented yet"
                //this.tasks.push(new MTSGenerator(this.IB, this.imageBags, this.taskSequence[tkNumber], this.canvasBank))  
            }
        }

        // TaskStreamer state 
        this.actionHistory = []
        this.rewardHistory = []
        this.taskNumber = 0
    }

    async get_step(){
        var stepPackage = await this.tasks[this.taskNumber].get_step()
        return stepPackage
    }

    deposit_action(action){
        this.tasks[this.taskNumber].deposit_action(action)
        this.actionHistory.push(action)
        if(this.tasks[this.taskNumber].can_transition()){
            this.taskNumber+=1
            if(this.taskNumber > this.taskSequence.length){
                this.TERMINAL_STATE = true

            }
        }

    }

    async get_behavioral_data(){

    }
}

class StimulusResponseGenerator{
    constructor(IB, imageBags, taskParams, state){
        // taskParams: entry of TASK_SEQUENCE

        this.IB = IB // Imagebuffer
        this.imageBags = imageBags
        this.taskParams = taskParams 

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
        Playspace2.draw_circle(this.canvasFixation, this.taskParams['fixationXCentroid'], this.taskParams['fixationYCentroid'], Playspace2.deg2propX(this.taskParams['fixationDiameterDegrees']), 'white')

        Playspace2.draw_eye_fixation_dot(this.canvasFixation, 0.5, 0.5)

        // Choice screen 
        for (var a in this.taskParams['actionXCentroid']){
            Playspace2.draw_circle(this.canvasChoice, this.taskParams['choiceXCentroid'][a], 
                this.taskParams['choiceYCentroid'][a], Playspace2.deg2propX(this.taskParams['choiceDiameterDegrees'][a]), 'white')    
        }
        
        this.currentStepNumber = 0 
    }

    can_transition(){
        return false
    }
    async deposit_action(action){
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

            await this.buffer_trial() // Buffer before presenting the fixation
            // Run fixation

            frameData['canvasSequence'] = [this.canvasFixation]
            frameData['durationSequence'] = [0]
            actionRegions['x'] = this.taskParams['fixationXCentroid']  // playspace units
            actionRegions['y'] = this.taskParams['fixationYCentroid']  // playspace units
            actionRegions['diameter'] = Playspace2.deg2propX(this.taskParams['fixationDiameterDegrees'])
            actionTimeoutMsec = undefined
            reward = 0 

            this.currentStepNumber+=1
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
       
            this.currentStepNumber +=1
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
            this.currentStepNumber = 0
        }
        var stepPackage = {
            'frameData':frameData, 
            'soundData':soundData,
            'actionRegions':actionRegions, 
            'actionTimeoutMsec':actionTimeoutMsec,
            'reward':reward}

        return stepPackage
    }

}



