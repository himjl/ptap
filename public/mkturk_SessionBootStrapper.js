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
