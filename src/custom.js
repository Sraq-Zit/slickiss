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

const rand = (min, max) => {
    if ((min instanceof Array) && min && min.length) return min[rand(0, min.length - 1)];
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Manage video qualities order and preferences */
class QualityManager {

    /**
     * @param {{file:string; label?: string; type?: string;}[]} data Data of each quality
     * @param {'1080p'|'720p'|'480p'|'360p'} preference Quality to play in preference
     */
    constructor(data, preference) {
        /** Source of each quality */
        this.data = data;
        /** Quality to play in preference */
        this.pref = preference;

        this.qualities = [1080, 720, 480, 360].filter(q => q + 'p' in this.data);

    }

    /** Get data of the preferred quality or less if not available
     * @returns {{file:string; label?: string; type?: string;}}
     */
    get preferredQ() {
        let qual;
        this.qualities.forEach(q => {
            if (!qual && q <= parseInt(this.pref))
                qual = this.data[q + 'p'];
        });
        if (!qual)
            this.qualities.slice().reverse().forEach(
                q => !qual && (qual = this.data[q + 'p'])
            );

        return qual;
    }

    /** Iterate over qualities in decreasing order
     * @param {(data: {file:string; label?: string; type?: string;}) => void} callback 
     */
    forEach(callback) { this.qualities.forEach(q => callback(this.data[q + 'p'])); }
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

/** Minified async version of ajax
 * @param {string | JQuery.AjaxSettings} option URL or object of ajax settings
 * @returns {Promise<string>}
 */
const req = async option => {
    if (typeof option == 'string')
        option = { url: option, dataType: "html" };

    if (!option.type && !option.method) option.type = 'GET';

    return new Promise((r, e) => $.ajax({ ...option, success: r, error: err => e(err) }));
}


/** Convert Date to ux display format
 * @param {Date} d Date to convert
 */
const getDisplayDate = (d = new Date) => {
    today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    diff = today.getTime() - d.getTime(); // get the difference between today(at 00:00:00) and the date
    if (d.getTime() == today.getTime()) {
        return "Today";
    } else if (diff <= (24 * 60 * 60 * 1000)) {
        return "Yesterday";
    } else {
        return d.toDateString(); // or format it what ever way you want
    }
}

/** Convert size to given unit
 * @param {string} value Value to convert. The value must contain a unit at the end
 * @param {'B'|'KB'|'MB'|'GB'|'TB'|'PB'|'EB'|'ZB'} [unit] Target unit to convert the value to
 * @param {number} [fractionDigits] Number of digits after decimal point
 * @returns {string}
 */
const convertSize = (value, unit, fractionDigits) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB'];
    if (typeof unit != 'undefined' && !units.includes(unit.toUpperCase()))
        throw 'Unsupported or wrong unit: ' + unit;

    value = value.toUpperCase();
    let u = new RegExp(units.join('|')).exec(value);
    u = u && u[0];
    value = parseFloat(value.replace(/[^0-9.e-]/gi, ''));

    if (typeof unit == 'undefined') {
        if (value >= 1024 && u != units.slice().pop())
            return convertSize(convertSize(value + u, units[units.indexOf(u) + 1]), unit, fractionDigits);
        else if (value < 1 && u != units.slice().shift())
            return convertSize(convertSize(value + u, units[units.indexOf(u) - 1]), unit, fractionDigits);
        return (fractionDigits == undefined ? value : value.toFixed(fractionDigits)) + u;
    }

    value = value * 1024 ** (units.indexOf(u) - units.indexOf(unit));
    if (fractionDigits && typeof fractionDigits == 'number')
        value = value.toFixed(fractionDigits);

    return value += unit;
}


