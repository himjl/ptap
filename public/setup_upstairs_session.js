async function setup_upstairs_session(sessionPackage){

  GAME_PACKAGE = sessionPackage['GAME_PACKAGE']
  GAME = GAME_PACKAGE['GAME']
  IMAGEBAGS = GAME_PACKAGE['IMAGEBAGS']
  TASK_SEQUENCE = GAME_PACKAGE['TASK_SEQUENCE']
  
  ENVIRONMENT = sessionPackage['ENVIRONMENT'] 

  var landingPageURL = sessionPackage['LANDING_PAGE_URL']
  SESSION = {}
  SESSION['ipAddress'] = await az.get_ip_address()
  SESSION['species'] = 'monkey'
  SESSION['url'] = window.location.href
  SESSION['landingPageURL'] = landingPageURL
  SESSION['agentID'] = await LocalStorageIO.load_string('agentID')

  SESSION['unixTimestampPageLoad'] = window.performance.timing.navigationStart

    UX = new MonkeyUX()
   
   DIO = new DropboxIO()
   await DIO.build(window.location.href)

   var saveDir = join([INSTALL_SETTINGS.dataDirPath, SESSION['agentID']])
   var debugDir = join([INSTALL_SETTINGS.debugDataDirPath, SESSION['agentID']])
   DataWriter = new DropboxDataWriter(DIO, debugDir, saveDir, SESSION['agentID'])

   CheckPointer = new DropboxCheckPointer(DIO, SESSION['agentID'], GAME, TASK_SEQUENCE)
   await CheckPointer.build()

   SIO = new S3_IO() 
   IB = new ImageBuffer(SIO)

   UX.updateSessionTextbox(SESSION['agentID'], GAME['gameID'])

   TaskStreamer = new TaskStreamerClass(GAME_PACKAGE, IB, CheckPointer)

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
    'bonusUSDPerCorrect':GAME['bonusUSDPerCorrect'], }

   Playspace = new PlaySpaceClass(playspacePackage)
   await Playspace.build()
   Playspace.toggleBorder(1)

    //========= Start in TEST mode =======//
    document.querySelector("button[name=doneTestingTask]").style.display = "block"
    document.querySelector("button[name=doneTestingTask]").style.visibility = "visible"

    var gamePackage = {}
    gamePackage['TaskStreamer'] = TaskStreamer
    gamePackage['DataWriter'] = DataWriter 
    gamePackage['Playspace'] = Playspace 
    gamePackage['UX'] = UX 
    gamePackage['SESSION'] = SESSION
    return gamePackage
}
