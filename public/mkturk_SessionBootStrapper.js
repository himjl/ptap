class SessionBootStrapper{
    constructor(){
        this.SIO = new S3_IO()

        this.bootstrapLog = {}
        this.bootstrapLog['loadMethods'] = {}
        this.bootstrapLog['inputLocations'] = {}
    }   
    async get(key){
        // key: IMAGEBAGS, GAME, ENVIRONMENT, TASK_SEQUENCE
        var k = await LocalStorageIO.load_string(key)
        if (k.startsWith('\'') || k.startsWith('\"')){
            k = k.slice(1)
            k = k.slice(0, k.length-1)
        }
        var loadMethod = this.infer_load_method(k)
        var VALUE = await this.load(k, loadMethod)

        if(key == 'IMAGEBAGS'){
            if(loadMethod != 'localstorage'){
                this.imagebagsPath = k
            }
            else{
                this.imagebagsPath = 'localstorage'
            }
        }


        // Log .get operation
        this.bootstrapLog['loadMethods'][key] = loadMethod
        if(loadMethod != 'localstorage'){
            this.bootstrapLog['inputLocations'][key] = k
        }
        else{
            this.bootstrapLog['inputLocations'][key] = loadMethod
        }
        
        return VALUE
    }

    get_imagebags_path(){
        var imagebagsPath = ''
        if (this.imagebagsPath != undefined){
            imagebagsPath = this.imagebagsPath
        }

        return imagebagsPath
    }

    get_bootstrap_log(){
        return this.bootstrapLog
    }

    infer_load_method(s){
        
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
            console.warn('SessionBootStrapper.infer_load_method could not infer for key', s, '; not supported')
            loadMethod = undefined
        }

        return loadMethod
    }

    async load(key, loadMethod){
        if(loadMethod == 'localstorage'){
            return JSON.parse(key)
        }
        else if(loadMethod == 'dropbox'){
            if (this.DIO == undefined){
                this.DIO = new DropboxIO()
                await this.DIO.build(window.location.href)
            }
            
            var s = await this.DIO.read_textfile(key)
            return JSON.parse(s)
        }
        else if(loadMethod == 'url'){
            var s = await this.SIO.read_textfile(key)
            return JSON.parse(s)
        }

        else{
            console.warn('SessionBootStrapper.load called with loadMethod', loadMethod, '; not supported')
            return undefined
        }
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
        console.warn("Verification of sessionPackage FAILED. Using failsafe task...")
        var sessionPackage = DEFAULT_HIT
        this.verificationLog['usingFailSafeHIT'] = true
        return sessionPackage
    }

    check_session_package(sessionPackage){
        var verified = true
        var use_default_HIT = false
        

        // Check that all keys exist 
        var necessary_keys = ['IMAGEBAGS', 'GAME', 'ENVIRONMENT', 'TASK_SEQUENCE']
        for (var i in necessary_keys){
            var key = necessary_keys[i]
            if(sessionPackage[key] == undefined){
                console.warn('sessionPackage is missing the key', key)
                verified = false
                return this.on_verification_fail()
            }
        }

        // Check that they are all of the correct type   
        if(sessionPackage['IMAGEBAGS'].constructor != Object){
            console.warn('sessionPackage["IMAGEBAGS"] is of incorrect type', sessionPackage['IMAGEBAGS'].constructor)
            verified = false 
        }
        if(sessionPackage['GAME'].constructor !=Object){
            console.warn('sessionPackage["GAME"] is of incorrect type', sessionPackage['GAME'].constructor)
            verified = false
        }
        if(sessionPackage['ENVIRONMENT'].constructor != Object){
            console.warn('sessionPackage["ENVIRONMENT"] is of incorrect type', sessionPackage['ENVIRONMENT'].constructor)
            verified = false
        }
        if(sessionPackage['TASK_SEQUENCE'].constructor != Array){
            console.warn('sessionPackage["TASK_SEQUENCE"] is of incorrect type', sessionPackage['TASK_SEQUENCE'].constructor)
            verified = false
        }

        // Check that all imagebags referenced in TASK_SEQUENCE are in IMAGEBAGS 
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
