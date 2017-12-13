class ActionPollerClass{
    constructor(event_types, bounds){
        // ['mousemove', 'touchmove', 'touchstart']

        this.event_types = event_types    
        this.calibrateBounds(bounds)    
        this._response_promise
        this.boundingBoxes = []

        this._resolveFunc
        this._errFunc

        var _this = this

        this.actionLog = {}
        this.actionLog['t'] = []
        this.actionLog['x'] = []
        this.actionLog['y'] = []
        this.actionLog['type'] = []

        this.loggingTouches = false
        this.listening = false
        this.attached = false 
        this.useComplementAsRegion = false

        this.actionCentroids = []
        this.actionRadii = []

        this.handleActionEvent = function(x, y, t){
            console.log(x, y, t)
            var inside = false
            if(this.loggingTouches == true){
                this.actionLog['t'].push(t)
                this.actionLog['x'].push(x)
                this.actionLog['y'].push(y)
                this.actionLog['type'].push(event.type)

            }
            if(_this.listening == true){

                for (var i = 0; i < this.actionCentroids.length; i++){
                    inside = _this.check_if_inside_circle(
                        x, 
                        y, 
                        this.actionCentroids[i][0], 
                        this.actionCentroids[i][1], 
                        this.actionRadii[i])
                    if(inside == true){
                        this.listening = false
                        var outcome = {'actionIndex':i, 
                                        'timestamp':t, 
                                        'x':x, 
                                        'y':y}
                        this._resolveFunc(outcome)
                    }
                }
                
                if(this.useComplementAsRegion == true){
                    this.listening = false 
                    var outcome = {
                        'actionIndex':'complement', 
                        'timestamp':t, 
                        'x':x, 
                        'y':y}
                }   
            }
        }

        var _this = this
        this.handleTouchEvent = function(event){
            console.log(event)
            var t = performance.now()
            var x = event.targetTouches[0].pageX - _this.leftbound
            var y = event.targetTouches[0].pageY - _this.topbound
            
            _this.handleActionEvent(x, y, t)
            
        }  

        this.handleMouseEvent = function(event){
            console.log(event)
            var t = performance.now()

            var x = event.pageX - _this.leftbound // In PLAYSPACE units. 
            var y = event.pageY - _this.topbound

            _this.handleActionEvent(x, y, t)
            }
    }
     

    start_logging(){
        this.loggingTouches = true 
        this.actionLog = {}
        this.actionLog['t'] = []
        this.actionLog['x'] = []
        this.actionLog['y'] = []
        this.actionLog['type'] = []

        if(this.attached == false){
            this.add_event_listener()
            this.attached = true 
        }

    }

    calibrateBounds(bounds){
        this.leftbound = bounds['leftbound']
        this.rightbound = bounds['rightbound']
        this.topbound = bounds['topbound']
        this.bottombound = bounds['bottombound']

    }
    create_action_regions(xCentroidPixels, yCentroidPixels, radiusPixels, useComplementAsRegion){
        // assumes circular 

        if(this.attached == false){
            this.add_event_listener()
            this.attached = true 
        }
        if(typeof(xCentroidPixels) == "number"){
            xCentroidPixels = [xCentroidPixels]
            yCentroidPixels = [yCentroidPixels]
            radiusPixels = [radiusPixels]
        }
 
        for (var i = 0; i < xCentroidPixels.length; i++){
            this.actionCentroids.push([xCentroidPixels[i], yCentroidPixels[i]])
        }
        this.actionRadii = radiusPixels
        
        this.useComplementAsRegion = useComplementAsRegion

        this.listening = true


    }

    Promise_wait_until_active_response(){
        // 
        var _this = this
        this._response_promise = new Promise(function(resolve, reject){
            _this._resolveFunc = resolve
            _this._errFunc = reject
        })
        var outcome = this._response_promise
        return outcome


    }

    check_if_inside_circle(x, y, xc, yc, r){
        var dxs = Math.pow(x - xc, 2)
        var dys = Math.pow(y - yc, 2)

        if (dxs + dys <= Math.pow(r, 2)){
            return true
        }
        else{
            return false
        }

    }


    add_event_listener(){

        if(typeof(this.event_types) == "string"){
            var event_types = [this.event_types]
        }
        else{
            var event_types = this.event_types
        }

        for(var i = 0; i < event_types.length; i++){
            if(event_types[i] == 'touchmove' || event_types[i] == 'touchstart' || event_types[i] == 'touchend'){
                window.addEventListener(event_types[i], this.handleTouchEvent, {passive:true})
            }
            else{
                window.addEventListener(event_types[i], this.handleMouseEvent)
            }
            
            console.log('Added ', event_types[i])
        }   
    }

    close_listener(){
        if(typeof(this.event_types) == "string"){
            var event_types = [this.event_types]
        }
        else{
            var event_types = this.event_types
        }

        for(var i = 0; i < event_types.length; i++){
            if(event_types[i] == 'touchmove' || 'touchstart' || 'touchend'){
                window.removeEventListener(event_types[i], this.handleTouchEvent, {passive:true})
            }
            else{
                window.removeEventListener(event_types[i], this.handleMouseEvent)
            }
            
            console.log('Removed ', event_types[i])
        }
    }

    timeout(timeoutMsec){
      return new Promise(
        function(resolve, reject){
          var timer_return = function(){resolve({
            "actionIndex":'timed_out', 
            'timestamp':performance.now(), 
            'x':'timed_out', 
            'y':'timed_out'})}

          setTimeout(timer_return,timeoutMsec)
        })
    }
}


