class TaskStreamerClass2{
    // todo: factor out into...

    // "task" component (specifying trial info); units of playspace.
    
    // "screen"-dependent component (constructing canvases, buffering); units of pixels.

    constructor(
        playspaceViewingDistanceInches, 
        playspaceHeightDegreesVisualAngle,
        playspaceWidthDegreesVisualAngle, 
        virtualPixelsPerInch, 
        ){



        // Viewing information (for rendering canvases of appropriate size)
        this.TERMINAL_STATE = false 
        this.playspaceWidth = deg2pixels(playspaceWidthDegreesVisualAngle, virtualPixelsPerInch, playspaceViewingDistanceInches) 
        this.playspaceHeight = deg2pixels(playspaceHeightDegreesVisualAngle, virtualPixelsPerInch, playspaceViewingDistanceInches)         

        
        
        this.canvasFixation = cf.new_canvas('fixation', this.playspaceWidth, this.playspaceHeight, true)
        this.canvasStimulus = cf.new_canvas('stimulus', this.playspaceWidth, this.playspaceHeight, true)
        this.canvasChoice = cf.new_canvas('choice', this.playspaceWidth, this.playspaceHeight, true)
        
        this.canvasReward = cf.new_canvas('reward', this.playspaceWidth, this.playspaceHeight, true)
        this.canvasPunish = cf.new_canvas('punish', this.playspaceWidth, this.playspaceHeight, true)



        this.canvasAction = cf.new_canvas('actionField', this.playspaceWidth, this.playspaceHeight, true)
        this.canvasAction.style.zIndex = 200

        Playspace.ActionPoller.attached = false 
        Playspace.ActionPoller.add_event_listener()

        cf.fill_canvas(this.canvasFixation, '#7F7F7F')
        cf.fill_canvas(this.canvasStimulus, '#7F7F7F')
        cf.fill_canvas(this.canvasChoice, '#7F7F7F')
        cf.fill_canvas(this.canvasReward, '#7F7F7F')
        cf.fill_canvas(this.canvasPunish, '#7F7F7F')

        cf.draw_circle(this.playspaceWidth * 0.5, this.playspaceHeight * 0.8, this.playspaceWidth * 0.1, 'white', this.canvasFixation)
        cf.draw_circle(this.playspaceWidth * 0.5, this.playspaceHeight * 0.5, 50, 'blue', this.canvasStimulus)
        cf.draw_circle(this.playspaceWidth * 0.3, this.playspaceHeight * 0.8, this.playspaceWidth * 0.2, 'green', this.canvasChoice)
        cf.draw_circle(this.playspaceWidth * 0.7, this.playspaceHeight * 0.8, this.playspaceWidth * 0.2, 'green', this.canvasChoice)
        OffTheShelfCanvases.draw_punish(this.playspaceWidth, this.playspaceHeight, this.canvasPunish)
        OffTheShelfCanvases.draw_reward(this.playspaceWidth, this.playspaceHeight, this.canvasReward)

        this.currentStepNumber = 0

        // TaskStreamer state 
        this.actionHistory = []
        this.rewardHistory = []
    }

    get_playspace_bounds(){
        var bounds = {}
        
        var height = getWindowHeight()
        var width = getWindowWidth()

        return bounds
    }
    
    async get_step(){
        
        var frameData = {}
        var actionRegions = {}
        var soundData = {}
        var reward = 0
        var actionTimeoutMsec = 0

        if (this.currentStepNumber == 0){
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
            // Run stimulus and choice
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
            if (this.actionHistory[this.actionHistory.length-1]['actionIndex'] == 0){
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
        this.rewardHistory.push(reward)
        return stepPackage
    }

    deposit_action(action){
        this.actionHistory.push(action)
    }

    async get_behavioral_data(){

    }
}

class StimulusResponseGenerator{
    constructor(){
        this.canvasFixation = cf.new_canvas('SR_fixation')
        this.canvasStimulus = cf.new_canvas('SR_stimulus')
        this.canvasDelay = cf.new_canvas('SR_delay')
        this.canvasChoice = cf.new_canvas('SR_choice')
    }

    async buffer_trial(){
        // Fixation screen 

        // Stimulus screen 

        // (optional) delay screen

        // Choice screen 

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


async function run_trial(trialPackage){

    var frameData = trialPackage['frameData']
    var rewardFunction = trialPackage['rewardFunction']
    var actionRegions = trialPackage['actionRegions']



    var agentActionSequence = []

    frameData = {}
    frameData['assetSeq'] = []
    frameData['placementSeq'] = []
    frameData['timingSeq'] = []


    // Draw trial
    await this.ScreenDisplayer.buffer_trial_frames(frameData)
    
    // Execute frame sequences
    for (var i = 0; i < frameData['assetSeq'].length; i++){
        await this.ScreenDisplayer.execute_frame_sequence(i)
        var action = await this.ActionPoller.poll(actionRegions[i])
        agentActionSequence.push(action)
    }
    // Compute and deliver reward
    var reward = rewardFunction(agentActionSequence)
    await this.Reinforcer.deliver_reinforcement(reward)

    // Package data
    var trialOutcome = {}
    trialOutcome['frameOutcomes'] = frameOutcomes
    trialOutcome['reward'] = reward 
    trialOutcome['actionOutcomes'] = agentActionSequence
    return trialOutcome

    // old input: 
    var trialPackage
    // ************ Prebuffer trial assets ***************

    // Fixation
    wdm('Buffering fixation...')
    //console.log(trialPackage)
    var fixationXCentroidPixels = this.xprop2pixels(trialPackage['fixationXCentroid'] )
    var fixationYCentroidPixels = this.yprop2pixels(trialPackage['fixationYCentroid'] )
    var fixationDiameterPixels = this.deg2pixels(trialPackage['fixationDiameterDegrees'] )


    var sampleXCentroidPixels = this.xprop2pixels(trialPackage['sampleXCentroid'])
    var sampleYCentroidPixels = this.yprop2pixels(trialPackage['sampleYCentroid'])
    var sampleDiameterPixels = this.deg2pixels(trialPackage['sampleDiameterDegrees'])

    var fixationFramePackage = {
        'fixationXCentroidPixels':fixationXCentroidPixels,
        'fixationYCentroidPixels':fixationYCentroidPixels, 
        'fixationDiameterPixels':fixationDiameterPixels,
        'eyeFixationXCentroidPixels':sampleXCentroidPixels, 
        'eyeFixationYCentroidPixels':sampleYCentroidPixels, 
        'eyeFixationDiameterPixels':Math.max(this.deg2pixels(0.2),4),
        'drawEyeFixationDot': trialPackage['drawEyeFixationDot'] || false, 
    }
    
    await this.ScreenDisplayer.bufferFixation(fixationFramePackage)

    // Stimulus sequence
    wdm('Buffering stimulus...')

    var choiceXCentroidPixels = this.xprop2pixels(trialPackage['choiceXCentroid'])
    var choiceYCentroidPixels = this.yprop2pixels(trialPackage['choiceYCentroid'])
    var choiceDiameterPixels = this.deg2pixels(trialPackage['choiceDiameterDegrees'])

    var stimulusFramePackage = {
        'sampleImage':trialPackage['sampleImage'],
        'sampleOn':trialPackage['sampleOnMsec'],
        'sampleOff':trialPackage['sampleOffMsec'],
        'sampleDiameterPixels':sampleDiameterPixels,
        'sampleXCentroid':sampleXCentroidPixels,
        'sampleYCentroid':sampleYCentroidPixels,
        'choiceImage':trialPackage['choiceImage'],
        'choiceDiameterPixels':choiceDiameterPixels,
        'choiceXCentroid':choiceXCentroidPixels,
        'choiceYCentroid':choiceYCentroidPixels,
    }

    await this.ScreenDisplayer.bufferStimulusSequence(stimulusFramePackage)

    // *************** Run trial *************************

    // SHOW BLANK
    wdm('Running fixation...')
    await this.ScreenDisplayer.displayBlank()

    // RUN FIXATION
    this.ActionPoller.create_action_regions(
        fixationXCentroidPixels,
        fixationYCentroidPixels,
        fixationDiameterPixels)

    var t_fixationOn = await this.ScreenDisplayer.displayFixation()
    var fixationOutcome = await this.ActionPoller.Promise_wait_until_active_response()

    // RUN STIMULUS SEQUENCE
    wdm('Running stimulus...')
    var t_SequenceTimestamps = await this.ScreenDisplayer.displayStimulusSequence()

    var actionXCentroidPixels = this.xprop2pixels(trialPackage['actionXCentroid'])
    var actionYCentroidPixels = this.yprop2pixels(trialPackage['actionYCentroid'])
    var actionDiameterPixels = this.deg2pixels(trialPackage['actionDiameterDegrees'])

    this.ActionPoller.create_action_regions(
        actionXCentroidPixels, 
        actionYCentroidPixels, 
        actionDiameterPixels)

    if(trialPackage['choiceTimeLimitMsec'] > 0){
        var actionPromise = Promise.race([
                            this.ActionPoller.Promise_wait_until_active_response(), 
                            this.ActionPoller.timeout(trialPackage['choiceTimeLimitMsec'])]) 
    }
    else{
        var actionPromise = this.ActionPoller.Promise_wait_until_active_response()
    }

    wdm('Awaiting choice...')
    var actionOutcome = await actionPromise
    var rewardAmount = trialPackage['choiceRewardMap'][actionOutcome['actionIndex']]

    // Deliver reinforcement
    wdm('Delivering reinforcement...')
    if (rewardAmount > 0){
        var t_reinforcementOn = Math.round(performance.now()*1000)/1000
        var p_sound = this.SoundPlayer.play_sound('reward_sound')
        var p_visual = this.ScreenDisplayer.displayReward(trialPackage['rewardTimeOutMsec'])
        var p_primaryReinforcement = this.Reinforcer.deliver_reinforcement(rewardAmount)
        await Promise.all([p_primaryReinforcement, p_visual]) 
        var t_reinforcementOff = Math.round(performance.now()*1000)/1000
    }
    if (rewardAmount <= 0){
        var t_reinforcementOn = Math.round(performance.now()*1000)/1000
        var p_sound = this.SoundPlayer.play_sound('punish_sound')
        var p_visual = this.ScreenDisplayer.displayPunish(trialPackage['punishTimeOutMsec'])
        await Promise.all([p_sound, p_visual]) 
        var t_reinforcementOff = Math.round(performance.now()*1000)/1000
    }
    if(rewardAmount == undefined){
        // Timeout
        rewardAmount = 0
        var t_reinforcementOn = Math.round(performance.now()*1000)/1000
        var t_reinforcementOff = Math.round(performance.now()*1000)/1000
    }

    this.rewardLog['t'].push(t_reinforcementOn)
    this.rewardLog['n'].push(rewardAmount)

    // *************** Write down trial outcome *************************
    wdm('Writing down trial outcome...')
    var trialOutcome = {}
    trialOutcome['return'] = rewardAmount 
    trialOutcome['action'] = actionOutcome['actionIndex']
    trialOutcome['responseX'] = actionOutcome['x']
    trialOutcome['responseY'] = actionOutcome['y']
    trialOutcome['fixationX'] = fixationOutcome['x']
    trialOutcome['fixationY'] = fixationOutcome['y']
    trialOutcome['timestampStart'] = fixationOutcome['timestamp']
    trialOutcome['timestampFixationOnset'] = t_fixationOn
    trialOutcome['timestampFixationAcquired'] = fixationOutcome['timestamp']
    trialOutcome['timestampResponse'] = actionOutcome['timestamp']
    trialOutcome['timestampReinforcementOn'] = t_reinforcementOn
    trialOutcome['timestampReinforcementOff'] = t_reinforcementOff
    trialOutcome['timestampStimulusOn'] = t_SequenceTimestamps[0]
    trialOutcome['timestampStimulusOff'] = t_SequenceTimestamps[1]
    trialOutcome['timestampChoiceOn'] = t_SequenceTimestamps.slice(-1)[0]
    trialOutcome['reactionTime'] = Math.round(actionOutcome['timestamp'] - t_SequenceTimestamps.slice(-1)[0])

    // todo: remove these internal references to TaskStreamer (violates modularity of main objects)
    trialOutcome['taskNumber'] = TaskStreamer.taskNumber
    trialOutcome['trialNumberTask'] = TaskStreamer.trialNumberTask 
    trialOutcome['trialNumberSession'] = TaskStreamer.trialNumberSession
    trialOutcome['sampleBagProbabilities'] = TaskStreamer.bagSamplingWeights
    trialOutcome['tStatistic'] = TaskStreamer.tStatistic 
    trialOutcome['empiricalEffectSize'] = TaskStreamer.empiricalEffectSize
    trialOutcome['a'] = TaskStreamer.a
    trialOutcome['b'] = TaskStreamer.b
    trialOutcome['c'] = TaskStreamer.c
    trialOutcome['d'] = TaskStreamer.d
    trialOutcome['tStatistic_criticalUb'] = TaskStreamer.tStatistic_criticalUb
    trialOutcome['tStatistic_criticalLb'] = TaskStreamer.tStatistic_criticalLb

    trialOutcome['i_sampleBag'] = trialPackage['i_sampleBag']
    trialOutcome['i_sampleId'] = trialPackage['i_sampleId']
    trialOutcome['i_choiceBag'] = trialPackage['i_choiceBag']
    trialOutcome['i_choiceId'] = trialPackage['i_choiceId']

    return trialOutcome
}


function getPlayspaceBounds(){
        var bounds = {}
        var windowHeight = getWindowHeight()
        var windowWidth = getWindowWidth()

        var screen_margin = 0.15
        var max_allowable_playspace_dimension = Math.round(Math.min(windowHeight, windowWidth))*(1-screen_margin)

        var min_dimension = Math.min(max_allowable_playspace_dimension, this.playspaceSizePixels)
        var min_dimension = Math.ceil(min_dimension)

        bounds['height'] = min_dimension
        bounds['width'] = min_dimension 
        bounds['leftBound'] = Math.floor((windowWidth - min_dimension)/2) // in units of window
        bounds['rightBound'] = Math.floor(windowWidth-(windowWidth - min_dimension)/2)
        bounds['topBound'] = Math.floor((windowHeight - min_dimension)/2)
        bounds['bottomBound'] = Math.floor(windowHeight-(windowHeight - min_dimension)/2)

        return bounds
    }

function attachWindowResizeMonitor(){
  
        var _this = this
        function onWindowResize(){
          // on window resize 
            var bounds = {}
            var windowHeight = getWindowHeight()
            var windowWidth = getWindowWidth()

            var screen_margin = 0.15
            var max_allowable_playspace_dimension = Math.round(Math.min(windowHeight, windowWidth))*(1-screen_margin)

            var min_dimension = Math.min(max_allowable_playspace_dimension, _this.playspaceSizePixels)
            var min_dimension = Math.ceil(min_dimension)

            _this.height = min_dimension
            _this.width = min_dimension 
            _this.leftBound = Math.floor((windowWidth - _this.width)/2) // in units of window
            _this.rightBound = Math.floor(windowWidth-(windowWidth - _this.width)/2)
            _this.topBound = Math.floor((windowHeight - _this.height)/2)
            _this.bottomBound = Math.floor(windowHeight-(windowHeight - _this.height)/2)

            bounds['height'] = _this.height
            bounds['width'] = _this.width
            bounds['leftBound'] = _this.leftBound
            bounds['rightBound'] = _this.rightBound
            bounds['topBound'] = _this.topBound
            bounds['bottomBound'] = _this.bottomBound
            bounds['windowWidth'] = windowWidth
            bounds['windowHeight'] = windowHeight
            bounds['t'] = Math.round(performance.now()*1000)/1000

            //_this.ScreenDisplayer.calibrateBounds(bounds)
            //_this.ActionPoller.calibrateBounds(bounds)
            _this.updateWindowLog(bounds) 

            console.log('onWindowResize():', bounds['leftBound'], bounds['topBound'])
        }

        onWindowResize()
        
        window.addEventListener('resize', onWindowResize)
        console.log('Attached window resize listener')
    }

function toggleBorder(on_or_off){
    //this.ScreenDisplayer.togglePlayspaceBorder(on_or_off)
}

function deg2inches(degrees, viewingDistanceInches){

        // diameter degrees 
        // assume centered (center of diameter length at viewing normal to screen surface)
        if(degrees.constructor == Array){
            var result = []
            for (var i = 0; i<degrees.length; i++){
                var rad = deg2rad(degrees[i]/2)
                result.push(2 * viewingDistanceInches * Math.atan(rad))
            }
            return result
        }

        var rad = deg2rad(degrees/2)
        return 2 * viewingDistanceInches * Math.atan(rad) 
    }

function deg2pixels(degrees, virtualPixelsPerInch, viewingDistanceInches){
    // Return virtual pixels 
    if(degrees.constructor == Array){
        var result = []
        for (var i = 0; i<degrees.length; i++){
            var inches = deg2inches(degrees[i], viewingDistanceInches)
            result.push(Math.round(inches * virtualPixelsPerInch))
        }
        return result
    }

    var inches = deg2inches(degrees, viewingDistanceInches)
    return Math.round(inches * virtualPixelsPerInch)
}


function xprop2pixels(xproportion){
    if(xproportion.constructor == Array){
        var result = []
        for (var i = 0; i<xproportion.length; i++){
            result.push(Math.round(xproportion[i]*this.width))
        }
        return result
    }
    return Math.round(xproportion*this.width)
}

function yprop2pixels(yproportion){
    if(yproportion.constructor == Array){
        var result = []
        for (var i = 0; i<yproportion.length; i++){
            result.push(Math.round(yproportion[i]*this.height))
        }
        return result
    }
    return Math.round(yproportion*this.height)
}

function deg2rad(deg){
    if(deg.constructor == Array){
        var result = []
        for (var i = 0; i<deg.length; i++){
            result.push(deg[i] * Math.PI / 180)
        }
        return result
    }
    return deg * Math.PI / 180
}

async function run_tutorial_trial(tutorial_image){
        var fixationXCentroidPixels = this.xprop2pixels(0.5)
        var fixationYCentroidPixels = this.yprop2pixels(0.7)
        var fixationDiameterPixels = this.deg2pixels(3)

        // BUFFER FIXATION
        var fixationFramePackage = {
            'fixationXCentroidPixels':fixationXCentroidPixels,
            'fixationYCentroidPixels':fixationYCentroidPixels, 
            'fixationDiameterPixels':fixationDiameterPixels,
        }
        await this.ScreenDisplayer.bufferFixation(fixationFramePackage)


        // BUFFER STIMULUS
        var stimulusXCentroidPixels = this.xprop2pixels(0.1 + 0.8 * Math.random())
        var stimulusYCentroidPixels = this.yprop2pixels(0.6 * Math.random())
        var stimulusDiameterPixels = this.deg2pixels(6)
        
        var stimulusCanvas = this.ScreenDisplayer.getSequenceCanvas('tutorial_sequence', 0)
        await this.ScreenDisplayer.renderBlank(stimulusCanvas)
        await this.ScreenDisplayer.drawImagesOnCanvas(tutorial_image, stimulusXCentroidPixels, stimulusYCentroidPixels, stimulusDiameterPixels, stimulusCanvas)

        // SHOW BLANK
        await this.ScreenDisplayer.displayBlank()

        // RUN FIXATION
        this.ActionPoller.create_action_regions(
            fixationXCentroidPixels,
            fixationYCentroidPixels,
            fixationDiameterPixels)

        await this.ScreenDisplayer.displayFixation()
        await this.ActionPoller.Promise_wait_until_active_response()

        // RUN STIMULUS SEQUENCE
        await this.ScreenDisplayer.displayScreenSequence(stimulusCanvas, 0)

        this.ActionPoller.create_action_regions(
            stimulusXCentroidPixels, 
            stimulusYCentroidPixels, 
            stimulusDiameterPixels)

        await this.ActionPoller.Promise_wait_until_active_response()
        this.SoundPlayer.play_sound('reward_sound')
    }