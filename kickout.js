let b;
Chrome.get().then(s => settings = s);


const blocked = chrome.runtime.getManifest().permissions
    .filter(e => Boolean(b === true || (b = (e[0] == '*' && (b === false || null)))));
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        Chrome.get().then(s => settings = s);
        return {
            cancel: Boolean(!details.url.includes("Scripts/video-js/video.js") || Number(settings.lite || !settings['servers.beta']))
        };
    }, {
    urls: blocked
}, ["blocking"]
);

chrome.webRequest.onHeadersReceived.addListener(
    function (info) {
        Chrome.get().then(s => settings = s);
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
