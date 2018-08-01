async function setup_upstairs_session(sessionPackage){

  ENVIRONMENT = sessionPackage['ENVIRONMENT'] 

  var landingPageURL = sessionPackage['LANDING_PAGE_URL']
  
  var SESSION = await extract_upstairs_session_info(landingPageURL)
  Playspace = new Playspace(ENVIRONMENT)

  
   DIO = new DropboxIO()
   await DIO.build(window.location.href)

   var saveDir = join([INSTALL_SETTINGS.dataDirPath, SESSION['agentId']])
   var debugDir = join([INSTALL_SETTINGS.debugDataDirPath, SESSION['agentId']])
   DataWriter = new DropboxDataWriter(DIO, debugDir, saveDir, SESSION['agentId'])

   UX = new MonkeyUX()
   UX.updateSessionTextbox(SESSION['agentId'], sessionPackage['GAME_PACKAGE']['GAME']['gameId'])

   HEI = new HumanEnvironmentInterface(ENVIRONMENT)
   await HEI.build()
    //========= Start in TEST mode =======//
    document.querySelector("button[name=doneTestingTask]").style.display = "block"
    document.querySelector("button[name=doneTestingTask]").style.visibility = "visible"
    
    var freturn = {}
    freturn['DataWriter'] = DataWriter 
    freturn['HEI'] = HEI 
    freturn['SESSION'] = SESSION
    return freturn

}


async function extract_upstairs_session_info(landingPageURL){
  var SESSION = {}

  SESSION['species'] = 'monkey'
  SESSION['url'] = window.location.href
  SESSION['landingPageURL'] = landingPageURL
  SESSION['agentId'] = await LocalStorageIO.load_string('agentId')
  SESSION['unixTimestampPageLoad'] = window.performance.timing.navigationStart

  return SESSION

}

