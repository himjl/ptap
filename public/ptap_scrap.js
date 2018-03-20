
function trialOutcome(){
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