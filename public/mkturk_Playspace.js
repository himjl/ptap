class PlaySpaceClass{
    constructor(
        playspace_degreesVisualAngle, 
        playspace_verticalOffsetInches,
        playspace_viewingDistanceInches,
        primary_reinforcer_type, 
        action_event_type, 
        periodicRewardInterval, 
        periodicRewardAmount
        ){

        this.ScreenDisplayer = new ScreenDisplayer( playspace_degreesVisualAngle, 
                                                    playspace_verticalOffsetInches,
                                                    playspace_viewingDistanceInches,)
        this.ActionPoller = new ActionPoller(action_event_type)
        this.Reinforcer = new Reinforcer(primary_reinforcer_type)
        this.SoundPlayer = new SoundPlayerClass()

        this.periodic_reward_interval = periodicRewardInterval 
        this.periodic_reward_amount = periodicRewardAmount

    }

    async build(){
        await this.SoundPlayer.build()
    }

    start_periodic_rewards(){
        if (this.periodic_reward_amount < 0){
            return
        }

        console.log('Called auto juicer')

        var periodic_reward = function(){
            this.Reinforcer.deliver_reinforcement(this.periodic_reward_amount, false)
        } 

        window.setInterval(periodic_reward, this.periodic_reward_interval)
        
    }

    start_action_tracking(actionLog){

    }

    start_environment_tracking(environmentLog){
        // battery
        // resize events

    }

    
    async run_trial(trialPackage){

        // ************ Prebuffer trial assets ***************

        // Fixation
        await this.ScreenDisplayer.bufferFixation(
            trialPackage['fixationCentroid'] , 
            trialPackage['fixationRadius'] )

        // Stimulus sequence
        await this.ScreenDisplayer.bufferStimulusSequence(
            trialPackage['sampleImage'], 
            trialPackage['sampleOn'], 
            trialPackage['sampleOff'], 
            trialPackage['sampleRadius'], 
            trialPackage['samplePlacement'], 
            trialPackage['testImage'], 
            trialPackage['testRadius'], 
            trialPackage['testPlacement'])

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
        var t_reinforcementOn = performance.now()
        var p_sound = SP.play_sound('reward_sound')
        var p_visual = this.ScreenDisplayer.displayReward()
        var p_primaryReinforcement = this.Reinforcer.deliver_reinforcement(rewardAmount)
        await Promise.all([p_primaryReinforcement, p_visual]) 
        var t_reinforcementOff = performance.now()


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
