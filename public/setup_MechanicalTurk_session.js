async function setup_mechanicalturk_session(sessionPackage){
 
  IMAGEBAGS = sessionPackage['IMAGEBAGS']
  GAME = sessionPackage['GAME'] 
  ENVIRONMENT = sessionPackage['ENVIRONMENT'] 
  TASK_SEQUENCE = sessionPackage['TASK_SEQUENCE']

  SIO = new S3_IO() 
  IB = new ImageBuffer(SIO)
  CheckPointer = new MechanicalTurkCheckPointer()
  TaskStreamer = new TaskStreamerClass(GAME, TASK_SEQUENCE, IMAGEBAGS, IB, CheckPointer)
  await TaskStreamer.build(5)
  DataWriter = new MechanicalTurkDataWriter(ENVIRONMENT['assignmentId'], ENVIRONMENT['hitId'], ENVIRONMENT['inSandboxMode'])

  var playspacePackage = {
    'playspace_degreesVisualAngle':ENVIRONMENT['playspace_degreesVisualAngle'], 
    'playspace_verticalOffsetInches':ENVIRONMENT['playspace_verticalOffsetInches'],
    'playspace_viewingDistanceInches':ENVIRONMENT['playspace_viewingDistanceInches'],
    'screen_virtualPixelsPerInch':ENVIRONMENT['screen_virtualPixelsPerInch'],
    'primary_reinforcer_type':ENVIRONMENT['primary_reinforcer_type'], 
    'action_event_type':ENVIRONMENT['action_event_type'], 
    'periodicRewardIntervalMsec':GAME['periodicRewardIntervalMsec'], 
    'periodicRewardAmount':GAME['periodicRewardAmount'], 
    'bonusUSDPerCorrect':GAME['bonusUSDPerCorrect'], }
  Playspace = new PlaySpaceClass(playspacePackage)
  await Playspace.build()

  UX = new MechanicalTurkUX(GAME['minimumTrials'], GAME['maximumTrials'], GAME['bonusUSDPerCorrect'])




  // Convenience - if debugging on my machine, skip instructions etc. 
  if(window.location.href.indexOf('localhost')!=-1){
    var show_instructions = false
    var show_hand_selection = false 
    var show_device_selection = false 
    var run_preview_mode = false
  }
  else{
    var show_instructions = true
    var show_hand_selection = true 
    var show_device_selection = true 
    if(ENVIRONMENT['assignmentId'] = 'assignmentId_not_found'){
      var run_preview_mode = true
    }
    else{
      var run_preview_mode = false
    }
  }


  if(run_preview_mode == true){
      console.log('RUNNING IN PREVIEW MODE')
      var tutorialImage = await SIO.load_image('tutorial_images/TutorialClickMe.png')
      UX.show_preview_splash()
      while(true){
        await Playspace.run_tutorial_trial(tutorialImage)
      }
  }

  if(show_instructions == true){
    await UX.run_instructions_dialogue()
  }

  
  if(show_hand_selection == true){
    ENVIRONMENT['handedness'] = await UX.run_hand_selection_dialogue()
  }

  
  if(show_device_selection){    
    ENVIRONMENT['inputDevice'] = await UX.run_device_selection_dialogue()
  }

  
  TaskStreamer.debug2record()
  Playspace.debug2record()
  DataWriter.debug2record()
  UX.debug2record()

  var gamePackage = {}
  gamePackage['TaskStreamer'] = TaskStreamer
  gamePackage['DataWriter'] = DataWriter 
  gamePackage['Playspace'] = Playspace 
  gamePackage['UX'] = UX 
  return gamePackage
}






