class SessionBootStrapper{
    constructor(){
        this.SIO = new S3_IO()
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
        var sessionPackage = await this.download_from_string(sessionPackageBootstrapString)

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
    async unpack_game_package(game_package_key){
        var gamePackage = await this.download_from_string(game_package_key) 
        var unpackedGame = {}

        unpackedGame['IMAGEBAGS'] = await this.unpack_imagebags(gamePackage['IMAGEBAGS'])
        unpackedGame['GAME'] = await this.unpack_game(gamePackage['GAME'])
        unpackedGame['TASK_SEQUENCE'] = await this.unpack_task_sequence(gamePackage['TASK_SEQUENCE'])

        return unpackedGame
    }

    async unpack_imagebags(imagebags_bootstrap){

        console.log('Loading IMAGEBAGS')
        var imagebags = await this.download_from_string(imagebags_bootstrap)
        var loadMethods = []
        var unpacked_imagebags = {}
        if (imagebags.constructor == Array){
            // Unpack additional levels
            for (var i in imagebags){
                var x = await this.download_from_string(imagebags[i])
                loadMethods.push(this.infer_load_method(imagebags[i]))
                for (var j in x){
                    if(!x.hasOwnProperty(j)){
                        continue
                    }

                    unpacked_imagebags[j] = x[j]
                }
            }
        }
        else if(imagebags.constructor == Object){
            unpacked_imagebags = imagebags
            loadMethods.push(this.infer_load_method(imagebags_bootstrap))
        }
        else{
            return undefined
        }

        for (var bagName in unpacked_imagebags){
            if(!unpacked_imagebags.hasOwnProperty(bagName)){
                continue
            }
            if (unpacked_imagebags[bagName].constructor == String){
                // Convert singletons
                unpacked_imagebags[bagName] = [unpacked_imagebags[bagName]]
            }
        }

        // Log 
        this.bootstrapLog['IMAGEBAGS'] = {}

        console.log('imagebgas load method', loadMethods)
        console.log('imagebags_bootstrap', imagebags_bootstrap)
        

        var constructors = []
        for (var k in loadMethods){
            var lM = loadMethods[k]
            if (lM == 'dropbox' || lM == 'url'){
                constructors.push(imagebags[k])
            } 
            else{
                constructors.push(undefined)
            }
        }

        this.bootstrapLog['IMAGEBAGS']['constructor'] = constructors
        this.bootstrapLog['IMAGEBAGS']['loadMethod'] = loadMethods
        
        return unpacked_imagebags
    }

    async unpack_game(game_bootstrap){
        console.log('Loading GAME')

        var game = await this.download_from_string(game_bootstrap)

        this.bootstrapLog['GAME'] = {}
        this.bootstrapLog['GAME']['constructor'] = this.infer_load_method(game_bootstrap)

        return game
    }


    async unpack_task_sequence(task_sequence_bootstrap){

        console.log('Loading task_sequence')

        var task_sequence = await this.download_from_string(task_sequence_bootstrap)

        if (task_sequence.constructor == Object){
            task_sequence = [task_sequence]
        }

        this.bootstrapLog['TASK_SEQUENCE'] = {}
        this.bootstrapLog['TASK_SEQUENCE']['constructor'] = this.infer_load_method(task_sequence_bootstrap)
        return task_sequence


    }
    
    async unpack_environment(environment){
        var ENVIRONMENT = await this.download_from_string(environment)
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

    async download_from_string(local_val){
        // local_val: a string that is either a: 
                // url
                // dropbox relative path
                // stringified JSON oject
        // or already an object 

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
            console.log('SessionBootStrapper.download_from_string called with loadMethod', loadMethod, '; not supported')
            return undefined
        }
    }
    infer_load_method(s){
        // s: a string that is either a: 
            // url
            // dropbox relative path 
            // stringified JSON object 
        // or it's an object.

        if(s == undefined){
            return undefined
        }
        if(s.constructor!=String){
            return 'literal'
        }
        
        if(s.startsWith('http') || s.startsWith('www')){
            return 'url'
        }
        else if(s.startsWith('/')){
            return 'dropbox'
        }
        else if(s.startsWith('{') || s.startsWith('[')){
            return 'localstorage'
        }
        else{
            console.log('SessionBootStrapper.infer_load_method could not infer for key', s, '; not supported')
            return undefined
        }
    }

    get_bootstrap_log(){
        return this.bootstrapLog
    }
}
