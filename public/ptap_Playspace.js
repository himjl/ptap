class Playspace2{
    // An object that is instantiated with the viewing parameters of the environnment (i.e. viewing distance, virtual pixels, desired playspace dimensions), and then provides canvas creation and drawing operations that are requested in units of degrees and playspace proportions

    constructor(
        virtualPixelsPerInch, 
        playspaceViewingDistanceInches, 
        playspaceWidthVisualAngle, 
        playspaceHeightVisualAngle,
        ){

        this.viewingDistanceInches = playspaceViewingDistanceInches
        this.widthVisualAngle = playspaceWidthVisualAngle
        this.heightVisualAngle = playspaceHeightVisualAngle
        this.virtualPixelsPerInch = virtualPixelsPerInch

        this.height = this.deg2pixels(this.heightVisualAngle)
        this.width = this.deg2pixels(this.widthVisualAngle)

        this.canvasPointers = {}
    }

    get_new_canvas(canvasId){
        // returns new, transparent canvas object with dimensions of Playspace
        var canvasobj = cf.new_canvas(canvasId, this.width, this.height, true)
        this.canvasPointers[canvasId] = canvasobj
        return canvasobj
    }


    // ******* Fundamental drawing functions ******************
    draw_image(canvasobj, image, xCentroidProportion, yCentroidProportion, diameterProportion){
        // diameterProportion: the diameter of the largest dimension of the image, in units of Playspace proportions
        
        var xCentroidPixels = xCentroidProportion * this.width 
        var yCentroidPixels = yCentroidProportion * this.height

        if (image.naturalWidth > image.naturalHeight){
            var diameterPixels = diameterProportion * this.width
        }
        else{
            var diameterPixels = diameterProportion * this.height
        }

        cf.draw_image(canvasobj, image, xCentroidPixels, yCentroidPixels, diameterPixels)
    }

    draw_circle(canvasobj, xCentroidProportion, yCentroidProportion, diameterProportion, color){
        // diameterProportion: the diameter of the circle, in units of the smallest dimension of the playspace 
        if(this.height < this.width){
            var diameterPixels = this.height * diameterProportion
        }
        else{
            var diameterPixels = this.width * diameterProportion
        }

        var xPixels = xCentroidProportion * this.width 
        var yPixels = yCentroidProportion * this.height 

        cf.draw_circle(canvasobj, xPixels, yPixels, diameterPixels, color)
    }

    draw_rectangle(canvasobj, xCentroidProportion, yCentroidProportion, widthProportion, heightProportion, color){
        var xPixels = this.width * xCentroidProportion
        var yPixels = this.height * yCentroidProportion
        var widthPixels = this.width * widthProportion
        var heightPixels = this.height * heightProportion
        cf.draw_rectangle(canvasobj, color, alpha, xPixels, yPixels, widthPixels, heightPixels)
    }

    fill_canvas(canvasobj, color){
        cf.fill_canvas(canvasobj, color)

    }

    clear_canvas(canvasobj){
        cf.clear_canvas(canvasobj)
    }

    // ******* Some common canvas operations ******************
    // reflects standard settings of author @mil; provided for convenience.
    fill_gray(canvasobj){
        // the neutral gray color
        cf.fill_canvas(canvasobj, '#7F7F7F')
    }

    draw_punish(canvasobj){
        var punishColor = 'black'
        var punishAlpha = 1
        
        var widthPixels = this.width * 2/3
        var heightPixels = this.height * 2/3 


        var x = this.width/2 - widthPixels/2
        var y = this.height/2 - heightPixels/2

        this.fill_gray(canvasobj)
        cf.draw_rectangle(canvasobj, punishColor, punishAlpha, x, y, widthPixels, heightPixels)
    }

    draw_reward(canvasobj){
        var punishColor = '#00cc00'
        var punishAlpha = 0.5
        
        var widthPixels = this.width * 2/3
        var heightPixels = this.height * 2/3 

        var x = this.width/2 - widthPixels/2
        var y = this.height/2 - heightPixels/2
        this.fill_gray(canvasobj)
        cf.draw_rectangle(canvasobj, punishColor, punishAlpha, x, y, widthPixels, heightPixels)
    }

    draw_eye_fixation_dot(canvasobj, xCentroidProportion, yCentroidProportion){

        var width = parseFloat(canvasobj.style.width)
        var height = parseFloat(canvasobj.style.height)

        var diameterPixels = Math.max(this.deg2pixels(0.2), 4) // at least 4 pixels at its widest 
        var xPixels = width * xCentroidProportion 
        var yPixels = height * yCentroidProportion 
        cf.draw_circle(canvasobj, xPixels, yPixels, diameterPixels, '#2d2d2d')
    }



    // ******* Spatial conversion functions *******
    deg2pixels(degrees){
        return deg2pixels_core(degrees, this.virtualPixelsPerInch, this.viewingDistanceInches)
    }
    pixels2deg(px){
        // assume centered about gaze todo

        throw "Not implemented yet"
    }

    deg2propX(degrees){
        // Degrees of visual angle to Playspace proportion (x dimension)
        if(degrees.constructor == Array){
            var _this = this
            return degrees.map(x => _this.deg2pixels(x)/_this.width)
        }
        var px = this.deg2pixels(degrees)
        return px / this.width

    }
    deg2propY(degrees){
        // Degrees of visual angle to Playspace proportion (y dimension)
        if(degrees.constructor == Array){
            var _this = this
            return degrees.map(x => _this.deg2pixels(x)/_this.height)
        }

        var px = this.deg2pixels(degrees)
        return px / this.height
    }
    propY2pixels(propY){

        if(propY.constructor == Array){
            var pxSeq = []
            for (var i = 0; i < propY.length; i ++){
                pxSeq.push(propY[i] * this.height)
            }
            return pxSeq
        }
        var px = propY * this.height
        return px
    }
    propX2pixels(propX){
        if(propX.constructor == Array){
            var pxSeq = []
            for (var i = 0; i < propX.length; i ++){
                pxSeq.push(propX[i] * this.width)
            }
            return pxSeq
        }
        var px = propX * this.width
        return px
    }

    // ********************************************
}

//// End playspace



// Canvas drawing operations. Utilized by Playspace to draw on canvases with correct spatial units
class cf{ // "Canvas Fabricator"
    static async draw_image(
        canvasobj, 
        images, 
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
    static clear_canvas(canvasobj){
        var context = canvasobj.getContext('2d')
        context.clearRect(0, 0, canvas.width, canvas.height);
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
        //canvasobj.style.border='1px dotted #E6E6E6' 

        canvasobj.style.width=width+'px'; // Set browser canvas display style to be workspace_width
        canvasobj.style.height=height+'px';

        // Draw blank gray 
        //context.fillStyle="#7F7F7F"; 
        //context.fillRect(0,0,canvasobj.width,canvasobj.height);


        // Remove overflow?
        //https://www.w3schools.com/cssref/pr_pos_overflow.asp

        context.imageSmoothingEnabled = use_image_smoothing // then nearest neighbor?

        if(_ratio !== 1){
          this.scaleContext(context)
        }
    } 

    static draw_border(canvasobj){
        canvasobj.style.border = '1px dotted #E6E6E6' 
    }
    
    static remove_border(canvasobj){
        canvasobj.style.border = 'none'
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


    static scaleContext(context){
       var devicePixelRatio = window.devicePixelRatio || 1
       var backingStoreRatio = context.webkitBackingStorePixelRatio ||
       context.mozBackingStorePixelRatio ||
       context.msBackingStorePixelRatio ||
       context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1 // /1 by default for chrome?
        var _ratio = devicePixelRatio / backingStoreRatio

        context.scale(_ratio, _ratio)  // x, y
    }


}



