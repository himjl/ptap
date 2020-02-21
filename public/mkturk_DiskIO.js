// Core disk I/O capabilities that are needed to run the task. 

//return whether user was redirected here after authenticating

// Template 

const checkImage = path =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({img, path, status: 'ok'});
        img.onerror = () => resolve({path, status: 'error'});
        img.src = path;
    });

class S3_IO {
    constructor() {

        this.read_textfile = this._read_textfile.bind(this);
        this.load_sound = this._load_sound.bind(this);
        this.load_image = this._load_image.bind(this);
        this.exists = this._exists.bind(this)

    }

    async _load_image(blob_url) {

        var img = await checkImage(blob_url);
        console.log(img);
        console.log('hello');
        if (img.status === 'ok'){
            return img.img
        }
        else{
            console.warn('error loading image')
            return 'image_failure'
        }

        /*
        var resolvefunc;
        var rejectfunc;
        var p = new Promise(function (resolve, reject) {
            resolvefunc = resolve;
            rejectfunc = reject
        });

        var img = new Image();
        img.onload = function () {
            //console.log('loaded '+blob_url)
            //console.log(this)
            resolvefunc(this)
        };
        img.src = blob_url;

        var img_loaded = await p;
        return img_loaded
        */
    }

    async _load_sound(sound_url) {
        var resolveFunc;
        var rejectFunc;
        var p = new Promise(function (resolve, reject) {
            resolveFunc = resolve;
            rejectFunc = reject
        });

        // https://stackoverflow.com/questions/33902299/using-jquery-ajax-to-download-a-binary-file
        var xhttp = new XMLHttpRequest();
        xhttp.responseType = "blob";
        try {
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    console.log(sound_url, ' loaded');
                    resolveFunc(this.response)
                }
            }
        } catch (error) {
            console.log(error)
        }

        xhttp.open("GET", sound_url, true);
        xhttp.send();
        var sound_blob = await p;


        return sound_blob

    }

    async _read_textfile(text_url) {
        // https://www.w3schools.com/xml/ajax_intro.asp

        // Configuring S3: to accept xhttp requests:
        // https://stackoverflow.com/questions/17533888/s3-access-control-allow-origin-header

        // scrub text url of quotations: 
        text_url = text_url.replace(/['"]+/g, '');


        var resolveFunc;
        var rejectFunc;
        var p = new Promise(function (resolve, reject) {
            resolveFunc = resolve;
            rejectFunc = reject
        });

        var xhttp = new XMLHttpRequest();

        try {
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    console.log(text_url, ' loaded');
                    resolveFunc(this.responseText)
                }
            }
        } catch (error) {
            console.log(error)
        }

        xhttp.open("GET", text_url, true);
        //console.log("xhttp", xhttp)

        console.time('Downloaded textfile at ' + text_url);
        xhttp.send();
        var s = await p;
        console.timeEnd('Downloaded textfile at ' + text_url);
        return s
    }

    async _exists(url) {
        var resolveFunc;
        var rejectFunc;
        var p = new Promise(function (resolve, reject) {
            resolveFunc = resolve;
            rejectFunc = reject
        });

        var xhttp = new XMLHttpRequest();


        try {
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    resolveFunc(true)
                } else {
                    resolveFunc(false)
                }
            }
        } catch (error) {
            console.log(error)
        }

        xhttp.open("GET", url, true);
        xhttp.send();
        var s = await p;
        return s

    }


}


class LocalStorageIO {
    constructor() {

    }

    static async load_string(key) {
        var string = await localStorage.getItem(key);
        string = atob(string);
        //localStorage.removeItem(key);
        return string
    }

    static async load_json(key) {
        var string = await localStorage.getItem(key);
        string = atob(string);
        //localStorage.removeItem(key);
        return JSON.parse(string)
    }

    static async write_string(datastr, key) {
        if (datastr.constructor != String) {
            datastr = JSON.stringify(datastr)
        }
        await localStorage.setItem(key, btoa(datastr))

    }
}   


