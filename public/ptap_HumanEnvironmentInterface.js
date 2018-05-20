class HumanEnvironmentInterface{
    // The agent-task interface. Responsible for executing:
    // sounds
    // canvas sequences with temporal precision 
    // the polling of agent actions 
    // delivering reinforcement 

    // Specify input arguments in units of 
    // pixels (where 0, 0 is pageX, pageY @ top left corner of rendered page)
    // msec (1000 = one second)


    constructor(ENVIRONMENT){
        
        var primary_reinforcer_type = ENVIRONMENT['primary_reinforcer_type'] 
        var action_event_type = ENVIRONMENT['action_event_type']
        var bonusUSDPerCorrect = ENVIRONMENT['bonusUSDPerCorrect']
        var juiceRewardPer1000 = ENVIRONMENT['juiceRewardPer1000Trials']
        this.bonusUSDPerCorrect = bonusUSDPerCorrect
        
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

        this.actionCanvasObj = Playspace.get_new_canvas('actionField')
        this.actionCanvasObj.style.zIndex = 101
        
        this.ActionPoller = new ActionPollerClass(action_event_type, this.actionCanvasObj)
        this.SoundPlayer = new SoundPlayerClass()


        // Async trackers 
        this.rewardLog = {'t':[], 'n':[]}
        this.totalUSDBonus = 0
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
        var reinforcementTimestamps = freturn[0]
        var frameTimestamps = freturn[1]

        if (reward > 0){ 
            this.rewardLog['n'].push(reward)
            this.rewardLog['t'].push(performance.now())
        }
        // Wait for eligible agent action
        if (actionTimeoutMsec == 0){
            // No action polled; move directly to next state
            var action = {'actionIndex':null, 
                            'x':null, 
                            'y':null, 
                            'timestamp':null}
        }
        else{
            var action = await this.ActionPoller.poll(
            actionRegions['x'], 
            actionRegions['y'], 
            actionRegions['diameter'],
            actionTimeoutMsec)
        }
        
        
        // Update bonus readout
        this.totalUSDBonus = this.totalUSDBonus + reward * this.bonusUSDPerCorrect
        var current_bonus_string = 'Bonus cents: '+(100*this.totalUSDBonus).toFixed(3)
        $('#bonus_counter').html(current_bonus_string)

        // Return
        var stepOutcome = {'frameTimestamps': frameTimestamps, 'action':action, 'reward': reward, 'reinforcementTimestamps':reinforcementTimestamps}
        return stepOutcome
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