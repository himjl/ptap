class UXclass {
    constructor() {

    }

    writeToTrialCounterDisplay(s) {
        var elem = document.getElementById('TrialCounter');
        elem.innerHTML = s; // text
    }
}

class MechanicalTurkUX extends UXclass {
    constructor(num_trials, bonusUSDPerCorrect) {
        super();
        this.num_trials = num_trials;
        this.bonusUSDPerCorrect = bonusUSDPerCorrect;
        this.bonusEarned = 0;
        this.ntrials_performed = 0;
    }

    async run_instructions_dialogue() {

        var screen1_instructions = "";
        screen1_instructions += "<ul>";
        screen1_instructions += '<p><text style="font-weight:bold; font-size:large">Thank you for your interest and contributing to research at at MIT!</text>';
        screen1_instructions += "<pi><li>Please use the latest version of <b>Google Chrome</b> to work on this HIT. It may not work correctly on other browsers.";
        screen1_instructions += "<p><li>You will be presented with rapidly flashed images. <b>Your task is to figure out where to click on parts of the screen based on the information in the images.</b>";
        screen1_instructions += '<p><li>The sound of a bell means you did something right, and received a small bonus reward.';
        screen1_instructions += "<p><li>Each trial begins with a <b>WHITE DOT</b>. Click the dot to begin the trial.";
        screen1_instructions += "<p><li>The HIT will submit <b>AUTOMATICALLY</b> after a certain number of trials. If the HIT freezes or does not submit, please contact us to resolve the issue and receive compensation for your time.";

        screen1_instructions += '<p><text style="color:#7A7A7A; font-size:smaller; font-style:italic">If you cannot meet these requirements or if doing so could cause discomfort or injury, do not accept this HIT. You will not be penalized in any way.</text>';
        screen1_instructions += "</ul>";

        await this.showMechanicalTurkInstructions(screen1_instructions)
    }

    show_preview_splash() {
        toggleElement(1, 'PreviewModeSplash')
    }

    async showMechanicalTurkInstructions(instructions_text) {

        document.getElementById("MechanicalTurkInstructionsSplash").style.visibility = 'visible';
        document.getElementById("InstructionSplashText").innerHTML = instructions_text;


        var btn = document.getElementById('CloseInstructionsButton');
        btn.disabled = false;
        btn.innerHTML = 'Continue';

        return new Promise(function (resolve, reject) {
            FLAGS.clicked_close_instructions = resolve
        })
    }

    async update_progressbar(trial_outcome) {
        /*var trialOutcome = {};
        trialOutcome['perf'] = rewardAmount;
        trialOutcome['action'] = actionOutcome['actionIndex'];
        trialOutcome['responseX'] = actionOutcome['x'];
        trialOutcome['responseY'] = actionOutcome['y'];
        trialOutcome['fixationX'] = fixationOutcome['x'];
        trialOutcome['fixationY'] = fixationOutcome['y'];
        trialOutcome['timestampStart'] = fixationOutcome['timestamp'];
        trialOutcome['timestampFixationOnset'] = t_fixationOn;
        trialOutcome['timestampFixationAcquired'] = fixationOutcome['timestamp'];
        trialOutcome['timestampResponse'] = actionOutcome['timestamp'];
        trialOutcome['timestampReinforcementOn'] = t_reinforcementOn;
        trialOutcome['timestampReinforcementOff'] = t_reinforcementOff;
        trialOutcome['timestampStimulusOn'] = t_SequenceTimestamps[0];
        trialOutcome['timestampStimulusOff'] = t_SequenceTimestamps[1];
        trialOutcome['timestampChoiceOn'] = t_SequenceTimestamps.slice(-1)[0];
        trialOutcome['reactionTime'] = Math.round(actionOutcome['timestamp'] - t_SequenceTimestamps.slice(-1)[0]);
        ];*/


        this.ntrials_performed+=1;
        var pbarupdate = this.ntrials_performed / this.num_trials * 100;
        this.writeToTrialCounterDisplay(this.ntrials_performed);
        this.bonusEarned += (trial_outcome['perf'] * this.bonusUSDPerCorrect);


        updateProgressbar(
             pbarupdate,
            'MechanicalTurk_TrialBar',
            '',
            100,
            ' ');

        if (!isNaN(this.bonusEarned)) {
            updateCashInButtonText(minimum_trials_left, this.bonusEarned, false)
        }
    }

}