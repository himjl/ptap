async function setup_mechanicalturk_session(sessionPackage){
 
  GAME_PACKAGE = sessionPackage['GAME_PACKAGE']
  GAME = GAME_PACKAGE['GAME']
  IMAGEBAGS = GAME_PACKAGE['IMAGEBAGS']
  TASK_SEQUENCE = GAME_PACKAGE['TASK_SEQUENCE']

  ENVIRONMENT = sessionPackage['ENVIRONMENT'] 
  
  var landingPageURL = sessionPackage['LANDING_PAGE_URL']
  console.log('Detected landing page URL', landingPageURL)


  Playspace = new Playspace(ENVIRONMENT)


  var SESSION = extract_mturk_session_info(landingPageURL)
  console.log('SESSION', SESSION)


  HEI = new HumanEnvironmentInterface(ENVIRONMENT)
  await HEI.build()

  UX = new MechanicalTurkUX(ENVIRONMENT['bonusUSDPerCorrect'])

  // Convenience - if debugging on my machine, skip instructions etc. 
  if(window.location.href.indexOf('localhost')!=-1){
    var show_instructions = false
    var show_hand_selection = true 
    var show_device_selection = true 
    var in_preview_mode = false
  }
  else{
    var show_instructions = true
    var show_hand_selection = true 
    var show_device_selection = true 
    if(SESSION['assignmentId'] == 'assignmentId_not_found'|| SESSION['assignmentId'] == 'ASSIGNMENT_ID_NOT_AVAILABLE'){
      var in_preview_mode = true
    }
    else{
      var in_preview_mode = false
    }
  }

  if(in_preview_mode == true){
      console.log('RUNNING IN PREVIEW MODE')
      UX.show_preview_splash()
  }

  if(show_instructions == true){
    UX.run_instructions_dialogue(ENVIRONMENT['instructionsDialogueString'])
  }

  if(show_hand_selection == true){
    UX.run_hand_selection_dialogue()
  }

  
  if(show_device_selection){    
    UX.run_device_selection_dialogue()
  }

  DataWriter = new MechanicalTurkDataWriter(SESSION['assignmentId'], SESSION['hitId'], SESSION['inSandboxMode'], in_preview_mode) 
  //Playspace.debug2record()
  DataWriter.debug2record()
  UX.debug2record()

  var freturn = {}
  freturn['DataWriter'] = DataWriter 
  freturn['HEI'] = HEI 
  freturn['SESSION'] = SESSION
  return freturn
}


function extract_mturk_session_info(landingPageURL){
  var SESSION = {}
  SESSION['workerId'] = az.get_workerId_from_url(landingPageURL)
  SESSION['hitId'] = az.get_hitId_from_url(landingPageURL)
  SESSION['assignmentId'] = az.get_assignmentId_from_url(landingPageURL)
  SESSION['inSandboxMode'] = az.detect_sandbox_mode(landingPageURL)
  SESSION['species'] = 'human_turker'
  SESSION['url'] = window.location.href
  SESSION['landingPageURL'] = landingPageURL
  SESSION['agentId']  = SESSION['workerId']
  SESSION['unixTimestampPageLoad'] = window.performance.timing.navigationStart
  return SESSION

}

