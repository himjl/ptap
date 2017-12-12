async function setupUpstairsTask(IMAGEBAGS, GAME, ENVIRONMENT){

  toggleElement(1, "SessionTextBox")
  toggleElement(1, "ReloadButton")
  toggleElement(1, 'DebugMessageTextBox')
  toggleElement(1, 'StageBar')
  toggleElement(1, 'AutomatorLoadBar')

  // Button callbacks
  document.querySelector("button[name=connectble]").addEventListener(
    'touchend',findBLEDevice,false)
  document.querySelector("button[name=connectble]").addEventListener(
    'mouseup',findBLEDevice,false)
  document.querySelector("button[name=noble]").addEventListener(
    'touchend',skipBLEDevice,false)
  document.querySelector("button[name=noble]").addEventListener(
    'mouseup',skipBLEDevice,false)
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
  IB = new ImageBuffer(DIO)

  console.log('Loading from landing page')
  var environment = {
      'playspace_degreesVisualAngle':45,
      'playspace_verticalOffsetInches':0, 
      'playspace_viewingDistanceInches':8, 
      'screen_virtualPixelsPerInch':143.755902965,
      'primary_reinforcer_type':'juice', 
      'action_event_type':['touchstart', 'touchmove'],
      'rigEnvironment':'monkeybox', // or monkeybox
      'agentID':'Zico',//
  }


  UX.updateSessionTextbox(environment['agentID'], game['gameID'])


  TaskStreamer = new TaskStreamerClass(GAME, IMAGEBAGS, IB, CheckPointer) // todo: move terminal setting into experiment constructor 
  PY = new PlaySpaceClass(
    environment['playspace_degreesVisualAngle'], 
    environment['playspace_verticalOffsetInches'],
    environment['playspace_viewingDistanceInches'],
    environment['screen_virtualPixelsPerInch'],
    environment['primary_reinforcer_type'], 
    environment['action_event_type'], 
    game['periodicRewardInterval'], 
    game['periodicRewardAmount'], 
    game['bonusUSDPerCorrect'], 
    )

    FLAGS.debug_mode = 1 

    //========= Start in TEST mode =======//
    document.querySelector("button[name=doneTestingTask]").style.display = "block"
    document.querySelector("button[name=doneTestingTask]").style.visibility = "visible"

    // Make sync button visible 
    document.querySelector("button[name=SyncButton]").style.visibility = "visible"


  toggleElement(0, 'SyncButton')
  toggleElement(0, 'TrialCounter')
  SD.togglePlayspaceBorder(0)
  document.getElementById('drive_juice_button').style.visibility = "hidden"

  var gamePackage = {}
  gamePackage['TaskStreamer'] = TaskStreamer
  gamePackage['DataWriter'] = DataWriter 
  gamePackage['PlaySpace'] = PlaySpace 
  gamePackage['UX'] = UX 

  return gamePackage
}