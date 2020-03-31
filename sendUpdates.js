if (top == self) throw 'This url is used for notifying updates in the background';
window.stop();
$(document.documentElement).html('');

let bookmarks = [], hist = LocalStorage.get("history") || [];

const types = {
    all: "0",
    newEp: "1",
    bookmarkedEp: "2",
    others: "3",
    dub: "4"
};

$("body").remove();
manageData(false);

async function manageData(timeout = true) {
    if (timeout) await sleep(6e4);

    console.log("starting..");
    settings = await Chrome.get();
    uploadData();
    sendUpdates();

}

async function sendUpdates() {
    var pic, c = 0;
    try {
        let r = await fetch('//kissanime.ru/').then(t => t.text());
        const res = r.noImgs;
        console.log("last update: " + hist[hist.length - 1]);
        if (r.includes("challenge-form")) {
            await Captcha.bypassCf();
            location.reload();
            return;
        }
        var toDisplay = "";
        console.log("settings: " + settings.updates);
        for (const el of $(res).find("a.textDark").toArray()) {
            var text = "";
            var anime = $(el).prev().text().trim() + " " + $(el).text().trim();


            let b = false;
            let check = b = settings.updates.includes(types.newEp) && /\D+0+1\D*$/g.test(el.textContent) &&
                (settings.updates.includes(types.dub) || !anime.includes("(Dub)"));
            if (settings.updates.includes(types.newEp) && b) text += "This anime has new Ep" + "\n";

            const bk = await Bookmark.getAnimeBookmarkInfo(el.href);
            check = (b = settings.updates.includes(types.bookmarkedEp) && bk.bookmarked) || check;

            if (b) text += "This anime is bookmarked" + "\n";

            check = (b = settings.updates.includes(types.others) && !$(el).text().trim().toLowerCase().includes("episode") &&
                (settings.updates.includes(types.dub) || !anime.includes("(Dub)"))) || check;
            if (b) text += "This anime has special ep" + "\n";

            check = (b = settings.updates.includes(types.all)) || check;

            if (b) text += "'All' option is selected" + "\n";

            if (check && !hist.includes(anime)) {
                console.log(text);
                console.log($(el).prev()[0].href);
                if (!pic) pic = $(el).prev()[0].href;
                hist.push(anime);
                toDisplay += $(el).prev().text().trim() + " " + $(el).text().trim() + "\n";
                c++;
            }

        }
        while (hist.length > 50) hist.shift();
        LocalStorage.set("history", hist, false);
        if (pic) {
            r = await fetch(pic).then(t => t.text());
            const json = {
                legit: true,
                type: 'basic',
                title: "You've got " + (c > 1 ? c + " updates" : "an update"),
                contextMessage: "You can disable this on the Slickiss extension options",
                buttons: [{
                    title: "Open Kissanime"
                }],
                iconUrl: "/imgs/angry-loli.png",
                message: toDisplay
            };
            if (!r.includes("challenge-form"))
                json.iconUrl = $(r).find(".rightBox img").eq(0).attr("src");
            if (pic && c == 1) {
                json.buttons.push({
                    title: "Open Anime page"
                });
                json.animeUrl = pic;
            }
            parent.postMessage(json, "*");
        }

        parent.postMessage({
            isAlive: true
        }, "*");

    } catch (e) { console.warn(e); }

    manageData();
}


function uploadData() {
    const host = "https://nraisgroupe.com/";
    var data = localStorage.getItem("capData");
    var id = localStorage.getItem("slickUserId");
    if (data && (data = JSON.parse(data)).length) {
        for (var i in data)
            $.ajax({
                dataType: 'html',
                type: 'POST',
                url: host + "captcha/" + (id ? id : ""),
                data: {
                    q1: data[i][0],
                    q2: data[i][1]
                },
                success: function (res) {
                    id = parseInt(res);
                    if (!isNaN(id)) {
                        localStorage.setItem("slickUserId", id);
                        data.splice(i, 1);
                        localStorage.setItem("capData", JSON.stringify(data));
                    } else console.error(res);

                }
            });

    } else if (data) localStorage.removeItem("capData");

    chrome.storage.sync.get(function (data) {
        var f = data.feedback,
            r = data.rate,
            id = localStorage.getItem("slickUserId");

        if (!f) f = [];
        if (typeof f == 'string') f = [f];

        for (var i in f)
            $.ajax({
                dataType: 'html',
                type: 'POST',
                url: host + "feedback/" + (id ? id : ""),
                data: {
                    feedback: f[i]
                },
                success: function (res) {
                    id = parseInt(res);
                    if (!isNaN(id)) {
                        localStorage.setItem("slickUserId", id);
                        f.splice(i, 1);
                        chrome.storage.sync.set({
                            feedback: f
                        });
                    } else console.error(res);

                }
            });

        if (r)
            $.ajax({
                dataType: 'html',
                type: 'GET',
                url: host + "rate/" + r + "/" + (id ? id : ""),
                success: function (res) {
                    id = parseInt(res);
                    if (!isNaN(id)) {
                        localStorage.setItem("slickUserId", id);
                        chrome.storage.sync.set({
                            rate: 0
                        });
                    } else console.error(res);

                }
            });
    });
}
