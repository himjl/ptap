class mechanical_turk_util_functions{
    static async submit_data(assignmentId, sandbox_mode, data_obj){
        /*
        assignmentId: str
        sandbox_mode: bool
        data_obj: JSON-like object

        Submits data to Mechanical Turk servers, and concludes the assignment for the subject.
        Per AWS documentation, we are required to include the assignmentId. Other fields are optional.
         */

        // Check to see if we should submit to the Mechanical Turk Sandbox server
        let external_question_submission_url = 'https://www.mturk.com/mturk/externalSubmit';
        if (sandbox_mode === true){
            external_question_submission_url = "https://workersandbox.mturk.com/mturk/externalSubmit";
        }

        // Create the submission form
        let submission_form = document.createElement("form");
        document.body.appendChild(submission_form);
        submission_form.setAttribute("method", "post");
        submission_form.setAttribute("action", external_question_submission_url);
        submission_form.style = "display: none;";

        // Attach inputs to the submission form
        let submission_data_input = document.createElement("input");
        submission_data_input.setAttribute("name", 'submission_data');
        submission_form.appendChild(submission_data_input);

        let assignmentId_input = document.createElement("input");
        assignmentId_input.setAttribute("name", 'assignmentId');
        submission_form.appendChild(assignmentId_input);

        // Fill out form
        let session_data_string = JSON.stringify(data_obj);

        assignmentId_input.value = assignmentId;
        submission_data_input.value = session_data_string;

        let currently_debugging = window.location.href.includes('localhost:');

        if (currently_debugging === false){
            submission_form.submit();
        }
        else{
            console.log('Currently on localhost; not submitting to turk');
            console.log('Data object:', data_obj);
        }

    }

    static get_workerId_from_url(url){
        var workerId = this._extract_url_string(url, 'workerId', 'workerId_not_found');
        console.log('workerId:', workerId);
        return workerId
    }



    static get_assignmentId_from_url(url){
        var assignmentId = this._extract_url_string(url, 'assignmentId', 'assignmentId_not_found');
        console.log('assignmentId', assignmentId);

        return assignmentId
    }

    static get_hitId_from_url(url){
        var hitId = this._extract_url_string(url, 'hitId', 'hitId_not_found');
        console.log('hitId', hitId);
        return hitId
    }

    static _extract_url_string(url, key, defaultValue){
        var name = key;
        key = key.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regexS = "[\\?&]" + key + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(url) || ["", defaultValue];

        return results[1]
    }

    static detect_developer_mode(url){
        if ((window.location.href.indexOf('developermodeoverride') !== -1) || (window.location.href.indexOf('localhost') !== -1) || (window.location.href.indexOf(':8000') !== -1)) {
            // It's a developer running this on his/her machine; disable preview mode
            console.log('Running in developer mode:');
            return true;
        }
        return false;
    }
    static detect_previewer(url){
        /*
        Detect if the current url reflects the one given to a previewer.
        return: bool
         */

        let in_preview_mode;

        if ((window.location.href.indexOf('localhost') !== -1) || (window.location.href.indexOf(':8000') !== -1)) {
            // It's a developer running this on his/her machine; disable preview mode
            in_preview_mode = false;
        }
        else {
            // It's a live human viewing the page in preview mode on the Mechanical Turk Website
            in_preview_mode = assignmentId === 'assignmentId_not_found' || assignmentId === 'ASSIGNMENT_ID_NOT_AVAILABLE';
        }

        return in_preview_mode
    }

    static detect_sandbox(url){
        /*
        Detect if the current url reflects the one given to a subject using Mechanical Turk in sandbox mode.
        return: bool
         */
        let sandbox = false;
        const submit_to_string = this._extract_url_string(url, 'turkSubmitTo', 'turkSubmitToNotFound');
        if (submit_to_string.includes('sandbox') === true){
            sandbox = true;
        }
        return sandbox
    }
}
