Chrome.get().then(s => settings = s);
chrome.storage.sync.onChanged.addListener(async v => {
    for (const k in v)
        if (typeof v[k].newValue == 'undefined') delete settings[k];
        else settings[k] = v[k].newValue;
    // settings = await Chrome.get();
});

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        if (details.initiator && details.initiator.includes('kissanime.ru'))
            return {
                cancel: Boolean(
                    !details.url.includes("Scripts/video-js/video") ||
                    Number(settings.supported && settings.lite && settings['servers.beta'])
                )
            };
    }, {
    urls: chrome.runtime.getManifest().permissions.filter(e => e.includes('https://'))
}, ["blocking"]
);

const BETAX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36';
chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        if (settings.useragent)
            return { requestHeaders: changeHeaders(details.requestHeaders, 'user-agent', BETAX_UA) };
    },
    { urls: ['*://*.googlevideo.com/*', '*://kissanime.ru/*'] },
    ['blocking', 'requestHeaders']
);

chrome.webRequest.onHeadersReceived.addListener(
    function (info) {
        return {
            responseHeaders: changeHeaders(info.responseHeaders, 'x-frame-options', '')
        };
    },
    {
        urls: ['<all_urls>'],
        types: ["sub_frame", "xmlhttprequest", "script"]
    },
    ['blocking', 'responseHeaders']
);

/** Change headers indexed i based on the `names[i]` to `values[i]` if `conds[i]` is true
 * @param {chrome.webRequest.HttpHeader[]} headers Headers to updates
 * @param {string[] | string} names name(s) of headears to change
 * @param {string[] | string} values value(s) to assign
 * @returns new headers
 */
const changeHeaders = (headers, names, values) => {
    if (typeof names != typeof values) throw 'wrong parameters!';
    if (typeof names == 'string') {
        names = [names];
        values = [values];
    }
    for (const i in names) {
        var index = headers.findIndex(x => x.name.toLowerCase() == names[i]);
        if (index != -1) {
            if (values[i] == '')
                headers.splice(index, 1);
            else
                headers[index].value = values[i];
        }
    }
    return headers;
};