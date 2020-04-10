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


class ListDict{
    constructor(){
        this.data = {}
    }
    update(update_dict){
        for (var key in update_dict){
            if(!update_dict.hasOwnProperty(key)){
                continue
            }
            if(!this.data.hasOwnProperty(key)){
                this.data[key] = []
            }
            this.data[key].push(update_dict[key])
        }
    }
}

class MechanicalTurkSubmitter{
    constructor(){
    }

    static async submit_data(assignmentId, hitId, sandbox_mode, data_obj){
        // Submits data to Amazon


        // jsonify the data object
        var result_str = JSON.stringify({'SESSION_DATA':data_obj});

        console.log('Packaged data of size', memorySizeOf(result_str, 1), 'for submission to Amazon.');


        document.getElementById("assignmentId").value = assignmentId;
        document.getElementById("submission_data").value = result_str;

        var submit_url = "https://www.mturk.com/mturk/externalSubmit";

        if (sandbox_mode){
            submit_url = "https://workersandbox.mturk.com/mturk/externalSubmit"
        }
        document.getElementById("MechanicalTurk_SubmissionForm").action = submit_url;

        try{
            await document.getElementById("MechanicalTurk_SubmissionForm").submit();
            console.log('Executed submission to Mechanical Turk servers. Sandbox:', sandbox_mode)
        }
        catch(error){
            console.log(error)
        }
        await sleep(1500)
    }
}
