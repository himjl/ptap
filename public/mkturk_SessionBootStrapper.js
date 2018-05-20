class SessionBootStrapper{
    constructor(){
        this.bootstrapLog = {}
    }   

    async build(){
        wdm('Unpacking SESSION_PACKAGE...')
        var unpackedSession = {}
        
        // Retrieve landing page url from localstorage - no need to unpack further
        wdm('Retrieving LANDING_PAGE_URL...')
        unpackedSession['LANDING_PAGE_URL'] = await this.load_localstorage_string('LANDING_PAGE_URL')

        // Retrieve sessionPackage bootstraps from localstorage
        var sessionPackageBootstrapString = await this.load_localstorage_string('SESSION_PACKAGE')

        // Unpack sessionPackage
        wdm('Download_from_stringing SESSION_PACKAGE...')
        var sessionPackage = await this.download_from_string_header(sessionPackageBootstrapString)

        // Unpack elements of game package
        wdm('Unpacking GAME_PACKAGE...')
        var gamePackage = await this.unpack_game_package(sessionPackage['GAME_PACKAGE'])

        // Unpack elements of environment
        wdm('Unpacking ENVIRONMENT...')
        var environment = await this.unpack_environment(sessionPackage['ENVIRONMENT'])

        // return
        unpackedSession['GAME_PACKAGE'] = gamePackage 
        unpackedSession['ENVIRONMENT'] = environment
        

        return unpackedSession
    }
    async unpack_game_package(game_package_string_header){
        var gamePackage = await this.download_from_string_header(game_package_string_header) 
        var unpackedGame = {}

        unpackedGame['IMAGE_TABLE'] = await this.unpack_imagebags(gamePackage['IMAGE_TABLE'])
        unpackedGame['GAME'] = await this.unpack_game(gamePackage['GAME'])
        unpackedGame['TASK_SEQUENCE'] = await this.unpack_task_sequence(gamePackage['TASK_SEQUENCE'])

        return unpackedGame
    }

    async unpack_imagebags(imagebags_bootstrap){

        console.log('Loading IMAGE_TABLE')
        var imagebags = await this.download_from_string_header(imagebags_bootstrap)

         // Log 

         this.bootstrapLog['IMAGE_TABLE'] = {}
        var loadMethod = this.infer_load_method(imagebags_bootstrap)
        
        this.bootstrapLog['IMAGE_TABLE']['loadMethod'] = loadMethod
        if (loadMethod == 'url' || loadMethod == 'dropbox'){
            this.bootstrapLog['IMAGE_TABLE']['loadHeader'] = imagebags_bootstrap
        }
        
        return imagebags
        
    }

    async unpack_game(game_bootstrap){
        console.log('Loading GAME')

        var game = await this.download_from_string_header(game_bootstrap)

        var loadMethod = this.infer_load_method(game_bootstrap)
        this.bootstrapLog['GAME'] = {}
        this.bootstrapLog['GAME']['loadMethod'] = loadMethod
        if (loadMethod == 'url' || loadMethod == 'dropbox'){
            this.bootstrapLog['GAME']['loadHeader'] = game_bootstrap
        }
        return game
    }


    async unpack_task_sequence(task_sequence_bootstrap){

        console.log('Loading task_sequence')

        var task_sequence = await this.download_from_string_header(task_sequence_bootstrap)

        if (task_sequence.constructor == Object){
            task_sequence = [task_sequence]
        }


        var loadMethod = this.infer_load_method(task_sequence_bootstrap)
        this.bootstrapLog['TASK_SEQUENCE'] = {}
        this.bootstrapLog['TASK_SEQUENCE']['loadMethod'] = loadMethod
        if (loadMethod == 'url' || loadMethod == 'dropbox'){
            this.bootstrapLog['TASK_SEQUENCE']['loadHeader'] = task_sequence_bootstrap
        }
        return task_sequence


    }
    
    async unpack_environment(environment){
        var ENVIRONMENT = await this.download_from_string_header(environment)
        return ENVIRONMENT
    }

    async load_localstorage_string(localStorageKey){
        var local_val = await LocalStorageIO.load_string(localStorageKey)
        
        if (local_val.startsWith('\'') || local_val.startsWith('\"')){
            local_val = local_val.slice(1)
            local_val = local_val.slice(0, local_val.length-1)
        }

        return local_val
    }

    async download_from_string_header(string_header){
        // string_header: a string that is either a: 
                // url
                // dropbox relative path
                // stringified JSON oject
        // or already an object 

        var loadMethod = this.infer_load_method(string_header)

        if(loadMethod == 'literal'){
            return string_header
        }

        if(loadMethod == 'localstorage'){
            return JSON.parse(string_header)
        }
        else if(loadMethod == 'dropbox'){
            if (this.DIO == undefined){
                this.DIO = new DropboxIO()
                await this.DIO.build(window.location.href)
            }
            
            var s = await this.DIO.read_textfile(string_header)
            return JSON.parse(s)
        }
        else if(loadMethod == 'url'){
            var s = await S3_IO.read_textfile(string_header)
            return JSON.parse(s)
        }

        else{
            console.log('SessionBootStrapper.download_from_string_header called with loadMethod', loadMethod, '; not supported')
            return undefined
        }
    }
    infer_load_method(string_header){
        // string_header: a string that is either a: 
            // url
            // dropbox relative path 
            // stringified JSON object 
        // or it's an object.

        if(string_header == undefined){
            return undefined
        }
        if(string_header.constructor!=String){
            return 'literal'
        }
        
        if(string_header.startsWith('http') || string_header.startsWith('www')){
            return 'url'
        }
        else if(string_header.startsWith('/')){
            return 'dropbox'
        }
        else if(string_header.startsWith('{') || string_header.startsWith('[')){
            return 'localstorage'
        }
        else{
            console.log('SessionBootStrapper.infer_load_method could not infer for key', string_header, '; not supported')
            return undefined
        }
    }

    get_bootstrap_log(){
        return this.bootstrapLog
    }

    verify_session_package(sessionPackage){

        var VF = new Verifier()
        sessionPackage = VF.verify_session_package(sessionPackage)
        this.VF = VF
        this.verification_log = VF.get_verification_log()
        return sessionPackage
    }
}
