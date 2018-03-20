
class CanvasTemplates{
    // Some commonly used drawing operations. These reflect the personal preferences of author @mil. 

    static fill_gray(canvasobj){
        // the neutral gray color
        cf.fill_canvas(canvasobj, '#7F7F7F')
    }
    static draw_button(canvasobj, xProportion, yProportion, diameterProportion){
        // x = 0.5 
        // y = 0.85
        // diameterDegrees = 3 

        var width = parseFloat(canvasobj.style.width)
        var height = parseFloat(canvasobj.style.height)
        var xPixels = width * xProportion 
        var yPixels = height * yProportion 
        var diameterPixels = (width + height)/2 * diameterProportion

        cf.draw_circle(canvasobj, xPixels, yPixels, diameterPixels, 'white')

    }

    static draw_eye_fixation_dot(canvasobj, xProportion, yProportion, virtualPixelsPerInch, viewingDistanceInches){

        var width = parseFloat(canvasobj.style.width)
        var height = parseFloat(canvasobj.style.height)

        var diameterPixels = Math.max(deg2pixels(0.2, virtualPixelsPerInch, viewingDistanceInches), 4) // at least 4 pixels at its widest 
        var xPixels = width * xProportion 
        var yPixels = height * yProportion 
        cf.draw_circle(canvasobj, xPixels, yPixels, diameterPixels, '#2d2d2d')
    }

    static draw_eye_fixation_cross(canvasobj, xProportion, yProportion, diameterProportion){
        return 
    }

    static draw_punish(canvasobj, playspaceWidth, playspaceHeight, ){
        var punishColor = 'black'
        var punishAlpha = 1
        
        var widthPixels = playspaceWidth * 2/3
        var heightPixels = playspaceHeight * 2/3 


        var x = playspaceWidth/2 - widthPixels/2
        var y = playspaceHeight/2 - heightPixels/2

        cf.draw_rectangle(canvasobj, punishColor, punishAlpha, x, y, widthPixels, heightPixels)

    }

    static draw_reward(canvasobj, playspaceWidth, playspaceHeight, ){
        var punishColor = '#00cc00'
        var punishAlpha = 0.5
        
        var widthPixels = playspaceWidth * 2/3
        var heightPixels = playspaceHeight * 2/3 

        var x = playspaceWidth/2 - widthPixels/2
        var y = playspaceHeight/2 - heightPixels/2

        cf.draw_rectangle(canvasobj, punishColor, punishAlpha, x, y, widthPixels, heightPixels)

    }

}