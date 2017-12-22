class az{
    constructor(){

    }

    static get_workerId_from_url(){
        var workerId = this._extract_url_string('workerId', 'workerId_not_found')
        console.log('workerId:', workerId)
        return workerId
    }

    static get_assignmentId_from_url(){
        var assignmentId = this._extract_url_string('assignmentId', 'assignmentId_not_found')
        console.log('assignmentId', assignmentId)
        return assignmentId
    }

    static get_hitId_from_url(){
        var hitId = this._extract_url_string('hitId', 'hitId_not_found')
        console.log('hitId', hitId)
        return hitId
    }


    static _extract_url_string(key, defaultValue){
        var name = key
        key = key.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regexS = "[\\?&]" + key + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.href) || ["", defaultValue] 

        return results[1]
        
    }
    static detect_sandbox_mode(){
        var submitToURL = this._extract_url_string('turkSubmitTo', '')
        console.log('submittoURL', submitToURL)
        if (submitToURL.indexOf('workersandbox')!=-1){
            var inSandboxMode = true
        }
        else{
            var inSandboxMode = false
        }

        return inSandboxMode

    }
    static async get_ip_address(){
      
      var resolveFunc
      var rejectFunc
      var p = new Promise(function(resolve, reject){
          resolveFunc = resolve
          rejectFunc = reject
      })

      var xhttp = new XMLHttpRequest(); 


      try{
          xhttp.onreadystatechange = function(){
              if (this.readyState == 4 && this.status == 200){
                  resolveFunc(this.responseText)
              }
          }
      }
      catch(error){
          console.log(error)
      }
      
      xhttp.open("GET", "https://api.ipify.org?format=json", true);

      xhttp.send();
      var s = await p
      s = JSON.parse(s)

      return s['ip']       
    }

}