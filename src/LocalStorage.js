/** Class managing localStorage for json data */
class LocalStorage {
    /** Get data from the localStorage 
     * @param {string} key Index key of the desired value
     */
    static get(key) {
        return localStorage.getItem(key) && JSON.parse(localStorage.getItem(key));
    }

    /** Set json data to the localStorage 
     * @param {string} key Index key for the given value
     * @param {{}} data Value to assign
     * @param {boolean} append If false the old value will be deleted and replaced anew by the given
     * value, the default value is `true`
     */
    static set(key, data, append = true) {
        const d = this.get(key) || {};
        for (const k in data) d[k] = data[k];
        localStorage.setItem(key, JSON.stringify(append ? d : data));
        return d;
    }

}