class cf{ // "Canvas Fabricator"
    static async draw_image(images, 
        xcentroids_pixels, 
        ycentroids_pixels,
        diameter_pixels,
        canvasobj){

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

    static draw_circle(xPixels, yPixels, diameterPixels, color, canvasobj){

        var context=canvasobj.getContext('2d');

        context.beginPath();
        context.arc(xPixels,yPixels,diameterPixels/2,0*Math.PI,2*Math.PI);
        context.fillStyle=color; 
        context.fill();
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
            context.fillStyle="#7F7F7F"; 
            context.fillRect(0,0,canvasobj.width,canvasobj.height);
            

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

}