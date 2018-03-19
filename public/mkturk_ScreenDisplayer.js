class ScreenDisplayer{
constructor(bounds){
    
    this.canvas_blank = cf.new_canvas('canvas_blank', bounds['height'], bounds['width'], true)
    this.canvas_blank.style['z-index'] = 50

    this.canvas_front = this.canvas_blank

}

async build(){

}

execute_canvas_sequence(sequence, t_durations){
    if(typeof(t_durations) == "number"){
        t_durations = [t_durations]
    }
    if(sequence.constructor != Array){
        sequence = [sequence]
    }

    var resolveFunc
    var errFunc
    var p = new Promise(function(resolve,reject){
        resolveFunc = resolve;
        errFunc = reject;
    }).then();

    var lastframe_timestamp = undefined;
    var frame_unix_timestamps = []

    var prev_canvasobj = this.canvas_front
    var current_frame_index = -1
    var frames_left_to_animate = sequence.length

    var _this = this


    function updateCanvas(timestamp){

        // If time to show new frame OR first frame, 
        if (timestamp - lastframe_timestamp >= t_durations[current_frame_index] || lastframe_timestamp == undefined){
            current_frame_index++;
            frame_unix_timestamps[current_frame_index] = performance.now() //in milliseconds, rounded to nearest hundredth of a millisecond
            // Move canvas in front
            var curr_canvasobj = sequence[current_frame_index]
            prev_canvasobj.style.zIndex="0";
            curr_canvasobj.style.zIndex="100";
            prev_canvasobj = curr_canvasobj;

            lastframe_timestamp = timestamp
            //console.log('lastframe_timestamp', lastframe_timestamp)
            frames_left_to_animate--
            
        }; 
        // continue if not all frames shown
        if (frames_left_to_animate>0){
            window.requestAnimationFrame(updateCanvas);
        }
        else{
            _this.canvas_front = curr_canvasobj
            resolveFunc(frame_unix_timestamps);
        }
    }

    //requestAnimationFrame advantages: goes on next screen refresh and syncs to browsers refresh rate on separate clock (not js clock)
    window.requestAnimationFrame(updateCanvas); // kick off async work
    return p

}
}





