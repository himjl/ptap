class mechanical_turk_util_functions{
    constructor(){
    }

    static async submit_data(assignmentId, sandbox_mode, data_obj){
        /*
        assignmentId: str
        sandbox_mode: bool
        data_obj: JSON-like object

        Submits data to Mechanical Turk servers, and concludes the assignment for the subject.
        Per AWS documentation, we are required to include the assignmentId. Other fields are optional.
         */

        // Check to see if we should submit to the Mechanical Turk Sandbox server
        var external_question_submission_url = 'https://www.mturk.com/mturk/externalSubmit';
        if (sandbox_mode === true){
            external_question_submission_url = "https://workersandbox.mturk.com/mturk/externalSubmit";
        }

        // Create the submission form
        var submission_form = document.createElement("form");
        submission_form.setAttribute("method", "post");
        submission_form.setAttribute("action", external_question_submission_url);
        submission_form.style = "display: none;";

        // Attach inputs to the submission form
        var submission_data_input = document.createElement("input");
        submission_data_input.setAttribute("name", 'submission_data');
        submission_form.appendChild(submission_data_input);

        var assignmentId_input = document.createElement("input");
        assignmentId_input.setAttribute("name", 'assignmentId');
        submission_form.appendChild(assignmentId_input);

        // Fill out form
        var session_data_string = JSON.stringify({'SESSION_DATA':data_obj});

        assignmentId_input.value = assignmentId;
        submission_data_input.value = session_data_string;

        submission_form.submit();
    }
}
