async function setupUpstairsTask(sessionPackage){

    var IMAGEBAGS = sessionPackage['IMAGEBAGS']
    var GAME = sessionPackage['GAME'] 
    var ENVIRONMENT = sessionPackage['ENVIRONMENT'] 
    var TASK_SEQUENCE = sessionPackage['TASK_SEQUENCE']

    toggleElement(1, "SessionTextBox")
    toggleElement(1, "ReloadButton")
    toggleElement(1, 'DebugMessageTextBox')
    toggleElement(1, 'StageBar')
    toggleElement(1, 'AutomatorLoadBar')

    // Button callbacks

    document.querySelector("button[name=doneTestingTask]").addEventListener(
    'touchend',doneTestingTask_listener,false)
    document.querySelector("button[name=doneTestingTask]").addEventListener(
    'mouseup',doneTestingTask_listener,false)
    //document.querySelector("button[name=SyncButton]").addEventListener(
    //  'mouseup',sync_data_listener,false)
    document.querySelector("button[name=SyncButton]").addEventListener(
    'touchend',sync_data_listener,false)

  
   //================== AWAIT CONNECT TO BLE ==================//

   connectBLEButtonPromise()
   
   DIO = new DropboxIO()
   var DBX_REDIRECT_URI = DBX_REDIRECT_URI_ROOT + "mkturk.html"
   await DIO.build(DBX_REDIRECT_URI)


   var savePath = '/testptap'+ENVIRONMENT['agentID']+'.txt'
   SIO = new S3_IO() 
   DataWriter = new DataWriter(DIO, savePath)
   UX = new UX_poller()
   CheckPointer = new DropboxCheckPointer(DIO, ENVIRONMENT['agentID'], GAME, ENVIRONMENT)
   await CheckPointer.build()
   IB = new ImageBuffer(SIO)

   console.log('Loading from landing page')


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


    //========= Start in TEST mode =======//
    document.querySelector("button[name=doneTestingTask]").style.display = "block"
    document.querySelector("button[name=doneTestingTask]").style.visibility = "visible"

    // Make sync button visible 
    document.querySelector("button[name=SyncButton]").style.visibility = "visible"


    toggleElement(0, 'SyncButton')
    toggleElement(0, 'TrialCounter')
    Playspace.toggleBorder(1)
    document.getElementById('drive_juice_button').style.visibility = "hidden"

    var gamePackage = {}
    gamePackage['TaskStreamer'] = TaskStreamer
    gamePackage['DataWriter'] = DataWriter 
    gamePackage['Playspace'] = Playspace 
    gamePackage['UX'] = UX 

    return gamePackage
}