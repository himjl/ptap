class DataWriter{
    constructor(DIO, debugSaveDir, saveDir, savePrefix){
        this.DIO = DIO
        this.saveDir = saveDir
        this.debugSaveDir = debugSaveDir
        this.savePrefix = savePrefix

        this.trialData = {}
        this.pollPeriodMsec = 120000
        this.saveTimeoutPeriodMsec = 5000 // save at most every 5 seconds
        this.lastSaveTimestamp = performance.now()
        this.probeFunctions = {}

        this.keyData = {}
        this.savePath = join([this.debugSaveDir, this.generate_filename('debug_'+this.savePrefix)])// join([this.saveDir, ])
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

        this.pollPeriodMsec = Math.max(5000, this.pollPeriodMsec) // Save at most every 5000 msec

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
        var _this = this
        window.setInterval(function(){console.log('calling poll save');_this.write_out.apply(_this)}, this.pollPeriodMsec)
    }
  
    async write_out(){
        
        if(performance.now() - this.lastSaveTimestamp < this.saveTimeoutPeriodMsec){
            console.log('skipping save')
            return 
        }

        var dataString = JSON.stringify(this.package_data(), null, 4)
        
        await this.DIO.write_string(dataString, this.savePath)
        console.log('Saved. Size:', memorySizeOf(dataString, 1), 'Last save (msec ago):', Math.round(performance.now() - this.lastSaveTimestamp))
        this.lastSaveTimestamp = performance.now()
    }

    concludeSession(){
        return
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
