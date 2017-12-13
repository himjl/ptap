class PlaySpaceClass{
    constructor(
        playspace_degreesVisualAngle, 
        playspace_verticalOffsetInches,
        playspace_viewingDistanceInches,
        screen_virtualPixelsPerInch,
        primary_reinforcer_type, 
        action_event_type, 
        periodicRewardInterval, 
        periodicRewardAmount, 
        bonusUSDPerCorrect, 
        ){


        this.viewingDistanceInches = playspace_viewingDistanceInches
        this.viewingOffsetInches = playspace_verticalOffsetInches
        this.playspaceSizeDegrees = playspace_degreesVisualAngle
        this.virtualPixelsPerInch = screen_virtualPixelsPerInch

        this.playspaceSizePixels = this.deg2pixels(this.playspaceSizeDegrees)


        var bounds = this.getPlayspaceBounds()    
        this.ScreenDisplayer = new ScreenDisplayer(bounds)
        

        this.play
        if (primary_reinforcer_type == 'juice'){
            this.Reinforcer = new JuiceReinforcer()
        }
        else if(primary_reinforcer_type == 'monetary'){
            this.Reinforcer = new MonetaryReinforcer(bonusPerCorrect)
        }

        this.ActionPoller = new ActionPollerClass(action_event_type, bounds)
        this.SoundPlayer = new SoundPlayerClass()
        this.periodic_reward_interval = periodicRewardInterval 
        this.periodic_reward_amount = periodicRewardAmount

        // Async trackers 
        this.touchLog = {}

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
        await this.ScreenDisplayer.bufferFixation(
            fixationXCentroidPixels, 
            fixationYCentroidPixels, 
            fixationRadiusPixels
            )

        // Stimulus sequence
        var sampleXCentroidPixels = this.xprop2pixels(trialPackage['sampleXCentroid'])
        var sampleYCentroidPixels = this.yprop2pixels(trialPackage['sampleYCentroid'])
        var sampleRadiusPixels = this.deg2pixels(trialPackage['sampleRadiusDegrees'])

        var choiceXCentroidPixels = this.xprop2pixels(trialPackage['choiceXCentroid'])
        var choiceYCentroidPixels = this.yprop2pixels(trialPackage['choiceYCentroid'])
        var choiceRadiusPixels = this.deg2pixels(trialPackage['choiceRadiusDegrees'])

        await this.ScreenDisplayer.bufferStimulusSequence(
            trialPackage['sampleImage'], 
            trialPackage['sampleOn'], 
            trialPackage['sampleOff'], 
            sampleRadiusPixels, 
            sampleXCentroidPixels, 
            sampleYCentroidPixels,
            trialPackage['choiceImage'], 
            choiceRadiusPixels, 
            choiceXCentroidPixels, 
            choiceYCentroidPixels)

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
            var t_reinforcementOn = performance.now()
            var p_sound = this.SoundPlayer.play_sound('reward_sound')
            var p_visual = this.ScreenDisplayer.displayReward(trialPackage['rewardTimeOut'])
            var p_primaryReinforcement = this.Reinforcer.deliver_reinforcement(rewardAmount)
            await Promise.all([p_primaryReinforcement, p_visual]) 
            var t_reinforcementOff = performance.now()
        }
        if (rewardAmount <= 0){
            var t_reinforcementOn = performance.now()
            var p_sound = this.SoundPlayer.play_sound('punish_sound')
            var p_visual = this.ScreenDisplayer.displayPunish(trialPackage['punishTimeOut'])
            await Promise.all([p_sound, p_visual]) 
            var t_reinforcementOff = performance.now()
        }

        // *************** Write down trial outcome *************************
        var trialOutcome = {}
        trialOutcome['return'] = rewardAmount 
        trialOutcome['action'] = actionOutcome['actionIndex']
        trialOutcome['responseX'] = actionOutcome['x']
        trialOutcome['responseY'] = actionOutcome['y']
        trialOutcome['fixationX'] = fixationOutcome['x']
        trialOutcome['fixationY'] = fixationOutcome['y']
        trialOutcome['i_fixationBag'] = trialPackage['i_fixationBag']
        trialOutcome['i_fixationId'] = trialPackage['i_fixationId']
        trialOutcome['i_sampleBag'] = trialPackage['i_sampleBag']
        trialOutcome['i_sampleId'] = trialPackage['i_sampleId']
        trialOutcome['i_testBag'] = trialPackage['i_testBag']
        trialOutcome['i_testId'] = trialPackage['i_testId']
        trialOutcome['taskNumber'] = TaskStreamer.taskNumber
        trialOutcome['timestampStart'] = fixationOutcome['timestamp']
        trialOutcome['timestampFixationOnset'] = 
        trialOutcome['timestampFixationAcquired'] = fixationOutcome['timestamp']
        trialOutcome['timestampResponse'] = actionOutcome['timestamp']
        trialOutcome['timestampReinforcementOn'] = t_reinforcementOn
        trialOutcome['timestampReinforcementOff'] = t_reinforcementOff
        trialOutcome['trialNumberTask'] = TaskStreamer.trialNumberTask 
        trialOutcome['trialNumberSession'] = TaskStreamer.trialNumberSession
        trialOutcome['timestampStimulusOn'] = t_SequenceTimestamps[0]
        trialOutcome['timestampStimulusOff'] = t_SequenceTimestamps[1]
        trialOutcome['timestampChoiceOn'] = t_SequenceTimestamps.slice(-1)[0]
        trialOutcome['reactionTime'] = Math.round(actionOutcome['timestamp'] - t_SequenceTimestamps.slice(-1)[0])

        return trialOutcome
    }


    toggleBorder(on_or_off){
        this.ScreenDisplayer.togglePlayspaceBorder(on_or_off)
    }

    start_periodic_rewards(){
        if (this.periodic_reward_amount <= 0){
            return
        }

        console.log('Called auto juicer')

        var periodic_reward = function(){
            this.Reinforcer.deliver_reinforcement(this.periodic_reward_amount, false)
        } 

        window.setInterval(periodic_reward, this.periodic_reward_interval)
        
    }

    start_action_tracking(actionLog){
        this.ActionPoller.start_logging()
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

            console.log('onWindowResize', bounds['leftbound'], bounds['topbound'])
        }

        onWindowResize()
        
        window.addEventListener('resize', onWindowResize)
        console.log('Attached window resize listener')
    }

    start_environment_tracking(environmentLog){
        // battery
        // resize events
        this.environmentLog = {}
        
        // ******** Battery ******** 
        // http://www.w3.org/TR/battery-status/
        this.environmentLog['battery'] = {} 
        this.environmentLog['battery']['level'] = [] 
        this.environmentLog['battery']['dischargingTime'] = [] 
        this.environmentLog['battery']['timestamp'] = [] 

        var _this = this
        navigator.getBattery().then(function(batteryobj){
            _this.environmentLog['battery']['level'].push(batteryobj.level)
            _this.environmentLog['battery']['dischargingTime'].push(batteryobj.dischargingTime)
            _this.environmentLog['battery']['timestamp'].push(performance.now())

            batteryobj.addEventListener('levelchange',function(){
                _this.environmentLog['battery']['level'].push(batteryobj.level)
                _this.environmentLog['battery']['dischargingTime'].push(batteryobj.dischargingTime)
                _this.environmentLog['battery']['timestamp'].push(performance.now())
            })
          });

        // ******** Window resize ****
        this.environmentLog['window'] = {}
        this.environmentLog['window']['height'] = []
        this.environmentLog['window']['width'] = []
        this.environmentLog['window']['timestamp'] = []
        window.addEventListener('resize', function(){
            _this.environmentLog['window']['height'].push(getWindowHeight())
            _this.environmentLog['window']['width'].push(getWindowWidth())
            _this.environmentLog['window']['timestamp'].push(performance.now())
        })

        this.environmentLog.DevicePixelRatio = window.devicePixelRatio || 1
        this.environmentLog.navigator_appVersion = navigator.appVersion
        this.environmentLog.navigator_platform = navigator.platform
        this.environmentLog.navigator_userAgent = navigator.userAgent
        this.environmentLog.navigator_vendor = navigator.vendor
        this.environmentLog.navigator_language = navigator.language
        this.environmentLog.unixTimestampPageLoad = window.performance.timing.navigationStart
        this.environmentLog.currentDate = new Date;
        this.environmentLog.url = window.location.href
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

    
    
}
