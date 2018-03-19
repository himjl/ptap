class TaskStreamerTemplate{
    constructor(){

    }
    
    async get_step(){

    }

    async deposit_action_reward(action, reward){

    }

    async get_behavioral_data(){

    }
}

class StimulusResponseGenerator{
    constructor(){

    }
}

class MatchToSampleGenerator{
    constructor(){

    }
}

class LocalizationGenerator{
    constructor(){
        
    }
}

class OffTheShelfCanvases{
    static draw_fixation_screen(x, y, diameter, canvasobj){

    }
    static draw_punish(playspaceWidth, playspaceHeight, canvasobj){
        var punishColor = 'black'
        var punishAlpha = 1
        
        var widthPixels = playspaceWidth * 2/3
        var heightPixels = playspaceHeight * 2/3 


        var x = playspaceWidth/2 - widthPixels/2
        var y = playspaceHeight/2 - heightPixels/2

        cf.draw_rectangle(canvasobj, punishColor, punishAlpha, x, y, widthPixels, heightPixels)

    }

    static draw_reward(playspaceWidth, playspaceHeight, canvasobj){
        var punishColor = '#00cc00'
        var punishAlpha = 0.5
        
        var widthPixels = playspaceWidth * 2/3
        var heightPixels = playspaceHeight * 2/3 

        var x = playspaceWidth/2 - widthPixels/2
        var y = playspaceHeight/2 - heightPixels/2

        cf.draw_rectangle(canvasobj, punishColor, punishAlpha, x, y, widthPixels, heightPixels)

    }

}


async function bufferStimulusSequence(stimulusFramePackage){
    var sampleImage = stimulusFramePackage['sampleImage'] 
    var sampleOn = stimulusFramePackage['sampleOn'] 
    var sampleOff = stimulusFramePackage['sampleOff'] 
    var sampleDiameterPixels = stimulusFramePackage['sampleDiameterPixels'] 
    var sampleXCentroid = stimulusFramePackage['sampleXCentroid'] 
    var sampleYCentroid = stimulusFramePackage['sampleYCentroid']
    var choiceImage = stimulusFramePackage['choiceImage'] 
    var choiceDiameterPixels = stimulusFramePackage['choiceDiameterPixels'] 
    var choiceXCentroid = stimulusFramePackage['choiceXCentroid'] 
    var choiceYCentroid = stimulusFramePackage['choiceYCentroid']        

    var frame_canvases = []
    var frame_durations = []
    // Draw sample screen
    var sampleCanvas = this.getSequenceCanvas('stimulus_sequence', 0)
    await this.renderBlank(sampleCanvas) // todo: only do this on window resize
    await this.drawImagesOnCanvas(sampleImage, sampleXCentroid, sampleYCentroid, sampleDiameterPixels, sampleCanvas)
    frame_canvases.push(sampleCanvas)
    frame_durations.push(sampleOn)

    // Optionally draw blank delay screen
    if(sampleOff > 0){
        var delayCanvas = this.getSequenceCanvas('stimulus_sequence', 1)
        await this.renderBlank(delayCanvas) // todo: only do this on window resize
        delayCanvas = await this.renderBlank(blankCanvas)
        frame_canvases.push(delayCanvas)
        frame_durations.push(sampleOff)
    }

    // Draw test screen
    var testCanvas = this.getSequenceCanvas('stimulus_sequence', frame_canvases.length)
    await this.renderBlank(testCanvas) // todo: only do this on window resize
    await this.drawImagesOnCanvas(choiceImage, choiceXCentroid, choiceYCentroid, choiceDiameterPixels, testCanvas)
    frame_canvases.push(testCanvas)
    frame_durations.push(0)

    this.canvas_sequences['stimulus_sequence'] = frame_canvases
    this.time_sequences['stimulus_sequence'] = frame_durations

}