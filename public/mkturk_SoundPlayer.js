class SoundPlayerClass{ 
  constructor(){

      this.sound_filepaths = {
      'reward_sound':'sounds/chime.wav', // chime
      'punish_sound':'sounds/bad_doot.wav', // punish sound
      'blip':'sounds/frog.wav'}

      this.current_sound_counter = 0

      this.is_built = false


      // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createBuffer


}

  async build(){
   
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    var _this = this
    console.log('build soundplayer')
    var finishedLoading = function(bufferList){
      _this.bufferedSounds = bufferList 
      return 
    }

    var soundRequests = [] 

    var bufferLoader = new BufferLoader(this.audioContext, ['sounds/chime.wav', 'sounds/bad_doot.wav'], finishedLoading)
    bufferLoader.load();
    this.is_built = true

    return 

  }

  async play_sound(name){

    // example of WebAudioAPI: https://www.html5rocks.com/en/tutorials/webaudio/intro/
    if(this.is_built == false){
      await this.build()
    }

    if (name == 'reward_sound'){
      var bufferEntry = this.bufferedSounds[0]
    }
    else if(name == 'punish_sound'){
      var bufferEntry = this.bufferedSounds[1]
    }
    else{
      return
    }
    var s = this.audioContext.createBufferSource()
    s.buffer = bufferEntry 
    s.connect(this.audioContext.destination)
    s.start(0)
    //
    return 

    
  }
}


// Source: https://www.html5rocks.com/en/tutorials/webaudio/intro/js/buffer-loader.js
function BufferLoader(context, urlList, callback) {
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array();
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferList);
      },
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }

  request.onerror = function() {
    alert('BufferLoader: XHR error');
  }

  request.send();
}

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i], i);
}


