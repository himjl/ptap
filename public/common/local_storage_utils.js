class LocalStorageUtils {
    constructor() {
    }

    static retrieve_json_object(key){
        // Key: a string or integer.
        // Returns: a JSON.parsed DOMString, or null if the key has no corresponding value.

        if (typeof(key) === "number"){
            key = key.toString();
        }

        // Loads a DOMString or null
        let val  = window.localStorage.getItem(key);

        if (val == null){
            console.log('Returned null value for key', key);
            return val
        }
        else{
            // Parse the string
            return JSON.parse(val)
        }
    }

    static store_object_as_json(key, object){
        // Stores a JavaScript object as a JSON string
        const stringified_object = JSON.stringify(object);
        return window.localStorage.setItem(key, stringified_object)
    }

}

