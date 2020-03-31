const interval = 4 * 1024 * 1024;
var downloads = {};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message.download) return;
    item = downloads[message.url];
    if (!item) {
        item = {
            phase: 0,
            response: new Uint8Array,
            tabs: [sender.tab.id]
        }
    }
    preloader = new XMLHttpRequest();
    preloader.open("GET", message.url, true);
    preloader.responseType = "arraybuffer";

    preloader.onload = function (e) {
        if (e) {
            if (!e.lengthComputable) {
                this.onerror();
                return;
            }
            item.response = concat(item.response, new Uint8Array(this.response));
            item.phase++;
        }
        console.log(item, e);
        if (item.phase > item.phases || item.phase * interval > item.size) {
            var blob = new Blob([item.response], {
                type: "video/mp4"
            })
            var file = URL.createObjectURL(blob);
            console.log(file);
            response
            return;
            
        }
        preloader.open("GET", message.url, true);
        var from = 0,
            to = "";
        if (item.phase) from = item.phase * interval + 1;
        if ((item.phase + 1) * interval < item.size) to = (item.phase + 1) * interval;
        preloader.setRequestHeader("Range",
            "bytes=" + from + "-" + to);
        preloader.send();
    };


    preloader.onprogress = function (e) {
        if (e.lengthComputable) {
            if (!item.size) {
                item.size = e.total;
                item.phases = parseInt(e.total / interval);
                this.abort();
                this.onload();
            }
        } else this.onerror();
    }
    preloader.onerror = function (e) {
        if (!item.size || !e) {
            //on error
            return;
        }
        this.onload();
    }

    preloader.send();
    
    return true;
});


function concat(...arrays) {
    let totalLength = 0;
    for (const arr of arrays) {
        totalLength += arr.length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}
