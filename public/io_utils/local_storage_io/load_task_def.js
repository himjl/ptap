class localstorage_io {
    constructor() {
    }

    static async load_task_def() {
        // Load stuff from local storage
        // Retrieve sessionPackage bootstraps from localstorage
        var task_def_raw_string = await localstorage_io.load_string('TASK_DEF');
        return JSON.parse(task_def_raw_string)
    }

    static async load_landing_page_url() {
        return await localstorage_io.load_string('LANDING_PAGE_URL')
    }

    static async load_string(key) {
        var string = await localStorage.getItem(key);
        string = atob(string);
        return string
    }
}
