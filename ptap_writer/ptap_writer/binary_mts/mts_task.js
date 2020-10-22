async function run_mts_blocks(block_sequence, checkpoint_key_prefix){
    /*
    subtask_sequence: Array of Objects, which detail the subtasks which will be run
    checkpoint_key: a String which is used for checkpointing behavioral data

    This function returns a list of returns from "run_binary_sr_trials". It allows the caller to request that multiple
    subtasks be run back-to-back.

    Between each subtask, a "splash" screen appears in which the subject is informed the last subtask has concluded.

    If a subtask is to fail, for some reason, this function concludes early, and returns the behavioral data for trials
    that have been completed so far. It also attaches the error message which was associated with the error.
     */

    var nphases = phase_sequence.length;
    var return_values = {'data':[]};

    try {
        for (let i_phase = 0; i_phase < nphases; i_phase++) {
            const playspace_size_pixels = infer_canvas_size();
            const cur_phase = phase_sequence[i_subtask];

            // Load savedata for this subtask
            const cur_checkpoint_key = checkpoint_key_prefix.concat('_phase', i_phase.toString());

            var cur_session_data = await run_binary_mts_trials(
                cur_phase['image_url_prefix'],
                cur_phase['stimulus_image_url_suffix_sequence'],
                cur_phase['choice0_url_suffix_sequence'],
                cur_phase['choice1_url_suffix_sequence'],
                cur_phase['rewarded_choice_sequence'],
                cur_phase['stimulus_duration_msec'],
                cur_phase['reward_duration_msec'],
                cur_phase['punish_duration_msec'],
                cur_phase['choice_duration_msec'],
                cur_phase['minimal_choice_duration_msec'],
                cur_phase['post_stimulus_delay_duration_msec'],
                cur_phase['usd_per_reward'],
                playspace_size_pixels,
                cur_phase['block_name'],
                cur_checkpoint_key,
            );

            // Push data to return values
            return_values['data'].push(cur_session_data);
        }
        let playspace_size_pixels = infer_canvas_size();
        await congratulations_screen(playspace_size_pixels)
    }

    catch(error){
        console.log(error);
        return_values['error'] = error;
    }

    return return_values
}



async function run_binary_mts_trials(
    image_url_prefix,
    stimulus_image_url_suffix_sequence,
    choice0_url_suffix_sequence,
    choice1_url_suffix_sequence,
    rewarded_choice_sequence,
    stimulus_duration_msec,
    reward_duration_msec,
    punish_duration_msec,
    choice_duration_msec,
    minimal_choice_duration_msec,
    post_stimulus_delay_duration_msec,
    usd_per_reward,
    size,
    block_name,
    checkpoint_key,
){

    /*
    Core function for getting behavioral data on a series of 2AFC trials from a human subject.

    image_url_prefix, String
    image_url_suffix_sequence, [t]
    choice0_url_suffix_sequence,  [t]
    choice1_url_suffix_sequence,  [t]
    rewarded_choice_sequence, [t]. If an entry is -1, no choice is given a reward.
    stimulus_duration_msec, [t]
    reward_duration_msec, [t]. If an entry is zero, no reward feedback is given.
    punish_duration_msec, [t]. If an entry is zero, no punish feedback is given.
    choice_duration_msec, [t]. Max choice time
    minimal_choice_duration_msec, [t]. Imposes a delay until this much time has elapsed. Triggers a GUI element showing the remaining time a choice is made.
    post_stimulus_delay_duration_msec, [t]. The amount of time before the choices pop up.
    usd_per_reward, Float
    size, () in pixels
    block_name, String
    checkpoint_key: String which is used as a key for LocalStorage

    Returns {'coords':coords, 'data_vars':data_vars, 'meta':meta}
     */

    var diameter_pixels = size * 0.25;
    var coords = {};
    coords['url_prefix'] = image_url_prefix;
    coords['stimulus_duration_msec'] = stimulus_duration_msec;
    coords['reward_duration_msec'] = reward_duration_msec;
    coords['punish_duration_msec'] = punish_duration_msec;
    coords['choice_duration_msec'] = choice_duration_msec;
    coords['minimal_choice_duration_msec'] = minimal_choice_duration_msec;
    coords['post_stimulus_delay_duration_msec'] = post_stimulus_delay_duration_msec;
    coords['usd_per_reward'] = usd_per_reward;
    coords['playspace_size_px'] = size;
    coords['block_name'] = block_name;
    coords['timestamp_session_start'] = performance.timing.navigationStart;

    const [hcur, wcur] = get_screen_dims();
    coords['screen_height_px'] = hcur;
    coords['screen_width_px'] = wcur;
    coords['device_pixel_ratio'] = window.devicePixelRatio || 1;

    var data_vars = {};
    data_vars['action'] = [];
    data_vars['stimulus_url_suffix'] = [];
    data_vars['choice0_url_suffix'] = [];
    data_vars['choice1_url_suffix'] = [];
    data_vars['reaction_time_msec'] = [];
    data_vars['rel_timestamp_start'] = []; // The time the subject engaged the fixation button; is relative to the start time of calling this function
    data_vars['rel_timestamp_stimulus_on'] = [];
    data_vars['rel_timestamp_stimulus_off'] = [];
    data_vars['rel_timestamp_choices_on'] = [];
    data_vars['trial_number'] = [];

    var meta = {'performed_trials':false};

    // Resume task if there is checkpoint data
    let cur_subtask_datavars = {};
    let _loaded_data = LocalStorageUtils.retrieve_json_object(checkpoint_key);
    if (_loaded_data != null){
        cur_subtask_datavars = _loaded_data;
    }

    // If there is savedata, load it, reflect savedata in HUD, and set the data_vars
    let start_trial = 0;
    if (cur_subtask_datavars['perf'] != null) {
        start_trial = cur_subtask_datavars['perf'].length;
        data_vars = cur_subtask_datavars;
    }

    // Pre-buffer images
    var trial_images = new ImageBufferClass;
    let all_urls = [];

    for (let i_image = start_trial; i_image < stimulus_image_url_suffix_sequence.length; i_image++){
        let current_stimulus_suffix = stimulus_image_url_suffix_sequence[i_image];
        let current_choice0_suffix = choice0_url_suffix_sequence[i_image];
        let current_choice1_suffix = choice1_url_suffix_sequence[i_image];

        let stim_url = image_url_prefix.concat(current_stimulus_suffix);
        all_urls.push(stim_url)

        let c0_url = image_url_prefix.concat(current_choice0_suffix);
        all_urls.push(c0_url)

        let c1_url = image_url_prefix.concat(current_choice1_suffix);
        all_urls.push(c1_url)
    }
    all_urls = [... new Set(all_urls)];
    await trial_images.buffer_urls(all_urls);

    // Begin tracking actions
    var action_recorder = new ActionListenerClass(false, true);

    // Iterate over trials
    var canvases = await initialize_mts_task_canvases(size);

    for (let i_trial = start_trial; i_trial < image_url_suffix_sequence.length; i_trial++){

        // Buffer stimulus
        let current_stimulus_suffix = stimulus_image_url_suffix_sequence[i_trial];
        let current_stimulus_url = image_url_prefix.concat(current_stimulus_suffix);
        var current_stimulus_image = await trial_images.get_by_url(current_stimulus_url);
        await draw_image(canvases['stimulus_canvas'], current_stimulus_image, size/2, size/2, diameter_pixels);


        // Buffer choice image
        let current_c0_suffix = choice0_url_suffix_sequence[i_trial];
        let current_c1_suffix = choice1_url_suffix_sequence[i_trial];

        let c0_url = image_url_prefix.concat(current_c0_suffix);
        let c1_url = image_url_prefix.concat(current_c1_suffix);

        var current_c0_image = await trial_images.get_by_url(c0_url);
        var current_c1_image = await trial_images.get_by_url(c1_url);

        await draw_image(canvases['choice_canvas'], current_c0_image, size/4, size*3/4, diameter_pixels);
        await draw_image(canvases['choice_canvas'], current_c1_image, size/4, size*3/4, diameter_pixels);

        // Run trial initiation
        await display_canvas_sequence([canvases['blank_canvas'], canvases['fixation_canvas']], [0, 0]);
        var fixation_outcome = await action_recorder.Promise_get_subject_keypress_response({' ':-1});

        // Run stimulus
        var _stimulus_seq = undefined;
        var _t_seq = undefined;
        if (post_stimulus_delay_duration_msec > 0){
            // Insert delay before showing choices
            _stimulus_seq = [canvases['fixation_canvas'], canvases['stimulus_canvas'], canvases['blank_canvas'], canvases['choice_canvas']];
            _t_seq = [0, stimulus_duration_msec, post_stimulus_delay_duration_msec, 0]
        }
        else{
            // No delay before showing choices
            _stimulus_seq = [canvases['fixation_canvas'], canvases['stimulus_canvas'], canvases['choice_canvas']];
            _t_seq = [0, stimulus_duration_msec, 0]
        }
        let timestamp_stimulus = await display_canvas_sequence(_stimulus_seq, _t_seq);

        // Show choices and wait for response
        let choice_outcome = await action_recorder.Promise_get_subject_keypress_response({'f':0, 'j':1}, choice_duration_msec);
        let reaction_time_msec = choice_outcome['t'] - timestamp_stimulus[timestamp_stimulus.length-1];

        // Evaluate subject action
        let action = choice_outcome['actionIndex'];
        let reinforced_action = rewarded_choice_sequence[i_trial]
        let reinforcement = -1

        if (action === -1){
            // Timed out, always punish
            reinforcement = 0
        }
        if (reinforced_action !== -1) {
            if (action === reinforced_action) {
                reinforcement = 1
            }
        }

        // Provide visual feedback, and apply a timeout
        if (reinforcement === 0){
            await display_canvas_sequence([canvases['choice_canvas'], canvases['punish_canvas'], canvases['blank_canvas']], [0, punish_duration_msec, 0]);
        }
        else if (reinforcement === 1){
            await display_canvas_sequence([canvases['choice_canvas'], canvases['reward_canvas'], canvases['blank_canvas']], [0, reward_duration_msec, 0]);
        }
        // Trigger await for the rest of the trial, if minimal_choice_duration_msec has not elapsed
        if (reaction_time_msec < minimal_choice_duration_msec){
            await timeout(minimal_choice_duration_msec - reaction_time_msec);
            console.log('Todo: add GUI element for minimal choice time')
        }

        data_vars['action'].push(action);
        data_vars['stimulus_url_suffix'].push(current_stimulus_suffix);
        data_vars['choice0_url_suffix'].push(current_c0_suffix);
        data_vars['choice1_url_suffix'].push(current_c1_suffix);
        data_vars['reaction_time_msec'].push(Math.round(reaction_time_msec));
        data_vars['rel_timestamp_start'].push(Math.round(fixation_outcome['t'])); // The time the subject engaged the fixation button; is relative to the start time of calling this function
        data_vars['rel_timestamp_stimulus_on'].push(Math.round(timestamp_stimulus[1]));
        data_vars['rel_timestamp_stimulus_off'].push(Math.round(timestamp_stimulus[2]));
        data_vars['rel_timestamp_choices_on'].push(Math.round(timestamp_stimulus[timestamp_stimulus.length-1]));
        data_vars['trial_number'].push(i_trial);
        meta['performed_trials'] = true;

        // Checkpoint data vars to local storage
        LocalStorageUtils.store_object_as_json(checkpoint_key, data_vars);
    }

    // Delete canvases
    canvases['fixation_canvas'].remove();
    canvases['stimulus_canvas'].remove();
    canvases['reward_canvas'].remove();
    canvases['punish_canvas'].remove();
    canvases['choice_canvas'].remove();
    canvases['blank_canvas'].remove();

    // Remove event listeners from window
    action_recorder.close_listeners();
    delete trial_images.cache_dict;
    return {'coords':coords, 'data_vars':data_vars, 'meta':meta}
}


async function congratulations_screen(size){
    /*
    Creates and displays a div informing the subject they are finished with the HIT, and they can press "space" to submit.
    size: () of canvas, in units of pixels
    mean_perf: (), from [0, 1]
     */

    var splash1_canvas = create_canvas('splash1_canvas', size, size);
    var font_size = (size * 0.05).toString();
    var font = font_size+'px Times New Roman';

    await draw_text(splash1_canvas, 'Thank you for your work!', font, 'white', size/2, size * 0.3, 'center');
    await draw_text(splash1_canvas, 'Press space to submit.', font, '#66ff33', size/2, size * 0.65, 'center');

    await display_canvas_sequence([splash1_canvas], [0]);
    var action_recorder = new ActionListenerClass(false, true);

    await timeout(500);
    await action_recorder.Promise_get_subject_keypress_response({' ': 0}, 10000);
    splash1_canvas.remove()
}


async function initialize_mts_task_canvases(size){
    var width = size;
    var height = size;
    var canvases = {};

    // Create fixation canvas
    canvases['fixation_canvas'] = create_canvas('fixation_canvas', width, height);
    await draw_dot_with_text(canvases['fixation_canvas'], 'Press space', width*0.5, height*0.75, size * 0.15, "white", 1);
    await draw_dot_with_text(canvases['fixation_canvas'], '', width*0.5, height*0.5, Math.max(10, size * 0.01), "black", 1);
    // Create stimulus canvas
    canvases['stimulus_canvas'] = create_canvas('stimulus_canvas', width, height);

    // Create reward canvas (green square)
    canvases['reward_canvas'] = create_canvas('reward_canvas', width, height);
    await draw_rectangle(
        canvases['reward_canvas'],
        width * 0.5,
        height*0.5,
        width * 1/3,
        height * 1/3,
        "#00cc00",
        0.5);

    // Create punish canvas (black square)
    canvases['punish_canvas'] = create_canvas('punish_canvas', width, height);
    await draw_rectangle(
        canvases['punish_canvas'],
        width * 0.5,
        height*0.5,
    width * 1/3,
        height * 1/3,
        "black",
        0.8);

    // Create choice canvas
    canvases['choice_canvas'] = create_canvas('choice_canvas', width, height);
    canvases['blank_canvas'] = create_canvas('blank_canvas', width, height);

    return canvases
}

