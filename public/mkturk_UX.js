class UX_poller{
    constructor(DIO){
        this.DIO = DIO
        this.min_poll_period = 10*1000 // at least 10 seconds in between polling
        this.last_poll = performance.now()
        this.calledAutoJuice = false 

    }

    async poll(){
        
        if (this.calledAutoJuice == false){
            console.log('Called auto juicer')
            R.deliver_reinforcement(5, false)
            window.setInterval(function(){R.deliver_reinforcement(5, false)}, 120000)
            this.calledAutoJuice = true
        } 

        this.writeToTrialCounterDisplay(TRIAL_NUMBER_FROM_SESSION_START)

        return
    }

    async _diskread(fpath){
        var exists = await this.DIO.exists(fpath)
        if(exists == true){
            var string = await this.DIO.read_textfile(fpath)
            var flag = JSON.parse(string)
            return flag
        }
        else{
            return undefined
        }
    }

    writeToTrialCounterDisplay(s){
        var elem = document.getElementById('TrialCounter')
        elem.innerHTML = s; // text
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