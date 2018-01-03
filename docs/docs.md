# Making your first task 

You can run match-to-sample (MTS) and stimulus-response (SR) sessions out-of-the-box. Here's what you need to do: 

## Installation 
* Change mkturk_install_settings.js (e.g. to use your local Dropbox app key; to specify where you would like to save things) 

## Defining your task 

A task is defined by a text file in a format called "JSON". A JSON-structured file looks like a bunch of dictionaries (e.g. key-value pairs, like {'some_key':'some_value'}) and lists (['element1', 'element2']). 

To run a session in ptap, you need to give ptap a single text file called a "sessionPackage". 

A sessionPackage has two keys: 
* GAME_PACKAGE
* ENVIRONMENT

We'll go through each key and talk about what it should consist of: 

## GAME_PACKAGE 
The GAME_PACKAGE is a dictionary that defines the logical structure and contents of the behavioral task. Here, you will tell ptap which images, rules (i.e. SR vs. MTS), rewards, punishments (e.g. timeout lengths), etc. you would like to use in the session. 

Before we get into the contents of the GAME_PACKAGE, here is the space of tasks that you could define, and the terms that are used in ptap to describe each kind of task: 

**ptap terms**
* "task": a set of images and a rule that tells you what happens if you do something for each image (e.g., always poke left if you see image 'A', but poke left if you see image 'B')
* "game": a sequence of tasks and the rules that govern transitions between them (e.g. how many trials you must do for a task and at what performance before going onto the next task), as well as what happens at the end of the sequence of tasks
* "imagebag": a group of images that are functionally identical in the context of the task; i.e. where the same outcome occurs if you do the same things to them. A common imagebag structure is a set of images with different views of a single 3D object. 



The GAME_PACKAGE itself consists of 3 keys: 

### GAME 
These are settings for 

## ENVIRONMENT 
The ENVIRONMENT is where you tell ptap about where it is being run (e.g. for monkeys or for humans on mechanical turk). These are details that are necessary to run the task correctly, but not necessary to define the task. 



