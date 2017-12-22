class PlaySpaceClass{
    constructor(playspacePackage){

        var playspace_degreesVisualAngle = playspacePackage['playspace_degreesVisualAngle'] 
        var playspace_verticalOffsetInches = playspacePackage['playspace_verticalOffsetInches']
        var playspace_viewingDistanceInches = playspacePackage['playspace_viewingDistanceInches']
        var screen_virtualPixelsPerInch = playspacePackage['screen_virtualPixelsPerInch']
        var primary_reinforcer_type = playspacePackage['primary_reinforcer_type'] 
        var action_event_type = playspacePackage['action_event_type'] 
        var periodicRewardIntervalMsec = playspacePackage['periodicRewardIntervalMsec'] 
        var periodicRewardAmount = playspacePackage['periodicRewardAmount'] 
        var bonusUSDPerCorrect = playspacePackage['bonusUSDPerCorrect'] 

        this.viewingDistanceInches = playspace_viewingDistanceInches
        this.viewingOffsetInches = playspace_verticalOffsetInches
        this.playspaceSizeDegrees = playspace_degreesVisualAngle
        this.virtualPixelsPerInch = screen_virtualPixelsPerInch

        this.playspaceSizePixels = this.deg2pixels(this.playspaceSizeDegrees)

        var bounds = this.getPlayspaceBounds()    
        this.ScreenDisplayer = new ScreenDisplayer(bounds)
        

        if (primary_reinforcer_type == 'juice'){
            this.Reinforcer = new JuiceReinforcer()
        }
        else if(
            primary_reinforcer_type == 'monetary' 
            || primary_reinforcer_type == 'usd'
            || primary_reinforcer_type == 'money'
            || primary_reinforcer_type == 'dollars'){
            this.Reinforcer = new MonetaryReinforcer(bonusUSDPerCorrect)
        }

        this.ActionPoller = new ActionPollerClass(action_event_type, bounds)
        this.SoundPlayer = new SoundPlayerClass()
        this.periodicRewardIntervalMsec = periodicRewardIntervalMsec 
        this.periodicRewardAmount = periodicRewardAmount

        // Async trackers 
        this.rewardLog = {'t':[], 'n':[]}
    }

    debug2record(){
        this.rewardLog = {'t':[], 'n':[]}
        this.start_device_tracking()
        this.ActionPoller.start_action_tracking()
        this.toggleBorder(0)
        console.log('debug2record: Playspace performed a reset of reward, device, and action logs')
    }

    async build(){
        
        this.attachWindowResizeMonitor()
        await this.SoundPlayer.build()
        await this.ScreenDisplayer.build()
        
    }


    async run_trial(trialPackage){

        // ************ Prebuffer trial assets ***************

        // Fixation

        var fixationXCentroidPixels = this.xprop2pixels(trialPackage['fixationXCentroid'] )
        var fixationYCentroidPixels = this.yprop2pixels(trialPackage['fixationYCentroid'] )
        var fixationRadiusPixels = this.deg2pixels(trialPackage['fixationRadiusDegrees'] )

        var fixationFramePackage = {
            'fixationXCentroidPixels':fixationXCentroidPixels,
            'fixationYCentroidPixels':fixationYCentroidPixels, 
            'fixationRadiusPixels':fixationRadiusPixels,
        }
        await this.ScreenDisplayer.bufferFixation(fixationFramePackage)

        // Stimulus sequence
        var sampleXCentroidPixels = this.xprop2pixels(trialPackage['sampleXCentroid'])
        var sampleYCentroidPixels = this.yprop2pixels(trialPackage['sampleYCentroid'])
        var sampleRadiusPixels = this.deg2pixels(trialPackage['sampleRadiusDegrees'])

        var choiceXCentroidPixels = this.xprop2pixels(trialPackage['choiceXCentroid'])
        var choiceYCentroidPixels = this.yprop2pixels(trialPackage['choiceYCentroid'])
        var choiceRadiusPixels = this.deg2pixels(trialPackage['choiceRadiusDegrees'])

        var stimulusFramePackage = {
            'sampleImage':trialPackage['sampleImage'],
            'sampleOn':trialPackage['sampleOnMsec'],
            'sampleOff':trialPackage['sampleOffMsec'],
            'sampleRadiusPixels':sampleRadiusPixels,
            'sampleXCentroid':sampleXCentroidPixels,
            'sampleYCentroid':sampleYCentroidPixels,
            'choiceImage':trialPackage['choiceImage'],
            'choiceRadiusPixels':choiceRadiusPixels,
            'choiceXCentroid':choiceXCentroidPixels,
            'choiceYCentroid':choiceYCentroidPixels,
        }

        await this.ScreenDisplayer.bufferStimulusSequence(stimulusFramePackage)

        // *************** Run trial *************************

        // SHOW BLANK
        await this.ScreenDisplayer.displayBlank()

        // RUN FIXATION
        this.ActionPoller.create_action_regions(
            fixationXCentroidPixels,
            fixationYCentroidPixels,
            fixationRadiusPixels)

        var t_fixationOn = await this.ScreenDisplayer.displayFixation()
        var fixationOutcome = await this.ActionPoller.Promise_wait_until_active_response()

        // RUN STIMULUS SEQUENCE
        var t_SequenceTimestamps = await this.ScreenDisplayer.displayStimulusSequence()

        var actionXCentroidPixels = this.xprop2pixels(trialPackage['actionXCentroid'])
        var actionYCentroidPixels = this.yprop2pixels(trialPackage['actionYCentroid'])
        var actionRadiusPixels = this.deg2pixels(trialPackage['actionRadiusDegrees'])

        this.ActionPoller.create_action_regions(
            actionXCentroidPixels, 
            actionYCentroidPixels, 
            actionRadiusPixels)

        if(trialPackage['choiceTimeLimit'] > 0){
            var actionPromise = Promise.race([
                                this.ActionPoller.Promise_wait_until_active_response(), 
                                this.ActionPoller.timeout(trialPackage['choiceTimeLimit'])]) 
        }
        else{
            var actionPromise = this.ActionPoller.Promise_wait_until_active_response()
        }

        var actionOutcome = await actionPromise
        var rewardAmount = trialPackage['choiceRewardMap'][actionOutcome['actionIndex']]

        // Deliver reinforcement
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

        this.rewardLog['t'].push(t_reinforcementOn)
        this.rewardLog['n'].push(rewardAmount)

        // *************** Write down trial outcome *************************
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

        trialOutcome['taskNumber'] = TaskStreamer.taskNumber
        trialOutcome['trialNumberTask'] = TaskStreamer.trialNumberTask 
        trialOutcome['trialNumberSession'] = TaskStreamer.trialNumberSession
        trialOutcome['i_sampleBag'] = trialPackage['i_sampleBag']
        trialOutcome['i_sampleId'] = trialPackage['i_sampleId']
        trialOutcome['i_choiceBag'] = trialPackage['i_choiceBag']
        trialOutcome['i_choiceId'] = trialPackage['i_choiceId']

        return trialOutcome
    }


    toggleBorder(on_or_off){
        this.ScreenDisplayer.togglePlayspaceBorder(on_or_off)
    }

    start_periodic_rewards(){
        if (this.periodicRewardAmount <= 0){
            return
        }
        if (this.periodicRewardIntervalMsec <= 0){
            return
        }

        console.log('Called auto reinforcer:',this.periodicRewardAmount, 'reward(s) every', this.periodicRewardIntervalMsec/1000, 'seconds')
        // https://stackoverflow.com/questions/12587977/html5-audio-chrome-on-android-doesnt-automatically-play-song-vs-chrome-on-pc-d/24842152#24842152
        this.SoundPlayer.play_sound('reward_sound')
        var _this = this
        var periodic_reward = function(){
            var t = Math.round(performance.now()*1000)/1000
            _this.Reinforcer.deliver_reinforcement(_this.periodicRewardAmount)
            _this.SoundPlayer.play_sound('reward_sound')
            _this.rewardLog['n'].push(_this.periodicRewardAmount)
            _this.rewardLog['t'].push(t)
        } 


        window.setInterval(periodic_reward, this.periodicRewardIntervalMsec)
        
    }

    start_action_tracking(){
        this.ActionPoller.start_action_tracking()
    }

    get_action_log(){
        return this.ActionPoller.actionLog
    }

    getPlayspaceBounds(){
        var bounds = {}
        var windowHeight = getWindowHeight()
        var windowWidth = getWindowWidth()

        var screen_margin = 0.15
        var max_allowable_playspace_dimension = Math.round(Math.min(windowHeight, windowWidth))*(1-screen_margin)

        var min_dimension = Math.min(max_allowable_playspace_dimension, this.playspaceSizePixels)
        var min_dimension = Math.ceil(min_dimension)

        bounds['height'] = min_dimension
        bounds['width'] = min_dimension 
        bounds['leftbound'] = Math.floor((windowWidth - min_dimension)/2) // in units of window
        bounds['rightbound'] = Math.floor(windowWidth-(windowWidth - min_dimension)/2)
        bounds['topbound'] = Math.floor((windowHeight - min_dimension)/2)
        bounds['bottombound'] = Math.floor(windowHeight-(windowHeight - min_dimension)/2)

        return bounds
    }

    attachWindowResizeMonitor(){
  
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
            _this.leftbound = Math.floor((windowWidth - _this.width)/2) // in units of window
            _this.rightbound = Math.floor(windowWidth-(windowWidth - _this.width)/2)
            _this.topbound = Math.floor((windowHeight - _this.height)/2)
            _this.bottombound = Math.floor(windowHeight-(windowHeight - _this.height)/2)

            bounds['height'] = _this.height
            bounds['width'] = _this.width
            bounds['leftbound'] = _this.leftbound
            bounds['rightbound'] = _this.rightbound
            bounds['topbound'] = _this.topbound
            bounds['bottombound'] = _this.bottombound

            _this.ScreenDisplayer.calibrateBounds(bounds)
            _this.ActionPoller.calibrateBounds(bounds)

            // https://stackoverflow.com/questions/5489946/jquery-how-to-wait-for-the-end-of-resize-event-and-only-then-perform-an-ac
            // TODO: rebuffer frames on resize (needs to be controlled by Playspace?) - retranslate canvas 
            //_this.ScreenDisplayer.requestRefreshCurrentFrames()

            console.log('onWindowResize():', bounds['leftbound'], bounds['topbound'])
        }

        onWindowResize()
        
        window.addEventListener('resize', onWindowResize)
        console.log('Attached window resize listener')
    }

    start_device_tracking(){
        // battery
        // resize events
        this.deviceLog = {}
        
        // ******** Battery ******** 
        // http://www.w3.org/TR/battery-status/
        this.deviceLog['battery'] = {} 
        this.deviceLog['battery']['level'] = [] 
        this.deviceLog['battery']['dischargingTime'] = [] 
        this.deviceLog['battery']['timestamp'] = [] 

        var _this = this
        navigator.getBattery().then(function(batteryobj){
            _this.deviceLog['battery']['level'].push(batteryobj.level)
            _this.deviceLog['battery']['dischargingTime'].push(batteryobj.dischargingTime)
            _this.deviceLog['battery']['timestamp'].push(Math.round(performance.now()*1000)/1000)

            batteryobj.addEventListener('levelchange',function(){
                _this.deviceLog['battery']['level'].push(batteryobj.level)
                _this.deviceLog['battery']['dischargingTime'].push(batteryobj.dischargingTime)
                _this.deviceLog['battery']['timestamp'].push(Math.round(performance.now()*1000)/1000)
            })
          });

        // ******** Window resize ****
        this.deviceLog['window'] = {}
        this.deviceLog['window']['height'] = []
        this.deviceLog['window']['width'] = []
        this.deviceLog['window']['timestamp'] = []
        window.addEventListener('resize', function(){
            _this.deviceLog['window']['height'].push(getWindowHeight())
            _this.deviceLog['window']['width'].push(getWindowWidth())
            _this.deviceLog['window']['timestamp'].push(Math.round(performance.now()*1000)/1000)
        })

        // ******** Device and browser ****
        this.deviceLog.devicePixelRatio = window.devicePixelRatio || 1
        this.deviceLog.navigator_appVersion = navigator.appVersion
        this.deviceLog.navigator_platform = navigator.platform
        this.deviceLog.navigator_userAgent = navigator.userAgent
        this.deviceLog.navigator_vendor = navigator.vendor
        this.deviceLog.navigator_language = navigator.language
        this.deviceLog.unixTimestampPageLoad = window.performance.timing.navigationStart
        this.deviceLog.currentDate = new Date;
        this.deviceLog.url = window.location.href
    }

    deg2inches(degrees){
        if(degrees.constructor == Array){
            var result = []
            for (var i = 0; i<degrees.length; i++){
                var rad = this.deg2rad(degrees[i])
                result.push(this.viewingDistanceInches * Math.atan(rad + Math.tan(this.viewingOffsetInches / this.viewingDistanceInches)) - this.viewingOffsetInches)
            }
            return result
        }

        var rad = this.deg2rad(degrees)
        return this.viewingDistanceInches * Math.atan(rad + Math.tan(this.viewingOffsetInches / this.viewingDistanceInches)) - this.viewingOffsetInches
    }

    deg2pixels(degrees){
        // Return virtual pixels 
        if(degrees.constructor == Array){
            var result = []
            for (var i = 0; i<degrees.length; i++){
                var inches = this.deg2inches(degrees[i], this.viewingDistanceInches, this.viewingOffsetInches)
                result.push(Math.round(inches * this.virtualPixelsPerInch))
            }
            return result
        }

        var inches = this.deg2inches(degrees, this.viewingDistanceInches, this.viewingOffsetInches)
        return Math.round(inches * this.virtualPixelsPerInch)
    }

    xprop2pixels(xproportion){
        if(xproportion.constructor == Array){
            var result = []
            for (var i = 0; i<xproportion.length; i++){
                result.push(Math.round(xproportion[i]*this.width))
            }
            return result
        }
        return Math.round(xproportion*this.width)
    }

    yprop2pixels(yproportion){
        if(yproportion.constructor == Array){
            var result = []
            for (var i = 0; i<yproportion.length; i++){
                result.push(Math.round(yproportion[i]*this.height))
            }
            return result
        }
        return Math.round(yproportion*this.height)
    }

    deg2rad(deg){
        if(deg.constructor == Array){
            var result = []
            for (var i = 0; i<deg.length; i++){
                result.push(deg[i] * Math.PI / 180)
            }
            return result
        }
        return deg * Math.PI / 180
    }

    
    async run_tutorial_trial(tutorial_image){
        var fixationXCentroidPixels = this.xprop2pixels(0.5)
        var fixationYCentroidPixels = this.yprop2pixels(0.7)
        var fixationRadiusPixels = this.deg2pixels(3)

        // BUFFER FIXATION
        var fixationFramePackage = {
            'fixationXCentroidPixels':fixationXCentroidPixels,
            'fixationYCentroidPixels':fixationYCentroidPixels, 
            'fixationRadiusPixels':fixationRadiusPixels,
        }
        await this.ScreenDisplayer.bufferFixation(fixationFramePackage)


        // BUFFER STIMULUS
        var stimulusXCentroidPixels = this.xprop2pixels(0.1 + 0.8 * Math.random())
        var stimulusYCentroidPixels = this.yprop2pixels(0.6 * Math.random())
        var stimulusRadiusPixels = this.deg2pixels(4)
        
        var stimulusCanvas = this.ScreenDisplayer.getSequenceCanvas('tutorial_sequence', 0)
        await this.ScreenDisplayer.renderBlank(stimulusCanvas)
        await this.ScreenDisplayer.drawImagesOnCanvas(tutorial_image, stimulusXCentroidPixels, stimulusYCentroidPixels, stimulusRadiusPixels, stimulusCanvas)

        // SHOW BLANK
        await this.ScreenDisplayer.displayBlank()

        // RUN FIXATION
        this.ActionPoller.create_action_regions(
            fixationXCentroidPixels,
            fixationYCentroidPixels,
            fixationRadiusPixels)

        await this.ScreenDisplayer.displayFixation()
        await this.ActionPoller.Promise_wait_until_active_response()

        // RUN STIMULUS SEQUENCE
        await this.ScreenDisplayer.displayScreenSequence(stimulusCanvas, 0)

        this.ActionPoller.create_action_regions(
            stimulusXCentroidPixels, 
            stimulusYCentroidPixels, 
            stimulusRadiusPixels)

        await this.ActionPoller.Promise_wait_until_active_response()
        this.SoundPlayer.play_sound('reward_sound')
    }
}
