# **ptap**

**ptap** (pronounced pee-tap) is a free, browser-based psychophysics platform that runs **in-lab** and **Amazon Mechanical Turk** experiments. It is a former branch of mkturk (built originally by E. Issa while at MIT). 

## What you need to get started

* A device with **Google Chrome**
* A **static web content server**:  
    * For messing around on your own computer, you can use **localhost**: python [SimpleHTTPServer](https://docs.python.org/2/library/simplehttpserver.html)  
    * For MTurk experiments, you need to create **public URLs**: try [s3](aws.amazon.com/s3) (5GB of storage/month is free and enough for the base **ptap** code and a reasonable number of stimulus images), [Apache](https://httpd.apache.org/), ...
* Optional: a Dropbox account (for saving in-lab data)

## What makes **ptap** different

* Expressible and modular: you can write new image-based tasks without worrying about low level details
* Platform independent: it can run on tablets, computers, and phones
* Out-of-the-box compatibility with Amazon Mechanical Turk means you can run **identical versions of tasks in your lab and on Mechanical Turk**.

## Who it's for

**ptap** is a former branch of mkturk, which was a package designed to run in-cage behavioral experiments in nonhuman primates in the DiCarlo lab at MIT. It has since been adapted for human primates, along with improvements in task expressibility, modularity, energy consumption, and user interaction. As such, it is suitable for:

* Running your lab's in-cage psychophysics software
* Cognitive and AI scientists who wish to benchmark humans on image-based tasks 
