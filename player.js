const controlIcons = {
    pause: "pause",
    play: "play",
    forward: "forward",
    backward: "backward",
    download: "download",
    "download-aborted": "download-aborted"
};
const toolbarButtons = {
    star: "star",
    play: "play-button",
    pause: "pause-button",
    download: "download-button",
    fscreen: "fullscreen-button",
    exitFullscreen: "exit-full-button",
    setting: "settings-button",
    volume2: "volume2",
    volume1: "volume1",
    volume0: "volume0",
    volumeMute: "mute"
};

function generateImgTag() {
    var res = "";
    for (var i in arguments)
        res += "<img src='" + xUrl("imgs/transparent.png") + "' class='" + arguments[i] + "'>";
    return res;
}

function fadeIcon(which) {
    $(".svg." + which + "Icon").attr("src", xUrl("imgs/" + which + ".svg")).show().fadeOut(500);
}

function secToTime(time) {
    var t = [],
        x;
    if ((x = parseInt(time / 3600)) >= 1) {
        t.push(x < 10 ? "0" + x : x);
        time %= 3600;
    }
    t.push((x = parseInt(time / 60)) < 10 ? "0" + x : x);
    time %= 60;
    t.push((x = parseInt(time)) < 10 ? "0" + x : x);
    return t.join(":");
}

function setPlayerTime(time, duration) {
    var text = secToTime(time) + " / " + secToTime(duration);
    if ($("#time").text() != text)
        $("#time").text(text);
}

function getVolumeKey(v) {
    if (v.muted) return "volumeMute";
    var lvl = 0;
    if (v.volume) lvl = v.volume > .5 ? 2 : 1;
    return "volume" + lvl;
}

function setUpVideo() {
    var vid = $("video"),
        vDom = vid[0],
        loader = $("<img/>").addClass("controlIcon loadingImg").attr("src", xUrl("imgs/loader.gif")),
        ctrlIcon = $("<img/>").addClass("controlIcon svg"),
        container = $("<table/>").addClass("toolbarContainer").append("<tr/>"),
        timeDisplay = $("<div/>").addClass("timeDisplay").css("text-align", "center").append("<canvas></canvas><br><span></span>"),
        buffer = $("<div/>").addClass("buffer"),
        pointer = $("<div/>").addClass("pointer dragDot"),
        pFill = $("<div/>").addClass("pointerFill"),
        volume = $("<div/>").addClass("volumeBar"),
        bufferBar = $("<div/>").addClass("bufferBar").append(timeDisplay).append(pointer).append(pFill),
        controlBar = $("<div/>").addClass("controlBar").append(bufferBar).append(container),
        player = $("<div/>").addClass("player").append(vDom).append(controlBar).append(loader)
        .append(ctrlIcon.clone().addClass("playIcon"))
        .append(ctrlIcon.clone().addClass("pauseIcon"))
        .append(ctrlIcon.clone().addClass("backwardIcon"))
        .append(ctrlIcon.clone().addClass("forwardIcon"))
        .append(ctrlIcon.clone().addClass("downloadIcon"))
        .append(ctrlIcon.clone().addClass("download-abortedIcon"));
    var style = $("<style/>");

    for (var key in toolbarButtons) {
        style[0].innerHTML += "\n." + key + "{-webkit-mask: url(" + xUrl("imgs/" + toolbarButtons[key]) + ".svg) no-repeat center;}";
    }
    container.prepend(style);
    container.find("tr")
        .append(
            "<td>" + generateImgTag("play media-control slickBtn") + "</td>"
        )
        .append("<td><span style='color:white;font-size:15px;' id='time'></span></td>")
        .append(
            $("<td/>").css("width", "20%").addClass("volume")
            .append(
                generateImgTag("slickBtn volumeLvl " + getVolumeKey(vDom))
            ).append(volume)
        )
        .append($("<td/>").css("width", "20%"))
        .append(
            $("<td/>").addClass("rating").css("width", "20%").append(
                generateImgTag("slickBtn star").repeat(5)
            )
        )
        .append(
            "<td style='text-align:right;position:relative;'>" + generateImgTag('setting slickBtn', 'download slickBtn', 'fscreen screen slickBtn') + "<div class='settings'>Nothing to show</div></td>"
        );

    container.find(".star").each((i, el) => el.title = ["Crappy", "Bad", "Meh", "Good", "Great"][i]);

    var settingsBloc = container.find(".settings"),
        table = $("<table/>").css({
            "user-select": "none",
            width: "100%",
            margin: "0 auto"
        }),
        pre = table.find("#preload");

    if ($(".q").length) table.append("<tr><td class='q'>" + $(".q").html() + "</td></tr>");
    $(".q").remove();

    $(document).on("click", ".q a", function (e) {
        var file;
        if ((file = $(this).data("file")) && !$(this).hasClass("active")) {
            e.preventDefault();
            if (file != vid.attr("src")) vid.attr("src", file);
            $(".q a").removeClass("active");
            $(this).addClass("active");
        }
    });

    table.append(
        "<tr><td id='status' ><div id='preload' style='cursor:pointer; text-align:center; color:#5d8800;'>Preload whole video</div><div id='abort' style='color:red;width:100%;'></div></td></tr>"
    ).append(
        $("<tr/>").append($("<td/>").css({
            cursor: "pointer",
            "text-align": "center",
            color: "red"
        }).text("Remove this player").on("click", function () {
            mouseOnSettings = 0;
            controlBar.click();
            showPrompt(player, function () {
                    if ($("#msgArea .permanent").is(":checked"))
                        chrome.storage.sync.set({
                            player: settings.player = 0
                        });
                    var txt = $("#msgArea textarea");
                    if (txt.length && txt.val().length > 0)
                        chrome.storage.sync.get(function (data) {
                            var f = data.feedback;
                            if (!f) f = [];
                            if (typeof f == 'string') f = [f];
                            f.push(txt.val());
                            chrome.storage.sync.set({
                                feedback: f
                            });
                        });
                    hidePlayer(vDom);
                }, undefined, undefined,
                "Are you sure you wanna use plain video player instead ?",
                "<label><input type='checkbox' class='permanent'> Don't use slickiss's player next time</label><br><br><textarea class='decorated' placeholder=\"I'd appreciate your feedback..\"></textarea>");
        }))
    );

    var mouseDown, mouseOver, offsetX, alphaTimeout, isControlHover, onVolume, mouseOnSettings, mouseOnSettingIcon;

    settingsBloc.html("").append(table);
    settingsBloc.add(controlBar).on("mouseenter mouseleave", function (e) {
        if (controlBar.is(this)) return isControlHover = e.type == "mouseenter";
        if (container.find(".setting").is(this)) mouseOnSettingIcon = e.type == "mouseenter";
        mouseOnSettings = e.type == "mouseenter";
    });

    player.on("mousemove mouseleave", function (e) {
            if (e.type == "mouseleave") {
                player.addClass("idle");
                return;
            }
            if (alphaTimeout) clearTimeout(alphaTimeout);
            player.removeClass("idle");
            alphaTimeout = setTimeout(function () {
                player.addClass("idle");
            }, isControlHover ? 10000 : 2000);
        })
        .on("click", function (e) {
            if (!mouseOnSettings) settingsBloc.hide();
        });


    volume.on("mousedown", function (e) {
        if (onVolume || e.which != 1) return;
        e.preventDefault();
        onVolume = 1;
        $(this).addClass("volumeChange");
    });

    $(document).on("click", ".slickBtn:not(.disabled)", function (e) {
            if ($(this).hasClass("media-control")) {
                var ev = jQuery.Event("keypress");
                ev.which = shortcuts.playAndPause;
                $("body").trigger(ev);
            }
            if (mouseOnSettings = $(this).hasClass("setting")) {
                settingsBloc.toggle();
                setTimeout(() => {
                    mouseOnSettings = mouseOnSettingIcon;
                }, 100);
            }
            if ($(this).hasClass("volumeLvl")) vDom.muted = !vDom.muted;

            if ($(this).hasClass("download")) {
                var ev = jQuery.Event("keypress");
                ev.which = "d".charCodeAt(0);
                $("body").trigger(ev);
            }

            if ($(this).hasClass("screen")) {
                var ev = jQuery.Event("keypress");
                ev.which = shortcuts.fullScreen;
                $("body").trigger(ev);
            }
        })
        .on("click mouseenter mouseleave", ".rating .star", function (e) {
            if (e.type == "mouseleave") {
                $(".star").removeClass("hover");
                return;
            }
            var cls = e.type == "click" ? "selected" : "hover";
            var el = $(this).addClass(cls);
            while (el.prev(".star").length)
                el = el.prev(".star").addClass(cls);

            el = $(this);
            while (el.next(".star").length)
                el = el.next(".star").removeClass(cls);
            if (cls == "selected" && e.originalEvent && e.originalEvent.isTrusted)
                chrome.storage.sync.set({
                    rate: $(".rating .selected").length,
                    _rate: $(".rating .selected").length
                });


        })
        .on("mousemove mouseleave mouseup", function (e) {
            if (!player.hasClass("canPlay")) return;


            if (onVolume)
                vDom.volume = Math.max(Math.min((e.pageX - volume.offset().left) / volume.width(), 1), 0);

            if (e.type == "mouseup") {
                volume.removeClass("volumeChange");
                onVolume = 0;
            }

            if (e.type == "mouseleave" || e.type == "mouseup") {
                if (mouseDown) {
                    mouseDown = 0;
                    vDom.currentTime = (offsetX / bufferBar.width()) * vDom.duration;
                    return;
                }
            }
            if (mouseDown) {
                offsetX = e.pageX - bufferBar[0].offsetLeft;
                if (offsetX < 0) offsetX = 0;
                if (offsetX > bufferBar.width()) offsetX = bufferBar.width();
                pointer[0].style.marginLeft = offsetX + "px";
                setPlayerTime((offsetX / bufferBar.width()) * vDom.duration, vDom.duration);
            }
            if (mouseOver) {
                var x = e.pageX - bufferBar[0].offsetLeft;
                if (x < 0) x = 0;
                if (x > bufferBar.width()) x = bufferBar.width();
                timeDisplay.css("margin-left", x + "px");
                var time = (x / bufferBar.width()) * vDom.duration;
                timeDisplay.find("span").text(secToTime(time));
                timeDisplay.find("canvas").replaceWith(getThumb(time));
                timeDisplay.css("margin-left", Math.max(x, timeDisplay.width() / 2) + "px");
                timeDisplay.css("margin-left",
                    Math.min(x, bufferBar.width - timeDisplay.width() / 2) + "px"
                );

            }
        });

    chrome.storage.sync.get(function (data) {
        if (data._rate) $(".rating .star").eq(data._rate - 1).click();
    });

    bufferBar.on("mousedown", function (e) {
            if (!player.hasClass("canPlay")) return;
            if (mouseDown || e.which != 1) return;
            e.preventDefault();
            offsetX = e.pageX - bufferBar[0].offsetLeft;
            if (offsetX < 0) offsetX = 0;
            if (offsetX > $(this).width()) offsetX = $(this).width();
            mouseDown = 1;
            pointer[0].style.marginLeft = offsetX + "px";
        })
        .on("mouseenter mouseleave", function (e) {
            if (!player.hasClass("canPlay")) return;
            mouseOver = e.type == "mouseenter";
            timeDisplay.css("opacity", mouseOver ? 1 : 0);
            player[mouseOver ? "addClass" : "removeClass"]("pinned");
        });

    vDom.controls = false;
    $("body").css("margin", "0").prepend(player);
    var pathname = location.pathname,
        title;

    window.addEventListener("message", function (e) {
        var key = e.message ? "message" : "data";
        var data = e[key];
        if (data.type == "keydown" || data.type == "keyup" || data.type == "keypress") {
            displayToast("You're now focused on the video, click again to use shortcuts");
        }
        if (data.title) title = data.title;
    });

    function toggleFullscreen() {
        if ($(".player").length) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
                $(vDom).removeClass("fullScreen");
            } else {
                player[0].webkitRequestFullscreen();
                $(vDom).addClass("fullScreen");
            }
            return;
        }
        if (vDom.webkitDisplayingFullscreen)
            vDom.webkitExitFullScreen()
        else
            vDom.webkitRequestFullScreen()

    }

    chrome.storage.sync.get('shortcuts', function (data) {
        if (data.shortcuts != 0) {
            $(document).on('keypress', "*", function (e) {
                if ($("input:focus, textarea:focus").length) return;
                e.stopImmediatePropagation();
                var key = e.which || e.keyCode;
                var skipTimeSpan = 60 + 25;
                switch (key) {
                    case shortcuts.playAndPause:
                        if (settings.player == 1)
                            vDom.paused ? vDom.play() : vDom.pause();
                        break;
                    case shortcuts.fullScreen:
                        toggleFullscreen();
                        break;
                    case shortcuts.nextEp:
                        parent.postMessage("nextEp", '*');
                        break;
                    case shortcuts.prevEp:
                        parent.postMessage("prevEp", '*');
                        break;
                    case shortcuts.skipTheme:
                        vDom.currentTime += skipTimeSpan;
                        fadeIcon(controlIcons.forward);
                        break;
                    case shortcuts.abortPreload:
                        !$("#abort").is(":visible") ? preload() : $("#abort").get(0).click();
                        break;
                    case "d".charCodeAt(0):
                        var src = vid.attr("src") ? vid.attr("src") : $("video source").attr("src");
                        var a = document.createElement("a");
                        a.href = src;
                        if (title) a.download = title;
                        a.click();
                        break;
                }
            });
        }
    });
    $(document).on('keydown', function (e) {
            e.stopImmediatePropagation();
            var key = e.which || e.keyCode;
            switch (key) {
                case 37:
                    vid[0].currentTime -= 4;
                    fadeIcon(controlIcons.backward);
                    break;
                case 39:
                    vid[0].currentTime += 4;
                    fadeIcon(controlIcons.forward);
                    break;
            }
        })
        .on("webkitfullscreenchange", function () {
            var f = document.fullscreenElement;
            if (!f) $(vDom).removeClass("fullScreen");
            $(".screen").removeClass(!f ? "exitFullscreen" : "fscreen").addClass(f ? "exitFullscreen" : "fscreen")

        });



    let continueFeatureHandled = false,
        t, volumeSetting = {
            lvl: vDom.volume,
            muted: vDom.muted
        };
    vid.add(player).css('width', '100%').css('height', '100%');
    vid.on('dblclick', function (e) {
            e.preventDefault();
            if (document.fullscreenElement) {
                $(vDom).removeClass("fullScreen");
                document.exitFullscreen();
            } else {
                $(vDom).addClass("fullScreen");
                player[0].webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        })
        .on('click', function (e) {
            if ($(".player").length)
                this.paused ? this.play() : this.pause();
        })
        .on('canplay', function (e) {
            $(".slickBtn").removeClass("disabled");
            setThumbnailsVid(vDom.currentSrc);

            $("#preload").on("click", () => {
                preload()
            });
            $("#abort").on("click", function () {
                fadeIcon(controlIcons["download-aborted"]);
                preloader.abort();
                $("#status").css("background", "").removeClass("preloading");
            });
            chrome.storage.sync.get('autoplay', function (data) {
                if (data.autoplay != 0)
                    vid.get(0).play();
            });
            if (!continueFeatureHandled)
                chrome.storage.sync.get('notifyLastTime', function (data) {
                    if (data.notifyLastTime !== false)
                        continueFeatureHandled = true;
                    var lastTimeLeftAt = localStorage.getItem('lastTimeLeftAt') || "{}";
                    var time;
                    var dataTimes = JSON.parse(lastTimeLeftAt);
                    if (time = dataTimes[md5(pathname)]) {
                        showPrompt(player, function () {
                            vid.get(0).currentTime = time
                        }, undefined, function () {
                            delete dataTimes[md5(pathname)];
                            localStorage.setItem('lastTimeLeftAt', JSON.stringify(dataTimes));
                        });
                        $(document).on("keypress", function () {
                            $(".prompt td").eq(1).click();
                        });
                    }
                });
            if (!this.currentTime) {
                $(pFill).width(0);
                setPlayerTime(this.currentTime, this.duration);
            }
            player.addClass("canPlay").removeClass("loading");
            $(".disabled").removeClass("disabled");

        })
        .on('timeupdate', function (e) {
            var v = this;


            var pos = (v.currentTime / v.duration);
            pFill[0].style.width = (pos * 95).toFixed(2) + "%";
            if (!mouseDown) {
                pointer[0].style.marginLeft = (pos * 95).toFixed(2) + "%";
                setPlayerTime(v.currentTime, v.duration);
            }

            if (v.currentTime > v.duration - 60 * 3)
                chrome.storage.sync.get('markAsSeen', function (data) {
                    if (data.markAsSeen == 1) {
                        parent.postMessage("finished", '*');
                    }

                    var lastTimeLeftAt = localStorage.getItem('lastTimeLeftAt') || '{}';
                    var dataTimes = JSON.parse(lastTimeLeftAt);
                    if (dataTimes[md5(pathname)]) {
                        delete dataTimes[md5(pathname)];
                        localStorage.setItem('lastTimeLeftAt', JSON.stringify(dataTimes));
                    }
                });
            else if (v.currentTime > 60)
                chrome.storage.sync.get('notifyLastTime', function (data) {
                    var lastTimeLeftAt = localStorage.getItem('lastTimeLeftAt') || '{}';
                    let dataTimes = JSON.parse(lastTimeLeftAt);
                    dataTimes[md5(pathname)] = v.currentTime;
                    if (data.notifyLastTime !== false)
                        localStorage.setItem('lastTimeLeftAt', JSON.stringify(dataTimes));

                });
        })
        .on("error", function (e) {
            if (![this.NETWORK_IDLE, this.NETWORK_LOADING].includes(this.networkState)) {
                $(".canPlay").removeClass("canPlay").removeClass("loading");
                $(".slickBtn:not(.setting)").addClass("disabled");
            }
        })
        .on("waiting", function () {
            player.addClass("loading");
        })
        .on("playing", function () {
            player.removeClass("loading")
        })
        .on("pause", function () {
            $(".pause").removeClass("pause").addClass("play");
            fadeIcon(controlIcons.pause);
        })
        .on("play", function () {
            fadeIcon(controlIcons.play);
            $(".play").removeClass("play").addClass("pause");
        })
        .on("volumechange", function (e) {
            var perc = vDom.volume * 100;
            if (volumeSetting.muted && perc > 0) this.muted = false;
            if (this.muted && !volumeSetting.muted) perc = 0;
            volumeSetting.lvl = this.volume;
            volumeSetting.muted = this.muted;
            volume.css("background", "linear-gradient(90deg, white " + perc + "%, #fffefe52 " + (1 - perc) + "%)");
            $(".volumeLvl").removeClass("volume2 volume1 volume0 volumeMute").addClass(getVolumeKey(this));
        });
    vDom.volume = vDom.volume;

    var buffers = {};
    vDom.addEventListener("progress", function () {
        var temp = {};
        var len = vDom.buffered.length;
        while (len--) {
            var s = vDom.buffered.start(len),
                e = vDom.buffered.end(len);
            temp[s] = e;
            if (!buffers[s]) {
                var buf = buffer.clone();
                buffers[s] = buf;
                bufferBar.append(buf);
            }
            var mLeft = (s / vDom.duration) * 95;
            var length = ((e - s) / vDom.duration) * 95;
            buffers[s].css("margin-left", mLeft.toFixed(2) + "%");
            buffers[s].css("width", length.toFixed(2) + "%");
        }
        for (var key in buffers) {
            if (!temp[key]) {
                buffers[key].remove();
                delete buffers[key];
            }
        }
    });
    if (settings.player != 1) hidePlayer(vDom);

    if (!vDom.currentSrc) {
        $(".canPlay").removeClass("canPlay").removeClass("loading");
        $(".slickBtn:not(.setting)").addClass("disabled");
        return;
    }

    setThumbnailsVid(vDom.currentSrc);


}



const thInterval = 5;
var thumbnails = {},
    queue = [],
    interval = 1,
    tnVid, started,
    handled = new Set();

function getThumb(time) {
    time = parseInt((time + 1) / thInterval);
    if (!handled.has(time)) {
        if (queue.includes(time)) queue = queue.filter(i => i != time);
        queue.push(time);
    }
    return thumbnails[time];
}

function setThumbnails() {
    if (interval * thInterval > tnVid[0].duration) return;
    var x = interval;
    while (queue.length && handled.has(x = queue.pop())) x = interval;
    tnVid.data("interval", x);
    tnVid[0].currentTime = x * thInterval;
    if (x == interval) interval++;
}

function setThumbnailsVid(src) {
    if(["www.mp4upload.com"].includes(location.host)) return;
    if (started) return;
    started = 1;
    $("body").append(
        tnVid = $("<video/>").attr("src", src).data("interval", 0)
        .on("canplay", function () {
            var intrvl = $(this).data("interval");
            if (intrvl != null) {
                if (!$(this).data("interval"))
                    for (var i = 0; i < this.duration / thInterval; i++)
                        thumbnails[i] = $("<canvas/>").hide()[0];

                this.pause();
                var canvas = thumbnails[$(this).data("interval")];
                $(canvas).show();
                var ctx = canvas.getContext('2d');
                ctx.drawImage(this, 0, 0,
                    canvas.width = 142,
                    canvas.height = 80);
                handled.add(intrvl);
            }
            setThumbnails();
        })
        .hide()
    );
}

function hidePlayer(vDom) {
    vDom.controls = 1;
    $("body").prepend(vDom);
    $(".player").remove();
    tnVid.remove();
}


var preloaded, preloader = new XMLHttpRequest();

function preload(progressHandler, loadHandler, errorHandler,
    video = $("video")[0], url = $("video")[0].currentSrc) {
    /*
        chrome.runtime.sendMessage(undefined, {
            url: url,
            download: 1
        }, undefined, function (response) {
            console.log(response);
        });
        return;
    */
    if (preloaded) return;
    fadeIcon(controlIcons.download);

    preloader.open("GET", url, true);
    preloader.responseType = "arraybuffer";

    $("#status").addClass("preloading");
    $('#abort').text("Abort");

    preloader.onload = loadHandler || function (oEvent) {
        if (!oEvent.lengthComputable) {
            $("#abort").text("Error, Abort and try again");
            return;
        }
        $("#status").removeClass("preloading").html("Video preloaded!");
        var blob = new Blob([oEvent.target.response], {
                type: "video/mp4"
            }),
            pos = video.currentTime,
            paused = video.paused;

        if (video.src !== URL.createObjectURL(blob))
            video.src = URL.createObjectURL(blob);
        video.currentTime = pos;
        if (!paused) video.play();
    };

    preloader.onprogress = progressHandler || function (oEvent) {
        if (oEvent.lengthComputable) {
            var perc = oEvent.loaded / oEvent.total;
            perc = parseInt(perc * 100);
            if (!$("#status").text().includes("(" + perc + "%)")) {
                $("#status").css("background", "linear-gradient(90deg, #a8f500 " + perc + "%, #ffffff00 " + perc + "%)");
                $("#abort").text("Abort (" + perc + "%)");
            }
        }
    }
    preloader.onerror = errorHandler || function (oEvent) {
        preloader.open("GET", url, true);
        preloader.send();
    }

    preloader.send();
}
