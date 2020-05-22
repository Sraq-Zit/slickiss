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
                        Number(settings.supported && settings.lite && settings['servers.beta'])
                    )
                };
    }, {
    urls: blocked
}, ["blocking"]
);

// const BETAX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36';
// chrome.webRequest.onBeforeSendHeaders.addListener(
//     function (details) {
//         return {
//             requestHeaders: changeHeaders(details.requestHeaders, 'user-agent', BETAX_UA)
//         }
//     },
//     { urls: ['<all_urls>'] },
//     ['blocking', 'requestHeaders']
// );

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