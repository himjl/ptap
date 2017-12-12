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
   wdm("Bluetooth connection handled...")

   DIO = new DropboxIO()
   var DBX_REDIRECT_URI = DBX_REDIRECT_URI_ROOT + "mkturk.html"
   await DIO.build(DBX_REDIRECT_URI)

   SIO = new S3_IO() 
   DataWriter = new DataWriter(DIO)
   UX = new UX_poller()
   CheckPointer = new DropboxCheckPointer()
   IB = new ImageBuffer(SIO)

   console.log('Loading from landing page')


   UX.updateSessionTextbox(ENVIRONMENT['agentID'], GAME['gameID'])

   TaskStreamer = new TaskStreamerClass(GAME, TASK_SEQUENCE, IMAGEBAGS, IB, CheckPointer)
   PlaySpace = new PlaySpaceClass(
    ENVIRONMENT['playspace_degreesVisualAngle'], 
    ENVIRONMENT['playspace_verticalOffsetInches'],
    ENVIRONMENT['playspace_viewingDistanceInches'],
    ENVIRONMENT['screen_virtualPixelsPerInch'],
    ENVIRONMENT['primary_reinforcer_type'], 
    ENVIRONMENT['action_event_type'], 
    GAME['periodicRewardInterval'], 
    GAME['periodicRewardAmount'], 
    GAME['bonusUSDPerCorrect'], 
    )

   await PlaySpace.build()
    //========= Start in TEST mode =======//
    document.querySelector("button[name=doneTestingTask]").style.display = "block"
    document.querySelector("button[name=doneTestingTask]").style.visibility = "visible"

    // Make sync button visible 
    document.querySelector("button[name=SyncButton]").style.visibility = "visible"


    toggleElement(0, 'SyncButton')
    toggleElement(0, 'TrialCounter')
    PlaySpace.toggleBorder(1)
    document.getElementById('drive_juice_button').style.visibility = "hidden"

    var gamePackage = {}
    gamePackage['TaskStreamer'] = TaskStreamer
    gamePackage['DataWriter'] = DataWriter 
    gamePackage['PlaySpace'] = PlaySpace 
    gamePackage['UX'] = UX 

    return gamePackage
}