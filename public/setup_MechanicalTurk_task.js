
async function setupMechanicalTurkTask(){

  SIO = new S3_IO() 
  DWr = new MechanicalTurkDataWriter()
  UX = new MechanicalTurk_UX_poller()

  var subject = await loadStringFromLocalStorage("SubjectSettings_string")

  var GAME_URL = await loadStringFromLocalStorage('GAME_URL')
  MechanicalTurkSettings = await loadStringFromLocalStorage('HIT_settings_string')
  ipAddress = await loadStringFromLocalStorage('IP_address')

  // Check if loadString failed 
  if(subject == "ée" || GAME_URL == 'ée' || MechanicalTurkSettings == 'ée' || ipAddress == 'ée'){
    console.log('something went wrong with local storage load')
  }

  SESSION['IP_address'] = ipAddress

  subject = JSON.parse(subject)
  console.log('FROM LOCAL STORAGE:', subject)
  wdm("Subject settings loaded...")

  for (var prop in subject){
    if (subject.hasOwnProperty(prop)){
      SESSION[prop] = subject[prop]
    }
  }

  if (SESSION.hasOwnProperty('SubjectID')){
    SESSION['agentID'] = SESSION.SubjectID
  }
  
  Experiment = await SIO.read_textfile(GAME_URL)
  Experiment = JSON.parse(Experiment)
  
  MechanicalTurkSettings = JSON.parse(MechanicalTurkSettings)

  SUBMIT_TO_SANDBOX = MechanicalTurkSettings['sandbox'] || false

  console.log('FROM LOCAL STORAGE:', MechanicalTurkSettings)
  
  
  var Game = Experiment['Experiment']
  if (Game == undefined){
    Game = Experiment['Game']
  }

  TS = new TaskStreamer(undefined, SIO, Game, Experiment["ImageBags"], SESSION.agentID, MechanicalTurkSettings['on_finish']) 
  await TS.build(MechanicalTurkSettings['MinimumTrialsForCashIn'])
  wdm('TaskStreamer built')

    SP = new SoundPlayer()
    await SP.build()    

    FLAGS.debug_mode = 1 


    // Initialize components of task
    RewardMap = new RewardMapGenerator(['mousemove', 'touchmove', 'touchstart']); 
    
    R = new MonetaryReinforcer(MechanicalTurkSettings['bonus_usd_per_correct'])

  var ngridpoints = TS.Game[0]['NGridPoints']
  setupPlayspace(ngridpoints) 

  SD = new ScreenDisplayer()

  window.addEventListener('resize', onWindowResize)


  var skip_preview_mode = true

  if(skip_preview_mode != true && window.location.href.startsWith('http://localhost:7800') == false){
    if(SESSION['assignmentId'] == 'ASSIGNMENT_ID_NOT_AVAILABLE' || SESSION['assignmentId'] == '' ){
      console.log('RUNNING IN PREVIEW MODE')

      // If in preview mode on MechanicalTurk
      toggleElement(1, 'PreviewModeSplash')
      var tutorial_image = await SIO.load_image('tutorial_images/TutorialMouseOver.png')

      while(true){
        await run_MouseOver_TutorialTrial(tutorial_image) 
      }
    }
  }


  document.querySelector("button[name=WorkerCashInButton]").style.visibility = 'visible'
  toggleCashInButtonClickability(0)


  var show_instructions = true
  if(show_instructions == true){

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

    await showMechanicalTurkInstructions(screen1_instructions)
    var hand_used = await showHandSelectionDialogue_and_getUserSelection()
    var device_selected = await showDeviceSelectionDialogue_and_getUserSelection()

  }
  transition_from_debug_to_science_trials()

  // Show trial progress counter
  toggleElement(1, 'MechanicalTurk_ProgressBar')
  toggleElement(1, 'MechanicalTurk_TrialBar')

  // Add cash in button 
  document.querySelector("button[name=WorkerCashInButton]").addEventListener(
    'mouseup',cash_in_listener,false)
  
  updateCashInButtonText(MechanicalTurkSettings["MinimumTrialsForCashIn"], 0, false)
  
}

async function showMechanicalTurkInstructions(instructions_text){
  
    document.getElementById("MechanicalTurkInstructionsSplash").style.visibility = 'visible'
    document.getElementById("InstructionSplashText").innerHTML = instructions_text

    
    var btn = document.getElementById('CloseInstructionsButton')
    btn.disabled = false 
    btn.innerHTML = 'Continue'

    return new Promise(function(resolve, reject){
        FLAGS.clicked_close_instructions = resolve
    })
}

async function showDeviceSelectionDialogue_and_getUserSelection(){
    // Turn on dialogue
    SESSION.MechanicalTurk_DeviceSelected = 'not_selected'
    document.getElementById("MechanicalTurkCursorDeviceSelectionScreen").style.visibility = 'visible'
    return new Promise(function(resolve, reject){
        FLAGS.clicked_device_selection = resolve
    })
}

async function showHandSelectionDialogue_and_getUserSelection(){
    // Turn on dialogue
    SESSION.MechanicalTurk_Handedness = 'not_selected'
    document.getElementById("MechanicalTurkHandSelectionScreen").style.visibility = 'visible'
    return new Promise(function(resolve, reject){
        FLAGS.clicked_hand_selection = resolve
    })
}

