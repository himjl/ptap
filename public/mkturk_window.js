// Functions for converting spatial units of degrees, pixels, virtual pixels  etc. 



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