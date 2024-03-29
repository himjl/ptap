function get_screen_dims(){
    var h = window.screen.height;
    var w = window.screen.width;
    return [h, w]
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


function infer_canvas_size() {
    // Present the canvases at 85% of the smallest screen dimension
    var [screen_height, screen_width] = get_screen_dims();
    var screen_margin = 0.3;
    return Math.round(Math.min(screen_height, screen_width)) * (1 - screen_margin);
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
    canvasobj.style.display = "block";
    canvasobj.style.position = 'absolute';
    canvasobj.style.top = 0;
    canvasobj.style.bottom = 0;
    canvasobj.style.left = 0;
    canvasobj.style.right = 0;
    canvasobj.style.width = width + 'px';
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

function set_canvas_level(canvas, z){
    /*
    canvas: Canvas object reference
    z: integer
     */
    canvas.style.zIndex = z.toString();
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
        var letterSize = Math.min((diameter_pixel*2) / (nLetters + 0.6), 40);
        context.font = letterSize.toString() + "px Arial";
        context.fillStyle = "gray";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, xcentroid_pixel, ycentroid_pixel);
    }

    // So further calls to this canvas context are not alpha'd out.
    context.globalAlpha = 1
}

async function write_text(canvas, text, xcentroid_pixel, ycentroid_pixel, total_width_px, text_color){

    // Writes a single line of text, of width total_width_px, horizontally centered on xcentroid_pixel, and vertically centered on ycentroid_pixel

    let nLetters = text.length;
    let context = canvas.getContext('2d');
    if (nLetters > 0){
        var letterSize = total_width_px / nLetters;
        context.font = letterSize.toString() + "px Arial";
        context.fillStyle = text_color;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, xcentroid_pixel, ycentroid_pixel);
    }

}

async function clear_canvas(canvasobj){
    var context = canvasobj.getContext('2d');
    context.fillStyle = "#7F7F7F";
    context.fillRect(0, 0, canvasobj.width, canvasobj.height);
}

async function draw_border(canvas, xcentroid, ycentroid, width_pixels, height_pixels, border_width_px, color){
    var context = canvas.getContext('2d');
    context.globalAlpha = 1

    // Red rectangle
    context.beginPath();
    context.lineWidth = border_width_px.toString();
    context.strokeStyle = color;
    context.rect(xcentroid - width_pixels / 2, ycentroid - height_pixels / 2, width_pixels, height_pixels);
    context.stroke();
}


async function draw_rectangle(canvas, xcentroid, ycentroid, width_pixels, height_pixels, color, alpha) {
    var context = canvas.getContext('2d');
    context.fillStyle = color;
    context.globalAlpha = alpha;
    var width = parseFloat(canvas.style.width);
    var height = parseFloat(canvas.style.height);
    context.fillRect(xcentroid - width_pixels / 2, ycentroid - height_pixels / 2, width_pixels, height_pixels);
    context.fill();
    context.globalAlpha = 1
}

async function draw_text(canvas, string, font, color, x, y, align){
    var ctx = canvas.getContext("2d");
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(string, x, y);
    ctx.globalAlpha = 1
}

async function draw_image(canvas, image, xcentroid_pixel, ycentroid_pixel, diameter_pixels) {
    /*
    Draws an image on the canvas.

    canvas: a reference to a Canvas object.
    image: an image blob.
    xcentroid_pixel: () with respect to canvas coordinates (x = 0 at left; positive direction is rightward)
    ycentroid_pixel: () with respect to canvas coordinates (y = 0 at top; positive direction is downward)
    diameter_pixels: () the size of the drawn image's longest dimension (either width or height).
     */
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

    var context = canvas.getContext('2d');
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
    let frame_timestamps = [];
    let i_canvas_next = 0;
    let on_first_call = true;
    let timestamp_draw = undefined;
    let epsilon = (1/60 * 1000) * 0.4; // If a frame has been reported to be shown for at least (trequested - epsilon), go to the next frame. The alternative is that the frame is shown for longer than requested (trequested + frame_period).

    function check_frame(timestamp) {
        /*
        timestamp: a DOMHighResTimeStamp instance, similar to the number given by performance.now(). It is in milliseconds.
         */

        if (on_first_call === true){
            on_first_call = false;
            set_canvas_level(canvas_sequence[i_canvas_next], 100);
            i_canvas_next++;
            timestamp_draw = timestamp;
            frame_timestamps.push(performance.now());
        }
        else{
            var time_elapsed = timestamp - timestamp_draw;
            var canvas_duration_fulfilled = time_elapsed >= (t_durations[i_canvas_next - 1] - epsilon);

            if ((canvas_duration_fulfilled) && (i_canvas_next < nframes)){
                set_canvas_level(canvas_sequence[i_canvas_next], 100);
                set_canvas_level(canvas_sequence[i_canvas_next-1], 0);
                i_canvas_next++;
                timestamp_draw = timestamp;
                frame_timestamps.push(performance.now())
            }
        }

        // On last canvas
        var on_last_canvas = i_canvas_next === nframes;
        if (on_last_canvas === true){
            // Time remaining on this canvas has elapsed
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

