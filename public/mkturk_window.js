// Functions for converting spatial units of degrees, pixels, virtual pixels  etc. 


class cv{
    static deg2inches(degrees, viewing_distance_inches, offset_inches){
            var rad = this.deg2rad(degrees)
            return viewing_distance_inches * Math.atan(rad + Math.tan(offset_inches / viewing_distance_inches)) - offset_inches
        }

    static deg2pixels(degrees){
        // Return virtual pixels 
    }

    static proportion2pixels(proportion){

    }

    static deg2rad(deg){
        return deg * Math.PI / 180
    }
}


function getWindowWidth(){
    // Reference: https://www.w3schools.com/js/js_window.asp
    var w = window.innerWidth
      || document.documentElement.clientWidth
      || document.body.clientWidth;
    return w
}

function getWindowHeight(){
    // Reference: https://www.w3schools.com/js/js_window.asp
    var w = window.innerHeight
      || document.documentElement.clientHeight
      || document.body.clientHeight;
    return w

}

function _dpr(){
  var devicePixelRatio = window.devicePixelRatio || 1
  return devicePixelRatio
}