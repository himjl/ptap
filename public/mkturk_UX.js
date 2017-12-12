class UX_poller{
    constructor(){

    }

    async poll(trialOutcome){
        
        this.writeToTrialCounterDisplay(trialOutcome['trialNumberSession'])

        return
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



}

class MechanicalTurk_UX_poller{
    constructor(){

    }

    async poll(){

        var minimum_trials_left = Math.max(MechanicalTurkSettings["MinimumTrialsForCashIn"] - TRIAL_NUMBER_FROM_SESSION_START, 0)
        if(minimum_trials_left > 0){
            updateProgressbar(TRIAL_NUMBER_FROM_SESSION_START/MechanicalTurkSettings["MinimumTrialsForCashIn"]*100, 'MechanicalTurk_TrialBar', '', 100, ' ')

            var bonus_earned = R.bonus_total
            updateCashInButtonText(minimum_trials_left, bonus_earned, false)
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

}