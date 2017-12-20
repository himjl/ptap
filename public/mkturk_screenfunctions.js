function setDeviceSelection(element, devicename){
	SESSION.MechanicalTurk_DeviceSelected = devicename 
	var device_option_elements = document.querySelectorAll(".DeviceButton")
	for(var i = 0; i<device_option_elements.length; i++){
		device_option_elements[i].style['opacity'] = 0.5
		device_option_elements[i].style['border-color'] = '#ddd'
	}
	element.style['border-color'] = 'green'
	element.style['opacity'] = 1

	var continue_button = document.getElementById('CloseDeviceSelectionButton')
	continue_button.innerHTML = 'Continue'
	continue_button.disabled = false

}

function setHandSelection(element, handedness){
    SESSION.MechanicalTurk_Handedness = handedness 
    var hand_option_elements = document.querySelectorAll(".HandButton")
    for(var i = 0; i<hand_option_elements.length; i++){
        hand_option_elements[i].style['opacity'] = 0.5
        hand_option_elements[i].style['border-color'] = '#ddd'
    }
    element.style['border-color'] = 'green'
    element.style['opacity'] = 1

    var continue_button = document.getElementById('CloseHandSelectionButton')
    continue_button.innerHTML = 'Continue'
    continue_button.disabled = false

}


function toggleElement(on_or_off, element_id){
		var elem = document.getElementById(element_id)
	if(on_or_off == 0){
		elem.style.visibility = 'hidden'
	}
	else if(on_or_off == 1){
		elem.style.visibility = 'visible'
	}
}

function updateProgressbar(pct, bar_id, text_prefix, max_bar_width, innerHTML) {
	var max_bar_width = max_bar_width || 30
    var elem = document.getElementById(bar_id); 

	elem.style.width = max_bar_width*pct/100+"%" // pct + '%'; 
	elem.innerHTML = innerHTML || text_prefix + ' ' + Math.round(pct) + '%'; // text
}

function toggleProgressbar(on_or_off, bar_id){
	var elem = document.getElementById(bar_id); 

	if(on_or_off == 0){
		elem.style.visibility = 'hidden'
	}
	else if(on_or_off == 1){
		elem.style.visibility = 'visible'
	}
}


function updateCashInButtonText(trials, bonus_earned, cash_in_option){
	var elem = document.querySelector("button[name=WorkerCashInButton]")

	if(cash_in_option == false){
		var button_string = 'Bonus: $'+bonus_earned.toFixed(3)
	}
	else if(cash_in_option == true){
		var button_string = 'Bonus: $'+bonus_earned.toFixed(3)+'<br>Turn in early'
	}
	elem.innerHTML = button_string

}	
function toggleCashInButtonClickability(on_or_off){
	var elem = document.querySelector("button[name=WorkerCashInButton]")
	if(on_or_off == 0){
		elem.disabled = true
		elem.style["background-color"] = "#DBDDDF"
		elem.style["color"] = "#767373"
	}
	else{
		elem.disabled = false
		elem.style["background-color"] = "#00cc66"
		elem.style["color"] = "#f7fcf8"


	}
	return
}

function displayTerminalScreen(){
	var terminal_text = 'Thank you for completing this HIT. Please wait while it is submitted...'
	document.getElementById('terminal_splash_screen').style.zIndex = 100
	document.getElementById('terminal_splash_screen').style.innerHTML = terminal_text

}


function initializeMouseTracker(){
	TOUCHSTRING_UDPATECOUNTER = 0
    TOUCHLOG = initializeTouchLog()
    


	console.log('setupmousetracker')
	// https://stackoverflow.com/questions/7790725/javascript-track-mouse-position
	document.onmousemove = handleMouseMove;
	function handleMouseMove(event){
		t = Math.round(performance.now()*1000)/1000
		var dot, eventDoc, doc, body, pageX, pageY;

        event = event || window.event; // IE-ism

        // If pageX/Y aren't available and clientX/Y are,
        // calculate pageX/Y - logic taken from jQuery.
        // (This is to support old IE)
        if (event.pageX == null && event.clientX != null) {
            eventDoc = (event.target && event.target.ownerDocument) || document;
            doc = eventDoc.documentElement;
            body = eventDoc.body;

            event.pageX = event.clientX +
              (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
              (doc && doc.clientLeft || body && body.clientLeft || 0);
            event.pageY = event.clientY +
              (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
              (doc && doc.clientTop  || body && body.clientTop  || 0 );
        }

        TOUCHLOG['x'].push(Math.round(event.pageX))
        TOUCHLOG['y'].push(Math.round(event.pageY))
        TOUCHLOG['t'].push(Math.round(performance.now()*1000)/1000)
        TOUCHLOG['updateCounter'].push(TOUCHSTRING_UDPATECOUNTER)
        TOUCHLOG['eventType'].push('dg')

        TOUCHSTRING_UDPATECOUNTER+=1

	}
}

function initializeTouchTracker(){
	var header='pageX,pageY'
            header+=',clientXdelta_from_pageX,clientYdelta_from_pageY'
            header+=',screenXdelta_from_pageX,screenYdelta_from_pageY'
            header+=',radiusX,radiusY'
            header+=',touch_update_number'
            header+=',unix_timestamp_delta_from__'+SESSION.unixTimestampPageLoad
            header+=',Tap_or_Drag\n'
    
    TOUCHSTRING_UDPATECOUNTER = 0
    TOUCHLOG = initializeTouchLog()

	window.addEventListener('touchmove', function(event){
		// the user touched the screen
		pageX = event.targetTouches[0].pageX
		pageY = event.targetTouches[0].pageY

		clientXdelta_from_pageX = Math.round(event.targetTouches[0].clientX - pageX)
		clientYdelta_from_pageY = Math.round(event.targetTouches[0].clientY - pageY)
		
		screenXdelta_from_pageX = Math.round(event.targetTouches[0].screenX - pageX)
		screenYdelta_from_pageY = Math.round(event.targetTouches[0].screenY - pageY)

		radiusX = Math.round(event.targetTouches[0].radiusX)
		radiusY = Math.round(event.targetTouches[0].radiusY)
		t = Math.round(performance.now()*1000)/1000

		TOUCHLOG['x'].push(Math.round(pageX))
        TOUCHLOG['y'].push(Math.round(pageY))
        TOUCHLOG['t'].push(Math.round(performance.now()*1000)/1000)
        TOUCHLOG['radiusX'].push(radiusX)
        TOUCHLOG['radiusY'].push(radiusY)
        TOUCHLOG['clientXdelta_from_pageX'].push(clientXdelta_from_pageX)
        TOUCHLOG['screenYdelta_from_pageX'].push(screenYdelta_from_pageX)
        TOUCHLOG['updateCounter'].push(TOUCHSTRING_UDPATECOUNTER)
        TOUCHLOG['eventType'].push('dg')
        
        TOUCHSTRING_UDPATECOUNTER+=1

	},  {passive: true})

	window.addEventListener('touchstart', function(event){

		pageX = event.targetTouches[0].pageX
		pageY = event.targetTouches[0].pageY

		clientXdelta_from_pageX = event.targetTouches[0].clientX - pageX
		clientYdelta_from_pageY = event.targetTouches[0].clientY - pageY
		
		screenXdelta_from_pageX = Math.round(event.targetTouches[0].screenX - pageX)
		screenYdelta_from_pageX = Math.round(event.targetTouches[0].screenY - pageY)

		radiusX = Math.round(event.targetTouches[0].radiusX)
		radiusY = Math.round(event.targetTouches[0].radiusY)
		t = Math.round(performance.now()*1000)/1000


        TOUCHLOG['x'].push(Math.round(pageX))
        TOUCHLOG['y'].push(Math.round(pageY))
        TOUCHLOG['t'].push(Math.round(performance.now()*1000)/1000)
        TOUCHLOG['radiusX'].push(radiusX)
        TOUCHLOG['radiusY'].push(radiusY)
        TOUCHLOG['clientXdelta_from_pageX'].push(clientXdelta_from_pageX)
        TOUCHLOG['screenYdelta_from_pageX'].push(screenYdelta_from_pageX)
        TOUCHLOG['updateCounter'].push(TOUCHSTRING_UDPATECOUNTER)
        TOUCHLOG['eventType'].push('tp')

		TOUCHSTRING_UDPATECOUNTER+=1


	},  {passive: true})

}
//passive event handlers: 
//https://stackoverflow.com/questions/39152877/consider-marking-event-handler-as-passive-to-make-the-page-more-responsive









