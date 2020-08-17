var FLAGS = {};
var session_data = new ListDict;

(async function () {
    try {

        // Load task def from local storage
        var task_def = await localstorage_io.load_task_def();

        // Get session information
        var landing_page_url = await localstorage_io.load_landing_page_url();
        var hitId = az.get_hitId_from_url(landing_page_url);
        var assignmentId = az.get_assignmentId_from_url(landing_page_url);
        var sandbox_mode = az.detect_sandbox_mode(landing_page_url);

        console.log('landing_page_url', landing_page_url);
        console.log('assignmentId', assignmentId);
        console.log('sandbox_mode',sandbox_mode);
        console.log('hitId', hitId);
        // Set up session
        var TrialIterator = new Trial_Iterator_Class(task_def);
        var freturn = await setup_session(task_def, assignmentId);
        var Playspace = freturn['Playspace'];
        var UX = freturn['UX'];

        // Attach metadata for session
        session_data.data['url'] = window.location.href;
        session_data.data['unixTimestampPageLoad'] = window.performance.timing.navigationStart;
        session_data.data['landingPageURL'] = landing_page_url;
        session_data.data['sandbox'] = sandbox_mode;

        // Turn on progressbar display; USD
        toggleElement(1, 'MechanicalTurk_ProgressBar');
        toggleElement(1, 'WorkerCashInButton');

        // Execute blue diamond tutorial
        if (true){
            var TutorialIterator = new Tutorial_Generator_Class();
            while(true){
                var tutorial_trial_data = await TutorialIterator.get_next_trial();
                var tutorial_trial_outcome = await Playspace.run_trial(tutorial_trial_data);
                var tutorial_state = TutorialIterator.update_state(tutorial_trial_outcome);
                session_data.update(tutorial_trial_outcome, 'tutorial_');
                if (tutorial_state !== 'in_progress'){
                    break
                }
            }
        }

        if (tutorial_state === 'failure'){
            // Submit to turk; subject did not pass.
            await MechanicalTurkSubmitter.submit_data(assignmentId, hitId, sandbox_mode, session_data.data)
        }

        // Execute main trial loop
        while (TrialIterator.terminal === false) {
            var trial_data = await TrialIterator.get_next_trial();
            var trial_outcome = await Playspace.run_trial(trial_data);
            session_data.update(trial_outcome);
            UX.update_progressbar(trial_outcome);
        }
        // Attach image info to session_data
        session_data.data['bonus_USD_per_correct'] = task_def['bonus_USD_per_correct'];
        session_data.data['image_url_prefix'] = task_def['image_url_prefix'];
        session_data.data['image_url_suffixes'] = task_def['image_url_suffixes'];

        // Submit the data to Mechanical Turk
        await MechanicalTurkSubmitter.submit_data(assignmentId, hitId, sandbox_mode, session_data.data)
    }
    catch (error) {
        // Error catch
        console.error(error);
        var errorMessage = String(error)
    }
    finally {
        // Error handling
        await sleep(1500);

        var dataobj = {'SESSION_DATA': session_data.data};
        document.getElementById("submission_data").value = JSON.stringify(dataobj);

        // Extract assignmentId from localstorage
        var landing_page_url = await localstorage_io.load_landing_page_url();
        var assignmentId = az.get_assignmentId_from_url(landing_page_url);
        document.getElementById("assignmentId").value = assignmentId;

        var submit_url = "https://www.mturk.com/mturk/externalSubmit";

        document.getElementById("MechanicalTurk_SubmissionForm").action = submit_url;
        console.log('Submitting failed session to mechanical turk');

        document.getElementById("MechanicalTurk_SubmissionForm").submit();
    }
}())

