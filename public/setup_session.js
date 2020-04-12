async function setup_session(task_def) {
    // Before trials initiate, several tasks must be completed, based on the task_def.

    /*
    1. Begin buffering images, async.
    2. Run the instructions dialogue.
    3. Get the input device of the user.
    4. Detect if this is a preview Turker, or someone who has accepted the job.
    */

    var bonus_USD_per_correct =  task_def['bonus_USD_per_correct'];
    var num_trials = task_def['trial_sequence'].length;

    // Defaults
    var Playspace = new PlaySpaceClass(bonus_USD_per_correct);
    await Playspace.build();

    Playspace.start_action_tracking();
    Playspace.start_device_tracking();

    var UX = new MechanicalTurkUX(num_trials, bonus_USD_per_correct);

    var run_preview_mode = true;

    // If debugging on local server, deactivate preview mode
    if (window.location.href.indexOf('localhost') !== -1) {
        run_preview_mode = false
    }
    // Show preview mode if simply a previewer
    else {
        if (SESSION['assignmentId'] === 'assignmentId_not_found' || SESSION['assignmentId'] === 'ASSIGNMENT_ID_NOT_AVAILABLE') {
            run_preview_mode = true
        }
        else {
            run_preview_mode = false
        }
    }

    // Catch previewers and keep them in preview mode
    if (run_preview_mode === true) {
        var image_buffer = ImageBuffer();
        var tutorial_image = await image_buffer.get_by_url('image_assets/TutorialClickMe.png');

        UX.show_preview_splash();

        while (true) {
            await Playspace.run_tutorial_trial(tutorial_image)
        }
    }

    await UX.run_instructions_dialogue();

    var freturn = {
        'UX':UX,
        'Playspace':Playspace,
    };



    return freturn
}





