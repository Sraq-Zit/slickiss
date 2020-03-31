throw 'test tooltip';
var req = new XMLHttpRequest();
var mouseOver;

if (settings.ttip !== false && !$("#divContentVideo").length) {
    $("body").prepend(Gtooltip);


    $("body").on("mouseenter", "a", function (e) {
            mouseOver = 1;
            var link = this.href;
            while (link.includes("/") && link.lastIndexOf("/") != link.indexOf(animeLink) + animeLink.length - 1)
                link = link.substring(0, link.lastIndexOf("/"));

            if (!link.includes(animeLink) ||
                location.pathname == $("<a/>").attr("href", link)[0].pathname) return;

            req.open('GET', link, true);
            req.onerror = function () {
                req.open('GET', link, true);
                req.send();
            }
            req.onload = function () {
                var doc = $(this.responseText),
                    img = doc.find(".rightBox .barContent img").eq(0).attr({
                        width: "160px",
                        height: "210px"
                    }),
                    card = doc.find(".bigBarContainer").eq(0);

                img.css({
                    float: "left",
                    margin: "10px"
                });
                card.find("p").last().remove();
                var json = {
                    anime: link,
                    error: function () {
                        card.find("span[id*=Bookmark]").remove();
                        card.children(".barTitle").text("You can disable this by clicking Escape button or in the extension options").css("font-family", "monospace").after(img);
                        $(".ttip").html('').append(card.css("font-size", ".8em")).css("opacity", ".85");
                    }
                }
                json.success = function () {
                    if(!mouseOver) return;
                    var txt = "",
                        rt = this.responseText;
                    if (rt == "null") txt = "【Ctrl+B to bookmark】";
                    else {
                        card.find(".bigChar").append(" <span class='bookmarked'>✓</span> ");
                        if (rt.includes("false")) txt = "【Ctrl+M to mark as watched】";
                    }
                    card.find(".bigChar").append("<sup>" + txt + "</sup>");
                    json.error();
                }
                checkBookmark(json);

            }
            req.send();
        })
        .on('mouseleave', 'a', function () {
            mouseOver = 0;
            $(".ttip").css("opacity", "");
            req.abort();
        });
    $(document).on("keydown", function (e) {
        if ($(".ttip").css("opacity") === "0") return;
        if (e.keyCode == 27) { // escape
            $("body").off("mouseenter mouseleave keydown", "a");
            $(".ttip").css("opacity", 0);
            chrome.storage.sync.set({
                ttip: false
            });
        }
    });
}
