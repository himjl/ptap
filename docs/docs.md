# Running an example ptap session 

## 1. Start a local webserver on your machine. I use one that is run by a Python function. 

 'cd' to your ptap install directory, run the following command in your terminal, based on Python version:

 Python 2 version: 

    python -m SimpleHTTPServer [port number here; e.g. 7800]

 Python 3 version: 
    
    python -m http.server [port number here; e.g. 7800]

## 2. Open Google Chrome and navigate to 

    http://localhost:7800/

## 3. Click on the links to bring you to the following folder: 

    public/landing_pages/examples/

## 4. Select 'landingPage_MechanicalTurkMTS_to_SR.html'. 

 This will bring you to a "landing page", which is basically a webpage where the inputs to ptap are stored in the user's "local storage", which is a modern version of the browser cache. 

 The landing page then redirects you to the main mkturk.html webpage. 

 The Javascript in mkturk.html then looks inside of local storage, retrieves the inputs the landing page stored, and constructs the session. 

* In the case that ptap detects that it is running a session for Mechanical Turk, once the session is concluded (e.g. after a predetermined number of trials or a performance criterion being reached - whichever one happens first), the code sends the session data as a POST request to Amazon's webservers. When running an example on our own machine, Amazon does not accept this POST, so Amazon's webservers should display an error page upon POST submit and redirect. The POST should work when ptap is run in the context of an actual HIT. At that point, __TurkMonitor__ can be used to retrieve the data from Amazon. 

* In the case that ptap detects it is running a session for an inlab session, behavioral data is fed continuously to a Dropbox folder.

# Making your first task 

You can run match-to-sample (MTS) and stimulus-response (SR) sessions out-of-the-box. Here's what you need to do: 

## Installation 
* Change mkturk_install_settings.js appropriately (e.g. to use your local Dropbox app key; to specify where you would like to save things) 
* Upload ptap to a webserver (e.g. a local one for messing around, or a public one for everything else, like on Amazon s3)
* If you're doing inlab stuff, go to Dropbox developers and make a Dropbox app. Get the app key (and put it into mkturk_install_settings.js) and put down allowable redirect URIs (i.e. to wherever you uploaded ptap/public/mkturk.html)

## Defining your task 

A task is defined by a text file in a format called "JSON". A JSON-structured file looks like a bunch of dictionaries (e.g. key-value pairs, like {'some_key':'some_value'}) and lists (['element1', 'element2']). 

To run a session in ptap, you need to give ptap a single text file called a "sessionPackage". 

Before we get into the contents of the sessionPackage, here is the space of tasks that you could define, and the terms that are used in ptap to describe each kind of task: 

## **ptap** concepts
* "task": a set of images and a rule that tells you what happens if you do something for each image (e.g., always poke left if you see image 'A', but poke left if you see image 'B')
* "game": a sequence of tasks and the rules that govern transitions between them (e.g. how many trials you must do for a task and at what performance before going onto the next task), as well as what happens at the end of the sequence of tasks
* "imagebag": a group of images that are functionally identical in the context of the task; i.e. where the same outcome occurs if you do the same things to them. A common imagebag structure is a set of images with different views of a single 3D object

Together, these three concepts comprehensively express a space of behavioral tasks (using the term 'task' loosely here, now that we have a more formal definition for it).  

# How to fill out a sessionPackage

A sessionPackage has two keys: 
* **GAME_PACKAGE**
* **ENVIRONMENT**

We'll go through each key and talk about what it should consist of: 

## GAME_PACKAGE 
The GAME_PACKAGE is a dictionary that defines the logical structure and contents of the behavioral task. Here, you will tell ptap which images, rules (i.e. SR vs. MTS), rewards, punishments (e.g. timeout lengths), etc. you would like to use in the session. 

Along these lines, the GAME_PACKAGE consists of 3 keys: 

### GAME 
These are settings for the game as a whole. You need to specify: 

    'GAME': {
            'gameId':'failsafeGameSettings',
            "periodicRewardIntervalMsec":0,
            "periodicRewardAmount":0,
            "bonusUSDPerCorrect":0.0005, 
            "onFinish":"terminate", // can be terminate, continue
            "minimumTrials":50,
            "maximumTrials":200,
            "randomSeed":undefined,
            }

These are fairly self explanatory. 

### TASK_SEQUENCE
This is a list of dictionaries, each of which looks like: 

    {
                    "taskType":"SR", // MTS
                    "sampleBagNames":['stimulus_objectome_airplane', 'stimulus_objectome_ant'], 
                    "rewardMap":{"stimulus_objectome_airplane":[1, 0], "stimulus_objectome_ant":[0, 1]}, // blank if MTS 
                    "fixationXCentroid":0.5,
                    "fixationYCentroid":0.8,
                    "fixationDiameterDegrees":6,
                    "sampleXCentroid":0.5,
                    "sampleYCentroid":0.5,
                    "sampleDiameterDegrees":8,
                    "actionXCentroid":[0.2, 0.8], 
                    "actionYCentroid":[0.8, 0.8],
                    "actionDiameterDegrees":[6, 6],
                    "choiceXCentroid":[0.2, 0.8],
                    "choiceYCentroid":[0.8, 0.8],
                    "choiceDiameterDegrees":[6, 6],
                    "sampleOnMsec":200, 
                    "sampleOffMsec":0,
                    "choiceTimeLimitMsec":5000,
                    "punishTimeOutMsec":400,
                    "punishStreakTimeOutMultiplier":1.2,
                    "rewardTimeOutMsec":150,
                    "probabilityRepeatWhenWrong":0,
                    "averageReturnCriterion":0, 
                    "minTrialsCriterion":50,
                    "sampleSampleWithReplacement":true, // true / false  
                } 

The "rewardMap" key is unique to SR. For each key in "rewardMap", a list is specified that gives reward amounts for selecting an action (in the same order as specified in actionXCentroid, actionYCentroid...). It looks like: 
    
    "rewardMap":{"stimulus_objectome_airplane":[1, 0], "stimulus_objectome_ant":[0, 1]}, // blank if MTS 
    
The "choiceMap" key is unique to MTS and looks like: 

    "choiceMap":{"obj0_stimuli":"obj0_token", 
                  "obj1_stimuli":"obj1_token", 
                  }

### IMAGEBAGS
This is a dictionary with 

    {'bagname':[url_or_dropbox_path_to_image0, url_or_dropbox_path_to_image1 ...]}


### Wrapping them up in a single dictionary: 

That concludes the contents of the GAME_PACKAGE, which should then look like: 

    gamePackage = {'IMAGEBAGS':*your_imagebags_here*, 
                                      'GAME':*your_game_here*, 
                                      'TASK_SEQUENCE':*your_task_sequence_here*}


## ENVIRONMENT 
The ENVIRONMENT is where you tell ptap about where it is being run (e.g. for monkeys or for humans on mechanical turk). These are details that are necessary to run the task correctly, but not necessary to define the task. 

    ENVIRONMENT = {
                        'playspace_degreesVisualAngle':24,
                        'playspace_verticalOffsetInches':0, 
                        'playspace_viewingDistanceInches':8, 
                        'screen_virtualPixelsPerInch':143.755902965,
                        'primary_reinforcer_type':'juice', 
                        'action_event_type':['mouseup', 'touchstart', 'touchmove'],
                        'rigEnvironment':'monkeybox', 
                        "bonusUSDPerCorrect":0.0005,
                        "juiceRewardPer1000Trials":250,
                    }  

# Putting it all together

So, your sessionPackage should look like: 

    sessionPackage = {'ENVIRONMENT':*your_environment_here*, 
                      'GAME_PACKAGE':{'IMAGEBAGS':*your_imagebags_here*, 
                                      'GAME':*your_game_here*, 
                                      'TASK_SEQUENCE':*your_task_sequence_here*}}

Once you have this in order, copy and paste it into the landing page template where it says "\__SESSION_PACKAGE_GOES_HERE__"(which is located at public/landing_pages/landing_page_template.html), or use a script to do so using a string replace.

Once you've done that, there are only three easy things left to do: 
1. In the landing page template, write down the name of your s3 bucket where it says \__S3_INSTALL_BUCKET_GOES_HERE__ (where you have uploaded the entire ptap "public" folder)
2. If you are doing an inlab experiment, in the landing page template, replace \__AGENTID_GOES_HERE__ with the name of the subject that will be using this landing page. 
3. Upload the landing page to a webserver (e.g. your local webserver, or to s3). Please note that for Android tablets, you must upload the landing page to /public/landing_pages (or some other directory in /public) for localstorage to work correctly.  

Then you're done!


# Beyond copying and pasting 

In the sessionPackage above, you can replace any of the ingredients with a url or relative dropbox path (where '/' is the Dropbox folder) to a textfile containing the necessary information. 

For example, imagebags can be quite **large** so it can be convenient to simply write it down once, upload it to a public url (such as a bucket you own on Amazon s3), and just write down the url to the imagebags. It would look something like: 

    sessionPackage = {'ENVIRONMENT':*your_environment_here*, 
                      'GAME_PACKAGE':{'IMAGEBAGS':"https://s3.amazonaws.com/milresources/ImageBagMetaDefinitions/MutatorTraining_FullVarWithBGSetA.json", 
                                      'GAME':*your_game_here*, 
                                      'TASK_SEQUENCE':*your_task_sequence_here*}}

Or you could just replace the entire sessionPackage with a url or relative dropbox path: 

    sessionPackage = "/mySessionPackagesOnDropbox/sessionPackage1.txt"


