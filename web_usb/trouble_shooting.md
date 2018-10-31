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


# Launching Google Chrome with WebUSB enabled, on Android:
Since non-rooted Android hardware devices do not allow user access to the terminal, it is not as straightforward to launch chrome with the "--enable-features=WebUSB" flag. 

Apparently, there is a way to do it though, without rooting your device. I followed the instructions written by Josh Lee, found on this StackOverflow post:
https://stackoverflow.com/questions/29280796/run-google-chrome-with-flags-on-android 

I'll write out exactly what I did below, though. You can follow these instructions instead of the one in the S.O. post, if you'd like. 

0. On your workstation (e.g., your laptop or desktop computer), install ADB, the Android Debug Utility. Running Mac OS, I did it by installing Android Studio, then following Option 3 in this StackOverflow post: 
https://stackoverflow.com/questions/17901692/set-up-adb-on-mac-os-x

1. Make sure your Chrome app is version 61 or above on your tablet, where WebUSB begins to be supported.
2. On your tablet's version of Chrome, in chrome://flags, turn on enable-command-line-on-non-rooted-devices. This will allow the tablet running Chrome to utilize command-line arguments when opened, which you will write in the enxt step.

3. On your workstation's terminal program, write the following command (in iTerm, on my Mac, while the tablet was connected): 
adb shell 'echo --enable-features=WebUSB > /data/local/tmp/chrome-command-line'

Basically, this step writes a file called "chrome-command-line" with the string '--enable-features=WebUSB' on your tablet's filesystem. 

4. Force stop your tablet's version of Chrome. 

5. You should be done. To check, open up the tablet's Chrome's web console with remote debugging, and type in "navigator.usb" in the console. It should return a USB object, not undefined. 



# Installing ptap on a new android tablet

On the tablet,
1. Update Chrome to version 61+
2. Turn on Remote USB debugging (https://www.phonearena.com/news/How-to-enable-USB-debugging-on-Android_id53909)
3. Go to chrome://flags, turn on enable-command-line-on-non-rooted-devices.
4. Go to chrome://flags, enable Experimental Web Platform Features, 
5. activate experimental canvas features (where is this?)
6. Deactivate the redirect on the ptap landing page 
7. Add the landing page to your homescreen
8. Done!