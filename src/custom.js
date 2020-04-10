$.prototype.__defineGetter__('oHTML', function () { return this[0].outerHTML });

String.prototype.__defineGetter__('noImgs', function () { return this && this.replace(/<img/g, '<im'); });
String.prototype.filenameFriendlize = function () {
    return this && this.replace(/\\/g, "_")
        .replace(/\//g, "-")
        .replace(/\*/g, "!")
        .replace(/\?/g, "!")
        .replace(/:/g, ";")
        .replace(/</g, "[")
        .replace(/>/g, "]")
        .replace(/"/g, "'")
        .replace(/\|/g, ",");
};

Number.prototype.pad = function (pad, length) {
    var str = this + "";
    while (str.length < length) str = pad + str;
    return str;
}

const sleep = async (timeout) => new Promise(r => setTimeout(r, timeout));

const ajax = $.ajax;
$.ajax = function (data) {
    if (location.host == $("<a/>").attr("href", data.url)[0].host)
        ajax(data);
    else {
        data.ajax = 1;
        chrome.runtime.sendMessage(undefined, data, undefined, function (response) {
            data[response.callback](response.resp1, response.resp2, response.resp3);
        });
    }
};

/** Convert Date to ux display format
 * @param {Date} d Date to convert
 */
const getDisplayDate = (d = new Date) => {
    today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    diff = today.getTime() - d.getTime(); // get the difference between today(at 00:00:00) and the date
    if (d.getTime() == today.getTime()) {
        return "Today";
    } else if (diff <= (24 * 60 * 60 * 1000)) {
        return "Yesterday";
    } else {
        return d.toDateString(); // or format it what ever way you want
    }
}


const rand = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

