class Artist{

    static async drawDot(xcentroid_pixel, ycentroid_pixel, pixelradius, color, canvasobj){
        var context=canvasobj.getContext('2d');

        // Draw fixation dot
        var rad = pixelradius;

        // Convert to pixel units of window
        var xcent = this.leftbound + xcentroid_pixel
        var ycent = this.topbound + ycentroid_pixel
        context.beginPath();
        context.arc(xcent,ycent,rad,0*Math.PI,2*Math.PI);
        context.fillStyle=color; 
        context.fill();
    }
}