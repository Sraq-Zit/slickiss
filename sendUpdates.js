let bookmarks = [],
    history = [];



if (location.href.includes("slickupdates")) {
    if (!$("html").html().includes("challenge-form")) {
        window.history.pushState({
            "pageTitle": "slickupdates"
        }, "", "/slickupdates");

        if (localStorage.getItem("history")) history = JSON.parse(localStorage.getItem("history"));
        $("html").html("");
        manageData(false);
    }
}

function manageData(timeout = true) {
    if (timeout) {
        setTimeout(function () {
            manageData(false)
        }, 60 * 1000);
        return;
    }


    uploadData();

    console.log("starting..");
    if (!settings.set) {
        manageData();
        return;
    }
    if (settings.updates.includes(types.bookmarkedEp)) {
        console.log("getting bookmarks if available..");
        $.ajax({
            dataType: 'html',
            type: 'GET',
            url: "/BookmarkList",
            success: function (responseData) {
                responseData = responseData.replace(/<img[^>]+?>/g, "");
                if (responseData.includes("challenge-form")) {
                    location.reload();
                    return;
                }
                $(responseData).find('.aAnime').each(function (index, el) {
                    var anime = $(el).text().trim();
                    bookmarks.push(anime);
                });
                sendUpdates();
            },
            error: function (responseData) {
                manageData();
            }
        });
    } else sendUpdates();

}

function sendUpdates() {
    var b = false;
    $.ajax({
        dataType: 'html',
        type: 'get',
        url: '//kissanime.ru/',
        success: function (responseData) {
            var res = responseData.replace(/<img[^>]+?>/g, "");
            console.log("last update: " + history[history.length - 1]);
            if (responseData.includes("challenge-form")) {
                location.reload();
                return;
            }
            var toDisplay = "";
            var pic, c = 0;
            console.log("settings: " + settings.updates);
            $(res).find("a.textDark").each(function () {
                var text = "";
                var anime = $(this).prev().text().trim() + " " + $(this).text().trim();

                var b;
                check = b = settings.updates.includes(types.newEp) && /\D+0+1\D*$/g.test(this.textContent) &&
                    (settings.updates.includes(types.dub) || !anime.includes("(Dub)"));
                if (settings.updates.includes(types.newEp) && b) text += "This anime has new Ep" + "\n";

                check |= b = settings.updates.includes(types.bookmarkedEp) && bookmarks.includes($(this).prev().text().trim());
                if (b) text += "This anime is bookmarked" + "\n";

                check |= b = settings.updates.includes(types.others) && !$(this).text().trim().toLowerCase().includes("episode") &&
                    (settings.updates.includes(types.dub) || !anime.includes("(Dub)"));
                if (b) text += "This anime has special ep" + "\n";

                check |= b = settings.updates.includes(types.all);
                if (b) text += "'All' option is selected" + "\n";

                if (check && !history.includes(anime)) {
                    console.log(text);
                    console.log($(this).prev()[0].href);
                    if (!pic) pic = $(this).prev().get(0).href;
                    history.push(anime);
                    toDisplay += $(this).prev().text().trim() + " " + $(this).text().trim() + "\n";
                    c++;
                }

            });
            while (history.length > 50) history.shift();
            localStorage.setItem("history", JSON.stringify(history));

            if (pic) $.ajax({
                dataType: 'html',
                type: 'GET',
                url: pic,
                success: function (responseData) {
                    var title = "You've got " + (c > 1 ? c + " updates" : "an update"),
                        json = {
                            legit: true,
                            type: 'basic',
                            title: title,
                            contextMessage: "You can disable this on the Slickiss extension options",
                            buttons: [{
                                title: "Open Kissanime"
                            }],
                            iconUrl: "/imgs/angry-loli.png",
                            message: toDisplay
                        };
                    if (!responseData.includes("challenge-form"))
                        json.iconUrl = $(responseData).find(".rightBox img").eq(0).attr("src");
                    if (pic && c == 1) {
                        json.buttons.push({
                            title: "Open Anime page"
                        });
                        json.animeUrl = pic;
                    }
                    parent.postMessage(json, "*");
                }
            });

            parent.postMessage({
                isAlive: true
            }, "*");

            manageData();
        },
        error: manageData
    });
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

    } else if(data) localStorage.removeItem("capData");

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
