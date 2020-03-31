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


setCustomShortcut("playAndPause");
setCustomShortcut("fullScreen");
setCustomShortcut("nextEp");
setCustomShortcut("prevEp");
setCustomShortcut("skipTheme");
setCustomShortcut("skipTimeSpan");

chrome.storage.sync.get('servers', function (data) {
    var settings = data.servers,
        isHostSet = (settings == undefined ? true : settings[location.host] != 0);
    console.log(settings[location.host]);
    if (isHostSet) {
        if ($("video").length === 1) {

            if ($("#streamurj").length != 0) {
                if ($("#streamurj").text().toLowerCase().indexOf("nothin") == -1 && $("#streamurj").text().length > location.host.length)
                    parent.postMessage("grab#" + $("<a/>").attr("href", "//" + location.host + "/stream/" + $("#streamurj").html()).get(0).href, "*");
                else
                    $("#streamurj").on("DOMSubtreeModified", function () {
                        parent.postMessage("grab#" + $("<a/>").attr("href", "//" + location.host + "/stream/" + $("#streamurj").html()).get(0).href, "*");
                    });
            }

            $("#videooverlay").click();
            var video = $("video").clone();
            if ($("video").attr("src") != undefined)
                if ($("video").attr("src").length > 0) parent.postMessage("grab#" + video.get(0).src, "*");

            video.prop("muted", false)
                .prop("controls", true)
                .attr("id", "mainVid")
                .attr("preload", "auto")
                .removeAttr("class").removeAttr("name");
            var status = "<div id='status' style='color: white; display:none;'>0%</div>" +
                "<div id='abort' style='color:red;cursor:pointer; display:none;'> abort</div>";
            var quality = $("<div />");
            quality.append($("a:contains('360p')"))
                .append($("a:contains('480p')"))
                .append($("a:contains('720p')"));

            if (localStorage.getItem("tipLife") == null)
                localStorage.setItem("tipLife", 0);
            var tiplife = Number(localStorage.getItem("tipLife"));
            var key = String.fromCharCode(shortcuts.skipTheme);
            if (key == " ") key = "Spc";
            if (shortcuts.skipTheme == 13) key = "Entr";
            if (tiplife < 9) {
                quality.append($("<div />").html("Tip : Use the key '" + key + "' to skip the opening or the ending.")
                    .css('float', 'right').css('color', 'white'));
                localStorage.setItem("tipLife", tiplife + 1);
            }
            $("body").html("").css('background-color', 'initial');
            console.log(undefined);
            $("html").css('background', 'none');
            $("body").append(video).append(quality)
                .append(status).append('<br>');
            

            setUpVideo();

            $("body").on('click', '#abort', function (event) {
                xhr.abort();
                $(this).prev().hide();
                $(this).hide();
            });

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
                                url: location.href,
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
    }
});


function preload(progressHandler, loadHandler, errorHandler,
    video = $("video").get(0), url = $("video > source").attr('src')) {
    if (url == undefined) url = $("video").attr('src');

    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    $('#abort').show();
    $("#status").show();

    xhr.onload = loadHandler || function (oEvent) {
        $('#abort').hide();
        if (!oEvent.lengthComputable) {
            $("#status").text("can't preload this video, reload the page if the video isn't playing");
            return;
        }
        $("#status").text("100%");
        var blob = new Blob([oEvent.target.response], {
                type: "video/mp4"
            }),
            pos = video.currentTime,
            paused = video.paused;

        console.log(oEvent);

        if (video.src !== URL.createObjectURL(blob))
            video.src = URL.createObjectURL(blob);
        video.currentTime = pos;
        if (!paused) video.play();
    };

    xhr.onprogress = progressHandler || function (oEvent) {
        if (oEvent.lengthComputable) {
            var percentComplete = oEvent.loaded / oEvent.total;
            percentComplete = parseInt(percentComplete * 100);

            if (percentComplete + "%" != $("#status").text())
                $("#status").text(percentComplete + "%");
        }
    }
    xhr.onerror = errorHandler || function (oEvent) {
        $("#status").text("error occurred, reload the page.");
    }

    xhr.send();
}
