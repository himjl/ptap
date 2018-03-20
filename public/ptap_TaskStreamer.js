class TaskStreamerClass2{
    // todo: factor out into...

    // "task" component (specifying trial info); units of playspace.
    
    // "screen"-dependent component (constructing canvases, buffering); units of pixels.

    constructor(
        ImageBuffer, 
        taskSequence,
        imageBags, 
        ){

        this.IB = ImageBuffer
        this.imageBags = imageBags
        this.taskSequence = taskSequence 

        this.canvasBank = [] // Increase as needed

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
    }

    async get_behavioral_data(){

    }
}

class StimulusResponseGenerator{
    constructor(IB, imageBags, taskParams, canvasList){
        // taskParams: entry of TASK_SEQUENCE

        this.IB = IB // Imagebuffer
        this.imageBags = imageBags
        this.taskParams = taskParams 




        // Canvases needed to run the task
        this.canvasFixation = Playspace2.get_new_canvas('SR_fixation')
        this.canvasStimulus = Playspace2.get_new_canvas('SR_stimulus')
        this.canvasDelay = Playspace2.get_new_canvas('SR_delay')
        this.canvasChoice = Playspace2.get_new_canvas('SR_choice')


        // Fill out what you can
        CanvasTemplates.fill_gray(this.canvasFixation)
        CanvasTemplates.fill_gray(this.canvasStimulus)
        CanvasTemplates.fill_gray(this.canvasDelay)
        CanvasTemplates.fill_gray(this.canvasChoice)

        // Initiation button and eye fixation dot
        CanvasTemplates.draw_button(this.canvasFixation, this.taskParams['fixationXCentroid'], this.taskParams['fixationYCentroid'], 0.15)

        CanvasTemplates.draw_eye_fixation_dot(this.canvasFixation, 0.5, 0.5, Playspace2.virtualPixelsPerInch, Playspace2.viewingDistanceInches)

        // Choice screen 
        for (var a in this.taskParams['actionXCentroid']){
            CanvasTemplates.draw_button(this.canvasChoice, this.taskParams['actionXCentroid'][a], 
                this.taskParams['actionYCentroid'][a], this.taskParams['actionDiameterDegrees'][a])    
        }
        
        this.currentStepNumber = 0 
    }


    async deposit_action(action){
        if (this.actionHistory == undefined){
            this.actionHistory = []
        }

        this.actionHistory.push(action)

    }

    async buffer_trial(){

        // Called before fixation is presented. 

        var sampleBag = np.random.choice(this.taskParams['sampleBagNames'])
        var sampleId = np.random.choice(this.imageBags[sampleBag])
        var sampleImage = await this.IB.get_by_name(sampleId)
        cf.draw_image(this.canvasStimulus, sampleImage, parseFloat(this.canvasStimulus.style.height) * 0.5, parseFloat(this.canvasStimulus.style.width) * 0.5, Playspace2.deg2pixels(8))

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
            actionRegions['xPixels'] = 0 * 0.5 
            actionRegions['yPixels'] = 0 * 0.8 
            actionRegions['diameterPixels'] = 100
            actionTimeoutMsec = undefined
            reward = 0 

            this.currentStepNumber+=1
        }
        else if(this.currentStepNumber == 1){
            // Run stimulus, (optionally) delay, and choice

            frameData['canvasSequence'] = [this.canvasStimulus, this.canvasChoice]
            frameData['durationSequence'] = [200, 0]

            actionRegions['xPixels'] = [this.playspaceWidth * 0.3, this.playspaceWidth * 0.7]  
            actionRegions['yPixels'] = [this.playspaceHeight * 0.8, this.playspaceHeight * 0.8]
            actionRegions['diameterPixels'] = [this.playspaceWidth * 0.2, this.playspaceWidth * 0.2  ]
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
                actionRegions['xPixels'] = 0
                actionRegions['yPixels'] = 0
                actionRegions['diameterPixels'] = 0
                actionTimeoutMsec = 0
                soundData['soundName'] = 'reward_sound'
                reward = 1
            }

            else{
                // Punish screen screen
                frameData['canvasSequence'] = [this.canvasPunish, this.canvasPunish]
                frameData['durationSequence'] = [2000, 0]
                actionRegions['xPixels'] = 0
                actionRegions['yPixels'] = 0
                actionRegions['diameterPixels'] = 0
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



