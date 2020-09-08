async function run_subtasks(subtask_sequence, checkpoint_key_prefix){
    /*
    subtask_sequence: Array of Objects, which detail the subtasks which will be run
    checkpoint_key: a String which is used for checkpointing behavioral data

    This function returns a list of returns from "run_binary_sr_trials". It allows the caller to request that multiple
    subtasks be run back-to-back.

    Between each subtask, a "splash" screen appears in which the subject is informed the last subtask has concluded.

    If a subtask is to fail, for some reason, this function concludes early, and returns the behavioral data for trials
    that have been completed so far. It also attaches the error message which was associated with the error.
     */

    var nsubtasks = subtask_sequence.length;
    var return_values = {'data':[]};


    try {

        for (var i_subtask = 0; i_subtask < nsubtasks; i_subtask++) {
            var playspace_size_pixels = infer_canvas_size();
            var cur_subtask = subtask_sequence[i_subtask];
            var cur_image_url_prefix = cur_subtask['image_url_prefix'];
            var cur_image_url_suffix_sequence = cur_subtask['image_url_suffix_seq'];
            var cur_label_sequence = cur_subtask['label_seq'];
            var cur_label_to_key = cur_subtask['label_to_key'];
            var cur_stimulus_duration_msec = cur_subtask['stimulus_duration_msec'];
            var cur_reward_duration_msec = cur_subtask['reward_duration_msec'];
            var cur_punish_duration_msec = cur_subtask['punish_duration_msec'];
            var cur_choice_duration_msec = cur_subtask['choice_duration_msec'];
            var cur_post_stimulus_delay_duration_msec = cur_subtask['post_stimulus_delay_duration_msec'];
            var usd_per_reward = cur_subtask['usd_per_reward'];
            var cur_sequence_name = cur_subtask['sequence_name'];

            // Load savedata for this subtask
            const cur_checkpoint_key = checkpoint_key_prefix.concat('_subtask', i_subtask.toString());

            var cur_session_data = await run_binary_sr_trials(
                cur_image_url_prefix,
                cur_image_url_suffix_sequence,
                cur_label_sequence,
                cur_label_to_key,
                cur_stimulus_duration_msec,
                cur_reward_duration_msec,
                cur_punish_duration_msec,
                cur_choice_duration_msec,
                cur_post_stimulus_delay_duration_msec,
                usd_per_reward,
                playspace_size_pixels,
                cur_sequence_name,
                cur_checkpoint_key,
                );

            // Push data to return values
            return_values['data'].push(cur_session_data);

            // Run the "end of subtask" splash screen if there are tasks that remain after this one
            if ((i_subtask + 1) < (nsubtasks)){
                await inter_subtask_splash_screen(playspace_size_pixels)
            }
        }

        await provide_session_end(return_values['data'])
    }

    catch(error){
        console.log(error);
        return_values['error'] = error;
    }

    return return_values
}


async function run_binary_sr_trials(
    image_url_prefix,
    image_url_suffix_sequence,
    label_sequence,
    label_to_key,
    stimulus_duration_msec,
    reward_duration_msec,
    punish_duration_msec,
    choice_duration_msec,
    post_stimulus_delay_duration_msec,
    usd_per_reward,
    size,
    sequence_name,
    checkpoint_key,
){

    /*
    Core function for getting behavioral data on a binary-SR task from a human subject.

    image_url_sequence: [t]
    label_sequence: [t]. 0 or 1.
    label_to_key: 'fj' (for 0 to f, 1 to j) or 'jf' (for 0 to j, 1 to f)
    stimulus_duration_msec: ()
    reward_duration_msec: ()
    punish_duration_msec: ()
    choice_duration_msec: ()
    post_stimulus_delay_duration_msec: ()
    usd_per_reward: ()
    size: () in pixels
    sequence_name: String
    checkpoint_key: String which is used as a key for LocalStorage
     */

    var diameter_pixels = size * 0.25;

    var coords = {};
    coords['stimulus_url_prefix'] = image_url_prefix;
    coords['stimulus_duration_msec'] = stimulus_duration_msec;
    coords['reward_duration_msec'] = reward_duration_msec;
    coords['punish_duration_msec'] = punish_duration_msec;
    coords['post_stimulus_delay_duration_msec'] = post_stimulus_delay_duration_msec;
    coords['usd_per_reward'] = usd_per_reward;
    coords['playspace_size_px'] = size;
    coords['label_to_key'] = label_to_key;
    coords['sequence_name'] = sequence_name;
    coords['timestamp_session_start'] = performance.timing.navigationStart;

    const [hcur, wcur] = get_screen_dims();
    coords['screen_height_px'] = hcur;
    coords['screen_width_px'] = wcur;
    coords['device_pixel_ratio'] = window.devicePixelRatio || 1;

    var data_vars = {};
    data_vars['perf'] = [];
    data_vars['action'] = [];
    data_vars['stimulus_url_suffix'] = [];
    data_vars['label'] = [];
    data_vars['reaction_time_msec'] = [];
    data_vars['rel_timestamp_start'] = []; // The time the subject engaged the fixation button; is relative to the start time of calling this function
    data_vars['rel_timestamp_stimulus_on'] = [];
    data_vars['rel_timestamp_stimulus_off'] = [];
    data_vars['rel_timestamp_choices_on'] = [];
    data_vars['trial_number'] = [];


    // Resume task if there is checkpoint data
    let cur_subtask_datavars = {};
    let _loaded_data = LocalStorageUtils.retrieve_json_object(checkpoint_key);
    if (_loaded_data != null){
        cur_subtask_datavars = _loaded_data;
    }

    // If there is savedata, load it, and set the data_vars
    let start_trial = 0;
    if (cur_subtask_datavars['perf'] != null) {
        start_trial = cur_subtask_datavars['perf'].length;
        data_vars = cur_subtask_datavars
    }

    // Pre-buffer images
    var trial_images = new ImageBufferClass;
    for (let i_image = start_trial; i_image < image_url_suffix_sequence.length; i_image++){
        let current_suffix = image_url_suffix_sequence[i_image];
        let current_url = image_url_prefix.concat(current_suffix);
        await trial_images.get_by_url(current_url);
    }

    // Begin tracking actions
    var action_recorder = new ActionListenerClass(false, true);

    // Iterate over trials
    var canvases = await initialize_sr_task_canvases(size);

    for (let i_trial = start_trial; i_trial < image_url_suffix_sequence.length; i_trial++){
        // Buffer stimulus
        let current_suffix = image_url_suffix_sequence[i_trial];
        let current_url = image_url_prefix.concat(current_suffix);
        var current_image = await trial_images.get_by_url(current_url);
        await draw_image(canvases['stimulus_canvas'], current_image, size/2, size/2, diameter_pixels);

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
        var timestamp_stimulus = await display_canvas_sequence(_stimulus_seq, _t_seq);

        // Show choices and wait for response
        var choice_outcome = await action_recorder.Promise_get_subject_keypress_response({'f':0, 'j':1}, choice_duration_msec);
        var reaction_time_msec = choice_outcome['t'] - timestamp_stimulus[timestamp_stimulus.length-1];

        // Evaluate choice
        var perf = undefined;

        // Get correct action
        var cur_label = label_sequence[i_trial];

        let correct_action;
        if (label_to_key === 'fj'){
            correct_action = cur_label;
        }
        else if (label_to_key === 'jf'){
            correct_action = 1 - cur_label;
        }
        else{
            correct_action = cur_label;
        }

        // Evaluate subject action
        var action = choice_outcome['actionIndex'];
        if (action === -1){
            // Timed out
            perf = 0
        }
        else if (action === correct_action){
            perf = 1
        }
        else{
            perf = 0
        }

        // Provide visual feedback, and apply a timeout
        if (perf === 0){
            await display_canvas_sequence([canvases['choice_canvas'], canvases['punish_canvas'], canvases['blank_canvas']], [0, punish_duration_msec, 0]);
        }
        else if (perf === 1){
            await display_canvas_sequence([canvases['choice_canvas'], canvases['reward_canvas'], canvases['blank_canvas']], [0, reward_duration_msec, 0]);
        }

        // Record outcomes
        data_vars['perf'].push(perf);
        data_vars['action'].push(action);
        data_vars['stimulus_url_suffix'].push(current_suffix);
        data_vars['label'].push(cur_label);
        data_vars['reaction_time_msec'].push(Math.round(reaction_time_msec));
        data_vars['rel_timestamp_start'].push(Math.round(fixation_outcome['t'])); // The time the subject engaged the fixation button; is relative to the start time of calling this function
        data_vars['rel_timestamp_stimulus_on'].push(Math.round(timestamp_stimulus[1]));
        data_vars['rel_timestamp_stimulus_off'].push(Math.round(timestamp_stimulus[2]));
        data_vars['rel_timestamp_choices_on'].push(Math.round(timestamp_stimulus[timestamp_stimulus.length-1]));
        data_vars['trial_number'].push(i_trial);

        // Checkpoint data vars to local storage
        console.log('Checkpointing', i_trial);
        LocalStorageUtils.store_object_as_json(checkpoint_key, data_vars);
        console.log('Done checkpointing', i_trial);

        // Callback
        await update_hud(perf, usd_per_reward);
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
    return {'coords':coords, 'data_vars':data_vars}
}

async function update_hud(perf, usd_per_reward){
    /*
    A function which is called at the end of every trial.
    It displays the subject's performance, remaining trials, and amount earned.
     */
    var hud_current_trial_count = document.getElementById('hud_total_trials');
    const current_trial_count = parseInt(hud_current_trial_count.innerText);
    hud_current_trial_count.innerHTML = (current_trial_count+1).toString();

    var hud_current_rewards = document.getElementById('hud_total_rewards');
    const current_rewards = parseInt(hud_current_rewards.innerText);
    hud_current_rewards.innerHTML = (current_rewards + perf).toString();

    let current_performance = 0;
    if (current_trial_count > 0){
        current_performance = current_rewards / current_trial_count;
    }

    let next_performance = (current_performance * current_trial_count + perf) / (current_trial_count + 1);

    let hud_current_performance = document.getElementById('hud_current_performance');
    next_performance = Math.round(next_performance * 100).toString();
    if (next_performance.length === 1){
        next_performance = '&nbsp&nbsp'.concat(next_performance);
    }
    else if(next_performance.length === 2){
        next_performance = '&nbsp'.concat(next_performance);
    }
    hud_current_performance.innerHTML = next_performance;

    var hud_current_bonus = document.getElementById('hud_current_bonus');
    let next_bonus = (current_rewards+perf) * (usd_per_reward) * 100;
    next_bonus = (next_bonus).toPrecision(2).toString();
    if(next_bonus.length === 1){
        next_bonus = next_bonus.concat('.0');
    }
    hud_current_bonus.innerHTML = next_bonus;
}


async function provide_session_end(session_data){
    var perf_per_subtask = [];
    for (let i_subtask = 0; i_subtask < session_data.length; i_subtask++){
        let cur_data = session_data[i_subtask];
        perf_per_subtask.push(MathUtils.mean(cur_data['data_vars']['perf']));
    }
    var grand_mean = MathUtils.mean(perf_per_subtask);
    var playspace_size_pixels = infer_canvas_size();
    await congratulations_screen(playspace_size_pixels, grand_mean)
}

async function congratulations_screen(size, mean_perf){
    /*
    Creates and displays a div informing the subject they are finished with the HIT, and they can press "space" to submit.
    size: () of canvas, in units of pixels
    mean_perf: (), from [0, 1]
     */

    let mean_perf_percentage = Math.round(mean_perf * 100);

    var splash1_canvas = create_canvas('splash1_canvas', size, size);
    var font_size = (size * 0.05).toString();
    var font = font_size+'px Times New Roman';

    var total_pbar_width = 0.6;
    var filled_pbar_width = total_pbar_width * (mean_perf);
    await draw_text(splash1_canvas, 'Thank you for your work!', font, 'white', size/2, size * 0.3, 'center');
    await draw_rectangle(splash1_canvas, size*0.5, size * 0.5, size * total_pbar_width, size * 0.15, '#DCDCDC', 1);
    await draw_rectangle(splash1_canvas, size*(1 - total_pbar_width)/2 + size*(filled_pbar_width/2), size * 0.5, size * filled_pbar_width, size * 0.15, '#66ff33', 0.8);
    await draw_text(splash1_canvas, 'Score: '+mean_perf_percentage.toString()+'%', font, 'white', size/2, size * 0.5, 'center');
    await draw_text(splash1_canvas, 'Press space to submit.', font, '#66ff33', size/2, size * 0.65, 'center');

    await display_canvas_sequence([splash1_canvas], [0]);
    var action_recorder = new ActionListenerClass(false, true);

    await timeout(500);
    await action_recorder.Promise_get_subject_keypress_response({' ': 0}, 10000);
    splash1_canvas.remove()
}


async function inter_subtask_splash_screen(size){
    /*
    Displays a series of canvases informing the subject that the current task has ended, and a new one will begin.
    Requires that the subject press "b" to continue, after a timeout.
     */

    var timeout_msec = 3000;

    var splash1_canvas = create_canvas('splash1_canvas', size, size);
    var splash2_canvas = create_canvas('splash2_canvas', size, size);

    var ctx = splash1_canvas.getContext("2d");
    var font = '30px Times New Roman';
    var color = 'white';
    var text_align = 'center';
    var string1 = 'End of current task. A new task will start in 5 seconds.';
    var string2 = 'Press "b" on your keyboard to continue!';
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = text_align;
    ctx.fillText(string1, size/2, size*0.4);

    ctx = splash2_canvas.getContext("2d");
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = text_align;
    ctx.fillText(string1, size/2, size*0.4);

    ctx.font = font;
    ctx.fillStyle = "#66ff33";
    ctx.textAlign = text_align;
    ctx.fillText(string2, size/2, size*0.55);

    set_canvas_level(splash1_canvas, 100);
    await display_canvas_sequence([splash1_canvas, splash2_canvas], [timeout_msec, 0]);
    var action_recorder = new ActionListenerClass(false, true);
    await action_recorder.Promise_get_subject_keypress_response({'b': 0});

    splash1_canvas.remove();
    splash2_canvas.remove();
}


async function initialize_sr_task_canvases(size){
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
    await draw_dot_with_text(canvases['choice_canvas'], 'F', width*0.25, height*0.75, size * 0.1, "white", 1);
    await draw_dot_with_text(canvases['choice_canvas'], 'J', width*0.75, height*0.75, size * 0.1, "white", 1);
    canvases['blank_canvas'] = create_canvas('blank_canvas', width, height);

    return canvases
}

