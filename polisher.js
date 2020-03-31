if ($("body").html().includes("One more step"))
    throw new Error("Cloudflare");

if (location.href.includes("#noredirect") && parent.destroy)
    parent.destroy(/#noredirect(\d+)/g.exec(location.href)[1]);

if (!$("link[href*='style.css']").length) {
    $("html, body").css({
        "background-color": "white",
        overflow: "hidden"
    });
    $("body").css("font-size", "1em");
    $("head").prepend("<link href='/Content/css/tpl_style.css?v=7' rel='stylesheet' type='text/css'>")
}

new Slickiss;
$(".slickExtra").remove();

throw 'test';


var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent",
    eventer = window[eventMethod],
    messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

$("a:contains('Hide'), .specialButton").each(function (index, el) {
    this.click();
});



$('#adsIfrme15, #adsIfrme11').remove();


function grabbingLink(data) {
    if (data == undefined || !data.includes('#') || data.split("#")[0] != "grab")
        return null;

    return data.split("#")[1];
}

$("body").prepend(batchBoard).prepend(bmLoad);

if ($("#btnBookmarkManager").length != 0) $("#btnBookmarkManager")[0].click();

if ($("#divContentVideo").length) {
    $("html").eq(0).append("<div id='divFileName' class='dummy'><div id='centerDivVideo'></div></div>");

    const glxTsIds = [11565, 11875, 11874, 11873, 11963, 11964, 11965, 11966];
    for (var i in glxTsIds)
        $("html > .dummy").eq(0).append("<div id='glx-" + glxTsIds[i] + "-container'></div>");

    var el = $("#divContentVideo").clone();
    var html = $("body").html();
    $(window).load(function () {
        if (!$("#divContentVideo iframe").length)
            $("#divContentVideo").replaceWith(el);

        var adblockFun = /function (.+?)\(\) ?{[^}]+#divContentVideo[^}]+?}/g.exec(html)[1];
        $('script').attr('onload', `window["${adblockFun}"] = () =>  {$("script").removeAttr("onload")}`);
    });

    //console.log(data.lite);
    if (settings.lite == 0) {
        $("iframe:not(#divContentVideo iframe):not(#disqus_thread iframe)").hide();
        $('#divContentVideo').attr("id", "dContentVideo");
        $('#divDownload').attr("id", "dDownload");
        $("body").prepend(batchBoard).prepend(bmLoad);
    } else loadPlayer();

    $.ajax({
        dataType: 'html',
        type: 'GET',
        url: "/BookmarkList",
        success: function (rd) {
            var listing = $(rd).find(".listing");
            if (!listing.length) return;
            var data = {};
            listing.find("tr").each(function () {
                var tds = $(this).find("td, th");
                var num;
                if ($(this).hasClass("head") || (num = /\d+/g.exec(tds.eq(1).text())) && tds.eq(2).find("a:not([style*=none])").text().trim() == "Unwatched") {
                    tds.slice(0).css("text-align", "left");
                    tds.eq(0).attr("data-title", tds[0].title).removeAttr("title");
                    $(this).find("th").eq(0).attr("width", "75%").html("New <a href='/BookmarkList'>Bookmarks</a> episodes not yet watched");
                    tds.slice(2).remove();
                    var index = num ? Number(num) : 0;
                    if (data[index]) data[index].push($(this).clone());
                    else data[index] = [$(this).clone()];

                }
                $(this).remove();
            });
            if (Object.keys(data).length == 0) return;
            for (var key in data)
                for (var i in data[key])
                    listing.append(data[key][i]);

            var wrapper = $("<div/>").addClass("listingWr");
            wrapper.append("<img src='" + chrome.extension.getURL("imgs/Notifications.png") + "' width=50>").append(listing);
            $(".ttip").remove();
            $("#divMyVideo").css("height", "100%").prepend("<div class='ttip'></div>").prepend(wrapper);
            listing.wrap("<div class='listing'></div>");
            listing.on("mouseenter", "td", function () {
                    if ($(this).attr("data-title")) $(".ttip").css("opacity", ".8").html($(this).attr("data-title"));
                })
                .on("mouseleave", "td", function () {
                    $(".ttip").css("opacity", "");
                });
            $(".listing a").each(function () {
                if (location.href.includes(this.href)) {
                    this.scrollIntoView();
                    $(this).addClass("playing");
                    return false;
                }
            });

        },
        error: function (responseData) {
            console.error("couldnt get bookmarks page");
        }
    });


    $("html").append($("<style/>").html("td>a:visited{color:#648f06;}"));


    //setTimeout(KeepAlive, 60 * 1000);

    function KeepAlive() {
        xhr = $.ajax({
            dataType: 'html',
            type: 'get',
            url: location.href,
            success: function (responseData) {
                if (responseData.includes('Please wait 5 seconds...')) return;
                if ($(responseData).find("#divContentVideo").length !== 0) return;
                if ($(responseData).find(".specialButton").length !== 0) return;

                var query1 = $(responseData).find("*[id^=formVerify] span").eq(0).text().trim(),
                    query2 = $(responseData).find("*[id^=formVerify] span").eq(1).text().trim();
                imgs = $(responseData).find("*[id^=formVerify] img");

                imgMatchesQuery(imgs, query1, query2, function (result) {
                    var index1 = imgs.eq(result[0]).attr('indexvalue'),
                        index2 = imgs.eq(result[1]).attr('indexvalue');
                    var answerCap = index1 + "," + index2,
                        reUrl = $(responseData).find("input[name='reUrl']").val(),
                        formUrl = $(responseData).find("*[id^=formVerify]").attr('action');
                    $.ajax({
                        dataType: 'html',
                        type: 'POST',
                        url: formUrl,
                        data: {
                            "answerCap": answerCap,
                            "reUrl": reUrl
                        }
                    });

                });

            }
        });
        setTimeout(KeepAlive, 60 * 1000);
    }


    function loadPlayer() {
        var bookmark = $("#divBookmark").css('position', 'absolute').css({
                'top': '2%',
                'left': '70%',
                'z-index': '1',
                transform: 'translateX(-100%)'
            }),
            index1 = $("#selectEpisode").attr('onchange', 'window.location = this.value').parent().clone(),
            index21 = $("#btnPrevious").parent().clone(),
            index22 = $("#btnNext").parent().clone(),
            controls = $("#selectServer").parent(),
            player = $("#selectPlayer").parent(),
            disqus_thread = $("#disqus_thread").clone();

        $("#formSearch > *:not(p, #result_box)").remove();

        $("#search").css("width", "100%").wrap('<div class="wrapper2"></div>');
        $("#search").find("#keyword").css("width", "60%");
        var search = $(".wrapper2").css({
            position: 'absolute',
            right: '2%',
            top: '0',
            'text-align': 'left',
            'max-height': '535px',
            width: '25%'
        });

        var quality = $("#slcQualix");

        $("html").append(bookmark);
        index1.append(index21).append(index22).removeAttr('style').css('text-align', 'center');


        vid = $("#divContentVideo").css('width', '70%').css('height', 'calc(97% - 100px)').css('text-align', 'center').css('margin-bottom', '70px')
            .prepend(player).prepend(quality).prepend(controls).prepend(index1);

        $("html").append(vid);

        $("body").html("").css('position', 'relative').append(vid)
            .append($("<a class='bigChar home'>Home</a>").attr('href', "//" + location.host).css('margin-right', '50px')).prepend(bookmark);

        $("iframe").css('width', '100%').css('height', '100%').css('text-align', 'center');
        $("#switch").remove();


        $(document).ready(function () {
            if ($("#selectEpisode").length === 0)
                $("#divContentVideo").wrap('<div class="extra-wrapper"></div>');
            $(".extra-wrapper").prepend(player).prepend(controls).prepend(index1);
        });

        $("*").on('click', function (event) {
            $("#result_box").hide();
        });

        loadAnimeData();

        $("body").prepend($("<div />").attr('id', 'captchaContainer').height(0).css('overflow', 'hidden')).append(search);


        $(".wrapper > .listing a").each(function () {
            console.log(location.href + "  " + this.href);
            if (location.href.includes(this.href)) {
                $("#divContentVideo iframe")[0].contentWindow.postMessage({
                    title: $(this).text().trim()
                }, "*");
                return false;
            }

        });

        if (!$("video").length)
            $(document).on("keypress keyup keydown", function (e) {
                if ($("input").is(":focus"))
                    return;
                $("#divContentVideo iframe")[0].contentWindow.focus();
                $("#divContentVideo iframe")[0].contentWindow.postMessage({
                    type: e.type,
                    which: e.which,
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey,
                    altKey: e.altKey,
                }, "*");
            });



        if (settings.prepareNextPrev != 0) {
            if (window.self === window.top) {
                if ($("#btnNext").length > 0)
                    $("body").append($("<iframe />").attr('src', $("#btnNext").parent().attr('href').changeServer(settings.defaultserver)).css('display', 'none'));
                if ($("#btnPrevious").length > 0)
                    $("body").append($("<iframe />").attr('src', $("#btnPrevious").parent().attr('href').changeServer(settings.defaultserver)).css('display', 'none'));
            }
        }


    }

    function loadAnimeData(i = 10) {
        $.ajax({
            dataType: 'html',
            type: 'get',
            url: location.href.substring(0, location.href.lastIndexOf("/")),
            success: function (responseData) {
                $(".home").after($(responseData).find(".bigChar"));
                $("body").prepend($(responseData).find(".listing").css("width", "90%"));
                $(".listing").wrap('<div class="wrapper"></div>');
                $(".wrapper").css({
                    position: 'absolute',
                    right: '0',
                    top: '50px',
                    'overflow-x': 'hidden',
                    'text-align': 'left',
                    'max-height': 'calc(97% - 100px)',
                    width: '29%'
                });
                parent.postMessage(location.href, "*");
            },
            error: function (responseData) {
                i > 0 ? loadAnimeData(--i) : $("body").append("<div style='color:red'>could not load anime info</div>");
            }
        });
    }


    eventer(messageEvent, function (e) {
        var key = e.message ? "message" : "data";
        var data = e[key];

        if (data == "finished" && !$("#btnNext").length && $("#aRead").length)
            $("#aRead").get(0).click();
        if (data.includes('kissanime.ru'))
            setLinks(data);

        if (data == "nextEp")
            $("#btnNext").click();
        if (data == "prevEp")
            $("#btnPrevious").click();

        function setLinks(link) {
            var iframe = $("iframe[src*='" + link.substring(0, link.indexOf("&s")) + "']");
            var contents = $(iframe.contents().find('html'));
            iframe.remove();

            $("a").each(function (index, el) {
                if (link.substring(0, link.indexOf("&s")) == this.href) {
                    var href = $(this).attr('href');
                    $(this).on('click', function (event) {
                        event.preventDefault();
                        window.history.pushState({
                            "pageTitle": contents.find('title').text()
                        }, "", link);
                        
                        var ifrm = "#divMyVideo iframe",
                            selEp = "#selectEpisode",
                            selSv = "#selectServer",
                            prev = "#btnPrevious",
                            next = "#btnNext";
                        
                        $(ifrm).attr("src", contents.find(ifrm).attr("src"));
                        $(selEp).replaceWith(contents.find(selEp));
                        $(selSv).replaceWith(contents.find(selSv));
                        if (!$(prev).parent().replaceWith(contents.find(prev).parent()).length)
                            $(next).parent().before(contents.find(prev).parent());
                        if (!$(next).parent().replaceWith(contents.find(next).parent()).length)
                            $(prev).parent().before(contents.find(next).parent());
                        
                        $(".playing").removeClass("playing");
                        $(".listing a").each(function () {
                            if (location.href.includes(this.href)) {
                                this.scrollIntoView();
                                $(this).addClass("playing");
                                return false;
                            }
                        });


                        if (settings.prepareNextPrev == 1 && window.self === window.top) {
                            if ($("#btnNext").length > 0)
                                $("body").append($("<iframe />").attr('src', $("#btnNext").parent().attr('href').changeServer(settings.defaultserver)).css('display', 'none'));
                            if ($("#btnPrevious").length > 0)
                                $("body").append($("<iframe />").attr('src', $("#btnPrevious").parent().attr('href').changeServer(settings.defaultserver)).css('display', 'none'));
                        }
                    });
                }
            });

        }


    }, false);



} else $("html").append("<style>iframe:not([id^='dsq'], #divContentVideo iframe){display:none}</style>");

$(".slickExtra").remove();
$("body").on('click', 'a:not(.unlinked,a[href="#"])', function (event) {
    var evt = event ? event : window.event;
    if (evt.shiftKey && this.href.includes(animeLink)) {
        evt.preventDefault();
        var anime = this.href;
        while (anime.lastIndexOf("/") != anime.indexOf(animeLink) + animeLink.length - 1)
            anime = anime.substring(0, anime.lastIndexOf("/"));
        if (!selectedHistory.includes(anime))
            addToBar(anime);
        return;
    }

    if (settings.defaultserver != "default") {
        if (this.href.includes("/Anime/") && this.href.lastIndexOf("/") - (this.href.indexOf("/Anime/") + 7) > 0 && !this.href.includes("&s=" + settings.defaultserver)) {
            //event.preventDefault();
            this.href += "&s=" + settings.defaultserver;
        }
    }
});
