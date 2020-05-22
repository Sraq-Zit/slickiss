
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

    if (message.type == 'logout') {
        (async () => {
            await new Promise(r => chrome.cookies.remove({ url: 'https://kissanime.ru', name: 'usernameK' }, r));
            await new Promise(r => chrome.cookies.remove({ url: 'https://kissanime.ru', name: 'passwordK' }, r));
            sendResponse();
        })();
        return true;
    }

    if (message.type === 'open_url')
        chrome.tabs.create({
            url: chrome.extension.getURL(message.data)
        });

    if (message.type == 'updateData')
        Chrome.get().then(s => settings = s);


    if (message.ajax) {
        delete message.ajax;
        message.success = (resp) => sendResponse({
            resp1: resp,
            callback: "success"
        });
        message.error = (a, b, c) => sendResponse({
            resp1: a,
            resp2: b,
            resp3: c,
            callback: "error"
        });
        $.ajax(message);
        return true;
    }

});

var frame = $("<iframe/>")
$("body").append(frame.attr("src", "https://kissanime.ru/#sendUpdates"));


const step = 30000;
var timeout = 6 * step;

var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent",
    eventer = window[eventMethod],
    messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
eventer(messageEvent, function (e) {
    var key = e.message ? "message" : "data";
    var data = e[key];
    if (data.isAlive) timeout = 2 * step;
    if (!data.legit) return;
    delete data.legit;
    var url = md5(data.message + Math.random());
    if (data.animeUrl) {
        url = data.animeUrl;
        delete data.animeUrl;
    }

    console.log("showing notification..");
    chrome.notifications.create(
        url, data,
        function () { }
    );
});
chrome.notifications.onButtonClicked.addListener(function (notificationId, btnIndex) {
    var url = notificationId.includes("kissanime") && btnIndex ? notificationId : 'https://kissanime.ru/';
    chrome.tabs.create({
        url: url
    });
});


countTime();

function countTime() {
    if (timeout > 0) timeout -= step;
    else {
        timeout = 2 * step;
        $("iframe").replaceWith(frame.clone());
    }
    setTimeout(countTime, step);
}
