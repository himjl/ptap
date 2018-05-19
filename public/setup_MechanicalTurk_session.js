async function setup_mechanicalturk_session(sessionPackage){
 
  GAME_PACKAGE = sessionPackage['GAME_PACKAGE']
  GAME = GAME_PACKAGE['GAME']
  IMAGEBAGS = GAME_PACKAGE['IMAGEBAGS']
  TASK_SEQUENCE = GAME_PACKAGE['TASK_SEQUENCE']

  ENVIRONMENT = sessionPackage['ENVIRONMENT'] 
  
  var landingPageURL = sessionPackage['LANDING_PAGE_URL']
  console.log('Detected landing page URL', landingPageURL)


  Playspace2 = new Playspace2(
    ENVIRONMENT['screen_virtualPixelsPerInch'], 
    ENVIRONMENT['playspace_viewingDistanceInches'], 
    ENVIRONMENT['playspace_degreesVisualAngle'], 
    ENVIRONMENT['playspace_degreesVisualAngle']
  )


  SESSION = {}
  SESSION['workerId'] = az.get_workerId_from_url(landingPageURL)
  SESSION['hitId'] = az.get_hitId_from_url(landingPageURL)
  SESSION['assignmentId'] = az.get_assignmentId_from_url(landingPageURL)
  SESSION['inSandboxMode'] = az.detect_sandbox_mode(landingPageURL)
  //SESSION['ipAddress'] = await az.get_ip_address()
  SESSION['species'] = 'human_turker'
  SESSION['url'] = window.location.href
  SESSION['landingPageURL'] = landingPageURL
  SESSION['agentId']  = SESSION['workerId']
  SESSION['unixTimestampPageLoad'] = window.performance.timing.navigationStart

  console.log('SESSION', SESSION)
  SIO = new S3_IO() 
  IB = new ImageBuffer(SIO)
  CheckPointer = new MechanicalTurkCheckPointer(GAME_PACKAGE)
  await CheckPointer.build()
  DataWriter = new MechanicalTurkDataWriter(SESSION['assignmentId'], SESSION['hitId'], SESSION['inSandboxMode']) 

  var playspacePackage = {
    'playspace_degreesVisualAngle':ENVIRONMENT['playspace_degreesVisualAngle'], 
    'playspace_verticalOffsetInches':ENVIRONMENT['playspace_verticalOffsetInches'],
    'playspace_viewingDistanceInches':ENVIRONMENT['playspace_viewingDistanceInches'],
    'screen_virtualPixelsPerInch':ENVIRONMENT['screen_virtualPixelsPerInch'],
    'primary_reinforcer_type':ENVIRONMENT['primary_reinforcer_type'], 
    'action_event_type':ENVIRONMENT['action_event_type'], 
    'periodicRewardIntervalMsec':GAME['periodicRewardIntervalMsec'], 
    'periodicRewardAmount':GAME['periodicRewardAmount'], 
    'bonusUSDPerCorrect':ENVIRONMENT['bonusUSDPerCorrect'], 
    'juiceRewardPer1000Trials':ENVIRONMENT['juiceRewardPer1000Trials']}
  HEI = new HumanEnvironmentInterface(playspacePackage)
  await HEI.build()
  console.log(ENVIRONMENT)
  UX = new MechanicalTurkUX(GAME['minimumTrials'], GAME['maximumTrials'], ENVIRONMENT['bonusUSDPerCorrect'])

  // Convenience - if debugging on my machine, skip instructions etc. 
  if(window.location.href.indexOf('localhost')!=-1){
    var show_instructions = true
    var show_hand_selection = true 
    var show_device_selection = true 
    var run_preview_mode = false
  }
  else{
    var show_instructions = true
    var show_hand_selection = true 
    var show_device_selection = true 
    if(SESSION['assignmentId'] == 'assignmentId_not_found'|| SESSION['assignmentId'] == 'ASSIGNMENT_ID_NOT_AVAILABLE'){
      var run_preview_mode = true
    }
    else{
      var run_preview_mode = false
    }
  }

  if(run_preview_mode == true){
      console.log('RUNNING IN PREVIEW MODE')
      UX.show_preview_splash()
  }

  if(show_instructions == true){
    UX.run_instructions_dialogue(ENVIRONMENT['instructionsDialogueString'])
  }

  
  if(show_hand_selection == true){
    SESSION['handedness'] = UX.run_hand_selection_dialogue()
  }

  
  if(show_device_selection){    
    SESSION['inputDevice'] = UX.run_device_selection_dialogue()
  }

  //Playspace.debug2record()
  DataWriter.debug2record()
  UX.debug2record()

  var freturn = {}
  freturn['DataWriter'] = DataWriter 
  freturn['HEI'] = HEI 
  freturn['SESSION'] = SESSION
  freturn['run_preview_mode'] = run_preview_mode
  return freturn
}





