
class Chrome {
    /** Get data from the chrome storage API
     * @param {string} [k] Data's key 
     * @param {'local'|'sync'} [stgType] Storage type 
     */
    static async get(k, stgType = 'sync') {
        const data = await new Promise(resolve => chrome.storage[stgType].get(d => resolve(d)));
        return typeof k == 'undefined' ? data : data[k];
    }

    /** Set data to the chrome storage API
     * @param {*} [s] Data to store 
     * @param {'local'|'sync'} [stgType] Storage type 
     */
    static async set(d, stgType = 'sync') {
        return new Promise(r => {
            chrome.storage[stgType].set(d, r);
            chrome.runtime.sendMessage(undefined, { type: 'updateData' });
        });

    }

}


let settings = {
    useragent: false,
    thumbnails: false,
    autoplay: false,
    batch: [0, 1, 2, 3, 4, 5],
    captcha: true,
    defaultserver: "default",
    lite: "1",
    markAsSeen: true,
    notifyLastTime: true,
    player: "1",
    prepareNextPrev: false,
    quality: "720p",
    'servers.moe': true,
    'servers.mp4upload': true,
    'servers.nova': true,
    'servers.beta': true,
    'servers.hydrax': true,
    shortcuts: true,
    ttip: true,
    updates: ["0"],
    lastVisit: {}
};


Chrome.get().then(s => {
    s = Object.keys(s).length ? s : (Chrome.set(settings) || settings);
    for (const k in settings)
        if (!(k in s)) {
            s[k] = settings[k];
            Chrome.set({ [k]: settings[k] });
        }

    settings = s;
});