class MonkeyUX{
    constructor(){
        toggleElement(1, "SessionTextBox")
        toggleElement(1, 'DebugMessageTextBox')
        toggleElement(1, 'TrialCounter')
        document.querySelector("button[name=doneTestingTask]").addEventListener(
        'touchend',this.doneTestingTask_listener,false)
        document.querySelector("button[name=doneTestingTask]").addEventListener(
        'mouseup',this.doneTestingTask_listener,false)

        connectBLEButtonPromise()
    }

    async poll(trialOutcome){
        console.log('poo', trialOutcome['trialNumberSession'])
        this.writeToTrialCounterDisplay(trialOutcome['trialNumberSession']+1)

        return
    }

    debug2record(){
        console.log('debug2record: UX (not implemented yet)')
        toggleElement(0, "drive_juice_button")
        toggleElement(0, "SessionTextBox")
        toggleElement(0, "myProgress")
        toggleElement(0, "DebugMessageTextBox")
        var progressbar_names = [
                            'AutomatorLoadBar',
                            'StageBar',]

        for (var _p in progressbar_names){
            toggleProgressbar(0, progressbar_names[_p])
        }

        this.writeToTrialCounterDisplay('-')

    }
    writeToTrialCounterDisplay(s){
        var elem = document.getElementById('TrialCounter')
        elem.innerHTML = s; // text
    }

    updateSessionTextbox(agentID, ExperimentName){
        var sess_textbox = document.getElementById("SessionTextBox")

        var line1_prefix = "<b>Subject:</b> "
        var linebreak = "<br>"
        var line2_prefix = "<b>Game:</b> "

        sess_textbox.innerHTML = line1_prefix + agentID + linebreak + line2_prefix + ExperimentName
    }

    doneTestingTask_listener(event){
        event.preventDefault()
        //console.log("User is done testing. Start saving data");
        FLAGS.debug_mode = 0

        document.querySelector("button[name=doneTestingTask]").style.display = "none"
        TaskStreamer.debug2record()
        Playspace.debug2record()
        DataWriter.debug2record()
        UX.debug2record()

        return
    }
}

class MechanicalTurkUX{
    constructor(minimumTrials, maximumTrials){
        this.minimumTrials = minimumTrials // for enabling early turn-in
        this.maximumTrials = maximumTrials
        this.bonusEarned = 0
    }

    async poll(trialOutcome){
        var trialNumberSession = trialOutcome['trialNumberSession']

        var minimum_trials_left = Math.max(this.minimumTrials - trialNumberSession, 0)
        if(minimum_trials_left > 0){
            updateProgressbar(trialNumberSession/this.minimumTrials*100, 'MechanicalTurk_TrialBar', '', 100, ' ')
            updateCashInButtonText(minimum_trials_left, this.bonusEarned, false)
        }
        else{

            document.getElementById('MechanicalTurk_TrialBar').style['background-color'] = '#00cc66'
            document.getElementById('MechanicalTurk_TrialBar').style['opacity'] = 1
            
            updateProgressbar(TRIAL_NUMBER_FROM_SESSION_START/MechanicalTurkSettings["MinimumTrialsForCashIn"]*100, 'MechanicalTurk_TrialBar', '', 100)

            toggleCashInButtonClickability(1)
            var bonus_earned = R.bonus_total
            var num_bonus_trials_performed = TRIAL_NUMBER_FROM_SESSION_START-MechanicalTurkSettings["MinimumTrialsForCashIn"]
            updateCashInButtonText(num_bonus_trials_performed, bonus_earned, true)
        }

        if(TRIAL_NUMBER_FROM_SESSION_START >= MechanicalTurkSettings["MAX_SESSION_TRIALS_MECHANICALTURK"]){
            TERMINAL_STATE = true
        }
    }

    async cash_in_listener(event){
        console.log('Worker called cash in')
        var original_text = document.querySelector("button[name=WorkerCashInButton]").innerHTML
        var original_color = document.querySelector("button[name=WorkerCashInButton]").style['background-color']

        document.querySelector("button[name=WorkerCashInButton]").innerHTML = 'Submitting...'

        document.querySelector("button[name=WorkerCashInButton]").style['background-color'] = '#ADFF97'
        
        await SP.playSound('reward_sound') // Chime
        
        TERMINAL_STATE = true // end on next trial

        document.querySelector("button[name=WorkerCashInButton]").style['background-color'] = original_color
        DWr.concludeSession()


        return 
    }



}