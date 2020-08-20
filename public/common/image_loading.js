const __check_image_download_successful = path =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({img, path, status: 'ok'});
        img.onerror = () => resolve({path, status: 'error'});
        img.src = path;
    });


class ImageBufferClass {
    constructor() {
        this.cache_dict = {}; // url:image data
        this.cache_members = []; // earliest image_path -> latest image_path
    }

    async get_by_url(url) {
        // url: string
        // Requested image not in buffer. Add it, then return.
        if (url in this.cache_dict) {
            return this.cache_dict[url]
        } else if (!(url in this.cache_dict)) {
            await this.download_image(url);
            return this.cache_dict[url]
        }
        console.log('Downloaded image at', url)
    }

    async remove_image_from_cache(url) {
        // Currently unused
        try {
            window.URL.revokeObjectURL(this.cache_dict[url].src);
            delete this.cache_dict[url];
        } catch (error) {
            console.log('removal of', filename, 'failed with:', error)
        }
    }

    async download_image(url) {
        // url: string
        try {
            if (!(url in this.cache_dict)) {
                this.cache_dict[url] = await this._load_image_core(url);
                this.cache_members.push(url);
            }
        } catch (error) {
            console.error("cache_these_images failed with error:", error)
        }
    }

    async _load_image_core(url) {
        var img = await __check_image_download_successful(url);
        if (img.status === 'ok'){
            return img.img
        }
        else{
            console.warn('error loading image at', url);
            return 'image_failure'
        }
    }
}
