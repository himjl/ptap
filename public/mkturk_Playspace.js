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

        this.ScreenDisplayer = new ScreenDisplayer( playspace_degreesVisualAngle, 
                                                    playspace_verticalOffsetInches,
                                                    playspace_viewingDistanceInches,
                                                    screen_virtualPixelsPerInch)

        if (primary_reinforcer_type == 'juice'){
            this.Reinforcer = new JuiceReinforcer()
        }
        else if(primary_reinforcer_type == 'monetary'){
            this.Reinforcer = new MonetaryReinforcer(bonusPerCorrect)
        }

        this.ActionPoller = new ActionPollerClass(action_event_type)
        this.SoundPlayer = new SoundPlayerClass()
        this.periodic_reward_interval = periodicRewardInterval 
        this.periodic_reward_amount = periodicRewardAmount

        // Async trackers 
        this.touchLog = {}

    }

    async build(){
        await this.SoundPlayer.build()
        await this.ScreenDisplayer.build()
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

    
    async run_trial(trialPackage){

        // ************ Prebuffer trial assets ***************

        // Fixation
        await this.ScreenDisplayer.bufferFixation(
            trialPackage['fixationXCentroid'] , 
            trialPackage['fixationYCentroid'] , 
            trialPackage['fixationRadiusDegrees'] )

        // Stimulus sequence
        await this.ScreenDisplayer.bufferStimulusSequence(
            trialPackage['sampleImage'], 
            trialPackage['sampleOn'], 
            trialPackage['sampleOff'], 
            trialPackage['sampleRadiusDegrees'], 
            trialPackage['sampleXCentroid'], 
            trialPackage['sampleYCentroid'],
            trialPackage['choiceImage'], 
            trialPackage['choiceRadiusDegrees'], 
            trialPackage['choiceXCentroid'], 
            trialPackage['choiceYCentroid'])

        // *************** Run trial *************************

        // SHOW BLANK
        await this.ScreenDisplayer.displayBlank()

        // RUN FIXATION
        this.ActionPoller.create_action_regions(
            trialPackage['fixationPlacement'], 
            trialPackage['fixationRadius'])

        var t_fixationOn = await this.ScreenDisplayer.displayFixation()
        var fixationOutcome = await this.ActionPoller.Promise_wait_until_active_response()


        // RUN STIMULUS SEQUENCE
        var t_SequenceTimestamps = await this.ScreenDisplayer.displayStimulusSequence()

        this.ActionPoller.create_action_regions(
            trialPackage['choiceCentroids'], 
            trialPackage['choiceRadius'])

        if(trialPackage['choiceTimeLimit'] > 0){
            var actionPromise = Promise.race([
                                this.ActionPoller.Promise_wait_until_active_response(), 
                                this.ActionPoller.timeout(trialPackage['choiceTimeLimit'])]) 
        }
        else{
            var actionPromise = this.ActionPoller.Promise_wait_until_active_response()
        }

        var actionOutcome = await actionPromise
        var rewardAmount = trialPackage['choiceRewardAmounts'][actionOutcome['actionIndex']]

        // Deliver reinforcement
        if (rewardAmount > 0){
            var t_reinforcementOn = performance.now()
            var p_sound = SP.play_sound('reward_sound')
            var p_visual = this.ScreenDisplayer.displayReward(trialPackage['rewardTimeOut'])
            var p_primaryReinforcement = this.Reinforcer.deliver_reinforcement(rewardAmount)
            await Promise.all([p_primaryReinforcement, p_visual]) 
            var t_reinforcementOff = performance.now()
        }
        if (rewardAmount <= 0){
            var t_reinforcementOn = performance.now()
            var p_sound = SP.play_sound('punish_sound')
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
        trialOutcome['reactionTime'] = Math.round(actionOutcome['timestamp'] - timestampChoiceOn)

        return trialOutcome
    }
}
