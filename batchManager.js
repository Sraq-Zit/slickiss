throw '';
//Load download links
var downloads = {};
var episodes = {};
var next, visited = new Set();
var href = location.href,
    progress = 0,
    links,
    errors,
    abort,
    lastIndex,
    shift,
    order = [];

if (href.last() == "/") href = href.substring(0, href.length - 2);

var later = "or <a class='get-downloads navigDownload' href='#' >Download using the navigator</a>";

$(document).on("change", "#select-all", function () {
        var check = $(this).is(":checked");
        $("input[class='ep']:visible").not(this).each(function () {
            if ($(this).is(":checked") != check)
                this.click();
        });
    })
    .on("keydown keyup", function (e) {
        shift = e.type == "keydown" && e.shiftKey;
    });


var navigDowload = $(".get-downloads").hasClass("navigDownload");
console.log(settings.batch);
order = settings.batch ? settings.batch : [0, 1, 2, 3, 4];
if (href.includes(animeLink) && href.lastIndexOf("/") == href.indexOf(animeLink) + animeLink.length - 1) {

    $("body").on('click', ".batch-info", function (event) {
        event.preventDefault();
        var id = ""
        if (this.id != undefined) id = this.id;
        chrome.runtime.sendMessage({
            type: 'open_url',
            data: "how-to-use-batch.html#" + id
        });
    });

    if ($("#btnBookmarkManager").length) $("#btnBookmarkManager").get(0).click();


    $("body").append($("<div />").attr('id', 'captchaContainer').height(0).css('overflow', 'hidden'));

    $(".listing th").eq(0).attr("width", "80").before("<th width='5%'>#</th>");

    $(".listing").before('[<a href="#" class="batch-info">Learn more</a>]<div id="notifs" style="padding:10px;border:1px solid red;display:none;overflow:auto;height:150px;"></div>');

    $(".listing").before("<table style='width:100%'><col width='85%'><tr>" + downloadsHeader + "</tr></table>").find("a").not('.get-downloads, .batch-info')
        .each(function (i, el) {
            $(this).before("<input class='ep' type='checkbox' data-href='" + this.href + "'>");
        });
    $(".listing input.ep").each(function (i) {
        $(this).parent().before("<td>" + ($(".listing input.ep").length - i).pad(0, 3) + "</td>");
    });

    $("#dldQuery").on("input", function () {
        this.value = this.value.replace(/\s|[^0-9,-]/g, "");
        if (!/^(\d+(-\d+)?,?)*$/g.test(this.value) || this.value == '') {
            return;
        }

        $("input[class='ep']").prop('checked', false);
        var v = this.value.split(",");
        for (var i in v) {
            var val = v[i].split("-"),
                min = parseInt(val[0]),
                max = val.length == 2 ? parseInt(val[1]) : min;

            min = Math.min(min, max);
            max = Math.max(min, max);
            while (min <= max)
                $("input[class='ep']").eq($(".listing input.ep").length - min++).prop('checked', true);
        }
    })

    $("body").on("change", "#select-all", function () {
        var check = $(this).is(":checked");
        $("input[class='ep']").not(this).each(function () {
            if ($(this).is(":checked") != check)
                this.click();
        });
    });

    $("input[class='ep']").on('change', function (e) {
        if ($("input[class='ep']:checked").length === $("input[class='ep']").length)
            $("#select-all").prop('checked', true);
        else if ($("#select-all").prop('checked')) $("#select-all").prop('checked', false);


        if (lastIndex != undefined && $(this).is(":checked"))
            if (shift) {
                var min = Math.min(lastIndex, $("input[class='ep']").index(this)),
                    max = Math.max(lastIndex, $("input[class='ep']").index(this));

                while (min <= max)
                    $("input[class='ep']").eq(min++).prop('checked', true);

                return;

            }

        lastIndex = $("input[class='ep']").index(this);
    });

}



$("body").on('click', ".get-downloads", function (event) {
    event.preventDefault();
    next = $("input[class='ep']:checked").length;

    if ($("input[class='ep']:checked").length === 0) {
        alert("Select episodes");
        return;
    }

    if (navigDowload) {
        $(".listing th").eq(0).attr("width", "45%").after("<th width='40%'> Progress </th>");
        $(".ep").each(function (i, el) {
            $(el).parent().after($("<td/>").text(el.checked ? "" : "Skipped"));
        });
        $(".ep:checked").each(function (i, el) {
            episodes[$(el).next().text().trim()] = i;
        });
        eventer(messageEvent, function (e) {
            var key = e.message ? "message" : "data";
            var data = e[key].ep;
            if (!data) return;

            if (data.status == epStatus.error || data.status == epStatus.success) {
                if (downloads[episodes[data.name]].status != epStatus.error) {
                    getVids(next);
                    progressAstep(data.status != epStatus.error);
                }
                downloads[episodes[data.name]].status == data.status;
            }
            if (data.status == epStatus.progress && data.percent != downloads[episodes[data.name]].percent) {
                downloads[episodes[data.name]].percent = data.percent;
                subProgress(data.percent / 100);
            }

        });

    }

    progress = 0;
    links = '';
    errors = '';
    $("#notifs").html("").hide().on("DOMSubtreeModified", function () {
        this.scrollTop = this.scrollHeight;
    });
    $("input[type='checkbox']").prop('disabled', 'disabled');
    $("#select-area").html('<div style="height: 15px;width: .1%;background-color: white;transition: all 2s linear;" id="download-loader"></div>')
        .css('border', '1px solid white')
        .parent().append('<td><a href="#" id="getResults">Get current links</a><br><a href="#" id="cancel">Abort</a></td>');

    $("#getResults").on('click', function (event) {
        event.preventDefault();
        if (!navigDowload) openWindow();
    });

    $("#cancel").on('click', function (event) {
        event.preventDefault();
        abort = 1;
        $("#select-area").parent().hide();
        $("#notifs").show().append("<span>Please wait until the current request is finished<br><span>");
    });


    self.destroy = function (id) {
        var srv = $("iframe#link" + id).data("server");
        $("iframe#link" + id).remove();
        id = parseInt(id);
        visited.add(id);
        addLinkIframe(id - 1, srv);
    }

    getVids();

});


function addLinkIframe(l, srv) {
    //while (visited.has(l) || $("link" + l).length) l--;
    if (l >= 0 && !$("iframe#link" + l).length)
        $("body").append($("<iframe/>").attr({
            "data-server": srv,
            "id": "link" + l,
            src: $("input[class='ep']:checked").eq(l).data('href').changeServer(srv) + "#noredirect" + l
        }).hide());
}

function getVids(i = $("input[class='ep']:checked").length, server = 0) {
    if (abort) {
        $("#select-area").parent().show();
        openResult(abort = 0);
        return;
    }

    var link = $("input[class='ep']:checked").eq(--i).data('href');

    var srv;
    switch (order[server]) {
        case 0:
            srv = "rapidvideo";
            break;
        case 1:
            srv = "streamango";
            break;
        case 2:
            srv = "openload";
            break;
        case 3:
            srv = "mp4upload";
            break;
        case 4:
            srv = "alpha";
            break;
        case 5:
            srv = "nova";
            break;
        default:
            grabbingFailed(i, getVids);
            return;
    }

    self.destroy(i);

    addLinkIframe(i - 2, srv);


    //srv = "rapidvideo"; //temp
    if (i >= 0) displayAttempt(srv.capitalizeFirst(), i);
    else {
        if (!navigDowload) openResult();
        if ($(".episodes .ep:checked").length == $(".episodes .ep").length)
            freeUpBar();
        else $(".closeBoard").click();
        return;
    }
    getCaptchaCustomIzed(link, function f(src, tries = 5) {
        if (navigDowload) {
            next = i;
            if (downloads[i] && downloads[i].status == epStatus.progress) return;
            if (downloads[i] && downloads[i].status == epStatus.success) {
                getVids(next);
            } else {
                if (!src) {
                    downloads[i] = {
                        status: epStatus.error
                    };
                    progressAstep(false);
                    return;
                }
                downloads[i] = {
                    status: epStatus.progress,
                    percent: 0
                };
                var name = $("input[class='ep']:checked").eq(i).next().text().trim();
                name = btoa(name);
                $("input[class='ep']:checked").eq(i).parent().next().append(
                    $("<iframe/>").attr("src", src + "#downloadAnime#" + name)
                    .css({
                        border: "1px solid white",
                        width: "90%",
                        display: "inline"
                    })
                    .height($(".listing td").eq(0).height())
                );
            }
            return;
        }
        if (i >= 0)
            switch (srv) {
                case "alpha":
                    if (!src) {
                        notifyAttemptResult("Alpha", i);
                        getVids(i + 1, server + 1);
                    }
                    break;
                case "streamango":
                    $.ajax({
                        dataType: 'html',
                        type: 'get',
                        url: src,
                        success: function (responseData) {
                            var match = /eval\(.+/g.exec(responseData);
                            if (match != null) {
                                eval(match[0]);
                                match = /src:d\('.+?'.*?\)/g.exec(responseData);
                                var vid = $("<a/>").attr('href', eval(match[0])).get(0).href;
                                getLinks(vid, i);
                                getVids(i);
                            } else {
                                notifyAttemptResult("Streamango", i);
                                getVids(i + 1, server + 1);
                                return;
                            }

                        },
                        error: function (xhr, err, status) {
                            if (err == "error" && !xhr.status)
                                $("#notifs").show().append("<span style='color: red'>This is likely caused by the adBlocker, disable your adblocker and try again, This extension blocks all kissanime ads so fret not!</span><br>");
                            notifyAttemptResult("Streamango", i);
                            getVids(i + 1, server + 1);
                            return;
                        }
                    });
                    break;
                case "mp4upload":
                    $.ajax({
                        dataType: 'html',
                        type: 'get',
                        url: src,
                        success: function (responseData) {
                            var output = eval(/eval(\(.*\))/.exec(responseData)[1]);
                            var res, vid;
                            if (res = /setup\(({.*?(\(.*?\))*.*?})\)/.exec(output)) {
                                var setup = JSON.parse(res[1].replace(/'/g, '"').replace(/([,{]"[^"]+?":)([^[{"]+?)([,\]}])/g, '$1"$2"$3'));
                                vid = setup.file;
                            } else vid = (res = /player\.src\("(.+?)"\)/.exec(output)) && res[1];

                            if (vid) {
                                getLinks(vid, i);
                                getVids(i);
                            } else {
                                notifyAttemptResult("Mp4Upload", i);
                                getVids(i + 1, server + 1);
                                return;
                            }

                        },
                        error: function (xhr, err, status) {
                            if (err == "error" && !xhr.status)
                                $("#notifs").show().append("<span style='color: red'>This is likely caused by the adBlocker, disable your adblocker and try again, This extension blocks all kissanime ads so fret not!</span><br>");
                            notifyAttemptResult("Mp4Upload", i);
                            getVids(i + 1, server + 1);
                            return;
                        }
                    });

                    break;


                case "openload":
                    $("body").append($("<iframe/>").attr("src", src)
                        .attr("class", "openloadGrabber").css("display", "visible"));
                    var gotlink = false;
                    var t = setTimeout(function () {
                        if (gotlink) return;

                        window.removeEventListener(messageEvent, f);
                        $(".openloadGrabber").remove();
                        notifyAttemptResult("Openload", i);
                        getVids(i + 1, server + 1);
                    }, 10 * 1000);


                    var f = function (e) {
                        var key = e.message ? "message" : "data",
                            data = e[key],
                            vid = grabbingLink(data);
                        if (vid != null) {

                            clearTimeout(t);
                            gotlink = true;
                            window.removeEventListener(messageEvent, f);
                            $(".openloadGrabber").remove();
                            getLinks(vid, i);
                            getVids(i);
                        }
                    }

                    eventer(messageEvent, f, false);

                    break;

                case "rapidvideo":
                    $.ajax({
                        dataType: 'html',
                        type: 'get',
                        url: src,
                        success: function (responseData) {
                            var vid = $(responseData).find("video source").attr("src");
                            if (vid == undefined)
                                if ((vid = $(responseData).find("video").attr("src")) == undefined) {
                                    notifyAttemptResult("RapidVideo", i);
                                    getVids(i + 1, server + 1);
                                    return;
                                }
                            getLinks(vid, i);
                            getVids(i);
                        },
                        error: function (xhr, err, status) {
                            if (err == "error" && !xhr.status)
                                $("#notifs").show().append("<span style='color: red'>This is likely caused by the adBlocker, disable your adblocker and try again, This extension blocks all kissanime ads so fret not!</span><br>");
                            notifyAttemptResult("RapidVideo", i);
                            getVids(i + 1, server + 1);
                            return;
                        }
                    });
                    break;

                case "nova":
                    $.ajax({
                        dataType: 'html',
                        type: 'post',
                        url: src.replace(/\/v\//g, "/api/source/"),
                        success: function (res) {
                            try {
                                var vid,
                                    q = settings.quality,
                                    data = JSON.parse(res).data;
                                for (var k in data) {
                                    data[data[k].label] = data[k];
                                    delete data[k];
                                }
                                while (!(vid = data[q]) && q)
                                    q = nextQuality(q);


                                q = settings.quality;
                                while (!(vid = data[q]) && q)
                                    q = prevQuality(q);

                                if (!vid) throw ["Video link not found. data: ", data];
                                vid = vid.file;

                                getLinks(vid, i);
                                getVids(i);
                            } catch (e) {
                                console.error(e);
                                notifyAttemptResult("Nova", i);
                                getVids(i + 1, server + 1);
                            }
                        },
                        error: function (xhr, err, status) {
                            if (err == "error" && !xhr.status)
                                $("#notifs").show().append("<span style='color: red'>This is likely caused by the adBlocker, disable your adblocker and try again, This extension blocks all kissanime ads so fret not!</span><br>");
                            notifyAttemptResult("RapidVideo", i);
                            getVids(i + 1, server + 1);
                            return;
                        }
                    });
                    break;
            }

        else if (navigDowload) openResult();
    }, srv, function (responseData) {

        switch (srv) {
            case "alpha":
                var match = /ovelWrap\(.+'\)/g.exec(responseData);
                $.ajax({
                    dataType: 'html',
                    type: 'get',
                    url: "/Scripts/css.js",
                    success: function (r) {
                        $.ajax({
                            dataType: 'html',
                            type: 'get',
                            url: "/Scripts/vr.js?v=1",
                            success: function (res) {
                                eval(r);
                                eval(res);
                                $(responseData).find("script").each(function (index, el) {
                                    if (this.tagName.toLowerCase() == "script" && $(this).html().toLowerCase().includes('crypto'))
                                        try {
                                            eval(this.innerHTML);
                                        } catch (err) {}
                                });
                                if (match == null || match[0].length < 50) {
                                    notifyAttemptResult("Alpha", i);
                                    getVids(i + 1, server + 1);
                                } else {
                                    var a = $("<div>" + eval(match[0]) + "</div>").find("a"),
                                        vid;

                                    if (!a.length || a.eq(0).attr("href").includes("rapidvideo")) {
                                        notifyAttemptResult("Alpha", i);
                                        getVids(i + 1, server + 1);
                                    } else {
                                        vid = a.eq(0).attr("href");
                                        getLinks(vid, i);
                                        getVids(i);
                                    }
                                }

                            },
                            error: function () {
                                notifyAttemptResult("Alpha", i);
                                getVids(i + 1, server + 1);
                            }
                        });
                    },
                    error: function () {
                        notifyAttemptResult("Alpha", i);
                        getVids(i + 1, server + 1);
                    }
                });
                return true;
                break;
            default:
                var myRegexp = {
                    "mp4upload": /"(http.+mp4upload.+?)"/g,
                    "streamango": /"(http.+streamango.+?)"/g,
                    "openload": /"(https:.+?embed.+?)"/g,
                    "rapidvideo": /"(http.+rapidvideo.+?)"/g,
                    "nova": /"(http.+novelplanet\.me.+?)"/g
                } [srv];
                var match = myRegexp.exec(responseData);
                return match != null ? match[1] : null;

        }
        return null;
    }, (r) => {
        updateAttempt(i, r);
    });
}


function notifyAttemptResult(srver, i, failure = true, scsMsg = "Link grabbed") {
    $("span#attempt" + i).remove();
    if (failure) {
        $("#notifs").show().append('<span style="color:#e7b0b0">' + srver + ' failed to get link for: ' + $("input[class='ep']:checked").eq(i).next().text() + '</span><br>');
    } else {
        $("#notifs").show()
            .append($("input[class='ep']:checked").eq(i).next().text() + ': ' + scsMsg + '<br>');
    }

}

function updateAttempt(i, p) {
    $("span#attempt" + i).html($("input[class='ep']:checked").eq(i).next().text() + ": " + p + " <br>");
}

function displayAttempt(srver, i) {
    $("#notifs").show().append('<span id="attempt' + i + '">' + $("input[class='ep']:checked").eq(i).next().text() + ": Trying " + srver + ".. <br><span>");
}

function grabbingFailed(i, getVids) {
    errors += $("input[class='ep']:checked").eq(i).next().text().trim() + "<br>";
    progressAstep(false);
    getVids(i);
}

function getLinks(data, i) {
    notifyAttemptResult(null, i, false);
    progressAstep();
    var downloadLink = $("<a/>").attr("href", data).get(0).href;
    links += $("input[class='ep']:checked").eq(i).next().text().trim() + ": " + downloadLink + "<br>";
}

function progressAstep(success = true) {
    progress++;
    var step = progress / $("input[class='ep']:checked").length;
    step *= 100;
    setLoader(step, success ? 'white' : 'red');
}

function subProgress(step) {
    step = (progress + step) / $("input[class='ep']:checked").length;
    setLoader(step * 100);
}

function setLoader(width, color = "white") {
    $("#download-loader").css('width', width + "%").css('background-color', color);
}

function openResult(win = 1) {
    $("#download-loader").fadeOut('fast', function () {
        this.remove();
        $("#select-area").replaceWith(downloadsHeader)
            .css('border', '');
        $("#getResults").parent().remove();
        $("#getResults").remove();
        $("input[type='checkbox']").prop('disabled', false);

        $("input[class='ep']").prop('checked', false);

        for (i in errors.split("<br>"))
            $("input[data-href='" + errors.split("<br>")[i] + "']").prop('checked', true);

        if (win) openWindow();
    });
}

function openWindow() {
    var container = $("<div/>").attr('style', 'width:85%;height:80%;margin:0 auto;text-align:left;'),
        header = $("<div class='bigChar' style='color:white;'><div>"),
        textarea1 = $('<textarea id="command" style="min-height: 10%;width: 100%;"></textarea>'),
        btn = $("<button style='width:15%;' id='copyBtn'>Copy Command</button>"),
        textarea2 = $('<textarea id="msg" style="height: 70%;width: 100%;"></textarea>');
    textarea1.val(prepareBatchCommand());
    textarea2.val(("Success:<br>" + links + "<br><br>Failed:<br>" + errors).replace(/<br>/g, "\n"));
    showMessage(container.append(header.html("IDMan Command Line(Recommended) <sup>[<a href='#' class='batch-info' id= 'idman-command'>What is this</a>]</sup>").clone())
        .append(textarea1).append(btn).append("<br><br>").append(header.text("Download Links").clone()).append(textarea2));

    $("body").on("click", "#copyBtn", function () {
        $("#command").get(0).select();
        document.execCommand("copy");
        if ($("#copiedAlert").length == 0)
            $(this).after("<span id='copiedAlert'>Command copied to the Clipboard</span>");
        else
            $("#copiedAlert").replaceWith("<span id='copiedAlert'>Command copied to the Clipboard</span>");

        setTimeout(function () {
            $("#copiedAlert").fadeOut('slow');
        }, 500);
    });
}

function showMessage(elements) {
    hideMessage(function () {
        $("body").prepend('<div id="msgArea" style="display:none;position:fixed;height:100vh;width:100vw;background-color:rgba(0,0,0,.8);text-align:center;padding: 50px 10px 50px 10px;z-index:1;"> </div>');
        $("#msgArea").append('<a id="closeMsgArea" style="position:absolute;top: 20px;left: 20px;border: 1px solid white;padding: 0px 5px;" href="#">X</a>')
            .append('<a id="howTo" style="position:absolute;top: 20px;left: 45px;border: 1px solid white;padding: 0px 5px;" href="#" class="batch-info">How to use</a>')
            .append(elements);
        $("#msgArea").fadeIn(500);
        $("#closeMsgArea").on('click', function (event) {
            event.preventDefault();
            hideMessage();
        });
    });
}

function hideMessage(f = function () {}) {

    if ($("#msgArea").length == 0) f();
    else $("#msgArea").fadeOut(500, function () {
        this.remove();
        f();
    });
}

function handleCloudFlareTimeout(jqXHR, callback) {
    if (jqXHR.status == 503) {
        $("#notifs").show().append("CloudFlare(<a href='https://image.prntscr.com/image/AXERhgRTQRqzeghMuKJA2Q.png'>this thing</a>) session expired, openning new session...<br>");
        setTimeout(function () {
            var win = window.open(location.href, '_blank');
            win.onload = function () {
                setTimeout(function () {
                    $("#notifs").append("done! Retrying...<br>");
                    win.close();
                    callback(true);
                }, 4000);
            };
        }, 700);
    } else callback(false);
}

function prepareBatchCommand() {
    var init = "if exist \"c:\\progra~1\\internet download manager\" (cd \"c:\\progra~1\\internet download manager\") else if exist \"c:\\progra~2\\internet download manager\" (cd \"c:\\progra~2\\internet download manager\") else mshta \"javascript:var sh=new ActiveXObject( \"WScript.Shell\" ); sh.Popup( \"you sure you have idman ? (Alternatively use the links provided from kissanime by the extension\", 10, \"IDMan not found!\", 64 );close()\" # \n idman.exe \n exit \n";

    var ls = links.split("<br>"),
        command = "start /w idman /d ",
        result = "";
    for (i in ls) {
        var lsParts = ls[i].split(": ");
        if (ls[i].length > 0) result += "\n " + command + "\"" + lsParts[lsParts.length - 1] + "\" /f \"" + ls[i].substring(0, ls[i].indexOf(lsParts[lsParts.length - 1]) - 2).filenameFriendly() + ".mp4\" /n /a ";
    }


    return init.replace(/#/g, result);

}


var xhr;

function getCaptchaCustomIzed(link, callback, server, responseFunction = function (r) {
    return r;
}, report) {
    if (server)
        if (link.includes("s="))
            link = link.substring(0, link.indexOf("s=") + 1) + "&s=" + server;
        else
            link += "&s=" + server;


    xhr = $.ajax({
        dataType: 'html',
        type: 'get',
        url: link,
        success: function (responseData) {
            if ($(responseData).find("#divContentVideo").length !== 0) {
                callback(responseFunction(responseData));
                return;
            }
            var desc1 = $(responseData).find("*[id^=formVerify] span").eq(0).text().trim(),
                desc2 = $(responseData).find("*[id^=formVerify] span").eq(1).text().trim();
            $(".captchaImg").remove();
            if ($(responseData).find("*[id^=formVerify] img").length == 0) {
                callback(null);
                return;
            }
            report("Solving Captcha ..");
            $("#captchaContainer").append($(responseData).find("*[id^=formVerify] img").addClass('captchaImg') /*.attr('opacity', '0')*/ );
            //console.log(desc2);
            var nImages = $(".captchaImg").length;
            var loadCounter = 0;
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
                    },
                    success: function (responseData) {
                        try {
                            if ($(responseData).find("#divContentVideo").length !== 0)
                                callback(responseFunction(responseData));
                            else
                                getCaptchaCustomIzed(link, callback, server, responseFunction, report);
                        } catch (err) {
                            getCaptchaCustomIzed(link, callback, server, responseFunction, report);
                        }
                    },
                    error: function (jqXHR, err) {
                        callback(null);
                    }
                });
            });

        },
        error: function (jqXHR, err, status) {
            console.log(err, status);
            handleCloudFlareTimeout(jqXHR, function (success) {
                if (success) {
                    getCaptchaCustomIzed(link, callback, server, responseFunction, report);
                }
            });
            callback(null);
        }
    });
}
