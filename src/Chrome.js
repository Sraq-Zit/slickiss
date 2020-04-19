class Chrome {

    static async get(k) {
        const data = await new Promise(resolve => chrome.storage.sync.get(d => resolve(d)));
        return typeof k == 'undefined' ? data : data[k];
    }

    static async set(d) {
        return new Promise(r => {
            chrome.storage.sync.set(d, r);
            chrome.runtime.sendMessage(undefined, { type: 'updateData' });
        });

    }

}


let settings = {
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
    'servers.mp4upload': true,
    'servers.nova': true,
    'servers.beta': true,
    shortcuts: true,
    ttip: true,
    updates: ["0"]
};


Chrome.get().then(s => {
    s = Object.keys(s).length ? s : (Chrome.set(settings) || settings);
    for (const k in settings)
        if (!(k in s)) s[k] = settings[k];

    settings = s;
});