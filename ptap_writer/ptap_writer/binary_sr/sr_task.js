async function run_subtasks(subtask_sequence){
    /*
    subtask_sequence: Array of Objects, which detail the subtasks which will be run

    This function returns a list of returns from "run_binary_sr_trials". It allows the caller to request that multiple
    subtasks be run back-to-back.

    Between each subtask, a "splash" screen appears in which the subject is informed the last subtask has concluded.

    If a subtask is to fail, for some reason, this function concludes early, and returns the behavioral data for trials
    that have been completed so far. It also attaches the error message which was associated with the error.
     */

    const nsubtasks = subtask_sequence.length;
    let return_values = {'data':[]};

    try {

        let bonus_usd_earned = 0;
        for (let i_subtask = 0; i_subtask < nsubtasks; i_subtask++) {
            let cur_subtask = subtask_sequence[i_subtask];

            // Load savedata for this subtask
            let cur_session_data = await run_binary_sr_trials(
                cur_subtask['image_url_seq'],
                cur_subtask['label_seq'],
                cur_subtask['stimulus_duration_msec'],
                cur_subtask['reward_duration_msec'],
                cur_subtask['punish_duration_msec'],
                cur_subtask['choice_duration_msec'],
                cur_subtask['post_stimulus_delay_duration_msec'],
                cur_subtask['intertrial_delay_period_msec'],
                cur_subtask['max_bonus_usd'],
                cur_subtask['min_performance_for_bonus'],
                cur_subtask['sequence_name'],
                );

            // Update bonus earned
            let perf_seq = cur_session_data['data_vars']['perf'];
            let max_bonus_usd = Math.max(cur_subtask['max_bonus_usd'], 0);
            let min_performance_for_bonus = Math.max(cur_subtask['min_performance_for_bonus'], 0);
            let nrewards = MathUtils.sum(perf_seq);
            let ntrials = 0;
            for (let i_trial= 0; i_trial < perf_seq.length; i_trial++){
                if (perf_seq[i_trial] !== -1){
                    ntrials = ntrials + 1
                }
            }
            let perf_subtask = nrewards / ntrials
            let bonus_usd_earned_subtask = (max_bonus_usd / (1-min_performance_for_bonus)) * (perf_subtask - min_performance_for_bonus)
            bonus_usd_earned_subtask = Math.max(bonus_usd_earned_subtask, 0)


            if (!(isNaN(bonus_usd_earned_subtask))){
                bonus_usd_earned = bonus_usd_earned + bonus_usd_earned_subtask
            }

            // Push data to return values
            return_values['data'].push(cur_session_data);

            // Run the "end of subtask" splash screen if there are tasks that remain after this one, and the subject has performed trials
            if ((i_subtask + 1) < (nsubtasks)){
                let playspace_size_pixels = infer_canvas_size();
                await inter_subtask_splash_screen(playspace_size_pixels)
            }
        }

        console.log(bonus_usd_earned)
        await provide_session_end(return_values['data'], bonus_usd_earned)
    }

    catch(error){
        console.log(error);
        return_values['error'] = error;
    }

    return return_values
}


async function run_binary_sr_trials(
    image_url_sequence,
    label_sequence,
    stimulus_duration_msec,
    reward_duration_msec,
    punish_duration_msec,
    choice_duration_msec,
    post_stimulus_delay_duration_msec,
    intertrial_delay_period_msec,
    max_bonus_usd,
    min_performance_for_bonus,
    sequence_name,
){
    let size = infer_canvas_size();
    /*
    Core function for getting behavioral data on a binary-SR task from a human subject.

    image_url_sequence: [t]
    label_sequence: [t]. -1 or 1.
    stimulus_duration_msec: ()
    reward_duration_msec: ()
    punish_duration_msec: ()
    choice_duration_msec: ()
    post_stimulus_delay_duration_msec: ()
    usd_per_reward: ()
    size: () in pixels
    sequence_name: String
     */

    let diameter_pixels = size * 0.25;
    console.log(stimulus_duration_msec)
    let coords = {};
    coords['stimulus_duration_msec'] = stimulus_duration_msec;
    coords['reward_duration_msec'] = reward_duration_msec;
    coords['punish_duration_msec'] = punish_duration_msec;
    coords['post_stimulus_delay_duration_msec'] = post_stimulus_delay_duration_msec;
    coords['intertrial_delay_period_msec'] = intertrial_delay_period_msec;
    coords['max_bonus_usd'] = max_bonus_usd;
    coords['min_performance_for_bonus'] = min_performance_for_bonus;
    coords['playspace_size_px'] = size;
    coords['sequence_name'] = sequence_name;
    coords['timestamp_session_start'] = performance.timing.navigationStart;

    const [hcur, wcur] = get_screen_dims();
    coords['screen_height_px'] = hcur;
    coords['screen_width_px'] = wcur;
    coords['device_pixel_ratio'] = window.devicePixelRatio || 1;

    let data_vars = {};
    data_vars['perf'] = [];
    data_vars['action'] = [];
    data_vars['label'] = [];
    data_vars['stimulus_url'] = [];
    data_vars['reaction_time_msec'] = [];
    data_vars['rel_timestamp_start'] = []; // The time the subject engaged the fixation button; is relative to the start time of calling this function
    data_vars['rel_timestamp_stimulus_on'] = [];
    data_vars['rel_timestamp_stimulus_off'] = [];
    data_vars['rel_timestamp_choices_on'] = [];
    data_vars['trial_number'] = [];


    // If there is savedata, load it, reflect savedata in HUD, and set the data_vars
    // Pre-buffer images
    let trial_images = new ImageBufferClass;
    let all_urls = [... new Set(image_url_sequence)];
    await trial_images.buffer_urls(all_urls);

    // Begin tracking actions
    var action_recorder = new ActionListenerClass(false, true);

    // Initialize canvases
    var canvases = await initialize_sr_task_canvases(size);
    let reward_url = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/feedback_is_correct_image.png'
    let punish_url = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/feedback_is_incorrect_image.png'
    await trial_images.buffer_urls([reward_url, punish_url]);
    let reward_image = await trial_images.get_by_url(reward_url);
    let punish_image = await trial_images.get_by_url(punish_url);
    await draw_image(canvases['reward_canvas'], reward_image, size/2, size/2, diameter_pixels);
    await draw_image(canvases['punish_canvas'], punish_image, size/2, size/2, diameter_pixels);


    // Iterate over trials
    for (let i_trial = 0; i_trial < image_url_sequence.length; i_trial++){

        // Buffer stimulus
        let current_url = image_url_sequence[i_trial];
        let current_image = await trial_images.get_by_url(current_url);
        await draw_image(canvases['stimulus_canvas'], current_image, size/2, size/2, diameter_pixels);

        // Run trial initiation
        await display_canvas_sequence([canvases['blank_canvas'], canvases['fixation_canvas']], [0, 0]);

        let fixation_outcome = await action_recorder.Promise_get_subject_keypress_response({' ':-1});
        // Run stimulus
        let _stimulus_seq = undefined;
        let _t_seq = undefined;
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

        // Evaluate choice
        let perf = undefined;

        // Get correct action
        let cur_label = label_sequence[i_trial];

        let correct_action;
        if (cur_label === 1){
            correct_action = 1;
        }
        else{
            correct_action = 0;
        }
        // Evaluate subject action
        let action = choice_outcome['actionIndex'];
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

        // Intertrial await
        await timeout(intertrial_delay_period_msec)

        // Record outcomes
        data_vars['perf'].push(perf);
        data_vars['action'].push(action);
        data_vars['stimulus_url'].push(current_url);
        data_vars['label'].push(cur_label);
        data_vars['reaction_time_msec'].push(Math.round(reaction_time_msec));
        data_vars['rel_timestamp_start'].push(Math.round(fixation_outcome['t'])); // The time the subject engaged the fixation button; is relative to the start time of calling this function
        data_vars['rel_timestamp_stimulus_on'].push(Math.round(timestamp_stimulus[1]));
        data_vars['rel_timestamp_stimulus_off'].push(Math.round(timestamp_stimulus[2]));
        data_vars['rel_timestamp_choices_on'].push(Math.round(timestamp_stimulus[timestamp_stimulus.length-1]));
        data_vars['trial_number'].push(i_trial);

        // Callback
        await update_hud(perf);
        progressbar_callback();
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


async function update_hud(perf){
    /*
    A function which is called at the end of every trial.
    It displays the subject's performance, remaining trials, and amount earned.
     */
    let hud_current_trial_count = document.getElementById('hud_total_trials');
    const current_trial_count = parseInt(hud_current_trial_count.innerText);
    hud_current_trial_count.innerHTML = (current_trial_count+1).toString();

    let hud_current_rewards = document.getElementById('hud_total_rewards');
    const current_rewards = parseInt(hud_current_rewards.innerText);
    hud_current_rewards.innerHTML = (current_rewards + perf).toString();

    /*
    var hud_current_bonus = document.getElementById('hud_current_bonus');
    let next_bonus = (current_rewards+perf) * (usd_per_reward) * 100;
    next_bonus = (next_bonus).toPrecision(2).toString();
    if(next_bonus.length === 1){
        next_bonus = next_bonus.concat('.0');
    }
    hud_current_bonus.innerHTML = next_bonus;
     */
}



async function provide_session_end(session_data, bonus_usd_earned){
    let nsuccesses = 0;
    let ntrials = 0;
    for (let i_subtask = 0; i_subtask < session_data.length; i_subtask++){
        let cur_data = session_data[i_subtask];
        nsuccesses = nsuccesses + MathUtils.sum(cur_data['data_vars']['perf']);
        ntrials = ntrials + cur_data['data_vars']['perf'].length;
    }

    await congratulations_screen(nsuccesses, ntrials, bonus_usd_earned)
}


async function congratulations_screen(nsuccesses, ntrials, bonus_usd_earned){
    /*
    Creates and displays a div informing the subject they are finished with the HIT, and they can press "space" to submit.
    Also informs them of their bonus
    size: () of canvas, in units of pixels
    mean_perf: (), from [0, 1]
     */
    let size = infer_canvas_size();
    var splash1_canvas = create_canvas('splash1_canvas', size, size);
    var font_size = (size * 0.04).toString();
    var font = font_size+'px Times New Roman';

    bonus_usd_earned = Math.round(bonus_usd_earned*100) / 100;

    await draw_text(splash1_canvas, 'Thank you for your work!', font, 'white', size/2, size * 0.3, 'center');

    if (ntrials > 0){

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


async function inter_subtask_splash_screen(size){
    /*
    Displays a series of canvases informing the subject that the current task has ended, and a new one will begin.
    Requires that the subject press "b" to continue, after a timeout.
     */

    var timeout_msec = 3000;

    var splash1_canvas = create_canvas('splash1_canvas', size, size);
    var splash2_canvas = create_canvas('splash2_canvas', size, size);

    var ctx = splash1_canvas.getContext("2d");
    var font = '1.5em Times New Roman';
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
    let action_recorder = new ActionListenerClass(false, true);
    await action_recorder.Promise_get_subject_keypress_response({'b': 0});

    splash1_canvas.remove();
    splash2_canvas.remove();
}


async function draw_sr_dot_with_text(canvas, text, xcentroid_pixel, ycentroid_pixel, diameter_pixel, fontsize_pixel, dot_color, alpha, ) {
    var context = canvas.getContext('2d');

    // Apply alpha to the dot
    if (alpha !== undefined) {
        // https://stackoverflow.com/questions/10487882/html5-change-opacity-of-a-draw-rectangle/17459193
        context.globalAlpha = alpha
    }

    context.beginPath();
    context.arc(xcentroid_pixel, ycentroid_pixel, diameter_pixel / 2, 0 * Math.PI, 2 * Math.PI);
    context.fillStyle = dot_color;
    context.fill();

    var nLetters = text.length;
    if (nLetters > 0){
        var letterSize = fontsize_pixel; // Math.min((diameter_pixel*2) / (nLetters + 0.6), 40);
        context.font = letterSize.toString() + "px Arial";
        context.fillStyle = "gray";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, xcentroid_pixel, ycentroid_pixel);
    }

    // So further calls to this canvas context are not alpha'd out.
    context.globalAlpha = 1
}

async function initialize_sr_task_canvases(size){
    let width = size;
    let height = size;
    let canvases = {};

    // Create fixation canvas
    canvases['fixation_canvas'] = create_canvas('fixation_canvas', width, height);
    let fontsize_fixation = size * 0.02
    let fixation_text = 'spacebar'

    await draw_sr_dot_with_text(canvases['fixation_canvas'], fixation_text, width*0.5, height*0.8, size * 0.1, fontsize_fixation, "white", 1);
    await draw_sr_dot_with_text(canvases['fixation_canvas'], '', width*0.5, height*0.5, Math.max(1, size * 0.01), 0, "black", 1);
    // Create stimulus canvas
    canvases['stimulus_canvas'] = create_canvas('stimulus_canvas', width, height);

    // Create reward canvas (green square)
    canvases['reward_canvas'] = create_canvas('reward_canvas', width, height);

    /*
    await draw_rectangle(
        canvases['reward_canvas'],
        width * 0.5,
        height*0.5,
        width * 1/3,
        height * 1/3,
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
    width * 1/3,
        height * 1/3,
        "black",
        0.8);
    */

    // Create choice canvas
    let fontsize_choice = fontsize_fixation; //size * 0.01
    canvases['choice_canvas'] = create_canvas('choice_canvas', width, height);
    await draw_sr_dot_with_text(canvases['choice_canvas'], 'F', width*0.3, height*0.8, size * 0.1, fontsize_choice, "white", 1);
    await draw_sr_dot_with_text(canvases['choice_canvas'], 'J', width*0.7, height*0.8, size * 0.1, fontsize_choice, "white", 1);
    canvases['blank_canvas'] = create_canvas('blank_canvas', width, height);

    return canvases
}

