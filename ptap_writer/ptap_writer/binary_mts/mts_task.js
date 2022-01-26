async function run_mts_blocks(block_sequence){

    let nblocks = block_sequence.length;
    let return_values = {'data':[]};
    let triggered_early_session_end = false;
    try {
        for (let i_block = 0; i_block < nblocks; i_block++) {
            const cur_block = block_sequence[i_block];

            let cur_session_data = await run_binary_mts_trials(
                cur_block['stimulus_url_sequence'],
                cur_block['choice0_url_sequence'],
                cur_block['choice1_url_sequence'],
                cur_block['give_feedback_sequence'],
                cur_block['ground_truth_choice_sequence'],
                cur_block['stimulus_duration_msec'],
                cur_block['reward_duration_msec'],
                cur_block['punish_duration_msec'],
                cur_block['choice_duration_msec'],
                cur_block['minimal_choice_duration_msec'],
                cur_block['post_stimulus_delay_duration_msec'],
                cur_block['intertrial_delay_duration_msec'],
                cur_block['inter_choice_presentation_delay_msec'],
                cur_block['pre_choice_lockout_delay_duration_msec'],
                cur_block['min_gt_performance_for_bonus'],
                cur_block['max_bonus_usd'],
                cur_block['block_name'],
                cur_block['query_string'],
            );

            // Push data to return values
            return_values['data'].push(cur_session_data);

            // Update bonus earned
            let perf_seq = cur_session_data['data_vars']['ground_truth_perf']
            let max_bonus_usd = Math.max(cur_block['max_bonus_usd'], 0);
            let min_performance_for_bonus = Math.max(cur_block['min_gt_performance_for_bonus'], 0);

            let ntrials = 0;
            let gt_ncorrect = 0;

            for (let i_trial = 0; i_trial < perf_seq.length; i_trial++){
                if (perf_seq[i_trial] !== -1){
                    ntrials = ntrials + 1
                    gt_ncorrect = gt_ncorrect + perf_seq[i_trial]
                }

            }
            let perf_subtask = gt_ncorrect / ntrials
            let bonus_usd_earned_subtask = (max_bonus_usd / (1-min_performance_for_bonus)) * (perf_subtask - min_performance_for_bonus)
            bonus_usd_earned_subtask = Math.max(bonus_usd_earned_subtask, 0)
            session_bonus_tracker.add_bonus(bonus_usd_earned_subtask);
            session_bonus_tracker.add_block_gt_performance(gt_ncorrect, ntrials);
        }

        let playspace_size_pixels = infer_canvas_size();
        // Congratulate worker on successful completion
        if (triggered_early_session_end === false){
            await congratulations_screen(playspace_size_pixels)
        }
    }

    catch(error){
        console.log(error);
        return_values['error'] = error;
    }

    return return_values
}



async function run_binary_mts_trials(
    stimulus_url_sequence,
    choice0_url_sequence,
    choice1_url_sequence,
    give_feedback_sequence,
    ground_truth_choice_sequence,
    stimulus_duration_msec,
    reward_duration_msec,
    punish_duration_msec,
    choice_duration_msec,
    minimal_choice_duration_msec,
    post_stimulus_delay_duration_msec,
    intertrial_delay_duration_msec,
    inter_choice_presentation_delay_msec,
    pre_choice_lockout_delay_duration_msec,
    min_gt_performance_for_bonus,
    max_bonus_usd,
    block_name,
    query_string,
){
    const size = infer_canvas_size();

    /*
    Core function for getting behavioral data on a series of 2AFC trials from a human subject.

    image_url_prefix, String
    image_url_suffix_sequence, [t]
    choice0_url_suffix_sequence,  [t]
    choice1_url_suffix_sequence,  [t]
    rewarded_choice_sequence, [t]. If an entry is -1, no choice is given a reward.
    ground_truth_choice_sequence, [t]. If an entry is -1, the choice does not affect the hidden performance tracker.
    stimulus_duration_msec,
    reward_duration_msec, . If zero, no reward feedback is given.
    punish_duration_msec, . If zero, no punish feedback is given.
    choice_duration_msec, . Max choice time
    minimal_choice_duration_msec, . Imposes a delay until this much time has elapsed. Triggers a GUI element showing the remaining time a choice is made.
    post_stimulus_delay_duration_msec, . The amount of time before the choices pop up.
    max_bonus_usd, Float
    min_gt_performance_for_bonus, Float
    size, () in pixels
    block_name, String

    Returns {'coords':coords, 'data_vars':data_vars}
     */

    var diameter_pixels = size * 0.25;
    var coords = {};
    coords['stimulus_duration_msec'] = stimulus_duration_msec;
    coords['reward_duration_msec'] = reward_duration_msec;
    coords['punish_duration_msec'] = punish_duration_msec;
    coords['choice_duration_msec'] = choice_duration_msec;
    coords['minimal_choice_duration_msec'] = minimal_choice_duration_msec;
    coords['post_stimulus_delay_duration_msec'] = post_stimulus_delay_duration_msec;
    coords['intertrial_delay_duration_msec'] = intertrial_delay_duration_msec;
    coords['playspace_size_px'] = size;
    coords['block_name'] = block_name;
    coords['min_gt_performance_for_bonus'] = min_gt_performance_for_bonus;
    coords['max_bonus_usd'] = max_bonus_usd;
    coords['timestamp_session_start'] = performance.timing.navigationStart;
    coords['image_diameter_pixels'] = diameter_pixels;

    const [hcur, wcur] = get_screen_dims();
    coords['screen_height_px'] = hcur;
    coords['screen_width_px'] = wcur;
    coords['device_pixel_ratio'] = window.devicePixelRatio || 1;

    var data_vars = {};
    data_vars['choice'] = []; // -1 = timed out, 0 = chose choice0; 1 = chose choice 1
    data_vars['action'] = []; // -1 = timed out, 0 = left, 1 = right
    data_vars['stimulus_url'] = [];
    data_vars['reinforcement'] = [];
    data_vars['ground_truth_perf'] = [];
    data_vars['choice0_url'] = [];
    data_vars['choice1_url'] = [];
    data_vars['choice0_location'] = []; // 0 = left, 1 = right
    data_vars['reaction_time_msec'] = [];
    data_vars['rel_timestamp_start'] = []; // The time the subject engaged the fixation button; is relative to the start time of calling this function
    data_vars['rel_timestamp_stimulus_on'] = [];
    data_vars['rel_timestamp_stimulus_off'] = [];
    data_vars['rel_timestamp_choices_on'] = [];
    data_vars['trial_number'] = [];


    // Resume task if there is checkpoint data
    let cur_subtask_datavars = {};

    // If there is savedata, load it, and set the data_vars
    let start_trial = 0;
    let early_exit_satisfied = false;
    if (cur_subtask_datavars['reinforcement'] != null) {
        start_trial = cur_subtask_datavars['reinforcement'].length;
        data_vars = cur_subtask_datavars;

        for (let i_trial = 0; i_trial < start_trial; i_trial++) {
            let cur_perf = cur_subtask_datavars['reinforcement'][i_trial];

            MTS_Session_HUD.increment_ntrials();
            // Increment online performance metrics
            let criterion_is_met = performance_tracker.check_satisfied(cur_perf);
            if (criterion_is_met === true) {
                early_exit_satisfied = true;
            }
        }
    }

    // Pre-buffer images
    var trial_images = new ImageBufferClass;
    let all_urls = [];

    for (let i_image = start_trial; i_image < stimulus_url_sequence.length; i_image++){

        let stim_url = stimulus_url_sequence[i_image];
        let c0_url = choice0_url_sequence[i_image];
        let c1_url = choice1_url_sequence[i_image];

        all_urls.push(stim_url);
        all_urls.push(c0_url);
        all_urls.push(c1_url)
    }
    all_urls = [... new Set(all_urls)];

    document.getElementById('downloading_images_splash').style.visibility = 'visible';
    await trial_images.buffer_urls(all_urls);
    document.getElementById('downloading_images_splash').style.visibility = 'hidden';
    // Begin tracking actions
    let action_recorder = new ActionListenerClass(true, true);

    // Initialize canvases
    let canvases = await initialize_mts_task_canvases(size);

    // Iterate over trials
    for (let i_trial = start_trial; i_trial < stimulus_url_sequence.length; i_trial++){

        // Buffer stimulus
        let current_stimulus_url = stimulus_url_sequence[i_trial];
        let c0_url = choice0_url_sequence[i_trial];
        let c1_url = choice1_url_sequence[i_trial];
        let ground_truth_correct_choice = ground_truth_choice_sequence[i_trial];
        // Buffer stimulus image
        let current_stimulus_image = await trial_images.get_by_url(current_stimulus_url);
        await draw_image(canvases['stimulus_canvas'], current_stimulus_image, size/2, size/2, diameter_pixels);

        // Buffer choice images
        let current_c0_image = await trial_images.get_by_url(c0_url);
        let current_c1_image = await trial_images.get_by_url(c1_url);
        let choice_y_px = size * 1/2;
        let choice_left_px = size * 1/5;
        let choice_right_px = size * 4/5;
        let choice_diameter_px = diameter_pixels;
        // Randomly assign the position of the two choices
        let choice0_location = 0; // Choice0 goes on left side
        if (Math.random() <= 0.5){
            choice0_location = 1 // Choice0 goes on right side
        }

        console.log(choice0_location)
        // Buffer first choice frame with either the left choice or right choice
        if (Math.random() <= 0.5){
            // Draw left side first
            let left_image = current_c0_image
            if (choice0_location === 1){
                left_image = current_c1_image
            }
            await draw_image(canvases['choice_canvas_frame0'], left_image, choice_left_px, choice_y_px, choice_diameter_px);
        }
        else {
            // Draw right side first
            let right_image = current_c0_image
            if (choice0_location === 0){
                right_image = current_c1_image
            }
            await draw_image(canvases['choice_canvas_frame0'], right_image, choice_right_px, choice_y_px, choice_diameter_px);
        }

        // Buffer second choice frame
        await draw_image(canvases['choice_canvas_frame1'], current_c0_image, choice_left_px * (1 - choice0_location) + choice_right_px * (choice0_location), choice_y_px, choice_diameter_px);
        await draw_image(canvases['choice_canvas_frame1'], current_c1_image, choice_left_px * (choice0_location) + choice_right_px * (1 - choice0_location), choice_y_px, choice_diameter_px);


        // Buffer final choice frame
        await draw_image(canvases['choice_canvas_frame2'], current_c0_image, choice_left_px * (1 - choice0_location) + choice_right_px * (choice0_location), choice_y_px, choice_diameter_px);
        await draw_image(canvases['choice_canvas_frame2'], current_c1_image, choice_left_px * (choice0_location) + choice_right_px * (1 - choice0_location), choice_y_px, choice_diameter_px);
        // Write query string
        if (query_string != null) {
            if (query_string.length > 0) {
                await write_text(canvases['choice_canvas_frame2'], query_string, size * 0.5, size * 0.5, size * 0.7, 'white')
            }
        }

        // Get screen parameters
        const cur_rect = canvases['choice_canvas_frame0'].getBoundingClientRect()
        const left_bound_px = cur_rect.left;
        const top_bound_px = cur_rect.top;

        // Run trial initiation
        await display_canvas_sequence([canvases['blank_canvas'], canvases['fixation_canvas']], [0, 0]);
        //var fixation_outcome = await action_recorder.Promise_get_subject_keypress_response({' ':-1});
        const fixation_region_info = [
            {
                'xcenter_px': 0.5 * size,
                'ycenter_px': size * 3/4,
                'radius_px': size * 0.1,
                'action_index':0,
            },
        ];

        let fixation_outcome = await action_recorder.Promise_get_subject_mouseclick_response(fixation_region_info, -1, left_bound_px, top_bound_px);

        // Run stimulus
        let _stimulus_seq = [canvases['fixation_canvas'], canvases['stimulus_canvas']];
        let _t_seq = [0, stimulus_duration_msec];


        if (post_stimulus_delay_duration_msec > 0){
            // Insert delay before showing choices
            _stimulus_seq.push(canvases['blank_canvas']);
            _t_seq.push(post_stimulus_delay_duration_msec);// inter_choice_presentation_delay_msec, inter_choice_presentation_delay_msec + pre_choice_lockout_delay_duration_msec, 0]
        }


        if (inter_choice_presentation_delay_msec > 0){
            // Add two separate choice screens, implementing a delayed draw for the second choice
            _stimulus_seq.push(... [canvases['choice_canvas_frame0'], canvases['choice_canvas_frame1']]);
            _t_seq.push(...[inter_choice_presentation_delay_msec, inter_choice_presentation_delay_msec + pre_choice_lockout_delay_duration_msec]);
        }
        else {
            _stimulus_seq.push(canvases['choice_canvas_frame1']);
            _t_seq.push(pre_choice_lockout_delay_duration_msec);
        }

        // Add text query pop up
        _stimulus_seq.push(canvases['choice_canvas_frame2']);
        _t_seq.push(0);

        let timestamp_stimulus = await display_canvas_sequence(_stimulus_seq, _t_seq);

        const regions_info = [
            {
                'xcenter_px': choice_left_px,
                'ycenter_px': choice_y_px,
                'radius_px': choice_diameter_px/2,
                'action_index':0,
            },
            {
                'xcenter_px': choice_right_px,
                'ycenter_px': choice_y_px,
                'radius_px': choice_diameter_px/2,
                'action_index':1,
            }
        ];

        let choice_outcome = await action_recorder.Promise_get_subject_mouseclick_response(regions_info, choice_duration_msec, left_bound_px, top_bound_px);

        // Get reaction time
        let reaction_time_msec = choice_outcome['t'] - timestamp_stimulus[timestamp_stimulus.length-1];
        // Evaluate subject action
        let action = choice_outcome['actionIndex'];
        if (action !== -1){
            // Draw rectangle around choice
            await draw_border(canvases['choice_canvas_frame2'], choice_left_px * (1 - action) + choice_right_px * (action), choice_y_px, width_pixels = diameter_pixels, diameter_pixels, 10, 'darkgray')
            await timeout(50)
        }

        let choice =  -1;
        if (action !== -1){
            choice = Number(( action || choice0_location ) && !( action && choice0_location ))
        }

        let reinforcement = -1;

        // Timed out, always punish
        if (action === -1){
            reinforcement = 0
        }

        // Apply reinforcement rule for this trial
        let give_feedback = give_feedback_sequence[i_trial]
        if (give_feedback > 0) {
            if (choice === ground_truth_correct_choice) {
                reinforcement = 1;
            } else {
                reinforcement = 0;
            }
        }

        // Log the ground-truth performance
        let ground_truth_perf = -1;
        if (ground_truth_correct_choice !== -1){
            if (choice === ground_truth_correct_choice){
                ground_truth_perf = 1;
            }
            else{
                ground_truth_perf = 0;
            }
        }

        MTS_Session_HUD.increment_ntrials();

        // Provide visual feedback, and apply a timeout
        if (reinforcement === 0){
            await display_canvas_sequence([canvases['choice_canvas_frame2'], canvases['punish_canvas'], canvases['blank_canvas']], [0, punish_duration_msec, 0]);
        }
        else if (reinforcement === 1){
            if(reward_duration_msec > 0){
                await display_canvas_sequence([canvases['choice_canvas_frame2'], canvases['reward_canvas'], canvases['blank_canvas']], [0, reward_duration_msec, 0]);
            }
            else{
                // No reward duration
                await display_canvas_sequence([canvases['choice_canvas_frame2'], canvases['blank_canvas']], [0, 0]);
            }
        }
        else {
            await display_canvas_sequence([canvases['choice_canvas_frame2'], canvases['blank_canvas']], [0, 0]);
        }

        // Trigger await for the rest of the trial, if minimal_choice_duration_msec has not elapsed
        if (reaction_time_msec < minimal_choice_duration_msec){
            await timeout(minimal_choice_duration_msec - reaction_time_msec);
        }

        // Apply constant intertrial wait
        await timeout(intertrial_delay_duration_msec);

        data_vars['choice'].push(choice); // 0 = chose choice0; 1 = chose choice 1
        data_vars['action'].push(action); // 0 = left, 1 = right
        data_vars['stimulus_url'].push(current_stimulus_url);
        data_vars['choice0_url'].push(c0_url);
        data_vars['choice1_url'].push(c1_url);
        data_vars['choice0_location'].push(choice0_location); // 0 = left, 1 = right
        data_vars['reaction_time_msec'].push(Math.round(reaction_time_msec));
        data_vars['rel_timestamp_start'].push(Math.round(fixation_outcome['t'])); // The time the subject engaged the fixation button; is relative to the start time of calling this function
        data_vars['rel_timestamp_stimulus_on'].push(Math.round(timestamp_stimulus[1]));
        data_vars['rel_timestamp_stimulus_off'].push(Math.round(timestamp_stimulus[2]));
        data_vars['rel_timestamp_choices_on'].push(Math.round(timestamp_stimulus[timestamp_stimulus.length-1]));
        data_vars['trial_number'].push(i_trial);
        data_vars['reinforcement'].push(reinforcement);
        data_vars['ground_truth_perf'].push(ground_truth_perf);

        // Clear canvases
        await clear_canvas(canvases['stimulus_canvas']);
        await clear_canvas(canvases['choice_canvas_frame0']);
        await clear_canvas(canvases['choice_canvas_frame1']);
        await clear_canvas(canvases['choice_canvas_frame2']);
    }

    // Delete canvases
    canvases['fixation_canvas'].remove();
    canvases['stimulus_canvas'].remove();
    canvases['reward_canvas'].remove();
    canvases['punish_canvas'].remove();
    canvases['choice_canvas_frame0'].remove();
    canvases['choice_canvas_frame1'].remove();
    canvases['choice_canvas_frame2'].remove();
    canvases['blank_canvas'].remove();

    // Remove event listeners from window
    action_recorder.close_listeners();
    delete trial_images.cache_dict;
    return {'coords':coords, 'data_vars':data_vars}
}


async function congratulations_screen(size){
    /*
    Creates and displays a div informing the subject they are finished with the HIT, and they can press "space" to submit.
    Also informs them of their bonus
    size: () of canvas, in units of pixels
    mean_perf: (), from [0, 1]
     */

    var splash1_canvas = create_canvas('splash1_canvas', size, size);
    var font_size = (size * 0.04).toString();
    var font = font_size+'px Times New Roman';

    let bonus_usd_earned = Math.round(session_bonus_tracker.bonus_usd_earned*100) / 100;
    let gt_nobs_total = session_bonus_tracker.ntrials_total;
    await draw_text(splash1_canvas, 'Thank you for your work!', font, 'white', size/2, size * 0.3, 'center');

    if (gt_nobs_total > 0){

        let total_pbar_width = 0.6;
        //let mean_perf = gt_ncorrect_total / gt_nobs_total;
        //let filled_pbar_width = Math.max(0, total_pbar_width * (2 * mean_perf - 1));

        await draw_rectangle(splash1_canvas, size*0.5, size * 0.5, size * total_pbar_width, size * 0.15, '#DCDCDC', 1);
        //await draw_rectangle(splash1_canvas, size*(1 - total_pbar_width)/2 + size*(filled_pbar_width/2), size * 0.5, size * filled_pbar_width, size * 0.15, '#66ff33', 0.8);
        if (bonus_usd_earned > 0.0){
            await draw_text(splash1_canvas, 'Bonus earned: $'+bonus_usd_earned.toString()+'', font, 'black', size/2, size * 0.5, 'center');
        }
        else{
            await draw_text(splash1_canvas, 'No bonus', font, 'white', size/2, size * 0.5, 'center');
        }
    }


    await timeout(2000);
    await draw_text(splash1_canvas, 'Press space to submit.', font, '#66ff33', size/2, size * 0.65, 'center');

    await display_canvas_sequence([splash1_canvas], [0]);
    var action_recorder = new ActionListenerClass(false, true);

    await action_recorder.Promise_get_subject_keypress_response({' ': 0}, 10000);
    splash1_canvas.remove()
}


async function initialize_mts_task_canvases(size){
    var width = size;
    var height = size;
    var canvases = {};

    // Create fixation canvas
    canvases['fixation_canvas'] = create_canvas('fixation_canvas', width, height);
    await draw_dot_with_text(canvases['fixation_canvas'], 'Click to start', width*0.5, height*0.75, size * 0.1, "white", 1);
    await draw_dot_with_text(canvases['fixation_canvas'], '', width*0.5, height*0.5, Math.max(10, size * 0.01), "black", 1);
    // Create stimulus canvas
    canvases['stimulus_canvas'] = create_canvas('stimulus_canvas', width, height);

    // Create reward canvas (green square)
    canvases['reward_canvas'] = create_canvas('reward_canvas', width, height);
    await draw_rectangle(
        canvases['reward_canvas'],
        width * 0.5,
        height *0.5,
        width *  1/4,
        height * 1/4,
        "#00cc00",
        0.5);

    // Create punish canvas (black square)
    canvases['punish_canvas'] = create_canvas('punish_canvas', width, height);
    await draw_rectangle(
        canvases['punish_canvas'],
        width * 0.5,
        height*0.5,
    width * 1/4,
        height * 1/4,
        "black",
        0.8);

    // Create choice canvas
    canvases['choice_canvas_frame0'] = create_canvas('choice_canvas_frame0', width, height);
    canvases['choice_canvas_frame1'] = create_canvas('choice_canvas_frame1', width, height);
    canvases['choice_canvas_frame2'] = create_canvas('choice_canvas_frame2', width, height);

    canvases['blank_canvas'] = create_canvas('blank_canvas', width, height);

    return canvases
}

