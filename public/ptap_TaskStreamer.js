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
        this.tasks[taskNumber].deposit_action(action)
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
        CanvasTemplates.draw_fixation_button(this.canvasFixation, this.taskParams['fixationXCentroid'], this.taskParams['fixationYCentroid'], 0.8)

        this.currentStepNumber = 0 
    }


    async deposit_action(action){

    }

    async buffer_trial(){

        // Called before fixation is presented. 

        var sampleBag = np.random.choice(this.taskParams['sampleBagNames'])
        var sampleId = np.random.choice(this.imageBags[sampleBag])
        var sampleImage = await this.IB.get_by_name(sampleId)
        cf.draw_image(this.canvasStimulus, sampleImage, this.canvasStimulus.height * 0.5, this.canvasStimulus.width * 0.5, Playspace2.deg2pixels(8))

        this.rewardMap = this.taskParams['rewardMap'][sampleBag]

    }

    async get_step(){
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
            actionRegions['xPixels'] = this.playspaceWidth * 0.5 
            actionRegions['yPixels'] = this.playspaceHeight * 0.8 
            actionRegions['diameterPixels'] = this.playspaceWidth * 0.1 
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

    async buffer_trial(){
        // Fixation screen 

        // Stimulus screen 

        // (optional) delay screen

        // Choice screen 

    }
}


class CanvasTemplates{
    // Some commonly used drawing operations. These reflect the personal preferences of author @mil. 

    static fill_gray(canvasobj){
        // the neutral gray color
        cf.fill_canvas(canvasobj, '#7F7F7F')
    }
    static draw_fixation_button(canvasobj, xProportion, yProportion, diameterProportion){
        // x = 0.5 
        // y = 0.85
        // diameterDegrees = 3 

        var xPixels = canvasobj.width * xProportion 
        var yPixels = canvasobj.height * yProportion 
        var diameterPixels = (canvasobj.width + canvasobj.height)/2 * diameterProportion

        cf.draw_circle(canvasobj, xPixels, yPixels, diameterPixels, 'white')

    }

    static draw_eye_fixation_dot(canvasobj, xProportion, yProportion, virtualPixelsPerInch, viewingDistanceInches){


        var diameterPixels = Math.max(deg2pixels(0.2, virtualPixelsPerInch, viewingDistanceInches), 4) // at least 4 pixels at its widest 
        var xPixels = canvasobj.width * xProportion 
        var yPixels = canvasobj.height * yProportion 
        cf.draw_circle(canvasobj, xPixels, yPixels, diameterPixels, '#2d2d2d')
    }

    static draw_eye_fixation_cross(canvasobj, xProportion, yProportion, diameterProportion){
        return 
    }

    static draw_punish(canvasobj, playspaceWidth, playspaceHeight, ){
        var punishColor = 'black'
        var punishAlpha = 1
        
        var widthPixels = playspaceWidth * 2/3
        var heightPixels = playspaceHeight * 2/3 


        var x = playspaceWidth/2 - widthPixels/2
        var y = playspaceHeight/2 - heightPixels/2

        cf.draw_rectangle(canvasobj, punishColor, punishAlpha, x, y, widthPixels, heightPixels)

    }

    static draw_reward(canvasobj, playspaceWidth, playspaceHeight, ){
        var punishColor = '#00cc00'
        var punishAlpha = 0.5
        
        var widthPixels = playspaceWidth * 2/3
        var heightPixels = playspaceHeight * 2/3 

        var x = playspaceWidth/2 - widthPixels/2
        var y = playspaceHeight/2 - heightPixels/2

        cf.draw_rectangle(canvasobj, punishColor, punishAlpha, x, y, widthPixels, heightPixels)

    }

}

