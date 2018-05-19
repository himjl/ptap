async function setup_upstairs_session(sessionPackage){

  GAME_PACKAGE = sessionPackage['GAME_PACKAGE']
  GAME = GAME_PACKAGE['GAME']
  IMAGEBAGS = GAME_PACKAGE['IMAGEBAGS']
  TASK_SEQUENCE = GAME_PACKAGE['TASK_SEQUENCE']
  ENVIRONMENT = sessionPackage['ENVIRONMENT'] 

  var landingPageURL = sessionPackage['LANDING_PAGE_URL']
  SESSION = {}

  SESSION['species'] = 'monkey'
  SESSION['url'] = window.location.href
  SESSION['landingPageURL'] = landingPageURL
  SESSION['agentId'] = await LocalStorageIO.load_string('agentId')
  SESSION['unixTimestampPageLoad'] = window.performance.timing.navigationStart

  Playspace2 = new Playspace2(
    ENVIRONMENT['screen_virtualPixelsPerInch'], 
    ENVIRONMENT['playspace_viewingDistanceInches'], 
    ENVIRONMENT['playspace_degreesVisualAngle'], 
    ENVIRONMENT['playspace_degreesVisualAngle']
  )

  UX = new MonkeyUX()
   wdm('Starting dropbox connection...')
   DIO = new DropboxIO()
   await DIO.build(window.location.href)

   var saveDir = join([INSTALL_SETTINGS.dataDirPath, SESSION['agentId']])
   var debugDir = join([INSTALL_SETTINGS.debugDataDirPath, SESSION['agentId']])
   DataWriter = new DropboxDataWriter(DIO, debugDir, saveDir, SESSION['agentId'])

   wdm('Starting checkpointer...')
   CheckPointer = new DropboxCheckPointer(DIO, SESSION['agentId'], GAME, TASK_SEQUENCE)
   await CheckPointer.build()

   IB = new ImageBuffer(S3_IO)

   UX.updateSessionTextbox(SESSION['agentId'], GAME['gameId'])

   TaskStreamer = new TaskStreamerClass(GAME_PACKAGE, IB, CheckPointer)
   wdm('Building taskstreamer...')
   await TaskStreamer.build(5)
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
  
    wdm('Building playspace...')
   HEI = new HumanEnvironmentInterface(playspacePackage)
   await HEI.build()
    //========= Start in TEST mode =======//
    document.querySelector("button[name=doneTestingTask]").style.display = "block"
    document.querySelector("button[name=doneTestingTask]").style.visibility = "visible"
    
    var gamePackage = {}
    gamePackage['TaskStreamer'] = TaskStreamer
    gamePackage['DataWriter'] = DataWriter 
    gamePackage['HEI'] = HEI 
    gamePackage['UX'] = UX 
    gamePackage['SESSION'] = SESSION
    wdm('Done building session components...')

    return gamePackage
}
