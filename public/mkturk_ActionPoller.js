class ActionPollerClass{
    constructor(event_types, bounds){
        // ['mousemove', 'touchmove', 'touchstart', 'onclick']

        this.event_types = event_types    
        this.calibrateBounds(bounds)    
        this._response_promise

        this._resolveFunc
        this._errFunc

        var _this = this

        this.actionLog = {}
        this.actionLog['t'] = []
        this.actionLog['x'] = []
        this.actionLog['y'] = []
        this.actionLog['type'] = []

        this.eventType2eventCode = {'mousemove':'mmv', 'mouseup':'mclk', 'touchmove':'dg', 'touchstart':'tp'}
        this.supportedEventTypes = ['mousemove', 'mouseup', 'touchmove', 'touchstart']

        this.loggingActions = false
        this.listening = false
        this.attached = false 
        this.useComplementAsRegion = false

        this.actionCentroids = []
        this.actionRadii = []

        this.trackNullActions = false // todo: move into constructor


        this.recordActionEvent = function(x, y, t, event_type){
            // Adds event to action log 

            //console.log('x:', x, ' y:', y, ' t:', t)
            if(this.loggingActions == true){
                this.actionLog['t'].push(t)
                this.actionLog['x'].push(x)
                this.actionLog['y'].push(y)
                this.actionLog['type'].push(this.eventType2eventCode[event_type])

            }
        }


        this.handleActionEvent = function(x, y, t, event_type){
            
            var inside = false
            
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
                        console.log('Resolved', event_type, outcome)
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
                        console.log('Resolved2',event_type, outcome)
                    this._resolveFunc(outcome)
                }   
            }
        }

        this.handleTouchEvent = function(event){
            // https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Supporting_both_TouchEvent_and_MouseEvent
            event.preventDefault() // prevents downstream call of click listener (default for browsers to ensure compatibility with mouse-only websites)
            var t = Math.round(performance.now()*1000)/1000
            var x = event.targetTouches[0].pageX - _this.leftBound
            var y = event.targetTouches[0].pageY - _this.topBound
            _this.recordActionEvent(x, y, t, event.type)
            _this.handleActionEvent(x, y, t, event.type)
            
        }  

        this.recordTouchEvent = function(event){
            event.preventDefault() // prevents downstream call of click listener (default for browsers to ensure compatibility with mouse-only websites)
            var t = Math.round(performance.now()*1000)/1000
            var x = event.targetTouches[0].pageX - _this.leftBound
            var y = event.targetTouches[0].pageY - _this.topBound
            _this.recordActionEvent(x, y, t, event.type)
        }

        this.handleMouseEvent = function(event){
            var t = Math.round(performance.now()*1000)/1000
            var x = event.pageX - _this.leftBound 
            var y = event.pageY - _this.topBound
            _this.recordActionEvent(x, y, t, event.type)
            _this.handleActionEvent(x, y, t, event.type)
            }

        this.recordMouseEvent = function(event){
            var t = Math.round(performance.now()*1000)/1000
            var x = event.pageX - _this.leftBound 
            var y = event.pageY - _this.topBound
            _this.recordActionEvent(x, y, t, event.type)
        }
    }
     
    start_action_tracking(){
        this.loggingActions = true 
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
        this.leftBound = bounds['leftBound']
        this.rightBound = bounds['rightBound']
        this.topBound = bounds['topBound']
        this.bottomBound = bounds['bottomBound']

    }
    create_action_regions(xCentroidPixels, yCentroidPixels, diameterPixels){
        // assumes circular 
        this.actionRadii = []
        this.actionCentroids = []

        if(this.attached == false){
            this.add_event_listener()
            this.attached = true 
        }
        if(typeof(xCentroidPixels) == "number"){
            xCentroidPixels = [xCentroidPixels]
            yCentroidPixels = [yCentroidPixels]
            diameterPixels = [diameterPixels]
        }
 
        for (var i = 0; i < xCentroidPixels.length; i++){
            this.actionCentroids.push([xCentroidPixels[i], yCentroidPixels[i]])
            this.actionRadii.push(diameterPixels[i]/2)
        }
        
        
        
    }

    Promise_wait_until_active_response(){
        // 
        var _this = this
        this.listening = true
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

        if(this.attached == true){
            console.log('already attached.')
            return
        }
        if(typeof(this.event_types) == "string"){
            var event_types = [this.event_types]
        }
        else{
            var event_types = this.event_types
        }

        for(var i = 0; i < event_types.length; i++){
            if(event_types[i] == 'touchmove' || event_types[i] == 'touchstart' || event_types[i] == 'touchend'){
                window.addEventListener(event_types[i], this.handleTouchEvent, {passive:false})
            }
            else if(event_types[i] == 'mousemove' || event_types[i] == 'mouseup'){
                window.addEventListener(event_types[i], this.handleMouseEvent)
            }
            
            //console.log('Added ', event_types[i])
        }   

        // Record all the rest of the events

        if(this.trackNullActions == true){
            for (var i = 0; i < this.supportedEventTypes.length; i++){
                var e = this.supportedEventTypes[i]
                if (this.event_types.includes(e)){
                    continue
                }

                if(e == 'touchmove' || e == 'touchstart' || e == 'touchend'){
                    window.addEventListener(e, this.recordTouchEvent, {passive:false}) //https://github.com/bevacqua/dragula/issues/468
                }
                else if(e == 'mousemove' || e == 'mouseup'){
                    window.addEventListener(e, this.recordMouseEvent)
                }
            }
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
            else if (event_types[i] == 'mousemove' || event_types[i] == 'mouseup'){
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
            'timestamp':Math.round(performance.now()*1000)/1000, 
            'x':'timed_out', 
            'y':'timed_out'})}

          setTimeout(timer_return,timeoutMsec)
        })
    }
}


