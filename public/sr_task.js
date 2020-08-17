async function run_binary_sr_trials(
    image_url_sequence,
    label_sequence,
    stimulus_duration_msec_sequence,
    reward_duration_msec_sequence,
    punish_duration_msec_sequence,
    choice_duration_msec_sequence,
    post_stimulus_delay_duration_msec_sequence,
    ){


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
    var trial_images = new image_buffer;
    for (var i_image = 0; i_image < image_url_sequence.length; i_image++){
        await trial_images.get_by_url(image_url_sequence[i_image]);
    }

    // Iterate over trials
    var canvases = await initialize_canvases();

    var frame_durations = await display_canvas_sequence([canvases['fixation_canvas'], canvases['reward_canvas'], canvases['punish_canvas']],
        [100, 200, 1000]);

    console.log(frame_durations)
    for (var i_trial = 0; i_trial < image_url_sequence.length; i_trial++){

        // Run fixation
        var timestamp_start = await wait_for_fixation();

        // Run stimulus
        var timestamps_stimulus = await show_stimulus_images();

        // Show choices and wait for response
        var choice_outcome = await get_subject_choice();

        // Give feedback
        await transmit_feedback(choice_outcome);

        // Record outcomes
    }

    // Delete canvases
    canvases['fixation_canvas'].remove();
    canvases['stimulus_canvas'].remove();
    canvases['reward_canvas'].remove();
    canvases['punish_canvas'].remove();
    canvases['choice_canvas'].remove();

    return session_data
}

async function initialize_canvases(){
    var canvases = {};

    var width = 768;
    var height = 768;

    // Create fixation canvas
    canvases['fixation_canvas'] = create_canvas('fixation_canvas', width, height);
    await draw_dot_with_text(canvases['fixation_canvas'], 'spacebar', width*0.5, height*0.8, 100, "white", 1);

    // Create stimulus canvas
    canvases['stimulus_canvas'] = create_canvas('stimulus_canvas', width, height);

    // Create reward canvas (green square)
    canvases['reward_canvas'] = create_canvas('reward_canvas', width, height);
    await draw_rectangle(
        canvases['reward_canvas'],
        width * 2/3,
        height * 2/3,
        "#00cc00",
        0.5);

    // Create punish canvas (black square)
    canvases['punish_canvas'] = create_canvas('punish_canvas', width, height);
    await draw_rectangle(
        canvases['punish_canvas'],
        width * 2/3,
        height * 2/3,
        "black",
        0.8);

    // Create choice canvas
    canvases['choice_canvas'] = create_canvas('choice_canvas', width, height);
    await draw_dot_with_text(canvases['choice_canvas'], 'F', width*0.25, height*0.8, 50, "white", 1);
    await draw_dot_with_text(canvases['choice_canvas'], 'J', width*0.75, height*0.8, 50, "white", 1);

    return canvases
}


const __check_image_download_successful = path =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({img, path, status: 'ok'});
        img.onerror = () => resolve({path, status: 'error'});
        img.src = path;
    });


class image_buffer {
    constructor() {
        this.cache_dict = {}; // url:image data
        this.cache_members = []; // earliest image_path -> latest image_path
    }

    async get_by_url(url) {
        // url: string
        try {
            // Requested image not in buffer. Add it, then return.
            if (url in this.cache_dict) {
                return this.cache_dict[url]
            } else if (!(url in this.cache_dict)) {
                await this.download_image(url);
                return this.cache_dict[url]
            }
        } catch (error) {
            console.error("get_by_name failed with error:", error)
        }
        console.log('Downloaded image at', url)
    }

    async remove_image_from_cache(filename) {
        // Currently unused
        try {
            window.URL.revokeObjectURL(this.cache_dict[filename].src);
            delete this.cache_dict[filename];
        } catch (error) {
            console.log('removal of', filename, 'failed with:', error)
        }
    }

    async download_image(url) {
        // url: string
        try {
            if (!(url in this.cache_dict)) {
                this.cache_dict[url] = await this._load_image_core(url);
                this.cache_members.push(url);
            }
        } catch (error) {
            console.error("cache_these_images failed with error:", error)
        }
    }

    async _load_image_core(url) {
        var img = await __check_image_download_successful(url);
        if (img.status === 'ok'){
            return img.img
        }
        else{
            console.warn('error loading image at', url);
            return 'image_failure'
        }
    }
}

function get_window_dims() {
    // Reference: https://www.w3schools.com/js/js_window.asp
    var w = window.innerWidth
        || document.documentElement.clientWidth
        || document.body.clientWidth;

    var h = window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight;

    return [h, w]
}

function detect_bounds() {
    var playspaceSizePixels = 768; // todo: fix

    var [windowHeight, windowWidth] = get_window_dims();

    var screen_margin = 0.15;
    var max_allowable_playspace_dimension = Math.round(Math.min(windowHeight, windowWidth)) * (1 - screen_margin);

    var min_dimension = Math.min(max_allowable_playspace_dimension, playspaceSizePixels);
    min_dimension = Math.ceil(min_dimension);

    var bounds = {};
    bounds['height'] = min_dimension;
    bounds['width'] = min_dimension;
    bounds['leftBound'] = Math.floor((windowWidth - min_dimension) / 2); // in units of window
    bounds['rightBound'] = Math.floor(windowWidth - (windowWidth - min_dimension) / 2);
    bounds['topBound'] = Math.floor((windowHeight - min_dimension) / 2);
    bounds['bottomBound'] = Math.floor(windowHeight - (windowHeight - min_dimension) / 2);

    return bounds
}

function create_canvas(canvas_id, width, height){
    /*
    Creates and returns a canvas with id canvas_id
     */

    var use_image_smoothing = true;

    // Create canvas and assign name
    var canvasobj = document.createElement('canvas');
    canvasobj.id = canvas_id;

    // Detect the pixel ratio of the subject's device
    var context = canvasobj.getContext('2d');

    var devicePixelRatio = window.devicePixelRatio || 1;
    var backingStoreRatio = context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatioproportion2pixels ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1; // /1 by default for chrome?

    var _ratio = devicePixelRatio / backingStoreRatio;

    // Set the dimensions of the canvas
    canvasobj.width = width * _ratio;
    canvasobj.height = height * _ratio;

    // Center canvas: https://stackoverflow.com/questions/5127937/how-to-center-canvas-in-html5
    canvasobj.style.padding = 0;
    canvasobj.style.margin = 'auto';
    canvasobj.style.display = "block"; //visible
    canvasobj.style.position = 'absolute';
    canvasobj.style.top = 0;
    canvasobj.style.bottom = 0;
    canvasobj.style.left = 0;
    canvasobj.style.right = 0;
    canvasobj.style.border = '1px dotted #E6E6E6';
    canvasobj.style.width = width + 'px'; // Set browser canvas display style to be workspace_width
    canvasobj.style.height = height + 'px';

    // Set background
    context.fillStyle = "#7F7F7F";
    context.fillRect(0, 0, canvasobj.width, canvasobj.height);

    // Set image smoothing
    context.imageSmoothingEnabled = use_image_smoothing;

    if (_ratio !== 1) {
        context.scale(_ratio, _ratio)
    }

    // Append to document body
    document.body.appendChild(canvasobj);
    return canvasobj
}


async function draw_dot_with_text(canvas, text, xcentroid_pixel, ycentroid_pixel, diameter_pixel, dot_color, alpha, ) {
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
        var letterSize = Math.min((diameter_pixel) / (nLetters + 0.5), 40);
        context.font = letterSize.toString() + "px Arial";
        context.fillStyle = "gray";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, xcentroid_pixel, ycentroid_pixel);
    }
    // So further calls to this canvas context are not necessarily alpha'd out.
    context.globalAlpha = 1
}

async function draw_rectangle(canvas, width_pixels, height_pixels, color, alpha) {
    var context = canvas.getContext('2d');
    context.fillStyle = color;
    context.globalAlpha = alpha;
    var width = parseFloat(canvas.style.width);
    var height = parseFloat(canvas.style.height);
    context.fillRect(width / 2 - width_pixels / 2, height / 2 - width_pixels / 2, width_pixels, height_pixels);
    context.fill()
}


async function draw_image(canvasobj, image, xcentroid_pixel, ycentroid_pixel, diameter_pixels) {

    var nativeWidth = image.naturalWidth;
    var nativeHeight = image.naturalHeight;
    let drawHeight, drawWidth;

    if (nativeHeight > nativeWidth) {
        drawHeight = diameter_pixels;
        drawWidth = diameter_pixels * nativeWidth / nativeHeight
    } else {
        drawWidth = diameter_pixels;
        drawHeight = diameter_pixels * nativeHeight / nativeWidth
    }

    // Place left corner of image
    var original_left_start = xcentroid_pixel - diameter_pixels / 2;
    var original_top_start = ycentroid_pixel - diameter_pixels / 2;

    var context = canvasobj.getContext('2d');
    await context.drawImage(image, original_left_start, original_top_start, drawWidth, drawHeight);

}

function display_canvas_sequence(canvas_sequence, t_durations) {
    /*
    Input arguments:
        canvas_sequence: Array of references to DOM canvases
        t_durations: Array of floats / integers; in units of milliseconds.
                     The amount of time that must elapse before the next frame is shown.
                     In the case of the last frame, this is the amount of time that is "blocked" before the promise resolves.

     This function immediately displays the canvases given in canvas_sequence.

     The last canvas in the sequence is kept "on" once this function is concluded.

     The function returns a promise that resolves when the sequence has concluded. The resolved promise returns
     an Array with performance.now() timestamps corresponding to the draw time of each canvas.
    */

    // Instantiate Promise which will resolve when the sequence is done
    var resolveFunc;
    var errFunc;
    var promise_done_with_sequence = new Promise(function (resolve, reject) {
        resolveFunc = resolve;
        errFunc = reject;
    }).then();


    const nframes = canvas_sequence.length;
    var frame_timestamps = [];
    var i_canvas_next = 0;
    var on_first_call = true;
    var timestamp_draw = undefined;
    var epsilon = (1/60 * 1000) * 0.4; // If a frame has been reported to be shown for trequested - epsilon, go to the next frame

    function check_frame(timestamp) {
        /*
        timestamp: a DOMHighResTimeStamp instance, similar to the number given by performance.now(). It is in milliseconds.
         */

        if (on_first_call === true){
            on_first_call = false;
            canvas_sequence[i_canvas_next].style.zIndex = "100";
            i_canvas_next++;
            timestamp_draw = timestamp;
            frame_timestamps.push(timestamp);
        }
        else{
            var time_elapsed = timestamp - timestamp_draw;
            var canvas_duration_fulfilled = time_elapsed >= (t_durations[i_canvas_next - 1] - epsilon);

            if ((canvas_duration_fulfilled) && (i_canvas_next < nframes)){
                canvas_sequence[i_canvas_next].style.zIndex = "100";
                canvas_sequence[i_canvas_next-1].style.zIndex = "0";
                i_canvas_next++;
                timestamp_draw = timestamp;
                frame_timestamps.push(timestamp)
            }
        }
        console.log('canvas', i_canvas_next, timestamp);

        // On last canvas
        var on_last_canvas = i_canvas_next === nframes;
        if (on_last_canvas === true){
            // Time remaining on this canvas has elapsed
            console.log('Time since draw', timestamp - timestamp_draw)
            if ((timestamp - timestamp_draw) >= t_durations[i_canvas_next-1]){
                resolveFunc(frame_timestamps)
            }
            else{
                window.requestAnimationFrame(check_frame);
            }
        }
        // More canvases to draw
        else{
            window.requestAnimationFrame(check_frame)
        }


    }

    window.requestAnimationFrame(check_frame);
    return promise_done_with_sequence
}