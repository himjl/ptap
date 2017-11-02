# **ptap**

**ptap** (pronounced pee-tap) is a free, browser-based psychophysics platform that runs **in-lab** and **Amazon Mechanical Turk** experiments. It is a former branch of mkturk (built originally by E. Issa while at MIT). 

## What you need to get started

* A device with **_Google Chrome_**
* A **_static web content server_**:  
    * For messing around on your own computer, you can use **localhost**: python [SimpleHTTPServer](https://docs.python.org/2/library/simplehttpserver.html)  
    * For MTurk experiments, you need to create **public URLs**: try [s3](aws.amazon.com/s3) (5GB of storage/month is free and enough for the base **ptap** code and a reasonable number of stimulus images), [Apache](https://httpd.apache.org/), ...
* Optional: a Dropbox account (for saving in-lab data)
