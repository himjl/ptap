class ListDict{
    constructor(){
        this.data = {}
    }
    update(update_dict, key_prefix){
        // key_prefix: optional argument to prepend key with some string
        key_prefix = key_prefix || '';

        for (var key in update_dict){
            if(!update_dict.hasOwnProperty(key)){
                continue
            }

            var record_key = key_prefix.concat(key);
            if(!this.data.hasOwnProperty(record_key)){
                this.data[record_key] = []
            }
            this.data[record_key].push(update_dict[key])
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
