async function setup_upstairs_session(sessionPackage){

  GAME_PACKAGE = sessionPackage['GAME_PACKAGE']
  GAME = GAME_PACKAGE['GAME']
  IMAGEBAGS = GAME_PACKAGE['IMAGEBAGS']
  TASK_SEQUENCE = GAME_PACKAGE['TASK_SEQUENCE']
  
  ENVIRONMENT = sessionPackage['ENVIRONMENT'] 

  var landingPageURL = sessionPackage['LANDING_PAGE_URL']
  SESSION = {}
  //SESSION['ipAddress'] = await az.get_ip_address()
  SESSION['species'] = 'monkey'
  SESSION['url'] = window.location.href
  SESSION['landingPageURL'] = landingPageURL
  SESSION['agentId'] = await LocalStorageIO.load_string('agentId')

  SESSION['unixTimestampPageLoad'] = window.performance.timing.navigationStart


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

   SIO = new S3_IO() 
   IB = new ImageBuffer(SIO)

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
   Playspace = new PlaySpaceClass(playspacePackage)
   await Playspace.build()
   //Playspace.toggleBorder(1)

    //========= Start in TEST mode =======//
    document.querySelector("button[name=doneTestingTask]").style.display = "block"
    document.querySelector("button[name=doneTestingTask]").style.visibility = "visible"
    
    var gamePackage = {}
    gamePackage['TaskStreamer'] = TaskStreamer
    gamePackage['DataWriter'] = DataWriter 
    gamePackage['Playspace'] = Playspace 
    gamePackage['UX'] = UX 
    gamePackage['SESSION'] = SESSION
    wdm('Done building session components...')

    // Playspace.Reinforcer.juiceRewardPer1000 = 175
    // wdm('20sec')
    // await sleep(20000)
    // ub = 500
    // for (i = 0; i < ub; i++) {
    //   await sleep(1500)
    //   Playspace.Reinforcer.deliver_reinforcement(1)
    //   wdm(i + ' of ' + ub + '. juicerewardper1000=' + Playspace.Reinforcer.juiceRewardPer1000)
    // }
    // return
    return gamePackage
}
