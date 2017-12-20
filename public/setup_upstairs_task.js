async function setupUpstairsTask(sessionPackage){

    var IMAGEBAGS = sessionPackage['IMAGEBAGS']
    var GAME = sessionPackage['GAME'] 
    var ENVIRONMENT = sessionPackage['ENVIRONMENT'] 
    var TASK_SEQUENCE = sessionPackage['TASK_SEQUENCE']

    toggleElement(1, "SessionTextBox")
    toggleElement(1, 'DebugMessageTextBox')
    toggleElement(1, 'TrialCounter')

    // Button callbacks
    UX = new UX_poller()
    document.querySelector("button[name=doneTestingTask]").addEventListener(
    'touchend',UX.doneTestingTask_listener,false)
    document.querySelector("button[name=doneTestingTask]").addEventListener(
    'mouseup',UX.doneTestingTask_listener,false)
  
   connectBLEButtonPromise()
   
   DIO = new DropboxIO()
   await DIO.build(window.location.href)

   var saveDir = join([INSTALL_SETTINGS.dataDirPath, ENVIRONMENT['agentID']])
   var debugDir = join([INSTALL_SETTINGS.debugDataDirPath, ENVIRONMENT['agentID']])
   DataWriter = new DataWriter(DIO, debugDir, saveDir, ENVIRONMENT['agentID'])

   CheckPointer = new DropboxCheckPointer(DIO, ENVIRONMENT['agentID'], GAME, TASK_SEQUENCE)
   await CheckPointer.build()

   SIO = new S3_IO() 
   IB = new ImageBuffer(SIO)

   UX.updateSessionTextbox(ENVIRONMENT['agentID'], GAME['gameID'])

   TaskStreamer = new TaskStreamerClass(GAME, TASK_SEQUENCE, IMAGEBAGS, IB, CheckPointer)

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

    return gamePackage
}