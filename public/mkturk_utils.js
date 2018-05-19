function getWindowWidth(){
    // Reference: https://www.w3schools.com/js/js_window.asp

    return $(window).width()

    var w = window.innerWidth
      || document.documentElement.clientWidth
      || document.body.clientWidth;
    return w
}

function getWindowHeight(){
    // Reference: https://www.w3schools.com/js/js_window.asp

    return $(window).height()

    var w = window.innerHeight
      || document.documentElement.clientHeight
      || document.body.clientHeight;
    return w
}

function wdm(s){
  // Write debug message
  console.log(s)
  var elem = document.getElementById('DebugMessageTextBox')
  elem.innerHTML = s; // text
}

class np{
  static mean(arr){
    var total = 0, i;
      for (i = 0; i < arr.length; i += 1) {
          total += arr[i];
      }
      return total / arr.length;
  }

  static sum(arr){
    var total = 0
    for (var i = 0; i < arr.length; i ++){
      total+=arr[i]
    }
    return total
  }

  static argclosest(arr, x){
    // Returns index with minimum absolute difference 
    // If there's a tie between two indices, return the lower index. 
    var diffMagnitude = undefined 
    var minIdx = 0

    for (var i = 0; i < arr.length; i++){
      diffMagnitude = Math.abs(arr[i] - x)
      if (diffMagnitude < Math.abs(arr[minIdx] - x)){
        minIdx = i 
      }
    }

    return minIdx

  }
  static choice(arr, n, replace, p){
    
    if(n == undefined){
      n = 1 
    }

    if(replace == undefined){
      replace = true
    }


    if(arr.constructor != Array){
      arr = [arr]
    }

    var L = arr.length
    if(p == undefined){
      // Execute uniform 
      p = []
      
      for (var i = 0; i < L; i ++){
        p.push(1/L)
      }
    }

    // Construct rejection sampling space
    var ubs = []
    
    var region_ub = 0 
    var region_width = 0
    for (var i = 0; i < L; i++){
      
      if (p[i] == undefined){
        region_width = 0
      }
      else{
        region_width = p[i]
      }
      region_ub += region_width
      ubs.push(region_ub)
    }
    var regionTotalWidth = ubs[ubs.length-1]
    

    var result = []
    var locSample = 0

    var whichSide = undefined
    var iClosest = undefined 
    var iSample = undefined 


    for(var i = 0; i < n; i++){
      locSample = Math.random() * regionTotalWidth

      // Find closest entry 
      iClosest = this.argclosest(ubs, locSample)

      whichSide = locSample - ubs[iClosest]

      if (whichSide > 0){

        // Get the next nonzero width region
        for (var j = iClosest + 1; j < ubs.length; j++){
          if (ubs[j] != ubs[iClosest]){
            iSample = j
            break
          }
        }
      }
      else if(whichSide < 0){
        iSample = iClosest
      }
      else if(whichSide == 0){
        iSample = iClosest 
      }
      else{
        console.log('Hmm....should not be here')
        console.log(iSample, iClosest, whichSide)
      }
      result.push(arr[iSample])
    }
    
    if(result.length == 1){
      result = result[0]
    }
    
    return result
  }

  static arange(start_, stop, step_){
    if (stop == undefined && step_ == undefined){
      stop = start_
      start_ = 0
    }
    if(step_ == undefined){
      step_ = 1
    }


    var x =[]
    for (var i = start_; i < stop; i = i+step_){
      x.push(i)
    }
    return x
  }

  static zeros(n){
    var x = []
    for (var i = 0; i < n; i++){
      x.push(0)
    }
    return x
  }

  static ones(n){
    var x = []
    for (var i = 0; i < n; i++){
      x.push(1)
    }
    return x
  }

  static nans(n){
    var x = []
    for (var i = 0; i < n; i++){
      x.push(NaN)
    }
    return x
  }
  
  static xvec(n, x){
    // populates a vector of length n with x
    var y = []
    for (var i = 0; i < n; i++){
      y.push(x)
    }
    return y
  }

  static iloc(arr, idx){
    
    if(idx.constructor != Array){
      return arr[idx]
    }

    var x = []
    for (var i in idx){
      x.push(arr[idx[i]])
    }

    return x
  }
}


(function(window){
  window.utils = {
    parseQueryString: function(str) {
      var ret = Object.create(null);

      if (typeof str !== 'string') {
        return ret;
      }

      str = str.trim().replace(/^(\?|#|&)/, '');

      if (!str) {
        return ret;
      }

      str.split('&').forEach(function (param) {
        var parts = param.replace(/\+/g, ' ').split('=');
        // Firefox (pre 40) decodes `%3D` to `=`
        // https://github.com/sindresorhus/query-string/pull/37
        var key = parts.shift();
        var val = parts.length > 0 ? parts.join('=') : undefined;

        key = decodeURIComponent(key);

        // missing `=` should be `null`:
        // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
        val = val === undefined ? null : decodeURIComponent(val);

        if (ret[key] === undefined) {
          ret[key] = val;
        } else if (Array.isArray(ret[key])) {
          ret[key].push(val);
        } else {
          ret[key] = [ret[key], val];
        }
      });

      return ret;
    }
  };
})(window);



// ----- Array equality ---- 
if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});



// Shuffles an array
function shuffle(array) {

  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}


function toBytesInt16(num){
  arr = new ArrayBuffer(2) //2 bytes
  view = new DataView(arr)
  view.setUint16(0,num); //arg1: byteOffset arg3: false || undefined -> bigEndian
  arr = new Uint8Array([view.getUint8(1), view.getUint8(0)])
  return arr
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

String.prototype.hashCode = function(){
    var hash = 0;
    if (this.length == 0) return hash;
    for (i = 0; i < this.length; i++) {
        char = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}


//================== UTILITIES ==================//


function join(parts, sep){
   var separator = sep || '/';
   var replace   = new RegExp(separator+'{1,}', 'g');
   return parts.join(separator).replace(replace, separator);
}

function add(a, b) {
    // For use in .reduce
    // See 
    // https://stackoverflow.com/questions/1230233/how-to-find-the-sum-of-an-array-of-numbers
    
    // var sum = [1, 2, 3].reduce(add, 0);
    // console.log(sum); // 6

    return a + b;
}


// https://stackoverflow.com/questions/1248302/how-to-get-the-size-of-a-javascript-object
function memorySizeOf(obj, format) {
    var bytes = 0;

    function sizeOf(obj) {
        if(obj !== null && obj !== undefined) {
            switch(typeof obj) {
            case 'number':
                bytes += 8;
                break;
            case 'string':
                bytes += obj.length * 2;
                break;
            case 'boolean':
                bytes += 4;
                break;
            case 'object':
                var objClass = Object.prototype.toString.call(obj).slice(8, -1);
                if(objClass === 'Object' || objClass === 'Array') {
                    for(var key in obj) {
                        if(!obj.hasOwnProperty(key)) continue;
                        sizeOf(obj[key]);
                    }
                } else bytes += obj.toString().length * 2;
                break;
            }
        }
        return bytes;
    };

    function formatByteSize(bytes) {
        if(bytes < 1024) return bytes + " bytes";
        else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
        else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
        else return(bytes / 1073741824).toFixed(3) + " GiB";
    };

    if(format == undefined){
      return sizeOf(obj) 
    }
    return formatByteSize(sizeOf(obj));
};

