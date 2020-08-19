async function run_subtasks(subtask_sequence){
    /*
    subtask_sequence: Array of Objects, which detail the subtasks which will be run

    This function returns a list of returns from "run_binary_sr_trials". It allows the caller to request that multiple
    subtasks be run back-to-back.

    Between each subtask, a "splash" screen appears in which the subject is informed the last subtask has concluded.

    If a subtask is to fail, for some reason, this function concludes early, and returns the behavioral data for trials
    that have been completed so far. It also attaches the error message which was associated with the error.
     */

    var nsubtasks = subtask_sequence.length;
    var return_values = {'data':[]};
    var playspace_size_pixels = infer_canvas_size();
    try {
        for (var i_subtask = 0; i_subtask < nsubtasks; i_subtask++) {
            var cur_subtask = subtask_sequence[i_subtask];
            var cur_image_url_sequence = cur_subtask['image_url_seq'];
            var cur_label_sequence = cur_subtask['label_seq'];
            var cur_stimulus_duration_msec = cur_subtask['stimulus_duration_msec'];
            var cur_reward_duration_msec = cur_subtask['reward_duration_msec'];
            var cur_punish_duration_msec = cur_subtask['punish_duration_msec'];
            var cur_choice_duration_msec = cur_subtask['choice_duration_msec'];
            var cur_post_stimulus_delay_duration_msec = cur_subtask['post_stimulus_delay_duration_msec'];

            var cur_session_data = await run_binary_sr_trials(
                cur_image_url_sequence,
                cur_label_sequence,
                cur_stimulus_duration_msec,
                cur_reward_duration_msec,
                cur_punish_duration_msec,
                cur_choice_duration_msec,
                cur_post_stimulus_delay_duration_msec,
                playspace_size_pixels);
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
    image_url_sequence,
    label_sequence,
    stimulus_duration_msec,
    reward_duration_msec,
    punish_duration_msec,
    choice_duration_msec,
    post_stimulus_delay_duration_msec,
    size,
){

    /*
    Core function for getting behavioral data on a binary-SR task from a human subject.

    image_url_sequence: [t]
    label_sequence: [t]. 0 or 1.
    stimulus_duration_msec: ()
    reward_duration_msec: ()
    punish_duration_msec: ()
    choice_duration_msec: ()
    post_stimulus_delay_duration_msec: ()
    size: () in pixels
     */

    var diameter_pixels = size * 0.25;

    var session_data = {};
    session_data['perf'] = [];
    session_data['action'] = [];
    session_data['reaction_time_msec'] = [];
    session_data['rel_timestamp_start'] = []; // The time the subject engaged the fixation button; is relative to the start time of calling this function
    session_data['rel_timestamp_stimulus_on'] = [];
    session_data['rel_timestamp_stimulus_off'] = [];
    session_data['rel_timestamp_choices_on'] = [];
    session_data['trial_number'] = [];

    // Pre-buffer images
    var trial_images = new ImageBufferClass;
    for (var i_image = 0; i_image < image_url_sequence.length; i_image++){
        await trial_images.get_by_url(image_url_sequence[i_image]);
    }

    // Begin tracking actions
    var action_recorder = new ActionListenerClass(false, true);

    // Iterate over trials
    var canvases = await initialize_sr_task_canvases(size);

    for (var i_trial = 0; i_trial < image_url_sequence.length; i_trial++){
        // Buffer stimulus
        var current_image = await trial_images.get_by_url(image_url_sequence[i_trial]);
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
        var cur_label = label_sequence[i_trial];
        var action = choice_outcome['actionIndex'];
        if (action === -1){
            // Timed out
            perf = 0
        }
        else if (action === cur_label){
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
        session_data['reaction_time_msec'].push(Math.round(reaction_time_msec));
        session_data['rel_timestamp_start'].push(Math.round(fixation_outcome['t'])); // The time the subject engaged the fixation button; is relative to the start time of calling this function
        session_data['rel_timestamp_stimulus_on'].push(Math.round(timestamp_stimulus[1]));
        session_data['rel_timestamp_stimulus_off'].push(Math.round(timestamp_stimulus[2]));
        session_data['rel_timestamp_choices_on'].push(Math.round(timestamp_stimulus[timestamp_stimulus.length-1]));
        session_data['trial_number'].push(i_trial);
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

    return session_data
}

async function provide_session_end(session_data){
    var perf_per_subtask = [];
    for (let i_subtask = 0; i_subtask < session_data.length; i_subtask++){
        let cur_data = session_data[i_subtask];
        perf_per_subtask.push(MathUtils.mean(cur_data['perf']));
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

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

    function rgbToHex(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    function color_interpolation(performance){
        /*
        performance: () between [0, 100]
        Returns a color hex code based on performance, from fully red (50 performance or below) to fully green (100 performance)
         */
        var green = Math.min(Math.max(0, 2 * performance/100 - 1), 0.8);
        var red = 0;
        var blue = 0;
        return rgbToHex(Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255));
    }

    var average_color = color_interpolation(mean_perf);

    var total_pbar_width = 0.6;
    var filled_pbar_width = total_pbar_width * (mean_perf);
    await draw_text(splash1_canvas, 'Thank you for your work!', font, 'white', size/2, size * 0.3, 'center');
    await draw_rectangle(splash1_canvas, size*0.5, size * 0.5, size * total_pbar_width, size * 0.15, '#DCDCDC', 1);
    await draw_rectangle(splash1_canvas, size*(1 - total_pbar_width)/2 + size*(filled_pbar_width/2), size * 0.5, size * filled_pbar_width, size * 0.15, '#66ff33', 0.8);
    await draw_text(splash1_canvas, 'Score: '+mean_perf_percentage.toString()+'%', font, 'white', size/2, size * 0.5, 'center');

    //await draw_text(splash1_canvas, 'Your best performance was ' + best_perf.toString()+'%', font, high_color, size/2, size * 0.3);
    //await draw_text(splash1_canvas, 'Your worst performance was ' + worst_perf.toString()+'%', font, low_color, size/2, size * 0.4);
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

