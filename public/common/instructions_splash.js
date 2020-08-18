function run_instructions(instructions_html, disable_button){
    /*
    instructions_html: String
    disable_button: boolean

    Creates and displays a div (at z-level 103) with a constituent span which displays the instructions_html.
    A button is created that will close the div.
    If disable_button === true, the button is disabled.
    */

    var div = document.createElement("div");
    div.setAttribute("id", 'instructions_div');
    div.style.position = "fixed";
    div.style.top = "50%";
    div.style.left = "50%";
    div.style.height = "80%";
    div.style.width = "80%";
    div.style.transform = "translate(-50%, -50%)";
    div.style.display = 'flex';
    div.style['align-items'] = 'center';
    div.style['flex-direction'] = 'column';
    div.style['font-size'] = '14px';
    div.style['z-index'] = '103';
    div.style['font-family'] = '\'Helvetica Neue\', serif';
    div.style['text-align'] = 'left';
    div.style.color = '#4B4B4B';
    div.style['background-color'] = '#E4E4E4';
    div.style.visibility = 'visible';
    div.style['border-radius'] = '8px';
    div.style['border-color'] = '#E6E6E6';
    div.style['border-style'] = 'solid';
    div.style['padding-right'] = '1%';
    div.style['padding-left'] = '1%';

    var span = document.createElement('span');
    span.innerHTML = instructions_html;
    div.appendChild(span);

    var button = document.createElement('button');


    var resolve_func;
    function _user_clicked(){
        div.style.display = 'none';
        resolve_func()
    }
    button.onclick = _user_clicked;
    button.disabled = disable_button;
    if (disable_button === true){
        button.innerHTML = 'Preview Mode. Accept the HIT if you would like to participate!'
    }
    else{
        button.innerHTML = 'I understand the instructions and would like to begin the task.'
    }

    div.appendChild(button);

    document.body.appendChild(div);
    //document.getElementById("main").appendChild(div);

    return new Promise(function(resolve, reject){
        resolve_func = resolve;
    })

}