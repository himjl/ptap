class SessionBootStrapper{
    constructor(){
        this.SIO = new S3_IO()
        this.bootstrapLog = {}
        this.bootstrapLog['loadMethods'] = {}
        this.bootstrapLog['inputLocations'] = {}
    }   

    async build(){
        
        var gamePackage = await this.unpack_game_package() 

        var sessionPackage = {}
        sessionPackage['IMAGEBAGS'] = gamePackage['IMAGEBAGS']
        sessionPackage['TASK_SEQUENCE'] = gamePackage['TASK_SEQUENCE']
        sessionPackage['GAME'] = gamePackage['GAME']
        sessionPackage['ENVIRONMENT'] = await this.unpack_environment()
        sessionPackage['LANDING_PAGE_URL'] = await LocalStorageIO.load_string('LANDING_PAGE_URL')

        return sessionPackage
    }

    async unpack_game_package(){
        var local_val_game = await this.load_localstorage_val('GAME_PACKAGE')
        var gamePackage = await this.download(local_val_game) 

        var gamePackageKeys = ['IMAGEBAGS', 'TASK_SEQUENCE', 'GAME']

        var unpackedGame = {}
        for (var i in gamePackageKeys){

            var k = gamePackageKeys[i]
            console.log('Loading', k)
            if(gamePackage!=undefined){
                unpackedGame[k] = await this.download(gamePackage[k])
            }
            else{
                unpackedGame[k] = undefined
            }
            
        }

        return unpackedGame
    }

    async unpack_environment(){
        var ENVIRONMENT = await this.load_localstorage_val('ENVIRONMENT')
        ENVIRONMENT = await this.download(ENVIRONMENT)
        return ENVIRONMENT
    }

    async load_localstorage_val(localStorageKey){
        var local_val = await LocalStorageIO.load_string(localStorageKey)
        
        if (local_val.startsWith('\'') || local_val.startsWith('\"')){
            local_val = local_val.slice(1)
            local_val = local_val.slice(0, local_val.length-1)
        }

        return local_val
    }

    async download(local_val){
        var loadMethod = this.infer_load_method(local_val)

        if(loadMethod == 'literal'){
            return local_val
        }

        if(loadMethod == 'localstorage'){
            return JSON.parse(local_val)
        }
        else if(loadMethod == 'dropbox'){
            if (this.DIO == undefined){
                this.DIO = new DropboxIO()
                await this.DIO.build(window.location.href)
            }
            
            var s = await this.DIO.read_textfile(local_val)
            return JSON.parse(s)
        }
        else if(loadMethod == 'url'){
            var s = await this.SIO.read_textfile(local_val)
            return JSON.parse(s)
        }

        else{
            console.log('SessionBootStrapper.download called with loadMethod', loadMethod, '; not supported')
            return undefined
        }
    }
    infer_load_method(s){

        if(s == undefined){
            return undefined
        }
        if(s.constructor!=String){
            return 'literal'
        }
        
        var loadMethod

        if(s.startsWith('http') || s.startsWith('www')){
            loadMethod = 'url'
        }
        else if(s.startsWith('/')){
            loadMethod = 'dropbox'
        }
        else if(s.startsWith('{') || s.startsWith('[')){
            loadMethod = 'localstorage'
        }
        else{
            console.log('SessionBootStrapper.infer_load_method could not infer for key', s, '; not supported')
            loadMethod = undefined
        }

        return loadMethod
    }

    get_bootstrap_log(){
        return this.bootstrapLog
    }
}

class Verifier{
    constructor(){
        this.verificationLog = {}
        this.verificationLog['verified'] = false 
        this.verificationLog['usingFailSafeHIT'] = false
        this.verificationLog['IMAGEBAGS_hash'] = undefined 
        this.verificationLog['GAME_hash'] = undefined 
        this.verificationLog['ENVIRONMENT_hash'] = undefined 
        this.verificationLog['TASK_SEQUENCE_hash'] = undefined 
    }

    on_verification_fail(){
        console.warn("Verification FAILED. Using failsafe game...")
        var sessionPackage = DEFAULT_HIT
        this.verificationLog['usingFailSafeHIT'] = true
        return sessionPackage
    }

    verify_session_package(sessionPackage){
        var verified = true
        var use_default_HIT = false
        

        // Check that all keys exist 
        var necessary_keys = {
            'IMAGEBAGS':Object, 
            'GAME':Object, 
            'ENVIRONMENT':Object, 
            'TASK_SEQUENCE':Array}

        for (var key in necessary_keys){
            if(!sessionPackage.hasOwnProperty(key)){
                console.warn('Verifier error: sessionPackage is missing the key', key)
                verified = false
                continue
            }
            if(sessionPackage[key] == undefined){
                console.warn('Verifier error: sessionPackage[\"'+key+'\"]  == undefined')
                verified = false
                continue
            }
            var correctConstructor = necessary_keys[key]
            if(sessionPackage[key].constructor != correctConstructor){
                console.warn('Verifier error: sessionPackage[\"', key, '\"] is of incorrect type', sessionPackage['IMAGEBAGS'].constructor)
                verified = false 
                continue
            }

            this.verificationLog[key+'_hash'] = JSON.stringify(sessionPackage[key]).hashCode()
        }

        // Check that all imagebags referenced in TASK_SEQUENCE are in IMAGEBAGS with at least one entry
        if(verified == false){
            sessionPackage = this.on_verification_fail()
        }
        if(verified == true){
            console.log("sessionPackage PASSED all tests.")
        }

        // Log .check_session_package call
        this.verificationLog['verified'] = verified
        return sessionPackage
    }

    get_verification_log(){
        return this.verificationLog
    }
}

// Verify inputs 

class az{
    constructor(){

    }

    static get_workerId_from_url(url){
        var workerId = this._extract_url_string(url, 'workerId', 'workerId_not_found')
        console.log('workerId:', workerId)
        return workerId
    }

    static get_assignmentId_from_url(url){
        var assignmentId = this._extract_url_string(url, 'assignmentId', 'assignmentId_not_found')
        console.log('assignmentId', assignmentId)
        return assignmentId
    }

    static get_hitId_from_url(url){
        var hitId = this._extract_url_string(url, 'hitId', 'hitId_not_found')
        console.log('hitId', hitId)
        return hitId
    }


    static _extract_url_string(url, key, defaultValue){
        var name = key
        key = key.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regexS = "[\\?&]" + key + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(url) || ["", defaultValue] 

        return results[1]
        
    }
    static detect_sandbox_mode(url){
        var submitToURL = this._extract_url_string(url, 'turkSubmitTo', '')
        console.log('submittoURL', submitToURL)
        if (submitToURL.indexOf('workersandbox')!=-1){
            var inSandboxMode = true
        }
        else{
            var inSandboxMode = false
        }

        return inSandboxMode

    }
    static async get_ip_address(){
      
      var resolveFunc
      var rejectFunc
      var p = new Promise(function(resolve, reject){
          resolveFunc = resolve
          rejectFunc = reject
      })

      var xhttp = new XMLHttpRequest(); 


      try{
          xhttp.onreadystatechange = function(){
              if (this.readyState == 4 && this.status == 200){
                  resolveFunc(this.responseText)
              }
          }
      }
      catch(error){
          console.log(error)
      }
      
      xhttp.open("GET", "https://api.ipify.org?format=json", true);

      xhttp.send();
      var s = await p
      s = JSON.parse(s)

      return s['ip']       
    }

}