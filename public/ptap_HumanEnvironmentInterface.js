class HumanEnvironmentInterface{
    // The agent-task interface. Responsible for executing:
    // sounds
    // canvas sequences with temporal precision 
    // the polling of agent actions 
    // delivering reinforcement 

    // Specify input arguments in units of 
    // pixels (where 0, 0 is pageX, pageY @ top left corner of rendered page)
    // msec (1000 = one second)


    constructor(playspacePackage){
        
        var primary_reinforcer_type = playspacePackage['primary_reinforcer_type'] 
        var action_event_type = playspacePackage['action_event_type'] 
        var periodicRewardIntervalMsec = playspacePackage['periodicRewardIntervalMsec'] 
        var periodicRewardAmount = playspacePackage['periodicRewardAmount'] 
        var bonusUSDPerCorrect = playspacePackage['bonusUSDPerCorrect'] 
        var juiceRewardPer1000 = playspacePackage['juiceRewardPer1000Trials']

        this.ScreenDisplayer = new ScreenDisplayer()
        
        if (primary_reinforcer_type == 'juice'){
            this.Reinforcer = new JuiceReinforcer(juiceRewardPer1000)
        }
        else if(
            primary_reinforcer_type == 'monetary' 
            || primary_reinforcer_type == 'usd'
            || primary_reinforcer_type == 'money'
            || primary_reinforcer_type == 'dollars'){
            this.Reinforcer = new MonetaryReinforcer(bonusUSDPerCorrect)
        }


        this.actionCanvasObj = Playspace2.get_new_canvas('actionField')
        this.actionCanvasObj.style.zIndex = 101
        
        this.ActionPoller = new ActionPollerClass(action_event_type, this.actionCanvasObj)
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
        //this.toggleBorder(0)
        console.log('debug2record: Playspace performed a reset of reward, device, and action logs')
    }

    async build(){
        
        await this.SoundPlayer.build()
        await this.ScreenDisplayer.build()
        
    }

    async step(frameData, soundData, actionRegions, actionTimeoutMsec, reward){
        // Start playing sound(t), async
        this.SoundPlayer.play_sound(soundData['soundName'])
        
        // Deliver reward(t) and run frames(t)
        var freturn = await Promise.all([this.Reinforcer.deliver_reinforcement(reward), this.ScreenDisplayer.execute_canvas_sequence(frameData['canvasSequence'], frameData['durationSequence'])])

        var frameTimestamps = freturn[1]
        // Wait for eligible agent action
        if (actionTimeoutMsec == 0){
            // No action polled; move directly to next state
            var action = 'null_state'
        }
        else{
            var action = await this.ActionPoller.poll(
            actionRegions['x'], 
            actionRegions['y'], 
            actionRegions['diameter'],
            actionTimeoutMsec)
        }
        
        

        // Return
        var stepOutcome = {'frameTimestamps': frameTimestamps, 'action':action, 'reward': reward}
        return stepOutcome
    }


    start_periodic_rewards(){
        if (this.periodicRewardAmount <= 0){
            return
        }
        if (this.periodicRewardIntervalMsec <= 0){
            return
        }

        if(this.periodicRewardAmount == undefined){
            return
        }

        if(this.periodicRewardIntervalMsec == undefined){
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

    updateWindowLog(bounds){
        if (this.playspaceLog == undefined){
            this.playspaceLog = {}

            for (var k in bounds){
                if(!bounds.hasOwnProperty(k)){
                    continue
                }
                this.playspaceLog[k] = []
            }
        }
        for (var k in bounds){
            if(!bounds.hasOwnProperty(k)){
                    continue
            }
            if(!this.playspaceLog.hasOwnProperty(k)){
                this.playspaceLog[k] = []
            }
            this.playspaceLog[k].push(bounds[k])
        }
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

        try{
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
        }
        catch(error){
            console.log('Battery logging error:', error)
        }

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
}