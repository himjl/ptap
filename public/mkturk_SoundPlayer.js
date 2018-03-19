class SoundPlayerClass{ 
  constructor(){

      this.sound_filepaths = {
      'reward_sound':'sounds/chime.wav', // chime
      'punish_sound':'sounds/bad_doot.wav', // punish sound
      'blip':'sounds/frog.wav'}

      this.is_buffered = {'reward_sound':false, 'punish_sound':false}
      this.current_sound_counter = 0

      this.is_built = false


      // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createBuffer

}

  async build(){
   
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.soundInstances = {} // name : preloaded sound
    this.bufferedSounds = []
    var _this = this
    
    
    console.log('build soundplayer')
    var finishedLoading = async function(bufferList){
      _this.bufferedSounds = bufferList 
      
      for (var i = 0; i < bufferList.length; i++){  
        if (i == 0){
          var name = 'reward_sound'
        }
        else if( i == 1){
          var name = 'punish_sound'
        }
        else{
          continue
        }

        var s = _this.audioContext.createBufferSource()
        s.buffer = bufferList[i] 
        s.connect(_this.audioContext.destination)
        _this.soundInstances[name] == s
        _this.is_buffered[name] = true
      }

      return 
    }

    var soundRequests = [] 

    var bufferLoader = new BufferLoader(this.audioContext, ['sounds/chime.wav', 'sounds/bad_doot.wav'], finishedLoading)
    await bufferLoader.load();
    
    this.is_built = true

    return 

  }

  async buffer_sound(name){

    var s = this.audioContext.createBufferSource()

    if(name == 'reward_sound'){
      var bufferEntry = this.bufferedSounds[0] 
    }
    else if(name == 'punish_sound'){
      var bufferEntry = this.bufferedSounds[1] 
    }
    else{
      return 
    }
    
    s.buffer = bufferEntry
    s.connect(this.audioContext.destination)
    this.soundInstances[name] = s

  }

  async play_sound(name){
    if (name == undefined){
      return 
    }

    if(this.is_built == false){
      await this.build()
    }
    if(this.soundInstances[name] == undefined){
      this.buffer_sound(name)
    }
    if(this.is_buffered[name] == false){
      this.buffer_sound(name)
    }
    this.soundInstances[name].start()
    this.is_buffered[name] = false
    this.buffer_sound(name) // Load up for next call
    
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


