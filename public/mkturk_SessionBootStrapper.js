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
            console.log('SessionBootStrapper.infer_load_method could not infer for key', s, '; not supported')
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
            console.log('SessionBootStrapper.load called with loadMethod', loadMethod, '; not supported')
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
