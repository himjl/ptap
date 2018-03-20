class cf{ // "Canvas Fabricator"
    static async draw_image(canvasobj, images, 
        xcentroids_pixels, 
        ycentroids_pixels,
        diameter_pixels,
        ){

        if(images.constructor == Array){
                // Iterate over the images in this frame and draw them all
                for (var i_image = 0; i_image<images.length; i_image++){

                    await this._drawImage(
                        images[i_image], 
                        xcentroids_pixels[i_image], 
                        ycentroids_pixels[i_image], 
                        diameter_pixels[i_image], 
                        canvasobj)
                }
            }

            else{
                await this._drawImage(images, xcentroids_pixels, 
                    ycentroids_pixels,
                    diameter_pixels,
                    canvasobj)
            }
        }

    static draw_circle(canvasobj, xPixels, yPixels, diameterPixels, color){

        var context=canvasobj.getContext('2d');

        context.beginPath();
        context.arc(xPixels,yPixels,diameterPixels/2,0*Math.PI,2*Math.PI);
        context.fillStyle=color; 
        context.fill();
    }

    static draw_rectangle(canvasobj, color, alpha, xPixels, yPixels, widthPixels, heightPixels){
        var context=canvasobj.getContext('2d');
        context.fillStyle=color 
        context.globalAlpha = alpha
        
        context.fillRect(xPixels, yPixels, widthPixels,heightPixels);

        context.fill()
    }

    static fill_canvas(canvasobj, color){
        var context = canvasobj.getContext('2d');
        context.fillStyle = color;
        context.fillRect(0, 0, parseFloat(canvasobj.style.width), parseFloat(canvasobj.style.height));
        context.fill();

    }

    static new_canvas(canvas_id, width, height, use_image_smoothing){
        use_image_smoothing = false || use_image_smoothing
        var canvasobj = document.createElement('canvas')
        canvasobj.id = canvas_id
        this.setupCanvas(canvasobj, width, height, use_image_smoothing)
        document.body.appendChild(canvasobj)
        return canvasobj 
    }

    static setupCanvas(canvasobj, width, height, use_image_smoothing){

        // Returns a horizontally (and vertically?) centered canvas 

        use_image_smoothing =  use_image_smoothing || false 
        var context = canvasobj.getContext('2d')

        var devicePixelRatio = window.devicePixelRatio || 1
        var backingStoreRatio = context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatioproportion2pixels ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1 // /1 by default for chrome?

        var _ratio = devicePixelRatio / backingStoreRatio

        canvasobj.width = width * _ratio;
        canvasobj.height = height * _ratio;

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

        canvasobj.style.width=width+'px'; // Set browser canvas display style to be workspace_width
        canvasobj.style.height=height+'px';

        // Draw blank gray 
        //context.fillStyle="#7F7F7F"; 
        //context.fillRect(0,0,canvasobj.width,canvasobj.height);


        // Remove overflow?
        //https://www.w3schools.com/cssref/pr_pos_overflow.asp

        context.imageSmoothingEnabled = use_image_smoothing // then nearest neighbor?

        if(_ratio !== 1){
          scaleContext(context)
        }
    } 

    static async _drawImage(image, xcentroid_pixel, ycentroid_pixel, diameter_pixels, canvasobj){

        // Special cases for 'image'
        if(image == 'dot'){
            await this.drawDot(xcentroid_pixel, ycentroid_pixel, diameter_pixels, 'white', canvasobj)
            return
        }
        if(image == 'blank'){
            await this.renderBlank(canvasobj)
            return
        }

        var nativeWidth = image.naturalWidth 
        var nativeHeight = image.naturalHeight

        if (nativeHeight > nativeWidth){
            var drawHeight = diameter_pixels
            var drawWidth = diameter_pixels * nativeWidth / nativeHeight
        }
        else{
            var drawWidth = diameter_pixels 
            var drawHeight = diameter_pixels * nativeHeight / nativeWidth
        }

        // in units of window
        var original_left_start = xcentroid_pixel - diameter_pixels/2 // in virtual pixel coordinates
        var original_top_start = ycentroid_pixel - diameter_pixels/2

        var context = canvasobj.getContext('2d')
        await context.drawImage(image, original_left_start, original_top_start, drawWidth, drawHeight)

        return 
    }

    static async drawText(textString, fontSize, color, xcentroid_pixel, ycentroid_pixel, canvasobj){
        var context = canvasobj.getContext('2d')
        fontSize = fontSize || 8
        color = color || 'black'
        context.font = fontSize+"px Arial"
        context.fillStyle = color
        context.fillText(textString, xcentroid_pixel, ycentroid_pixel)
        context.fill()

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
 
async function bufferFixation(fixationFramePackage){

    var xcentroid_pixel = fixationFramePackage['fixationXCentroidPixels'] 
    var ycentroid_pixel = fixationFramePackage['fixationYCentroidPixels']
    var fixationDiameter_pixels = fixationFramePackage['fixationDiameterPixels'] 
    // input arguments in playspace units 

    // Clear canvas if different 
    if (this.last_fixation_xcentroid == xcentroid_pixel 
        && this.last_fixation_ycentroid == ycentroid_pixel
        && this.last_fixation_diameter == fixationDiameter_pixels
        && this.last_eyeFixation_xcentroid == fixationFramePackage['eyeFixationXCentroidPixels']
        && this.last_eyeFixation_ycentroid == fixationFramePackage['eyeFixationYCentroidPixels']
        && this.last_eyeFixation_diameter == fixationFramePackage['eyeFixationDiameterPixels']
        && this.last_eyeFixation_drawn == fixationFramePackage['drawEyeFixationDot']
        ){
        // TODO also check for changes to eye fixation
        return 
    }

    await this.renderBlank(this.canvas_fixation)

    // Draw touch initiation dot
    await this.drawDot(
                    xcentroid_pixel, 
                    ycentroid_pixel, 
                    fixationDiameter_pixels, 
                    'white', 
                    this.canvas_fixation)

    // Draw eye fixation dot 
    if(fixationFramePackage['drawEyeFixationDot'] == true){
        await this.drawDot(
                            fixationFramePackage['eyeFixationXCentroidPixels'], 
                            fixationFramePackage['eyeFixationYCentroidPixels'], 
                            fixationFramePackage['eyeFixationDiameterPixels'], 
                            '#2d2d2d', 
                            this.canvas_fixation
                        )
    } 
   

    this.last_fixation_xcentroid = xcentroid_pixel
    this.last_fixation_ycentroid = ycentroid_pixel
    this.last_fixation_diameter = fixationDiameter_pixels
    this.last_eyeFixation_xcentroid = fixationFramePackage['eyeFixationXCentroidPixels']
    this.last_eyeFixation_ycentroid = fixationFramePackage['eyeFixationYCentroidPixels']
    this.last_eyeFixation_diameter = fixationFramePackage['eyeFixationDiameterPixels']
    this.last_eyeFixation_drawn = fixationFramePackage['drawEyeFixationDot']
}

function togglePlayspaceBorder(on_or_off){
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