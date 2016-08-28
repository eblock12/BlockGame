export default class DomHelper {
    /** Returns the current location query string as a collection of key-value pairs */
    public static getQueryStringAsDictionary() {
        let dict = {};
        let query = window.location.search.substring(1);
        let pairs = query.split("&");
        for (let i = 0, len = pairs.length; i < len; i++) {
            let pair = pairs[i].split("=");
            let key = pair[0];
            let value = pair[1];
            dict[key] = value;
        }
        return dict;
    };
}