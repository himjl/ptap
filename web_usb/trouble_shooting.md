# Launching Google Chrome with WebUSB enabled, on Mac OSX:

The Chromium team has disabled WebUSB as of March 2018, amid phishing exploits involving WebUSB hardware. 
However, one can re-enable WebUSB functionality by typing the following into the command line (e.g. in Terminal or iTerm): 

    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --enable-features=WebUSB

## Source: 
https://bugs.chromium.org/p/chromium/issues/detail?id=819197

Refer to the following comment by reillyg@chromium.org: 

        As you may be already aware members of the security research community have identified a vulnerability in some models of U2F token that allows them to be exploited via a phishing attack using WebUSB. Out of an abundance of caution we have disabled WebUSB in Chrome to protect users while we roll out an update which includes the ability to block access to these vulnerable devices specifically.
        We apologize for the inconvenience and thank you for your patience as we work through this issue.
        To manually re-enable WebUSB you may add the flag "--enable-features=WebUSB" to the Chrome command line. To do this on Windows, right click on the "Google Chrome" application shortcut, select Properties and add the string " --enable-features=WebUSB" to the end of the line in the box labeled "Target".