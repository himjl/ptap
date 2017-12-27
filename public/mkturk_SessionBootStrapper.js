class SessionBootStrapper{
    constructor(){
        this.SIO = new S3_IO()
        this.bootstrapLog = {}
        this.bootstrapLog['loadMethods'] = {}
        this.bootstrapLog['inputLocations'] = {}
    }   

    async build(){
        

        var sessionPackage = {}
        sessionPackage['GAME_PACKAGE'] = await this.unpack_game_package() 
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

    verify_game_package(gamePackage){
        // Checks top level key presence and type
        var verified = true

        var necessary_keys = [
            'IMAGEBAGS', 
            'GAME', 
            'TASK_SEQUENCE']

        var missing_keys = this.check_key_presence(gamePackage, necessary_keys)
        if(missing_keys.length > 0){
            return false
            // perhaps harsh because GAME could be sensibly replaced 
        }

        return verified

        // TODO
        if(gamePackage['TASK_SEQUENCE'].length == 0){
            return false
        }

        // Perform a cursory check of each task that they have the correct key names
        var necessary_keys = []
        for (var k in DEFAULT_HIT['TASK_SEQUENCE'][0]){
            if(!DEFAULT_HIT['TASK_SEQUENCE'].hasOwnProperty(k)){
                continue
            }
            if(k == 'choiceMap' || k == 'rewardMap'){
                console.log('Not checking for', k)
                continue
            }
            necessary_keys.push(k)
        }

        for (var taskNumber in gamePackage['TASK_SEQUENCE']){
            var tk = gamePackage['TASK_SEQUENCE'][taskNumber]
            
            var missing_keys = this.check_key_presence(tk, necessary_keys)
            if(missing_keys.length > 0){
                console.log('Task', taskNumber,'is missing ', missing_keys)
                return false
            }

            // Check that all samplebag keys referenced in task is in IMAGEBAGS
            var missing_sampleBagNames = this.check_key_presence(gamePackage['IMAGEBAGS'], tk['sampleBagNames'])
            if(missing_sampleBagNames.length > 0 ){
                    verified = false 
                    console.log('IMAGEBAGS is missing', missing_sampleBagNames)
                }

            if(tk['choiceMap'] != undefined && tk['taskType'] == 'MTS'){
                for (var sampleBag in tk['sampleBagNames']){
                    var missing_choiceBagNames = this.check_key_presence(gamePackage['IMAGEBAGS'], tk['choiceMap'][sampleBag])
                    if(missing_choiceBagNames.length > 0 ){
                        verified = false 
                        console.log('IMAGEBAGS is missing', missing_choiceBagNames)
                    }
                }
                
            }

        }

        


        return verified
    }


    check_key_presence(testObject, necessaryKeyList){
        if(necessaryKeyList.constructor != Array){
            necessaryKeyList = [necessaryKeyList]
        }
        // testObject: an object
        // necessaryKeys: a list
        var missingKeys = []

        for (var i in necessaryKeyList){
            var key = necessaryKeyList[i]

            if(!testObject.hasOwnProperty(key)){
                missingKeys.push(key)
            }
        }

        return missingKeys
    }


    verify_environment(environment){
        var verified = true 
        if(environment.constructor!=Object){
            verified = false
        }
        return verified
    }
    verify_session_package(sessionPackage){
        var verified = true
        var use_default_HIT = false
        
        verified = this.verify_game_package(sessionPackage['GAME_PACKAGE'])
        verified = this.verify_environment(sessionPackage['ENVIRONMENT'])

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
