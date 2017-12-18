class DataWriter{
    constructor(DIO){
        this.DIO = DIO
        this.trialData = {}
        this.sessionData = {} // doesn't change over the course of a session
        this.pollPeriodMsec = 5000
        this.probeFunctions = {}

        this.keyData = {}
        this.savePath = '/testptap.txt'
    }

    deposit_trial_outcome(trialOutcome){
        for (var key in trialOutcome){
            if(!trialOutcome.hasOwnProperty(key)){
                continue
            }
            if(!this.trialData.hasOwnProperty(key)){
                this.trialData[key] = []
                console.log('Added property ', key, ' to trialData')
            }
            this.trialData[key].push(trialOutcome[key])
        }
    }

    attach_probe(object, propertyName, probeName){
        var probefunc = function(){
            return object[propertyName]
        }
        this.probeFunctions[probeName] = probefunc
    }

    deposit_key_data(key, data){
        this.keyData[key] = data
    }

    package_data(){
        var dataPackage = {}
        dataPackage['BEHAVIOR'] = this.trialData // trial outcomes

        for (var probe in this.probeFunctions){
            if(!this.probeFunctions.hasOwnProperty(probe)){
                continue
            }
            dataPackage[probe] = this.probeFunctions[probe]()
        }

        for (var key in this.keyData){
            if(!this.keyData.hasOwnProperty(key)){
                continue
            }
            dataPackage[key] = this.keyData[key]
        }

        return dataPackage
    }

    

    start_polling(){
        if (this.pollPeriodMsec < 0 || this.pollPeriodMsec == undefined){
            return
        }

        this.pollPeriodMsec = Math.max(10000, this.pollPeriodMsec) // Save at most every 5000 msec

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
        var _this = this
        window.setInterval(function(){_this.write_out.apply(_this)}, this.pollPeriodMsec)
    }
  
    async write_out(){
        console.log('saving')
        var dataString = JSON.stringify(this.package_data(), null)
        await this.DIO.write_string(dataString, this.savePath)
    }

    concludeSession(){
        // 
    }




}

class MechanicalTurkDataWriter{
    // Where there can be no live writing / reading
    constructor(){
        this.dataobj = undefined
    }

    initialize(){
        this.dataobj = undefined
        initializeMouseTracker()
    }


    async concludeSession(){
        // Upload to turk

        if(SUBMIT_TO_SANDBOX == true){
            var submit_url = "https://workersandbox.mturk.com/mturk/externalSubmit" 
        }
        else if(SUBMIT_TO_SANDBOX == false){
            var submit_url = "https://www.mturk.com/mturk/externalSubmit"
        }

        document.getElementById("MechanicalTurk_SubmissionForm").action = submit_url
        console.log(document.getElementById('MechanicalTurk_SubmissionForm'))

        var aID = SESSION['assignmentId']


        var result_str = {'TASK_DATA':this.dataobj}


        result_str = JSON.stringify(result_str)

        //alert('Size of uncompressed is '+ result_str.length)
        //result_str = LZString.compress(result_str)
        //alert('Size of compressed is '+ result_str.length)

        document.getElementById("MechanicalTurk_SubmissionForm").action = submit_url


        document.getElementById("assignmentId").value = SESSION['assignmentId']; 
        document.getElementById("hitId").value = SESSION['hitId']
        console.log(aID) 
        document.getElementById("submission_data").value = result_str;

        await timeOut(1500)

        document.getElementById("MechanicalTurk_SubmissionForm").submit();
        console.log('SIMULATED SUBMISSION TO TURK')

    }
}

class DropboxDataWriter{
    constructor(DIO){
        this.dataobj =undefined 

        this.DIO = DIO
        this.min_write_timeout_period = TRIALDATA_SAVE_TIMEOUT_PERIOD // ms
        this.touchstring_max_cache_size = TOUCHSTRING_MAX_CACHE_SIZE // defined in install_settings
        this.trial_data_savepath = TRIAL_DATA_SAVEPATH
        this.touch_data_savepath = TOUCH_DATA_SAVEPATH

        this._debug_trial_data_savepath = _debug_TRIAL_DATA_SAVEPATH
        this._debug_touch_data_savepath = _debug_TOUCH_DATA_SAVEPATH
        this._last_touch_save = performance.now()
        this._last_trialbehavior_save = performance.now()

        this._touch_filename_suffix = this._generate_touch_filename_suffix()



    }

    initialize(){
        this.dataobj = undefined
        initializeTouchTracker()
    }

    deposit(trialOutcome){
        for (var key in trialOutcome){
            if(!trialOutcome.hasOwnProperty(key)){
                continue
            }
            if(!this.dataobj.hasOwnProperty(key)){
                this.dataobj[key] = []
                console.log('Added property ', key, ' to dataobj')
            }
            this.dataobj[key].push(trialOutcome[key])
        }
    }


    async saveTrialData(dataobj, save_to_debug_directory){

        
        var datastr = JSON.stringify(dataobj); 
        var __datestr = SESSION.currentDate.toISOString();
        var TrialDataFileName_suffix = __datestr.slice(0, __datestr.indexOf(".")) + "_" + SESSION.agentID + ".txt"; 

        try{// In debug mode
            if (save_to_debug_directory == 1){
                var savepath = join([this._debug_trial_data_savepath,
                    SESSION.agentID,
                    "debug__"+SESSION.agentID +'_'+TrialDataFileName_suffix])
            }
            else { 
                var savepath = join([this.trial_data_savepath,
                    SESSION.agentID,
                    SESSION.agentID +'_'+TrialDataFileName_suffix])
            }

            await this.DIO.write_string(datastr, savepath)             
            console.log(" BEHAVIOR FILE UPLOADED at "+savepath)
            }
        catch(error){
            console.error(error)
        }
    }

    async writeout(dataobj){
        // Asynchronous save at most every T seconds
        var _ms_since_last_trial_data_save = performance.now() - last_trial_data_save
        var _ms_since_last_touch_data_save = performance.now() - last_touch_save
        var _ms_since_last_paramfile_check = performance.now() - last_paramfile_check 

        if ( _ms_since_last_trial_data_save > TRIALDATA_SAVE_TIMEOUT_PERIOD){ 
            console.log(_ms_since_last_trial_data_save/1000+'s since last trial data save. Requesting save...')
            this.saveTrialData(dataobj, FLAGS.debug_mode)
            last_trial_data_save = performance.now()
        }

        if (_ms_since_last_touch_data_save > TOUCHSTRING_SAVE_TIMEOUT_PERIOD){
            console.log(_ms_since_last_touch_data_save/1000 +'s since last TOUCHSTRING save. '+memorySizeOf(TOUCHLOG)+' TOUCHSTRING save requested.')
            this.saveTouches(FLAGS.debug_mode)
            last_touch_save = performance.now()
        }
    }

    async saveTouches(save_to_debug_directory){
        try{

            if (save_to_debug_directory == 0){
                var savepath = join([this.touch_data_savepath, SESSION.agentID, SESSION.agentID+this._touch_filename_suffix ])
            }
            else { // In debug mode

                var savepath = join([this._debug_touch_data_savepath, SESSION.agentID, 'debug__'+SESSION.agentID+this._touch_filename_suffix ])
            }

            var datastring = JSON.stringify(TOUCHLOG)

            this.DIO.write_string(datastring, savepath)

            if(memorySizeOf(TOUCHLOG) > TOUCHSTRING_MAX_CACHE_SIZE){
                // Start new file and flush cache
                this._touch_filename_suffix = _generate_touch_filename_suffix()
                TOUCHLOG = initializeTouchLog()
            }

            console.log("Touches written to disk as "+savepath) 
        }
        catch (error){
            console.error(error)
        }
    }

    _generate_touch_filename_suffix(){
        var datestr = SESSION.currentDate.toISOString();
        datestr = datestr.slice(0,datestr.indexOf("."))
        var _touch_filename_suffix = '_touch_'+datestr+'__'+TOUCHSTRING_UDPATECOUNTER+'.txt' // Initial name
        return _touch_filename_suffix
    }

    async concludeSession(){
        console.log("Nothing to concludeSession() in DropboxDataWriter; actively wrote out every trial")
    }

}