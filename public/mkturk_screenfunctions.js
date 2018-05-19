function setDeviceSelection(element, devicename){
	UX.MechanicalTurk_DeviceSelected = devicename 
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
    UX.MechanicalTurk_Handedness = handedness 
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
	//elem.innerHTML = innerHTML || text_prefix + ' ' + Math.round(pct) + '%'; // text
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








