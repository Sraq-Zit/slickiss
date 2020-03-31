chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        return {
            cancel: true
        };
    }, {
        urls: ["*://artapeare.site/*", "*://boyaidare.club/*", "*://inpagepush.com/*", "*://vagwyn.pw/*", "*://*.ti553.com/*", "*://*.popads.net/*", "*://*.bebi.com/*", "*://1b6a637cbe7bb65ac.com/*", "*://4f6b2af479d337cf.com/*", "*://4702fb341ddf276d.com/*", "*://go.onclasrv.com/*", "*://deloton.com/*", "*://mc.yandex.ru/*", "*://ads.2mdnsys.com/*", "*://pl14474491.puserving.com/*", "*://go.oclaserver.com/*", "*://*.addthis.com/*", "*://m.addthisedge.com/*", "*://kissanime.ru/ads/*", "*://zukxd6fkxqn.com/*", "*://native.propellerads.com/*", "*://native.propellerclick.com/*", "*://cobalten.com/*", "*://pushance.com/*", "*://rotumal.com/*", "*://pusheify.com/*", "*://luckypushh.com/*", "*://koindut.com/*", "*://wranjeon.xyz/*", "*://forcedolphin.com/*", "*://nauchegy.link/*", "*://bristlyapace.com/*"]
    },
    ["blocking"]
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
        urls: ['<all_urls>'], //
        types: ["sub_frame", "xmlhttprequest"]
    },
    ['blocking', 'responseHeaders']
);
