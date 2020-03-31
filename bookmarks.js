throw 'test bookmarks';
if (location.href.includes("slickupdates")) throw "abort script to reduce data downloaded";
$.ajax({
    dataType: 'html',
    type: 'GET',
    url: "/BookmarkList",
    success: function (rd) {
        chrome.runtime.sendMessage({
            logged: rd.includes("Bookmark list") ? true : false
        });
    }
});

chrome.extension.onMessage.addListener(function (msg) {
    if (msg.bm && msg.link) {
        var link = msg.link;

        bkmarkAnime(link);
    }
});

var busy = false;

function bkmarkAnime(url) {
    if (busy) return;
    busy = true;
    $("#bmLoad img").attr("src", chrome.extension.getURL("imgs/loading.gif")).parent().fadeIn().children("div").text("Bookmarking");

    var json;
    bookmarkAnime(json = {
        anime: url,
        success: function () {
            if (this.responseText == "OK") {
                $("#bmLoad div").text("BOOKMARKED!");
                $("#bmLoad img")[0].src = $(json.response).find(".rightBox .barContent img")[0].src;
                setTimeout(function () {
                    $("#bmLoad").fadeOut(500);
                    busy = false;
                }, 1500);
            } else this.onerror();
        },
        error: function () {
            $("#bmLoad div").text("Failed! (You should be logged in)");
            setTimeout(function () {
                $("#bmLoad").fadeOut(500);
                busy = false;
            }, 1500);
        }
    })
}

function markSeen(url) {
    if (busy) return;
    busy = true;
    $("#bmLoad img").attr("src", chrome.extension.getURL("imgs/loading.gif")).parent().fadeIn().children("div").text("Marking");

    var json;
    markAnimeSeen(json = {
        anime: url,
        success: function () {
            if (this.responseText != "") {
                $("#bmLoad div").text("MARKED AS SEEN!");
                setTimeout(function () {
                    $("#bmLoad").fadeOut(500);
                    busy = false;
                }, 1500);
            } else this.onerror();
        },
        error: function () {
            $("#bmLoad div").text("Failed! (You should be logged in)");
            setTimeout(function () {
                $("#bmLoad").fadeOut(500);
                busy = false;
            }, 1500);
        }
    })
}
var hover;

$(document).on("mouseenter", "a", function () {
    var link = this.href;
    if (link.includes(animeLink)) {
        while (link.lastIndexOf("/") != link.indexOf(animeLink) + animeLink.length - 1)
            link = link.substring(0, link.lastIndexOf("/"));
        hover = link;
    }
}).on("mouseleave", "a", function () {
    hover = false;
}).on("keypress", function (e) {
    if (hover && e.ctrlKey && e.charCode == 2) bkmarkAnime(hover);
    if (hover && e.ctrlKey && e.charCode == 10) markSeen(hover);
});




//Display if last ep is seen or not and offer ability to check/uncheck
if (location.href.includes(animeLink)) {
    var handling = false;

    function getBookmarkValues() {
        if (handling) return;
        if ($("#spanBookmarkAdd:visible, #spanBookmarkRemove:visible, #spanBookmarkManager:visible").length == 0) {
            setTimeout(getBookmarkValues, 100);
            return;
        }
        handling = true;
        $(".aRead, .aUnRead").remove();
        findAnimeID({
            bdid: 1,
            url: location.href,
            success: function (id, rt) {
                $("#imgLoader")
                    .after($(rt).find(".aRead[bdid='" + id + "'], .aUnRead[bdid='" + id + "']").css("margin-left", "10px"));

                $(".aRead").text("[Mark as unwatched]");
                $(".aUnRead").text("[Mark as watched]");
                handling = false;
            },
            error: function (responseData) {
                handling = false;
            }

        });
    }


    $("#spanBookmarkManager").parent().find("a").on("click", getBookmarkValues);
    $("body").on("click", ".aRead, .aUnRead", function () {
        var el = $(this),
            toShow = $(this).hasClass("aRead") ? ".aUnRead" : ".aRead";
        el.hide();
        $('#imgLoader').show();
        markAnimeSeen({
            watched: $(this).hasClass("aRead") ? 0 : 1,
            anime: el.attr("bdid"),
            success: function () {
                var message = this.responseText;
                if (message != "") {
                    $(toShow).show();
                } else {
                    alert("Error!");
                    el.show();
                }
                $('#imgLoader').hide();
            },
            error: function () {
                alert("Error!");
                $('#imgLoader').hide();
                el.show();
            }
        });
    })
    getBookmarkValues();

}


//Notifying new and bookmarks related episodes
if (!location.href.includes(animeLink) && !location.href.includes('/BookmarkList') && !location.href.includes('/Special/') && location.host === "kissanime.ru") {
    $("head").prepend("<style> a.new{color:#fff5ab;} a.bookmarked{color:#ffabab;} </style>");
    $("a").not(".episodes a").each(function (cindex, cel) {
        if ($(this).text().trim().includes("Episode 001")) {
            if (!$(this).hasClass("textDark")) $(this).addClass("new");
            $(this).prev("a").addClass("new");
            $(this).parent("td").prev("td").children("a").addClass("new");
        }
    });
    $.ajax({
        dataType: 'html',
        type: 'GET',
        url: "/BookmarkList",
        success: function (responseData) {
            var h = [];
            $(responseData.replace(/<img[^>]+?>/g,"")).find('.aAnime').each(function (index, el) {
                var txt = this.textContent.trim();
                var hr = this.href;
                if (!h[hr]) h[hr] = [];
                h[hr].push(this);
            });
            $("a").not(".episodes a").each(function (cindex, cel) {
                if (!this.href.includes(animeLink)) return;
                var hr = this.href;
                while (hr.includes("?")) hr = hr.substring(0, hr.lastIndexOf("/"));
                if (h[hr] && !$(this).hasClass("textDark"))
                    $(this).addClass("bookmarked");
            });
        },
        error: function (responseData) {
            console.error("couldnt get bookmarks page");
        }
    });
}
