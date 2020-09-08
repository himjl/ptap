async function run_mts_session(mts_sequence){
    /*
    mts_sequence: Array of Objects, which detail the MTS tasks which will be run in series.

    This function returns a list of returns from "run_mts_trials".

    If a subtask is to fail, for some reason, this function concludes early, and returns the behavioral data for trials
    that have been completed so far. It also attaches the error message which was associated with the error.
     */

    var nsettings = mts_sequence.length;
    var return_values = {'data':[]};

    try {
        for (var i_subtask = 0; i_subtask < nsettings; i_subtask++) {
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

            var cur_session_data = await run_mts_trials(
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
                );
            return_values['data'].push(cur_session_data);
        }

        await provide_session_end(return_values['data'])
    }

    catch(error){
        console.log(error);
        return_values['error'] = error;
    }

    return return_values
}

async function run_mts_trials(
    ntrials,
    image_url_manifest,
    block_manifest,
    block_probabilities,
    stimulus_duration_msec,
    reward_duration_msec,
    punish_duration_msec,
    choice_duration_msec,
    post_stimulus_delay_duration_msec,
    size,
    usd_per_reward,
    ){

    /*
    Core function for getting behavioral data on a binary-SR task from a human subject.

    image_url_manifest: {category: [urls]}
    block_manifest: {block_name: {category:{'matches':[], 'distractors':[]}}}
    block_probabilities: {block_name: float}
    stimulus_duration_msec: ()
    reward_duration_msec: ()
    punish_duration_msec: ()
    choice_duration_msec: ()
    post_stimulus_delay_duration_msec: ()
    size: () in pixels
    usd_per_reward: ()
     */

    // Make a lookup table of {index : category qual_name} and {category qual_name : index}
    const ncategories = Object.keys(image_url_manifest).length;
    var category_index2category = {};
    var category2index = {};

    var _i = 0;
    for (let prop in image_url_manifest) {
        if (Object.prototype.hasOwnProperty.call(image_url_manifest, prop)) {
            // do stuff
            category_index2category[_i] = prop;
            category2index[prop] = _i;
            _i++;
        }
    }

    // Make a lookup table of {index : block qual_name}
    const nblocks = Object.keys(block_manifest).length;
    var block_probs_flat = [];
    var block_names_flat = [];
    for (let prop in block_manifest) {
        if (Object.prototype.hasOwnProperty.call(block_manifest, prop)) {
            // do stuff
            block_probs_flat.push(block_probabilities[prop]);
            block_names_flat.push(prop);
        }
    }

    var diameter_pixels = size * 0.25;
    var session_data = {};
    session_data['perf'] = [];
    session_data['action'] = [];
    session_data['index2category'] = category_index2category;
    session_data['block_names'] = block_names_flat;
    session_data['i_block'] = [];
    session_data['i_stimulus_category'] = [];
    session_data['i_distractor_category'] = [];
    session_data['i_match_category'] = [];

    session_data['i_rel_stimulus_image'] = []; // This index is "relative" to the list image_url_manifest[_current_stimulus_]
    session_data['i_rel_match_image'] = [];
    session_data['i_rel_distractor_image'] = [];

    session_data['reaction_time_msec'] = [];
    session_data['rel_timestamp_start'] = []; // The time the subject engaged the fixation button; is relative to the start time of calling this function
    session_data['rel_timestamp_stimulus_on'] = [];
    session_data['rel_timestamp_stimulus_off'] = [];
    session_data['rel_timestamp_choices_on'] = [];
    session_data['trial_number'] = [];

    var canvases = await initialize_mts_task_canvases(size);
    var image_buffer = new ImageBufferClass;
    var action_recorder = new ActionListenerClass(false, true);

    for (let i_trial = 0; i_trial<ntrials; i_trial++){
        let i_block_cur = MathUtils.multinomial(block_probs_flat);
        let block_cur = block_names_flat[i_block_cur];

        // Sample stimulus category
        let current_block_info = block_manifest[block_cur];
        let stimulus_pool = Object.keys(current_block_info);
        let stimulus_category = MathUtils.random_choice(stimulus_pool);

        // Sample distractor category
        let distractor_pool = current_block_info[stimulus_category]['distractors'];
        let distractor_category = MathUtils.random_choice(distractor_pool);

        // Sample match category
        let match_pool = current_block_info[stimulus_category]['matches'];
        let match_category = MathUtils.random_choice(match_pool);

        // Sample images
        let i_stimulus_rel_cur = Math.floor(Math.random() * image_url_manifest[stimulus_category].length);
        let i_distractor_rel_cur = Math.floor(Math.random() * image_url_manifest[distractor_category].length);
        let i_match_rel_cur = Math.floor(Math.random() * image_url_manifest[match_category].length);

        let stimulus_url_cur = image_url_manifest[stimulus_category][i_stimulus_rel_cur];
        let distractor_url_cur = image_url_manifest[distractor_category][i_distractor_rel_cur];
        let match_url_cur = image_url_manifest[match_category][i_match_rel_cur];

        // Download images
        var current_stimulus_image = await image_buffer.get_by_url(stimulus_url_cur);
        var current_distractor_image = await image_buffer.get_by_url(distractor_url_cur);
        var current_match_image = await image_buffer.get_by_url(match_url_cur);

        // Sample position of the choice images
        var image_left = undefined;
        var image_right = undefined;
        let correct_choice = undefined;
        if (Math.random() < 0.5){
            image_left = current_distractor_image;
            image_right = current_match_image;
            correct_choice = 1;
        }
        else{
            image_left = current_match_image;
            image_right = current_distractor_image;
            correct_choice = 0;
        }

        // Buffer canvases
        await draw_image(canvases['stimulus_canvas'], current_stimulus_image, size/2, size/2, diameter_pixels);
        await draw_image(canvases['choice_canvas'], image_left, size*0.25, size*0.5, diameter_pixels);
        await draw_image(canvases['choice_canvas'], image_right, size*0.75, size*0.5, diameter_pixels);

        // Obtain the initiation action from the subject
        await display_canvas_sequence([canvases['blank_canvas'], canvases['fixation_canvas']], [0, 0]);
        var fixation_outcome = await action_recorder.Promise_get_subject_keypress_response({' ':-1});

        // Display the stimuli
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

        // Get subject response
        var choice_outcome = await action_recorder.Promise_get_subject_keypress_response({'f':0, 'j':1}, choice_duration_msec);
        var reaction_time_msec = choice_outcome['t'] - timestamp_stimulus[timestamp_stimulus.length-1];

        // Evaluate choice
        var perf = undefined;
        var action = choice_outcome['actionIndex'];
        if (action === -1){
            // Timed out
            perf = 0
        }
        else if (action === correct_choice){
            perf = 1
        }
        else{
            perf = 0
        }

        // Provide visual feedback, and apply a timeout
        var timestamp_feedback = undefined;
        if (perf === 0){
            timestamp_feedback = await display_canvas_sequence([canvases['choice_canvas'], canvases['punish_canvas'], canvases['blank_canvas']], [0, punish_duration_msec, 0]);
        }
        else if (perf === 1){
            timestamp_feedback = await display_canvas_sequence([canvases['choice_canvas'], canvases['reward_canvas'], canvases['blank_canvas']], [0, reward_duration_msec, 0]);
        }

        // Record outcomes
        session_data['perf'].push(perf);
        session_data['action'].push(action);
        session_data['i_block'].push(i_block_cur);
        session_data['i_stimulus_category'].push(category2index[stimulus_category]);
        session_data['i_distractor_category'].push(category2index[distractor_category]);
        session_data['i_match_category'].push(category2index[match_category]);

        session_data['i_rel_stimulus_image'].push(i_stimulus_rel_cur); // This index is "relative" to the list image_url_manifest[_current_stimulus_]
        session_data['i_rel_match_image'].push(i_match_rel_cur);
        session_data['i_rel_distractor_image'].push(i_distractor_rel_cur);

        session_data['reaction_time_msec'].push(Math.round(reaction_time_msec));
        session_data['rel_timestamp_start'].push(Math.round(fixation_outcome['t'])); // The time the subject engaged the fixation button; is relative to the start time of calling this function
        session_data['rel_timestamp_stimulus_on'].push(Math.round(timestamp_stimulus[1]));
        session_data['rel_timestamp_stimulus_off'].push(Math.round(timestamp_stimulus[2]));
        session_data['rel_timestamp_choices_on'].push(Math.round(timestamp_stimulus[timestamp_stimulus.length-1]));
        session_data['trial_number'].push(i_trial);

        // Update HUD
        update_hud(perf, usd_per_reward)
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
    delete image_buffer.cache_dict;

    return session_data;
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
    next_bonus = (next_bonus).toPrecision(1).toString();
    if(next_bonus.length === 1){
        next_bonus = next_bonus.concat('.0');
    }
    hud_current_bonus.innerHTML = next_bonus;
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

    // Create choice canvas
    canvases['choice_canvas'] = create_canvas('choice_canvas', width, height);
    let letter_cue_size_px = 0.05 * width;
    letter_cue_size_px =  Math.max(5, Math.round(letter_cue_size_px));

    let letter1_x = 0.25 * width;
    let letter1_y = 0.65 * height;
    let letter2_x = 0.75 * width;
    let letter2_y = 0.65 * height;

    //await draw_rectangle(canvases['choice_canvas'], letter1_x, letter1_y, letter_cue_size_px, letter_cue_size_px, 'black', 0.8);
    //await draw_rectangle(canvases['choice_canvas'], letter2_x, letter2_y, letter_cue_size_px, letter_cue_size_px, 'black', 0.8);
    let font = (letter_cue_size_px * 0.7).toString() + "px Arial";
    await draw_text(canvases['choice_canvas'], 'F', font, '#D1D0CE', letter1_x, letter1_y, 'center');
    await draw_text(canvases['choice_canvas'], 'J', font, '#D1D0CE', letter2_x, letter2_y, 'center');

    // Create blank canvas
    canvases['blank_canvas'] = create_canvas('blank_canvas', width, height);

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


    return canvases
}

