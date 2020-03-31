class Chrome {

    static async get(k) {
        const data = await new Promise(resolve => chrome.storage.sync.get(d => resolve(d)));
        return typeof k == 'undefined' ? data : data[k];
    }

    static set(d) {
        chrome.storage.sync.set(d);
        chrome.runtime.sendMessage(undefined, { type: 'updateData' });
    }

}


let settings = {
    autoplay: false,
    batch: [0, 1, 2, 3, 4, 5],
    captcha: true,
    defaultserver: "rapidvideo",
    lite: "1",
    markAsSeen: true,
    notifyLastTime: true,
    player: true,
    prepareNextPrev: false,
    quality: "720p",
    'servers.mp4upload': true,
    'servers.nova': true,
    'servers.beta': true,
    shortcuts: true,
    ttip: true,
    updates: [0]
};
Chrome.get().then(s => settings = Object.keys(s).length ? s : (settings && Chrome.set(settings)));