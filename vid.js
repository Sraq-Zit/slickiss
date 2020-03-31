var xhr = new XMLHttpRequest();

chrome.storage.sync.get('customShortcuts', function (data) {
    if (data.customShortcuts != undefined) {
        shortcuts = data.customShortcuts;
    }
});


function setCustomShortcut(str) {
    chrome.storage.sync.get("shortcuts", function (data) {
        if (data[str] != undefined) shortcuts[str] = data[str];
    });
}


var xhr = new XMLHttpRequest();

var href = location.href;

xhr.open('GET', href, true);

xhr.onerror = function () {
    document.documentElement.innerHTML = 'Error getting Page';
}

var noEditHash = "#noReload";
var post = false;
xhr.onload = function () {
    if (this.responseText.includes("captcha_submit")) {
        localStorage.setItem("captcha", true);
        location.reload();
        return;
    }
    if (location.host.includes("rapidvideo")) {
        if (!$(this.responseText).find("video").length && post) {
            location.hash = noEditHash;
            location.reload();
        }
        if (!$(this.responseText).find("video").length) {
            xhr.open('POST', href, true);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhr.send("confirm.x=0&confirm.y=0&block=1");
            post = true;
            return;
        }
    }
    if (href.includes("novelplanet.me/v/") && !post) {
        post = /<title>.+?<\/title>/g.exec(this.responseText)[0];
        xhr.open('POST', href.replace(/\/v\//g, "/api/source/"), true);
        xhr.send();
        return;
    }
    var vid;
    try {
        var match = /eval\(.+/g.exec(this.responseText);
        if (match != null) {
            eval(match[0]);
            match = /src:d\('.+?'.*?\)/g.exec(this.responseText);
            vid = $("<a/>").attr('href', eval(match[0])).get(0).href;
        }
    } catch (e) {}

    var page = document.implementation.createHTMLDocument("");
    page.documentElement.innerHTML = this.responseText;
    var newPage = document.importNode(page.documentElement, true);
    chrome.storage.sync.get(function (data) { // servers
        var servers = data.servers,
            isHostSet = servers == undefined || servers[location.host] != 0;

        if (isHostSet) {
            var nodeList = newPage.querySelectorAll('script');
            if (location.host == "rapidvideo")
                for (var i = 0; i < nodeList.length; ++i)
                    nodeList[i].remove();

            document.replaceChild(newPage, document.documentElement);
            delete page;

            var video = $("<video/>");
            if (href.includes("novelplanet.me/v/")) {
                var vid,
                    q = data.quality || settings.quality,
                    res = JSON.parse($("html").text());
                if (res.success) {
                    var json = res.data;
                    for (var k in json) {
                        json[json[k].label] = json[k];
                        if (json[k].file)
                            $("body").append("<a href='#' data-file='" + json[k].file + "'>" + json[k].label + "</a>");
                        delete json[k];
                    }
                    while (!(vid = json[q]) && q)
                        q = nextQuality(q);

                    q = data.quality || settings.quality;
                    while (!(vid = json[q]) && q)
                        q = prevQuality(q);

                    if (vid) {
                        video.attr("src", vid.file).attr("poster", "/asset" + res.player.poster_file);
                        $("a:contains('" + vid.label + "')").addClass("active");
                    } else alert("No Video Found!");

                } else alert(res.data);

                $("body").append(video)
                $("head").html(post);
            }
            if ($("video").length === 1 || location.host.includes("mp4upload")) {
                video = $("video").clone();
                if ($("video").length && ($("video").attr("src") || $("video>source").attr("src"))) {
                    if ($("video").attr("src") != undefined)
                        if ($("video").attr("src").length > 0) parent.postMessage("grab#" + video.get(0).src, "*");
                } else {
                    try {
                        video = $("<video/>").attr("src", vid).attr("poster", $("video").attr("poster"));
                        if (!vid) {
                            var output = eval(/eval(\(.*\))/.exec($("body").html())[1]),
                                setup = /setup\(({.*?(\(.*?\))*.*?})\)/.exec(output),
                                res;
                            if (setup)
                                setup = JSON.parse(setup.replace(/'/g, '"').replace(/([,{]"[^"]+?":)([^[{"]+?)([,\]}])/g, '$1"$2"$3'));
                            else setup = {
                                file: (res = /player\.src\("(.+?)"\)/.exec(output)) && res[1],
                                image: (res = /player\.poster\("(.+?)"\)/.exec(output)) && res[1]
                            }
                            video = $("<video/>").attr("src", setup.file).attr("poster", setup.image);
                        }
                    } catch (e) {
                        console.warn(e);
                    }

                }

                var a360 = $("a:contains('360p')").addClass("p360"),
                    a480 = $("a:contains('480p')").addClass("p480"),
                    a720 = $("a:contains('720p')").addClass("p720"),
                    a1080 = $("a:contains('1080p')").addClass("p1080");


                video.prop("muted", false)
                    .prop("controls", true)
                    .attr("id", "mainVid")
                    .attr("preload", "auto")
                    .removeAttr("class").removeAttr("name");
                var quality = $("<div />").addClass("q")
                    .append(a360)
                    .append(a480)
                    .append(a720)
                    .append(a1080);

                quality.find("a").each(function () {
                    var c = "."+$(this).attr("class");
                    if($(this).html().includes("#fff")) $(this).addClass("active");
                    $(this).html($(this).text());
                    if (!$(this).data("file")) 
                        $.ajax({
                            dataType: 'html',
                            type: 'get',
                            url: this.href,
                            success: function (r) {
                                var src;
                                if(src = ($(r).find("video").attr("src") || $(r).find("video > source").attr("src")))
                                    $(c).attr("href", "#").attr("data-file", src);
                            }
                        });
                    
                });

                $("body").html("").css('background-color', 'initial');
                $("html").css('background', 'none');
                $("body").append(video).append(quality);

                $("link[href*='.css'], br").remove();
                setUpVideo();


                chrome.storage.sync.get('preload', function (data) {
                    //console.log(data.preload);
                    if (location.hash.indexOf("downloadAnime") != -1) {
                        var name = atob(
                            location.hash.substring(
                                location.hash.indexOf("#downloadAnime#") + "#downloadAnime#".length));

                        var url = $("video > source").attr('src') || $("video").attr('src');
                        var el = $("<div/>").addClass("wrapper").attr("style", "display:inline-block;width:80%;height:100%;").append($("<div/>").attr("style", "width:0px;height:100%;background-color:white;").addClass("loader"));

                        $("body").html(el).css("background-color", "black").append("<div style='display:inline-block;height:100%;width:20%;'><a id='suspend' href='#' style='width: 100vw;height: 100vh;display: table-cell;vertical-align:  middle;text-align: center;background-color: red;'>Pause</a></div>");

                        preload(function (oEvent) {
                            if (oEvent.lengthComputable) {
                                var percentComplete = oEvent.loaded / oEvent.total;
                                percentComplete = parseInt(percentComplete * 100);

                                parent.postMessage({
                                    ep: {
                                        percent: percentComplete,
                                        name: name,
                                        status: epStatus.progress
                                    }
                                }, "*");

                                if (percentComplete + "%" != $(".loader").get(0).style.width)
                                    $(".loader").css("width", percentComplete + "%");
                            }
                        }, function (oEvent) {
                            $('#abort').hide();
                            if (!oEvent.lengthComputable) {
                                parent.postMessage({
                                    ep: {
                                        name: name,
                                        status: epStatus.error
                                    }
                                }, "*");
                                $("body").html("").append($("<div style='height:100vh;width:100vw;background-color: white;'></div>")
                                    .append("<a href='#' onclick='location.reload();'>Retry</a>"));
                            }
                            $(".loader").css("width", "100%");
                            var blob = new Blob([oEvent.target.response], {
                                type: "video/mp4"
                            });
                            parent.postMessage({
                                ep: {
                                    name: name,
                                    status: epStatus.success,
                                    blob: URL.createObjectURL(blob)
                                }
                            }, "*");
                            var a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.textContent = a.download = name;

                            a.click();

                            $(a).attr("style", "width: 100vw;height: 100vh;display: table-cell;vertical-align:  middle;text-align: center;background-color: white;");


                            $("body").html("").append($("<div style='height:100vh;width:100vw;'></div>")
                                .append(a));

                        }, function () {
                            parent.postMessage({
                                ep: {
                                    url: href,
                                    status: epStatus.error
                                }
                            }, "*");
                            $("body").html("").append($("<div style='height:100vh;width:100vw;background-color: white;'></div>")
                                .append("<a href='#' onclick='location.reload();'>Retry</a>"));
                        }, undefined, url);
                    } else if (data.preload != 0)
                        preload();
                });

            }
        } else {
            location.hash = noEditHash;
            console.log(location.hash)
            location.reload();
            delete page;
        }
    });
}

if (location.hash != noEditHash && !localStorage.getItem("captcha")) {
    document.documentElement.innerHTML = 'Reloading Page...';
    window.stop();

    if (href.includes("rapidvideo") && !/&q=.+?p/g.test(href) && settings.quality)
        chrome.storage.sync.get(function (data) {
            href += "&q=" + settings.quality;
            xhr.open('GET', href, true);
            xhr.send();
        });
    else xhr.send();

} else {
    if (location.hash == noEditHash) location.hash = "#";
    localStorage.removeItem("captcha");
}

setCustomShortcut("playAndPause");
setCustomShortcut("fullScreen");
setCustomShortcut("nextEp");
setCustomShortcut("prevEp");
setCustomShortcut("skipTheme");
setCustomShortcut("skipTimeSpan");
