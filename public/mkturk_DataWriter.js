class DataWriter{
    constructor(){
        this.trialData = {}
        this.pollPeriodMsec = 60000
        this.saveTimeoutPeriodMsec = 5000 // save at most every 5 seconds
        this.lastTrialTimestamp = performance.now() 
        this.lastSaveTimestamp = performance.now()
        this.probeFunctions = {}
        this.keyData = {}
        
    }
    debug2record(){
        this.trialData = {}
    }
    deposit_trial_outcome(trialOutcome){
        for (var key in trialOutcome){
            if(!trialOutcome.hasOwnProperty(key)){
                continue
            }
            if(!this.trialData.hasOwnProperty(key)){
                this.trialData[key] = []
                //console.log('Added property ', key, ' to trialData')
            }
            this.trialData[key].push(trialOutcome[key])
        }
        this.lastTrialTimestamp = performance.now()
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
        console.log("DataWriter.start_polling NOT IMPLEMENTED")
    }

    write_out(){
        console.log("DataWriter.write_out NOT IMPLEMENTED")
    }
    
    async conclude_session(){
        console.log("DataWriter.conclude_session NOT IMPLEMENTED")
        return
    }
}

class DropboxDataWriter extends DataWriter{
    constructor(DIO, debugSaveDir, saveDir, savePrefix){
        super()
        this.DIO = DIO
        this.saveDir = saveDir
        this.debugSaveDir = debugSaveDir
        this.savePrefix = savePrefix
        this.savePath = join([this.debugSaveDir, this.generate_filename('debug_'+this.savePrefix)])
    }

    debug2record(){
        this.savePath = join([this.saveDir, this.generate_filename(this.savePrefix)])
        this.trialData = {}
    }
    generate_filename(prefix){
        
        var saveFilename = prefix
        var curDate = new Date()
        saveFilename+='_'
        saveFilename+=(curDate.getFullYear())+'-'
        saveFilename+=(curDate.getMonth()+1)+'-'
        saveFilename+=(curDate.getDate())

        saveFilename+='_T'
        saveFilename+=curDate.getHours()+'-'
        saveFilename+=curDate.getMinutes()+'-'
        saveFilename+=curDate.getSeconds()

        saveFilename+='.json'

        return saveFilename
    }

    start_polling(){

        // If no trial has been done in the past T1 seconds, write out once. 

        // Then after that, write out periodically every T2 seconds. 
        console.log('Called DataWriter.start_polling')
        if (this.pollPeriodMsec < 0 || this.pollPeriodMsec == undefined){
            console.log("Will not poll.")
            return
        }

        this.pollPeriodMsec = 30000
        this.latentSaveModeTimeoutMsec = 60000 // If it's been this.latentSaveModeTimeout msec, start saving every 
        this.latentSavePeriodMsec = 3 * 60000
        this.inLatentMode = false
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
        var _this = this

        var pollFunction = function(){
            // If it's been latentSaveModeTimeoutMsec since the last trial, save and enter latent mode.
            if(performance.now() - _this.lastTrialTimestamp >= _this.latentSaveModeTimeoutMsec){
                if(_this.inLatentMode == false){
                    console.log('Entering latent save mode.')
                }
                _this.inLatentMode = true
            }
            else{
                if(_this.inLatentMode == true){
                    console.log('Exiting latent save mode.')
                }
                _this.inLatentMode = false
            }            

            if(_this.inLatentMode == true){
                var lastSaveMsecAgo = performance.now() - _this.lastSaveTimestamp
                if(lastSaveMsecAgo >= _this.latentSavePeriodMsec){
                    console.log('Executing latent save. Last save was ', lastSaveMsecAgo/1000, 'sec ago.')
                    _this.write_out.apply(_this)
                }
            }
        }

        window.setInterval(pollFunction, this.pollPeriodMsec)

    }
  
    async write_out(){
        
        if(performance.now() - this.lastSaveTimestamp < this.saveTimeoutPeriodMsec){
            //console.log('skipping save')
            return 
        }

        var dataString = JSON.stringify(this.package_data(), null, 4)

        var savedMsecAgo = Math.round(performance.now() - this.lastSaveTimestamp)
        this.lastSaveTimestamp = performance.now()
        await this.DIO.write_string(dataString, this.savePath)
        console.log('Saved. Size:', memorySizeOf(dataString, 1), '(Last save', savedMsecAgo/1000,'sec ago):')
        
    }
}

class MechanicalTurkDataWriter extends DataWriter{
    constructor(assignmentId, hitId, inSandboxMode){
        super()
        console.log(this)
        this.inSandboxMode = inSandboxMode || false
        this.assignmentId = assignmentId
        this.hitId = hitId
    }

    start_polling(){
        return
    }
    async write_out(){
        return
    }

    async conclude_session(){
    
        var dataobj = this.package_data()
        var result_str = JSON.stringify({'SESSION_DATA':dataobj})
        console.log('Packaged data of size', memorySizeOf(result_str, 1), 'for submission to Amazon.')
        document.getElementById("assignmentId").value = this.assignmentId; 
        document.getElementById("hitId").value = this.hitId
        document.getElementById("submission_data").value = result_str;

        var submit_url = "https://www.mturk.com/mturk/externalSubmit"
        
        if(this.inSandboxMode == true){
            var submit_url = "https://workersandbox.mturk.com/mturk/externalSubmit" 
        }
        else if(this.inSandboxMode == false){
            var submit_url = "https://www.mturk.com/mturk/externalSubmit"
        }
        document.getElementById("MechanicalTurk_SubmissionForm").action = submit_url

        await sleep(1500)

        document.getElementById("MechanicalTurk_SubmissionForm").submit();
        console.log('SIMULATED SUBMISSION TO TURK')
    }
}
