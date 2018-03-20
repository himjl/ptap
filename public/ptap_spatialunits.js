
function deg2inches_core(degrees, viewingDistanceInches){

        // diameter degrees 
        // assume centered (center of diameter length at viewing normal to screen surface)
        if(degrees.constructor == Array){
            var result = []
            for (var i = 0; i<degrees.length; i++){
                var rad = deg2rad_core(degrees[i]/2)
                result.push(2 * viewingDistanceInches * Math.atan(rad))
            }
            return result
        }

        var rad = deg2rad_core(degrees/2)
        return 2 * viewingDistanceInches * Math.atan(rad) 
}

function pixels2deg_core(pixels, virtualPixelsPerInch, viewingDistanceInches){
    var inches = (pixels / virtualPixelsPerInch)/2 // ASSUME image is centered about normal gaze
    var rad = Math.tan(inches / viewingDistanceInches) 
    var deg = rad2deg_core(rad)
    return 2 * deg
}


function deg2pixels_core(degrees, virtualPixelsPerInch, viewingDistanceInches){
    // Return virtual pixels 
    if(degrees.constructor == Array){
        var result = []
        for (var i = 0; i<degrees.length; i++){
            var inches = deg2inches_core(degrees[i], viewingDistanceInches)
            result.push(Math.round(inches * virtualPixelsPerInch))
        }
        return result
    }

    var inches = deg2inches_core(degrees, viewingDistanceInches)
    return Math.round(inches * virtualPixelsPerInch)
}


function rad2deg_core(rad){
    return rad * (180 / Math.PI)
}
function deg2rad_core(deg){
    if(deg.constructor == Array){
        var result = []
        for (var i = 0; i<deg.length; i++){
            result.push(deg[i] * Math.PI / 180)
        }
        return result
    }
    return deg * Math.PI / 180
}