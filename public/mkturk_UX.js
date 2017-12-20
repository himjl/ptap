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
    constructor(minimumTrials, maximumTrials, bonusUSDPerCorrect){
        this.minimumTrials = minimumTrials // for enabling early turn-in
        this.maximumTrials = maximumTrials
        this.bonusUSDPerCorrect = bonusUSDPerCorrect

        this.bonusEarned = 0

        document.querySelector("button[name=WorkerCashInButton]").addEventListener('mouseup',this.cash_in_listener,false)
        document.querySelector("button[name=WorkerCashInButton]").addEventListener('touchstart',this.cash_in_listener,false)
        toggleElement(1, 'MechanicalTurk_ProgressBar')
        toggleElement(1, 'MechanicalTurk_TrialBar')

          document.querySelector("button[name=WorkerCashInButton]").style.visibility = 'visible'
                                toggleCashInButtonClickability(0)

    }

    debug2record(){
        return
    }
    async run_instructions_dialogue(){
        var screen1_instructions =  "" 
        screen1_instructions += "<ul>"
        screen1_instructions +='<p><text style="font-weight:bold; font-size:large">Thank you for your interest and contributing to research at at MIT!</text>'
        screen1_instructions += "<pi><li>Please use the latest version of <b>Google Chrome</b> to work on this HIT. It may not work correctly on other browsers."
        screen1_instructions += "<p><li>You will look at rapidly flashed images and be required to have a working mouse, touchscreen, or touchpad."
        screen1_instructions += '<p><li>The sound of a <text style="font-weight:bold">bell</text> means you received a small bonus reward.'
        screen1_instructions += '<p><li>When the top right button turns  <text style="font-weight:bold; color:green">GREEN</text> you can press it to submit early, though we encourage you to continue working for bonus rewards.'
        screen1_instructions += '<p><li>Highly productive workers may be contacted for exclusive, higher-paying HITs.' 
                screen1_instructions += '<p><text style="color:#7A7A7A; font-size:smaller; font-style:italic">If you cannot meet these requirements or if doing so could cause discomfort or injury, do not accept this HIT. You will not be penalized in any way.</text>'
        screen1_instructions += "</ul>"

        await this.showMechanicalTurkInstructions(screen1_instructions)
        
    }

    async run_device_selection_dialogue(){
        var hand_used = await this.showHandSelectionDialogue_and_getUserSelection()
        var device_selected = await this.showDeviceSelectionDialogue_and_getUserSelection()
    }

    async showDeviceSelectionDialogue_and_getUserSelection(){
    // Turn on dialogue
    SESSION.MechanicalTurk_DeviceSelected = 'not_selected'
    document.getElementById("MechanicalTurkCursorDeviceSelectionScreen").style.visibility = 'visible'
    return new Promise(function(resolve, reject){
        FLAGS.clicked_device_selection = resolve
    })
    }

    async showHandSelectionDialogue_and_getUserSelection(){
        // Turn on dialogue
        SESSION.MechanicalTurk_Handedness = 'not_selected'
        document.getElementById("MechanicalTurkHandSelectionScreen").style.visibility = 'visible'
        return new Promise(function(resolve, reject){
            FLAGS.clicked_hand_selection = resolve
        })
    }

    async run_mouse_over_tutorial(){
        // If in preview mode on MechanicalTurk
      toggleElement(1, 'PreviewModeSplash')
      var tutorial_image = await SIO.load_image('tutorial_images/TutorialMouseOver.png')

      while(true){
        await this.run_MouseOver_TutorialTrial(tutorial_image) 
      }

    }
    async showMechanicalTurkInstructions(instructions_text){
  
    document.getElementById("MechanicalTurkInstructionsSplash").style.visibility = 'visible'
    document.getElementById("InstructionSplashText").innerHTML = instructions_text

    
    var btn = document.getElementById('CloseInstructionsButton')
    btn.disabled = false 
    btn.innerHTML = 'Continue'

    return new Promise(function(resolve, reject){
        FLAGS.clicked_close_instructions = resolve
    })
}

    async poll(trialOutcome){
        
        var trialNumberSession = trialOutcome['trialNumberSession']
        this.bonusEarned+=(trialOutcome['return'] * this.bonusUSDPerCorrect)

        var minimum_trials_left = Math.max(this.minimumTrials - trialNumberSession, 0)
        if(minimum_trials_left > 0){
            updateProgressbar(trialNumberSession/this.minimumTrials*100, 'MechanicalTurk_TrialBar', '', 100, ' ')
            updateCashInButtonText(minimum_trials_left, this.bonusEarned, false)
        }
        else{

            document.getElementById('MechanicalTurk_TrialBar').style['background-color'] = '#00cc66'
            document.getElementById('MechanicalTurk_TrialBar').style['opacity'] = 1
            
            updateProgressbar(trialNumberSession/this.minimumTrials*100, 'MechanicalTurk_TrialBar', '', 100)

            toggleCashInButtonClickability(1)
            var num_bonus_trials_performed = trialNumberSession-this.minimumTrials
            updateCashInButtonText(num_bonus_trials_performed, this.bonusEarned, true)
        }

        if(trialNumberSession >= this.maximumTrials){
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

    async run_MouseOver_TutorialTrial(tutorial_image){

        var funcreturn = await SD.displayFixation(5)
        boundingBoxesFixation = funcreturn[0]
        
        RewardMap.create_reward_map_with_bounding_boxes(boundingBoxesFixation, 1)
        var fixation_outcome = await RewardMap.Promise_wait_until_active_response_then_return_reinforcement()

        var dwidth = PLAYSPACE._gridwidth*0.7
        var dheight = PLAYSPACE._gridheight*0.7
        var dx = PLAYSPACE._gridwidth/2+(PLAYSPACE.width-PLAYSPACE._gridwidth) * Math.random() // [0, playspace width - one imagewidth]
        var dy = PLAYSPACE._gridheight/2+(PLAYSPACE.height - 2*PLAYSPACE._gridheight) * Math.random() // avoid overlapping with fixation dot

        var boundingBoxMouseOver = await SD.bufferCanvasWithImage(tutorial_image, SD.canvas_fixation, dx, dy, dwidth, dheight)
        // Make smaller
        var original_x_width = boundingBoxMouseOver[0].x[1] - boundingBoxMouseOver[0].x[0]
        var original_y_width = boundingBoxMouseOver[0].y[1] - boundingBoxMouseOver[0].y[0]

        boundingBoxMouseOver[0].x[0] += original_x_width * 0.2
        boundingBoxMouseOver[0].x[1] -= original_x_width * 0.2
        boundingBoxMouseOver[0].y[0] += original_y_width * 0.2
        boundingBoxMouseOver[0].y[1] -= original_y_width * 0.2
        //============ Mouse over SCREEN ============//
        RewardMap.create_reward_map_with_bounding_boxes(boundingBoxMouseOver, 1)
        var fixation_onset_timestamps = await SD.displayScreenSequence(SD.canvas_fixation,0);

        wdm('Awaiting fixation...')

        
        console.log('Awaiting fixation...')
        var fixation_outcome = await RewardMap.Promise_wait_until_active_response_then_return_reinforcement()
        await SD.displayScreenSequence(SD.canvas_blank,0);

        await R.deliver_reinforcement(1)

}



}