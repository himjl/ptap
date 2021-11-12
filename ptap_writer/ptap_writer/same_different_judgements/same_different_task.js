async function run_same_different_trials(trial_sequence) {

    let return_values = {};
    try {
        let playspace_size_pixels = infer_canvas_size();

        return_values['data'] = await execute_sd_trials(
            trial_sequence['image_url_prefix'],
            trial_sequence['frame_info_sequence'],
            trial_sequence['ground_truth_correct_choice_sequence'],
            trial_sequence['choice0_url_suffix_sequence'],
            trial_sequence['choice1_url_suffix_sequence'],
            trial_sequence['rewarded_choice_sequence'],
            trial_sequence['reward_duration_msec'],
            trial_sequence['punish_duration_msec'],
            trial_sequence['choice_duration_msec'],
            trial_sequence['minimal_choice_duration_msec'],
            trial_sequence['post_stimulus_delay_duration_msec'],
            trial_sequence['intertrial_delay_duration_msec'],
            trial_sequence['inter_choice_presentation_delay_msec'],
            trial_sequence['pre_choice_lockout_delay_duration_msec'],
            trial_sequence['minimal_gt_performance_for_bonus'],
            trial_sequence['pseudo_usd_per_gt_correct'],
            trial_sequence['query_string'],
            playspace_size_pixels
        );

        // Increment bonus earned (for HUD use)
        let block_ground_truth_perf_seq = cur_session_data['data_vars']['ground_truth_perf'];
        let block_minimal_gt_performance_for_bonus = cur_session_data['coords']['minimal_gt_performance_for_bonus'];
        let block_pseudo_usd_per_gt_correct = cur_session_data['coords']['pseudo_usd_per_gt_correct'];
        let perf_on_trials_with_gt = [];
        for (let _i = 0; _i < block_ground_truth_perf_seq.length; _i++) {
            const cur = block_ground_truth_perf_seq[_i];
            if (cur !== -1) {
                perf_on_trials_with_gt.push(cur);
            }
        }
        let gt_ncorrect = MathUtils.sum(perf_on_trials_with_gt);
        let gt_nobs = perf_on_trials_with_gt.length;
        let gt_perf = gt_ncorrect / gt_nobs;
        let block_bonus_amount_usd = 0;
        if (gt_perf >= block_minimal_gt_performance_for_bonus) {

            block_bonus_amount_usd = block_pseudo_usd_per_gt_correct * (gt_perf - block_minimal_gt_performance_for_bonus) / (1 - block_minimal_gt_performance_for_bonus) * (gt_ncorrect);
            block_bonus_amount_usd = Math.max(block_bonus_amount_usd, 0);
        }
        session_bonus_tracker.add_bonus(block_bonus_amount_usd);
        session_bonus_tracker.add_block_gt_performance(gt_ncorrect, gt_nobs);
        playspace_size_pixels = infer_canvas_size();
        await congratulations_screen(playspace_size_pixels);
    } catch (error) {
        console.log(error);
        return_values['error'] = error;
    }

    return return_values
}


async function execute_sd_trials(
    image_url_prefix,
    frame_info_sequence, // [{'frame_image_url_suffix_sequence':[], 'frame_image_duration_msec_sequence':[]}]
    ground_truth_correct_choice_sequence,
    choice0_url_suffix_sequence,
    choice1_url_suffix_sequence,
    rewarded_choice_sequence,
    reward_duration_msec,
    punish_duration_msec,
    choice_duration_msec,
    minimal_choice_duration_msec,
    post_stimulus_delay_duration_msec,
    intertrial_delay_duration_msec,
    inter_choice_presentation_delay_msec,
    pre_choice_lockout_delay_duration_msec,
    minimal_gt_performance_for_bonus,
    pseudo_usd_per_gt_correct,
    query_string,
    size,
) {

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
    pseudo_usd_per_gt_correct, Float
    size, () in pixels
    block_name, String
    checkpoint_key: String which is used as a key for LocalStorage

    Returns {'coords':coords, 'data_vars':data_vars, 'meta':meta}
     */

    let diameter_pixels = size * 0.25;
    let choice_diameter_px = size * 0.15;
    let choice_y_px = size * 3 / 4;
    let choice_left_px = size * 1 / 4;
    let choice_right_px = size * 3 / 4;

    let coords = {};

    coords['ntrials_requested'] = frame_info_sequence.length;
    coords['url_prefix'] = image_url_prefix;
    coords['reward_duration_msec'] = reward_duration_msec;
    coords['punish_duration_msec'] = punish_duration_msec;
    coords['choice_duration_msec'] = choice_duration_msec;
    coords['minimal_choice_duration_msec'] = minimal_choice_duration_msec;
    coords['post_stimulus_delay_duration_msec'] = post_stimulus_delay_duration_msec;
    coords['intertrial_delay_duration_msec'] = intertrial_delay_duration_msec;
    coords['playspace_size_px'] = size;
    coords['minimal_gt_performance_for_bonus'] = minimal_gt_performance_for_bonus;
    coords['pseudo_usd_per_gt_correct'] = pseudo_usd_per_gt_correct;
    coords['timestamp_session_start'] = performance.timing.navigationStart;
    coords['image_diameter_pixels'] = diameter_pixels;

    const [hcur, wcur] = get_screen_dims();
    coords['screen_height_px'] = hcur;
    coords['screen_width_px'] = wcur;
    coords['device_pixel_ratio'] = window.devicePixelRatio || 1;

    let data_vars = {};
    data_vars['i_choice'] = []; // -1 = timed out, 0 = chose choice0; 1 = chose choice 1
    data_vars['i_motor_action'] = []; // -1 = timed out, 0 = left, 1 = right
    data_vars['stimulus_id_suffix_form'] = []; // -1 = timed out, 0 = left, 1 = right
    data_vars['reinforcement'] = [];
    data_vars['ground_truth_perf'] = [];
    data_vars['choice0_url_suffix'] = [];
    data_vars['choice1_url_suffix'] = [];
    data_vars['choice0_location'] = []; // 0 = left, 1 = right
    data_vars['reaction_time_msec'] = [];
    data_vars['rel_timestamp_start'] = []; // The time the subject engaged the fixation button; is relative to the start time of calling this function
    data_vars['rel_timestamp_stimulus_on'] = [];
    data_vars['rel_timestamp_stimulus_off'] = [];
    data_vars['rel_timestamp_choices_on'] = [];
    data_vars['trial_number'] = [];

    // Pre-buffer images
    let trial_images = new ImageBufferClass;
    let all_urls = [];
    let max_frames = 0;
    for (let i_trial = 0; i_trial < frame_info_sequence.length; i_trial++) {
        let cur_frame_info = frame_info_sequence[i_trial];
        let cur_suffixes = cur_frame_info['stimulus_frame_url_suffix_sequence'];
        if (cur_suffixes.length > max_frames) {
            max_frames = cur_suffixes.length;
        }
        for (let i_suffix = 0; i_suffix < cur_suffixes.length; i_suffix++) {
            let cur_suffix = cur_suffixes[i_suffix];
            all_urls.push(image_url_prefix.concat(cur_suffix));
        }
    }

    let is_correct_image_url = 'https://s3.amazonaws.com/samedifferentbehavior/task_assets/feedback_is_correct_image.png';
    let is_incorrect_image_url = 'https://s3.amazonaws.com/samedifferentbehavior/task_assets/feedback_is_incorrect_image.png';

    all_urls.push(is_correct_image_url);
    all_urls.push(is_incorrect_image_url);
    all_urls = [...new Set(all_urls)];

    document.getElementById('downloading_images_splash').style.visibility = 'visible';
    await trial_images.buffer_urls(all_urls);
    document.getElementById('downloading_images_splash').style.visibility = 'hidden';
    // Begin tracking actions
    let action_recorder = new ActionListenerClass(true, true);

    // Initialize canvases
    let canvases = await initialize_same_different_task_canvases(size, max_frames);

    // Draw reward / punish pictures
    let reward_image = await trial_images.get_by_url(is_correct_image_url);
    let punish_image = await trial_images.get_by_url(is_incorrect_image_url);

    await draw_image(canvases['reward_canvas'], reward_image, size / 2, size / 2, diameter_pixels);
    await draw_image(canvases['punish_canvas'], punish_image, size / 2, size / 2, diameter_pixels);
    // Iterate over trials
    for (let i_trial = 0; i_trial < frame_info_sequence.length; i_trial++) {

        // Buffer stimulus sequence frames
        let cur_frame_info = frame_info_sequence[i_trial];
        let cur_image_url_suffix_sequence = cur_frame_info['stimulus_frame_url_suffix_sequence'];
        let cur_image_dur_msec_sequence = cur_frame_info['stimulus_frame_duration_msec_sequence'];

        let _trial_canvas_seq = [];
        let _trial_frame_dur_seq = [];
        let frame_id_sequence = [];
        for (let i_frame = 0; i_frame < cur_image_url_suffix_sequence.length; i_frame++) {
            let cur_frame_duration_msec = cur_image_dur_msec_sequence[i_frame];
            let cur_frame_image_url_suffix = cur_image_url_suffix_sequence[i_frame];

            if (cur_frame_duration_msec <= 0) {
                // Do not bother drawing this frame
                continue
            }

            let cur_frame_url = image_url_prefix.concat(cur_frame_image_url_suffix);
            let current_frame_image = await trial_images.get_by_url(cur_frame_url);
            let canvas_frame_string = ['stimulus_frame', i_frame.toString(), '_canvas'].join('');
            await draw_image(canvases[canvas_frame_string], current_frame_image, size / 2, size / 2, diameter_pixels);

            _trial_canvas_seq.push(canvases[canvas_frame_string]);
            _trial_frame_dur_seq.push(cur_image_dur_msec_sequence[i_frame]);
            let cur_frame_id = [cur_frame_image_url_suffix, ' - ', cur_frame_duration_msec.toString()].join('');
            frame_id_sequence.push(cur_frame_id);
        }

        let cur_stimulus_id_suffix_form = frame_id_sequence.join(' | ');

        let reinforced_choice = rewarded_choice_sequence[i_trial];
        let ground_truth_choice = ground_truth_correct_choice_sequence[i_trial];

        // Buffer choice images
        let current_c0_suffix = choice0_url_suffix_sequence[i_trial];
        let current_c1_suffix = choice1_url_suffix_sequence[i_trial];
        let c0_url = image_url_prefix.concat(current_c0_suffix);
        let c1_url = image_url_prefix.concat(current_c1_suffix);
        let current_c0_image = await trial_images.get_by_url(c0_url);
        let current_c1_image = await trial_images.get_by_url(c1_url);

        // Randomly assign the position of the two choices
        let choice0_location = 0; // Choice0 goes on left side
        //if (Math.random() <= 0.5){
        //    choice0_location = 1 // Choice0 goes on right side
        //}

        // Buffer first choice frame with either the left choice or right choice
        if (Math.random() <= 0.5) {
            // Draw left side first
            let left_image = current_c0_image;
            if (choice0_location === 1) {
                left_image = current_c1_image
            }
            await draw_image(canvases['choice_canvas_frame0'], left_image, choice_left_px, choice_y_px, choice_diameter_px);
        } else {
            // Draw right side first
            let right_image = current_c0_image;
            if (choice0_location === 0) {
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
        const cur_rect = canvases['choice_canvas_frame0'].getBoundingClientRect();
        const left_bound_px = cur_rect.left;
        const top_bound_px = cur_rect.top;

        // Run trial initiation
        await display_canvas_sequence([canvases['blank_canvas'], canvases['fixation_canvas']], [0, 0]);
        //var fixation_outcome = await action_recorder.Promise_get_subject_keypress_response({' ':-1});
        const fixation_region_info = [
            {
                'xcenter_px': 0.5 * size,
                'ycenter_px': size * 3 / 4,
                'radius_px': size * 0.1,
                'action_index': 0,
            },
        ];

        let fixation_outcome = await action_recorder.Promise_get_subject_mouseclick_response(fixation_region_info, -1, left_bound_px, top_bound_px);

        // Run stimulus

        if (post_stimulus_delay_duration_msec > 0) {
            // Insert delay before showing choices
            _trial_canvas_seq.push(canvases['blank_canvas']);
            _trial_frame_dur_seq.push(post_stimulus_delay_duration_msec);// inter_choice_presentation_delay_msec, inter_choice_presentation_delay_msec + pre_choice_lockout_delay_duration_msec, 0]
        }

        if (inter_choice_presentation_delay_msec > 0) {
            // Add two separate choice screens, implementing a delayed draw for the second choice
            _trial_canvas_seq.push(...[canvases['choice_canvas_frame0'], canvases['choice_canvas_frame1']]);
            _trial_frame_dur_seq.push(...[inter_choice_presentation_delay_msec, inter_choice_presentation_delay_msec + pre_choice_lockout_delay_duration_msec]);
        } else {
            _trial_canvas_seq.push(canvases['choice_canvas_frame1']);
            _trial_frame_dur_seq.push(pre_choice_lockout_delay_duration_msec);
        }

        // Add text query pop up
        _trial_canvas_seq.push(canvases['choice_canvas_frame2']);
        _trial_frame_dur_seq.push(0);

        let timestamp_stimulus = await display_canvas_sequence(_trial_canvas_seq, _trial_frame_dur_seq);

        const regions_info = [
            {
                'xcenter_px': choice_left_px,
                'ycenter_px': choice_y_px,
                'radius_px': choice_diameter_px / 2,
                'action_index': 0,
            },
            {
                'xcenter_px': choice_right_px,
                'ycenter_px': choice_y_px,
                'radius_px': choice_diameter_px / 2,
                'action_index': 1,
            }
        ];

        console.log(choice_duration_msec, left_bound_px, top_bound_px)
        let choice_outcome = await action_recorder.Promise_get_subject_mouseclick_response(regions_info, choice_duration_msec, left_bound_px, top_bound_px);

        // Get reaction time
        let reaction_time_msec = choice_outcome['t'] - timestamp_stimulus[timestamp_stimulus.length - 1];
        // Evaluate subject action
        let action = choice_outcome['actionIndex'];
        if (action !== -1) {
            // Draw rectangle around choice
            await draw_border(canvases['choice_canvas_frame2'], choice_left_px * (1 - action) + choice_right_px * (action), choice_y_px, diameter_pixels, diameter_pixels, 10, 'darkgray');
            await timeout(50)
        }


        let choice = -1;
        if (action !== -1) {
            choice = Number((action || choice0_location) && !(action && choice0_location))
        }
        let reinforcement = -1;

        // Timed out, always punish
        if (action === -1) {
            reinforcement = 0
        }

        // Apply reinforcement rule for this trial
        if (reinforced_choice !== -1) {
            if (choice === reinforced_choice) {
                reinforcement = 1;
            } else {
                reinforcement = 0;
            }
        }

        // Log the ground-truth performance
        let ground_truth_perf = -1;
        if (ground_truth_choice !== -1) {
            if ((choice === ground_truth_choice) || (ground_truth_choice === -2)) {
                ground_truth_perf = 1;
            } else {
                ground_truth_perf = 0;
            }
        }

        MTS_Session_HUD.increment_ntrials();

        // Provide visual feedback, and apply a timeout
        if (reinforcement === 0) {
            if (punish_duration_msec > 0) {
                await display_canvas_sequence([canvases['choice_canvas_frame2'], canvases['punish_canvas'], canvases['blank_canvas']], [0, punish_duration_msec, 0]);
            }
        } else if (reinforcement === 1) {
            if (reward_duration_msec > 0) {
                await display_canvas_sequence([canvases['choice_canvas_frame2'], canvases['reward_canvas'], canvases['blank_canvas']], [0, reward_duration_msec, 0]);
            } else {
                // No reward duration
                await display_canvas_sequence([canvases['choice_canvas_frame2'], canvases['blank_canvas']], [0, 0]);
            }
        } else {
            await display_canvas_sequence([canvases['choice_canvas_frame2'], canvases['blank_canvas']], [0, 0]);
        }

        // Trigger await for the rest of the trial, if minimal_choice_duration_msec has not elapsed
        if (reaction_time_msec < minimal_choice_duration_msec) {
            await timeout(minimal_choice_duration_msec - reaction_time_msec);
        }

        // Apply constant intertrial wait
        await timeout(intertrial_delay_duration_msec);

        data_vars['i_choice'].push(choice); // 0 = chose choice0; 1 = chose choice 1
        data_vars['i_motor_action'].push(action); // 0 = left, 1 = right
        data_vars['stimulus_id_suffix_form'].push(cur_stimulus_id_suffix_form);
        data_vars['choice0_url_suffix'].push(current_c0_suffix);
        data_vars['choice1_url_suffix'].push(current_c1_suffix);
        data_vars['choice0_location'].push(choice0_location); // 0 = left, 1 = right
        data_vars['reaction_time_msec'].push(Math.round(reaction_time_msec));
        data_vars['rel_timestamp_start'].push(Math.round(fixation_outcome['t'])); // The time the subject engaged the fixation button; is relative to the start time of calling this function
        data_vars['rel_timestamp_stimulus_on'].push(Math.round(timestamp_stimulus[1]));
        data_vars['rel_timestamp_stimulus_off'].push(Math.round(timestamp_stimulus[2]));
        data_vars['rel_timestamp_choices_on'].push(Math.round(timestamp_stimulus[timestamp_stimulus.length - 1]));
        data_vars['trial_number'].push(i_trial);
        data_vars['reinforcement'].push(reinforcement);
        data_vars['ground_truth_perf'].push(ground_truth_perf);

        // Clear canvas
        await clear_canvas(canvases['choice_canvas_frame0']);
        await clear_canvas(canvases['choice_canvas_frame1']);
        await clear_canvas(canvases['choice_canvas_frame2']);
        console.log(i_trial + 1, 'trials completed');
        console.log(session_bonus_tracker);
    }

    // Delete canvases
    for (const [key, value] of Object.entries(canvases)) {
        console.log(`${key}: ${value}`);
        value.remove();
    }

    // Remove event listeners from window
    action_recorder.close_listeners();
    delete trial_images.cache_dict;
    return {'coords': coords, 'data_vars': data_vars}
}


async function congratulations_screen(size) {
    /*
    Creates and displays a div informing the subject they are finished with the HIT, and they can press "space" to submit.
    Also informs them of their bonus
    size: () of canvas, in units of pixels
    mean_perf: (), from [0, 1]
     */

    var splash1_canvas = create_canvas('splash1_canvas', size, size);
    var font_size = (size * 0.04).toString();
    var font = font_size + 'px Times New Roman';

    let bonus_usd_earned = Math.round(session_bonus_tracker.bonus_usd_earned * 100) / 100;
    let gt_nobs_total = session_bonus_tracker.ntrials_total;
    await draw_text(splash1_canvas, 'Thank you for your work!', font, 'white', size / 2, size * 0.3, 'center');

    if (gt_nobs_total > 0) {

        let total_pbar_width = 0.6;
        //let mean_perf = gt_ncorrect_total / gt_nobs_total;
        //let filled_pbar_width = Math.max(0, total_pbar_width * (2 * mean_perf - 1));

        await draw_rectangle(splash1_canvas, size * 0.5, size * 0.5, size * total_pbar_width, size * 0.15, '#DCDCDC', 1);
        //await draw_rectangle(splash1_canvas, size*(1 - total_pbar_width)/2 + size*(filled_pbar_width/2), size * 0.5, size * filled_pbar_width, size * 0.15, '#66ff33', 0.8);
        if (bonus_usd_earned > 0.0) {
            await draw_text(splash1_canvas, 'Bonus earned: $' + bonus_usd_earned.toString() + '', font, 'black', size / 2, size * 0.5, 'center');
        } else {
            await draw_text(splash1_canvas, 'No bonus', font, 'white', size / 2, size * 0.5, 'center');
        }
    }


    await timeout(2000);
    await draw_text(splash1_canvas, 'Press space to submit.', font, '#66ff33', size / 2, size * 0.65, 'center');

    await display_canvas_sequence([splash1_canvas], [0]);
    var action_recorder = new ActionListenerClass(false, true);

    await action_recorder.Promise_get_subject_keypress_response({' ': 0}, 10000);
    splash1_canvas.remove()
}


async function initialize_same_different_task_canvases(size, max_frames,) {
    var width = size;
    var height = size;
    var canvases = {};

    // Create fixation canvas
    canvases['fixation_canvas'] = create_canvas('fixation_canvas', width, height);
    await draw_dot_with_text(canvases['fixation_canvas'], 'Click to start', width * 0.5, height * 0.75, size * 0.1, "white", 1);
    await draw_dot_with_text(canvases['fixation_canvas'], '', width * 0.5, height * 0.5, Math.max(10, size * 0.01), "black", 1);
    // Create stimulus frame canvases
    for (let i_frame = 0; i_frame < max_frames; i_frame++) {
        let canvas_name = ['stimulus_frame', i_frame.toString(), '_canvas'].join('');
        canvases[canvas_name] = create_canvas(canvas_name, width, height);
    }

    // Create reward canvas (green square)
    canvases['reward_canvas'] = create_canvas('reward_canvas', width, height);
    /*
    await draw_rectangle(
        canvases['reward_canvas'],
        width * 0.5,
        height *0.5,
        width *  1/4,
        height * 1/4,
        "#00cc00",
        0.5);
    */
    // Create punish canvas (black square)
    canvases['punish_canvas'] = create_canvas('punish_canvas', width, height);
    /*
    await draw_rectangle(
        canvases['punish_canvas'],
        width * 0.5,
        height*0.5,
    width * 1/4,
        height * 1/4,
        "black",
        0.8);

     */

    // Create choice canvas
    canvases['choice_canvas_frame0'] = create_canvas('choice_canvas_frame0', width, height);
    canvases['choice_canvas_frame1'] = create_canvas('choice_canvas_frame1', width, height);
    canvases['choice_canvas_frame2'] = create_canvas('choice_canvas_frame2', width, height);

    canvases['blank_canvas'] = create_canvas('blank_canvas', width, height);

    return canvases
}

