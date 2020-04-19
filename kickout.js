let b;
Chrome.get().then(s => settings = s);
chrome.storage.sync.onChanged.addListener(async v => {
    for (const k in v)
        if (typeof v[k].newValue == 'undefined') delete settings[k];
        else settings[k] = v[k].newValue;
    // settings = await Chrome.get();
});


const blocked = chrome.runtime.getManifest().permissions
    .filter(e => Boolean(b === true || (b = (e[0] == '*' && (b === false || null)))));
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        b = true;
        const initiators = chrome.runtime.getManifest().permissions
            .filter(v => b && (b = (v[0] == '*')))
            .map(v => v.replace(/[*:/]/g, ''));
        for (const init of initiators)
            if (details.initiator && details.initiator.includes(init))
                return {
                    cancel: Boolean(
                        !details.url.includes("Scripts/video-js/video") ||
                        Number(settings.lite && settings['servers.beta'])
                    )
                };
    }, {
    urls: blocked
}, ["blocking"]
);

chrome.webRequest.onHeadersReceived.addListener(
    function (info) {
        var headers = info.responseHeaders;
        var index = headers.findIndex(x => x.name.toLowerCase() == "x-frame-options");
        if (index != -1) {
            headers.splice(index, 1);
        }
        return {
            responseHeaders: headers
        };
    }, {
    urls: ['<all_urls>'],
    types: ["sub_frame", "xmlhttprequest", "script"]
},
    ['blocking', 'responseHeaders']
);
