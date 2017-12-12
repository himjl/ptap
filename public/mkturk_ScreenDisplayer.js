class ScreenDisplayer{
    constructor(bounds){

        this.calibrateBounds(bounds)

        this.last_fixation_xcentroid = undefined 
        this.last_fixation_ycentroid = undefined
        this.last_fixation_radius = undefined 

        this._sequence_canvases = {} // key: sequence. key: frame. value: canvas 
        this.canvas_sequences = {} // key: sequence_id
        this.time_sequences = {} // key: sequence_id

        this.canvas_blank = this.createCanvas('canvas_blank')
        this.canvas_blank.style['z-index'] = 50

        this.canvas_front = this.canvas_blank

        this.canvas_reward = this.createCanvas('canvas_reward')
        this.canvas_punish = this.createCanvas('canvas_punish')
        this.canvas_fixation = this.createCanvas('canvas_fixation', true)
    }

    async build(){

        await this.renderBlank(this.canvas_blank)
        await this.renderReward(this.canvas_reward)
        await this.renderPunish(this.canvas_punish) 

    }

    calibrateBounds(bounds){
        // Called by Playspace whenever the window size changes 

        this.height = bounds['height']
        this.width = bounds['width'] 

        this.leftbound = bounds['leftbound']
        this.rightbound = bounds['rightbound']
        this.topbound = bounds['topbound']
        this.bottombound = bounds['bottombound']

    }   

    getSequenceCanvas(sequence_id, i_frame){
        if(this._sequence_canvases[sequence_id] == undefined){
            this._sequence_canvases[sequence_id] = []
        }
        if(this._sequence_canvases[sequence_id][i_frame] == undefined){
            this._sequence_canvases[sequence_id][i_frame] = this.createCanvas(sequence_id+'_frame'+i_frame)
        }

        return this._sequence_canvases[sequence_id][i_frame]
    }

    
    async displayBlank(){
        await this.displayScreenSequence(this.canvas_blank, 0)
    }


    async drawDot(xcentroid_pixel, ycentroid_pixel, pixelradius, color, canvasobj){
        var context=canvasobj.getContext('2d');

        // Draw fixation dot
        var rad = pixelradius;

        // Convert to pixel units of window
        var xcent = xcentroid_pixel 
        var ycent = ycentroid_pixel
        context.beginPath();
        context.arc(xcent,ycent,rad,0*Math.PI,2*Math.PI);
        context.fillStyle=color; 
        context.fill();
    }


    async bufferStimulusSequence(
        sampleImage, 
        sampleOn, 
        sampleOff, 
        sampleRadiusPixels, 
        sampleXCentroid, 
        sampleYCentroid,
        choiceImage, 
        choiceRadiusPixels, 
        choiceXCentroid, 
        choiceYCentroid
        ){


        var frame_canvases = []
        var frame_durations = []
        // Draw sample screen
        var sampleCanvas = this.getSequenceCanvas('stimulus_sequence', 0)
        sampleCanvas = await this.drawImagesOnCanvas(sampleImage, sampleXCentroid, sampleYCentroid, sampleRadiusPixels, sampleCanvas)
        frame_canvases.push(sampleCanvas)
        frame_durations.push(sampleOn)

        // Optionally draw blank delay screen
        if(sampleOff > 0){
            var delayCanvas = this.getSequenceCanvas('stimulus_sequence', 1)
            delayCanvas = await this.renderBlank(blankCanvas)
            frame_canvases.push(delayCanvas)
            frame_durations.push(sampleOff)
        }

        // Draw test screen
        var testCanvas = this.getSequenceCanvas('stimulus_sequence', frame_canvases.length)
        testCanvas = await this.drawImagesOnCanvas(choiceImage, choiceXCentroid, choiceYCentroid, choiceRadiusPixels, testCanvas)
        frame_canvases.push(testCanvas)
        frame_durations.push(undefined)

        this.canvas_sequences['stimulus_sequence'] = frame_canvases
        this.time_sequences['stimulus_sequence'] = frame_durations

    }

    async drawImagesOnCanvas(images, 
        xcentroids_pixels, 
        ycentroids_pixels,
        radius_pixels,
        canvasobj){

        if(images.constructor == Array){
                // Iterate over the images in this frame and draw them all
                for (var i_image = 0; i_image<images.length; i_image++){

                    await this._drawImage(
                        images[i_image], 
                        xcentroids_pixels[i_image], 
                        ycentroids_pixels[i_image], 
                        radius_pixels[i_image], 
                        canvasobj)
                }
            }

            else{
                await this._drawImage(images, xcentroids_pixels, 
                    ycentroids_pixels,
                    radius_pixels,
                    canvasobj)
            }
        }

        async _drawImage(image, xcentroids_pixel, ycentroids_pixel, radius_pixel, canvasobj){

            // Special cases for 'image'
            if(image == 'dot'){
                await this.drawDot(xcentroid_pixel, ycentroid_pixel, fixationRadius_pixel, 'white', canvasobj)
                return
            }
            if(image == 'blank'){
                await this.renderBlank(canvasobj)
                return
            }

            var nativeWidth = image.naturalWidth 
            var nativeHeight = image.naturalHeight

            if (nativeHeight > nativeWidth){
                var drawHeight = fixationRadius_pixel * 2
                var drawWidth = 2 * fixationRadius_pixel * nativeWidth / nativeHeight
            }
            else{
                var drawWidth = fixationRadius_pixel * 2
                var drawHeight = 2 * fixationRadius_pixel * nativeHeight / nativeWidth
            }

            // in units of window
            var original_left_start = this.leftbound + xcentroid_pixel - fixationRadius_pixel // in virtual pixel coordinates
            var original_top_start = this.topbound + ycentroid_pixel - fixationRadius_pixel

            var context = canvasobj.getContext('2d')
            await context.drawImage(image, original_left_start, original_top_start, drawWidth, drawHeight)

            return 

        }

 
    async bufferFixation(
        xcentroid_pixel, 
        ycentroid_pixel, 
        fixationRadius_pixel, 
        ){
        // input arguments in playspace units 

        // Clear canvas if different 
        if (this.last_fixation_xcentroid == xcentroid_pixel 
            && this.last_fixation_ycentroid == ycentroid_pixel
            && this.last_fixation_radius == fixationRadius_pixel){
            return 
    }
    await this.renderBlank(this.canvas_fixation)
    await this.drawDot(
        xcentroid_pixel, 
        ycentroid_pixel, 
        fixationRadius_pixel, 
        'white', 
        this.canvas_fixation)

    this.last_fixation_xcentroid = xcentroid_pixel
    this.last_fixation_ycentroid = ycentroid_pixel
    this.last_fixation_radius = fixationRadius_pixel

}
renderBlank(canvasobj){
    var context=canvasobj.getContext('2d');
    context.fillStyle="#7F7F7F";
    var width = parseFloat(canvasobj.style.width)
    var height = parseFloat(canvasobj.style.height)

    context.fillRect(0,0,width,height);
    context.fill()
}

async displayFixation(){
    var timestamps = await this.displayScreenSequence(this.canvas_fixation, 0)
    return timestamps
}

async displayStimulusSequence(){
    var timestamps = await this.displayScreenSequence(
        this.canvas_sequences['stimulus_sequence'], 
        this.time_sequences['stimulus_sequence'])
    return timestamps
}


async displayReward(msec_duration){
    var timestamps = await this.displayScreenSequence([this.canvas_blank, this.canvas_reward, this.canvas_blank],
        [0, msec_duration, 0])
    return timestamps
}

async displayPunish(msec_duration){
    var timestamps = await this.displayScreenSequence([this.canvas_blank, this.canvas_punish, this.canvas_blank],
        [0, msec_duration, 0])
    return timestamps
}

togglePlayspaceBorder(on_or_off){
        // Turns on / off the dotted border
        if(on_or_off == 1){
            var bs = '1px dotted #E6E6E6' // border style 
        }
        else{
            var bs = '0px'
        }
        this.canvas_blank.style.border = bs
        this.canvas_reward.style.border = bs
        this.canvas_punish.style.border = bs
        this.canvas_fixation.style.border = bs

        for (var sequence in this._sequence_canvases){
            if(this._sequence_canvases.hasOwnProperty(sequence)){
                for (var i = 0; i<this._sequence_canvases[sequence].length; i ++){
                    this._sequence_canvases[sequence][i].style.border = bs
                }
            }
        }
    }


    createCanvas(canvas_id, use_image_smoothing){
        use_image_smoothing = false || use_image_smoothing
        var canvasobj = document.createElement('canvas')
        canvasobj.id = canvas_id
        this.setupCanvas(canvasobj, use_image_smoothing)
        document.body.appendChild(canvasobj)
        return canvasobj 
    }

    displayScreenSequence(sequence, t_durations){
        console.log('calling sequence', sequence, 't_durations', t_durations)
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
        //console.log('seq', sequence, 'tseq', tsequence)

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
                console.log('lastframe_timestamp', lastframe_timestamp)
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
    

    drawRectangle(canvasobj, width_pixels, height_pixels, color, alpha){
        var context=canvasobj.getContext('2d');
        context.fillStyle=color 
        context.globalAlpha = alpha
        var width = parseFloat(canvasobj.style.width)
        var height = parseFloat(canvasobj.style.height)

        var square_width = width_pixels
        var square_height = height_pixels
        context.fillRect(width/2 - square_width/2,height/2 - square_width/2, square_width,square_height);

        context.fill()
    }
    renderReward(canvasobj){
        var rewardColor =  "#00cc00"
        var rewardAlpha = 0.5
        var width_pixels = this.width * 2/3
        var height_pixels = this.height * 2/3 
        this.drawRectangle(canvasobj, width_pixels, height_pixels, rewardColor, rewardAlpha)
    }

    renderPunish(canvasobj){

        var punishColor = 'black'
        var punishAlpha = 1
        
        var width_pixels = this.width * 2/3
        var height_pixels = this.height* 2/3 

        this.drawRectangle(canvasobj, width_pixels, height_pixels, punishColor, punishAlpha)
    }


    async bufferCanvasWithImage(image, canvasobj, dx, dy, dwidth, dheight){
        // In playspace units
        var context = canvasobj.getContext('2d')
        context.fillStyle="#7F7F7F"; 
        context.fillRect(0,0,canvasobj.width,canvasobj.height);

        context.drawImage(image, dx, dy, dwidth, dheight)

        var _boundingBox = [{}]
        _boundingBox[0].x = [dx,dx+dwidth]
        _boundingBox[0].y = [dy, dy+dheight]

        return _boundingBox
    }

    setupCanvas(canvasobj, use_image_smoothing){
      use_image_smoothing =  use_image_smoothing || false 
      var context = canvasobj.getContext('2d')

      var devicePixelRatio = window.devicePixelRatio || 1
      var backingStoreRatio = context.webkitBackingStorePixelRatio ||
      context.mozBackingStorePixelRatio ||
      context.msBackingStorePixelRatioproportion2pixels ||
      context.oBackingStorePixelRatio ||
      context.backingStorePixelRatio || 1 // /1 by default for chrome?

      var _ratio = devicePixelRatio / backingStoreRatio


      canvasobj.width = this.width * _ratio;
      canvasobj.height = this.height * _ratio;

    // Center canvas 
    // https://stackoverflow.com/questions/5127937/how-to-center-canvas-in-html5
    canvasobj.style.padding = 0

    canvasobj.style.margin = 'auto'
    canvasobj.style.display="block"; //visible
    canvasobj.style.position = 'absolute'
    canvasobj.style.top = 0
    canvasobj.style.bottom = 0
    canvasobj.style.left = 0  
    canvasobj.style.right = 0
    canvasobj.style.border='1px dotted #E6E6E6' 
    
    canvasobj.style.width=this.width+'px'; // Set browser canvas display style to be workspace_width
    canvasobj.style.height=this.height+'px';

    // Draw blank gray 
    context.fillStyle="#7F7F7F"; 
    context.fillRect(0,0,canvasobj.width,canvasobj.height);
    

    // Remove overflow?
    //https://www.w3schools.com/cssref/pr_pos_overflow.asp

    context.imageSmoothingEnabled = use_image_smoothing // then nearest neighbor?


    if(_ratio !== 1){
      scaleContext(context)
  }
} 



}



function scaleContext(context){
   var devicePixelRatio = window.devicePixelRatio || 1
   var backingStoreRatio = context.webkitBackingStorePixelRatio ||
   context.mozBackingStorePixelRatio ||
   context.msBackingStorePixelRatio ||
   context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio || 1 // /1 by default for chrome?
    var _ratio = devicePixelRatio / backingStoreRatio

    context.scale(_ratio, _ratio) 
}



async function renderImageOnCanvasLiterally(image, grid_index, canvasobj){

  var devicePixelRatio = window.devicePixelRatio || 1
  var backingStoreRatio = context.webkitBackingStorePixelRatio ||
  context.mozBackingStorePixelRatio ||
  context.msBackingStorePixelRatio ||
  context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio || 1 // /1 by default for chrome?

    var _ratio = devicePixelRatio / backingStoreRatio


  // Centers canvas vertically and horizontally
  canvasobj.style.width = canvasobj.width / _ratio + 'px'
  canvasobj.style.height = canvasobj.height / _ratio + 'px'
  canvasobj.style.left = 0
  canvasobj.style.right = 0
  canvasobj.style.top = 0
  canvasobj.style.bottom = 0
  canvasobj.style.margin = 'auto'
  

  var xleft=NaN;
  var ytop=NaN;
  var xbound=[];
  var ybound=[];

  wd = image.width
  ht = image.height
  xleft = Math.round(PLAYSPACE._xgridleft[grid_index])
  ytop = Math.round(PLAYSPACE._ygridtop[grid_index])

  context.drawImage(
    image, // Image element
    xleft, // dx: Canvas x-coordinate of image's top-left corner. 
    ytop // dy: Canvas y-coordinate of  image's top-left corner. 
    ); // dheight. height of drawn image.

  // For drawing cropped regions of an image in the canvas, see alternate input argument structures,
  // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
  
  // Bounding boxes of images on canvas; in units of window
  xbound=[xleft, xleft+wd];
  ybound=[ytop, ytop+ht];

  xbound[0]=xbound[0]
  xbound[1]=xbound[1]
  ybound[0]=ybound[0]
  ybound[1]=ybound[1]
  return [xbound, ybound]
}


