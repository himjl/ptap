class Playspace2{

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
    }

    get_new_canvas(canvasId){
        
        var canvasobj = cf.new_canvas(canvasId, this.width, this.height, true)
        // returns new, transparent canvas object with appropriate dimensions
        return canvasobj
    }

    deg2pixels(degrees){
        return deg2pixels(degrees, this.virtualPixelsPerInch, this.viewingDistanceInches)
    }
}


function deg2inches(degrees, viewingDistanceInches){

        // diameter degrees 
        // assume centered (center of diameter length at viewing normal to screen surface)
        if(degrees.constructor == Array){
            var result = []
            for (var i = 0; i<degrees.length; i++){
                var rad = deg2rad(degrees[i]/2)
                result.push(2 * viewingDistanceInches * Math.atan(rad))
            }
            return result
        }

        var rad = deg2rad(degrees/2)
        return 2 * viewingDistanceInches * Math.atan(rad) 
    }

function deg2pixels(degrees, virtualPixelsPerInch, viewingDistanceInches){
    // Return virtual pixels 
    if(degrees.constructor == Array){
        var result = []
        for (var i = 0; i<degrees.length; i++){
            var inches = deg2inches(degrees[i], viewingDistanceInches)
            result.push(Math.round(inches * virtualPixelsPerInch))
        }
        return result
    }

    var inches = deg2inches(degrees, viewingDistanceInches)
    return Math.round(inches * virtualPixelsPerInch)
}


function xprop2pixels(xproportion){
    if(xproportion.constructor == Array){
        var result = []
        for (var i = 0; i<xproportion.length; i++){
            result.push(Math.round(xproportion[i]*this.width))
        }
        return result
    }
    return Math.round(xproportion*this.width)
}

function yprop2pixels(yproportion){
    if(yproportion.constructor == Array){
        var result = []
        for (var i = 0; i<yproportion.length; i++){
            result.push(Math.round(yproportion[i]*this.height))
        }
        return result
    }
    return Math.round(yproportion*this.height)
}

function deg2rad(deg){
    if(deg.constructor == Array){
        var result = []
        for (var i = 0; i<deg.length; i++){
            result.push(deg[i] * Math.PI / 180)
        }
        return result
    }
    return deg * Math.PI / 180
}