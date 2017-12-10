class PlaySpaceClass{
    constructor(ScreenDisplayer, Reinforcer, ActionPoller, PlaySpaceDegrees, 
        ){

        this.ScreenDisplayer = ScreenDisplayer
        this.ActionPoller = ActionPoller
        this.Reinforcer = Reinforcer
        this.SoundPlayer = new SoundPlayerClass()

        // Default dimensions
        this.height = 768 
        this.width = 768 
        this.leftbound = 0 
        this.rightbound = this.width
        this.topbound = 0
        this.bottombound = this.height 
    }

    async build(){
        await this.SoundPlayer.build()
        window.addEventListener('resize', this.onWindowResize)
    }

    calibrateBounds(estimated_eye_screen_distance_inches, estimated_screen_virtual_pixels_per_inch, 
        estimated_grid_vertical_offset_inches, intended_playspace_degrees_of_visual_angle){


        var design_playspace_physical_inches = cv.deg2inches(intended_playspace_degrees_of_visual_angle, 
            estimated_eye_screen_distance_inches, estimated_grid_vertical_offset_inches) 

        var design_playspace_virtual_pixels = estimated_screen_virtual_pixels_per_inch * design_playspace_physical_inches

        // Get window size
        var windowHeight = getWindowHeight()
        var windowWidth = getWindowWidth()

        var screen_margin = 0.15
        var max_allowable_playspace_dimension = Math.round(Math.min(windowHeight, windowWidth))*(1-screen_margin)

        var min_dimension = Math.min(max_allowable_playspace_dimension, design_playspace_virtual_pixels)
        var min_dimension = Math.ceil(min_dimension)

        this.height = min_dimension
        this.width = min_dimension 

        this.leftbound = Math.floor((windowWidth - this.width)/2) // in units of window
        this.rightbound = Math.floor(windowWidth-(windowWidth - this.width)/2)
        this.topbound = Math.floor((windowHeight - this.height)/2)
        this.bottombound = Math.floor(windowHeight-(windowHeight - this.height)/2)

    }   

    function onWindowResize(){
      // on window resize 
      var windowHeight = getWindowHeight()
      var windowWidth = getWindowWidth()

      
      this.leftbound = Math.floor((windowWidth - this.width)/2) // as these are in units of the window, they should be updated when the window changes 
      this.rightbound = Math.floor(windowWidth-(windowWidth - this.width)/2)
      this.topbound = Math.floor((windowHeight - this.height)/2)
      this.bottombound = Math.floor(windowHeight-(windowHeight - this.height)/2)

      console.log('onWindowResize', this.leftbound, this.topbound)
    }

    
    async run_trial(trialPackage){

        // ************ Prebuffer trial assets ***************

        // Fixation
        await this.ScreenDisplayer.bufferFixation(
            trialPackage['fixationCentroid'] , 
            trialPackage['fixationRadius'] )

        // Stimulus sequence
        await this.ScreenDisplayer.bufferStimulusSequence(
            trialPackage['sampleImage'], 
            trialPackage['sampleOn'], 
            trialPackage['sampleOff'], 
            trialPackage['sampleRadius'], 
            trialPackage['samplePlacement'], 
            trialPackage['testImage'], 
            trialPackage['testRadius'], 
            trialPackage['testPlacement'])

        // *************** Run trial *************************

        // SHOW BLANK
        await this.ScreenDisplayer.displayBlank()

        // RUN FIXATION
        this.ActionPoller.create_action_regions(
            trialPackage['fixationPlacement'], 
            trialPackage['fixationRadius'])

        var t_fixationOn = await this.ScreenDisplayer.displayFixation()
        var fixationOutcome = await this.ActionPoller.Promise_wait_until_active_response()


        // RUN STIMULUS SEQUENCE
        var t_SequenceTimestamps = await this.ScreenDisplayer.displayStimulusSequence()

        this.ActionPoller.create_action_regions(
            trialPackage['choiceCentroids'], 
            trialPackage['choiceRadius'])

        if(trialPackage['choiceTimeLimit'] > 0){
            var actionPromise = Promise.race([
                                this.ActionPoller.Promise_wait_until_active_response(), 
                                this.ActionPoller.timeout(trialPackage['choiceTimeLimit'])]) 
        }
        else{
            var actionPromise = this.ActionPoller.Promise_wait_until_active_response()
        }

        var actionOutcome = await actionPromise
        var rewardAmount = trialPackage['choiceRewardAmounts'][actionOutcome['actionIndex']]

        // Deliver reinforcement
        var t_reinforcementOn = performance.now()
        var p_sound = SP.play_sound('reward_sound')
        var p_visual = this.ScreenDisplayer.displayReward()
        var p_primaryReinforcement = this.Reinforcer.deliver_reinforcement(rewardAmount)
        await Promise.all([p_primaryReinforcement, p_visual]) 
        var t_reinforcementOff = performance.now()


        // *************** Write down trial outcome *************************
        var trialOutcome = {}
        trialOutcome['return'] = rewardAmount 
        trialOutcome['action'] = actionOutcome['actionIndex']
        trialOutcome['responseX'] = actionOutcome['x']
        trialOutcome['responseY'] = actionOutcome['y']
        trialOutcome['fixationX'] = fixationOutcome['x']
        trialOutcome['fixationY'] = fixationOutcome['y']
        trialOutcome['i_fixationBag'] = trialPackage['i_fixationBag']
        trialOutcome['i_fixationId'] = trialPackage['i_fixationId']
        trialOutcome['i_sampleBag'] = trialPackage['i_sampleBag']
        trialOutcome['i_sampleId'] = trialPackage['i_sampleId']
        trialOutcome['i_testBag'] = trialPackage['i_testBag']
        trialOutcome['i_testId'] = trialPackage['i_testId']
        trialOutcome['taskNumber'] = TaskStreamer.taskNumber
        trialOutcome['timestampStart'] = fixationOutcome['timestamp']
        trialOutcome['timestampFixationOnset'] = 
        trialOutcome['timestampFixationAcquired'] = fixationOutcome['timestamp']
        trialOutcome['timestampResponse'] = actionOutcome['timestamp']
        trialOutcome['timestampReinforcementOn'] = t_reinforcementOn
        trialOutcome['timestampReinforcementOff'] = t_reinforcementOff
        trialOutcome['trialNumberTask'] = TaskStreamer.trialNumberTask 
        trialOutcome['trialNumberSession'] = TaskStreamer.trialNumberSession
        trialOutcome['timestampStimulusOn'] = t_SequenceTimestamps[0]
        trialOutcome['timestampStimulusOff'] = t_SequenceTimestamps[1]
        trialOutcome['timestampChoiceOn'] = t_SequenceTimestamps.slice(-1)[0]
        trialOutcome['reactionTime'] = Math.round(actionOutcome['timestamp'] - timestampChoiceOn)

        return trialOutcome
    }
}


class ScreenDisplayer{
    async bufferStimulusSequence(
        sampleImage, 
        sampleOn,
        sampleOff, 
        sampleScale, 
        samplePlacement, 
        testImages,  
        testScale, 
        testPlacement,
        ){

    }

    drawDot(color, xproportion, yproportion, rproportion){

        return bbox
    }

    drawImageAsDegrees(image, xdegreesOffset, ydegreesOffset, rdegrees){
        // assert in bounds, otherwise just draw as max

        return bbox
    }

    drawImageAsPlayspaceProportion(image, xproportion, yproportion, rproportion){

    }

    drawImageAsPixels(image, xpixels, ypixels, rpixels){

    }


    async displayStimulusSequence(){

    }

    async bufferSequence(sequenceID, 
        frameImages, 
        frameScales, 
        framePlacements, 
        frameDurations){

    }

    async bufferFixation(fixationCentroid, 
        fixationScale){

    }

    async displayBlank(){

    }

    async displayFixation(){
        // if nothing has changed, don't rebuffer (common usage to have same fixation each time)
        
        // should handle hard coded case for dots

        return timestamp
    }

    async displayPunish(){

    }

    async displayReward(show){
        if(show == false){
            return
        }

    }

    async displaySequence(sequenceID){
        // assumes idx 0 = stimulus on 
        // idx 1 = stimulus off 
        

        return frameTimestamps
    }

    constructor(){
        this._sequence_canvases = {} // key: sequence. key: frame. value: canvas 
        this.canvas_sequences = {} // key: sequence_id
        this.time_sequences = {} // key: sequence_id

        this.canvas_blank = this.createCanvas('canvas_blank')
        this.canvas_blank.style['z-index'] = 50

        this.canvas_front = this.canvas_blank

        this.canvas_reward = this.createCanvas('canvas_reward')
        this.canvas_punish = this.createCanvas('canvas_punish')


        this.canvas_fixation = this.createCanvas('canvas_fixation', true)


        this.renderReward(this.canvas_reward)
        this.renderPunish(this.canvas_punish) 
    }
    async displaySequence(sequence_id){
        console.log('displaying sequence ', sequence_id)
        var sequence = this.canvas_sequences[sequence_id]
        var tsequence = this.time_sequences[sequence_id]
        var frame_unix_timestamps = await this.displayScreenSequence(sequence, tsequence)

        return frame_unix_timestamps
    }

    togglePlayspaceBorder(on_or_off){
        // Turns on / off the dotted PLAYSPACE border
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

    async bufferSequenceFrames(sequence_id, image_sequence, grid_placement_sequence, frame_durations){

        var num_frames = image_sequence.length
        
        // Draw the images on each of the canvases in this sequence
        var canvas_sequence = []
        for (var i_frame = 0; i_frame<num_frames; i_frame++){
            var frame_grid_indices = grid_placement_sequence[i_frame]
            var frame_images = image_sequence[i_frame]
            var canvasobj = this.getSequenceCanvas(sequence_id, i_frame)


            if(frame_images.constructor == Array){
                // Iterate over the images in this frame and draw them all
                for (var i_image = 0; i_image<frame_images.length; i_image++){
                    await this.renderImageAndScaleIfNecessary(frame_images[i_image], frame_grid_indices[i_image], canvasobj)
                }
            }

            else{
                // Draw the single image in this frame 

                if(frame_grid_indices.constructor == Array){
                    frame_grid_indices = frame_grid_indices[0]
                }
                
                await this.renderImageAndScaleIfNecessary(frame_images, frame_grid_indices, canvasobj)
            }
            
            canvas_sequence.push(canvasobj)
        
        }

        this.canvas_sequences[sequence_id] = canvas_sequence
        this.time_sequences[sequence_id] = frame_durations
    }   

    async displayBlank(){
        await this.renderBlank(this.canvas_blank)
        await this.displayScreenSequence(this.canvas_blank, 0)
    }

    async displayFixation(gridindex){
        await this.renderBlank(this.canvas_fixation)

        var boundingBoxesFixation = this.renderFixationDot(gridindex, PLAYSPACE._gridwidth*0.4, 'white', this.canvas_fixation)
        var frame_timestamps = await this.displayScreenSequence(this.canvas_fixation, 0)
        return [boundingBoxesFixation, frame_timestamps]
    }

    async displayReward(msec_duration){
        var frame_unix_timestamps = await this.displayScreenSequence([this.canvas_blank, this.canvas_reward, this.canvas_blank],
            [0, msec_duration, 0])
        return frame_unix_timestamps
    }
    async displayPunish(msec_duration){
        var frame_unix_timestamps = await this.displayScreenSequence([this.canvas_blank, this.canvas_punish, this.canvas_blank],
            [0, msec_duration, 0])


        return frame_unix_timestamps
    }
    renderFixationDot( gridindex, dot_pixelradius, color, canvasobj){
        var context=canvasobj.getContext('2d');

        // do not clear in case user would like to draw multiple

        // Draw fixation dot
        var rad = dot_pixelradius;
        var xcent = PLAYSPACE._xgridcent[gridindex]; // playspace units
        var ycent = PLAYSPACE._ygridcent[gridindex];
        context.beginPath();
        context.arc(xcent,ycent,rad,0*Math.PI,2*Math.PI);
        context.fillStyle=color; 
        context.fill();

        // Define (rectangular) boundaries of fixation
        var boundingBoxesFixation = {'x':[xcent-rad, xcent+rad], 'y':[ycent-rad, ycent+rad]}

        return boundingBoxesFixation


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
    createCanvas(canvas_id, use_image_smoothing){
        use_image_smoothing = false || use_image_smoothing
        var canvasobj = document.createElement('canvas')
        canvasobj.id = canvas_id
        setupCanvas(canvasobj, use_image_smoothing)
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
    renderBlank(canvasobj){
        var context=canvasobj.getContext('2d');
        context.fillStyle="#7F7F7F";
        var width = parseFloat(canvasobj.style.width)
        var height = parseFloat(canvasobj.style.height)

        context.fillRect(0,0,width,height);
        context.fill()
    }


    renderReward(canvasobj){
        var context=canvasobj.getContext('2d');
        context.fillStyle="#00cc00";
        context.globalAlpha = 0.5
        var width = parseFloat(canvasobj.style.width)
        var height = parseFloat(canvasobj.style.height)


        var square_width = PLAYSPACE._gridwidth * 2
        var square_height = PLAYSPACE._gridheight * 2
        context.fillRect(width/2 - square_width/2,height/2 - square_width/2, square_width,square_height);

        context.fill()
    }

    renderPunish(canvasobj){
        var context=canvasobj.getContext('2d');
        var width = parseFloat(canvasobj.style.width)
        var height = parseFloat(canvasobj.style.height)

        context.fillStyle="black";
        var square_width = PLAYSPACE._gridwidth * 2
        var square_height = PLAYSPACE._gridheight * 2
        context.fillRect(width/2 - square_width/2,height/2 - square_width/2, square_width,square_height);
        
        context.fill();
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

    async renderImageAndScaleIfNecessary(image, grid_index, canvasobj){
      // Render image onto the playspace

      // Special cases for 'image'
      if(image == 'dot'){
        await this.renderFixationDot(grid_index, PLAYSPACE._gridwidth*0.45, "white", canvasobj)
        return
      }
      if(image == 'blank'){
        await this.renderBlank(canvasobj)
        return
      }

      var context = canvasobj.getContext('2d')

      var devicePixelRatio = window.devicePixelRatio || 1
      var backingStoreRatio = context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1 // /1 by default for chrome?

      var _ratio = devicePixelRatio / backingStoreRatio

      var original_left_start = PLAYSPACE._xgridcent[grid_index] - PLAYSPACE._gridwidth/2// in virtual pixel coordinates
      var original_top_start = PLAYSPACE._ygridcent[grid_index] - PLAYSPACE._gridheight/2


      context.drawImage(image, original_left_start, original_top_start, PLAYSPACE._gridwidth, PLAYSPACE._gridheight)


      var xbound=[original_left_start, original_left_start+PLAYSPACE._gridwidth];
      var ybound=[original_top_start, original_top_start+PLAYSPACE._gridheight];

      xbound[0]=xbound[0]
      xbound[1]=xbound[1]
      ybound[0]=ybound[0]
      ybound[1]=ybound[1]
      return [xbound, ybound]
    }


}







function setupCanvas(canvasobj, use_image_smoothing){
  use_image_smoothing =  use_image_smoothing || false 
  console.log(canvasobj)
    var context = canvasobj.getContext('2d')
    
    var devicePixelRatio = window.devicePixelRatio || 1
    var backingStoreRatio = context.webkitBackingStorePixelRatio ||
      context.mozBackingStorePixelRatio ||
      context.msBackingStorePixelRatio ||
      context.oBackingStorePixelRatio ||
      context.backingStorePixelRatio || 1 // /1 by default for chrome?

    var _ratio = devicePixelRatio / backingStoreRatio

    
    canvasobj.width = PLAYSPACE.width * _ratio;
    canvasobj.height = PLAYSPACE.height * _ratio;

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
    
    canvasobj.style.width=PLAYSPACE.width+'px'; // Set browser canvas display style to be workspace_width
    canvasobj.style.height=PLAYSPACE.height+'px';

    // Draw blank gray 
    context.fillStyle="#7F7F7F"; 
    context.fillRect(0,0,canvasobj.width,canvasobj.height);
    

    // Remove overflow?
    //https://www.w3schools.com/cssref/pr_pos_overflow.asp

    console.log('Use image smoothing:', use_image_smoothing)
    context.imageSmoothingEnabled = use_image_smoothing // then nearest neighbor?


    if(_ratio !== 1){
      scaleContext(context)
    }
} 

function scaleContext(context){
   var devicePixelRatio = window.devicePixelRatio || 1
  var backingStoreRatio = context.webkitBackingStorePixelRatio ||
    context.mozBackingStorePixelRatio ||
    context.msBackingStorePixelRatio ||
    context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio || 1 // /1 by default for chrome?
  console.log('devicePixelRatio', devicePixelRatio, 'backingStoreRatio', backingStoreRatio)
  var _ratio = devicePixelRatio / backingStoreRatio

  context.scale(_ratio, _ratio) 
}

//================== IMAGE RENDERING ==================//


async function drawGridDots(){
  canvasobj = document.getElementById('touchfix')
  //canvasobj.style['z-index'] = 5
  console.log(canvasobj)

  var context = canvasobj.getContext('2d')


  var dot_pixelradius = 10
  var color = "white"

  // https://www.w3schools.com/tags/canvas_clearrect.asp
  // Draw grid dots
  var rad = dot_pixelradius;
  for (var i = 0; i < PLAYSPACE._xgridcent.length; i++){
    var xcent = PLAYSPACE._xgridcent[i];
    var ycent = PLAYSPACE._ygridcent[i];
    console.log(xcent, ycent)
    context.beginPath();
    context.arc(xcent,ycent,rad,0*Math.PI,2*Math.PI);
    context.fillStyle=color; 
    context.fill();
  }
  var tutorial_image = await SIO.load_image('tutorial_images/trackpad.png')
  await renderImageAndScaleIfNecessary(tutorial_image, 0, canvasobj)
  await renderImageAndScaleIfNecessary(tutorial_image, 6, canvasobj)
  await renderImageAndScaleIfNecessary(tutorial_image, 2, canvasobj)
  await renderImageAndScaleIfNecessary(tutorial_image, 4, canvasobj)
  await renderImageAndScaleIfNecessary(tutorial_image, 8, canvasobj)
  console.log(getWindowWidth(), getWindowHeight())
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
  console.log(canvasobj)
  console.log('_ratio', _ratio, 'xleft',xleft, 'ytop', ytop, 'wd', wd, 'ht', ht)

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


