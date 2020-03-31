const hash = "#noSolve";
if (location.hash != hash &&
    location.href.toLowerCase().includes("areyouhuman") &&
    localStorage.getItem("captcha") !== "false") {


    window.stop();
    chrome.storage.sync.get('captcha', function (data) {
        if (data.captcha != 0) {
            try {
                var url = location.href.split("?")[1].split("=")[1];
                document.documentElement.innerHTML = captchaWaitMsg.replace(/#img/g, chrome.extension.getURL("imgs/angry-loli.png"));
                document.title = "(｀・ω・´)";
                changeFavicon('/Content/images/favicon.ico');
                if (location.href.includes("#noredirect") && parent.destroy)
                    $("html").html("");
                
                getCaptcha(decodeURIComponent(url));
            } catch (e) {}
        } else {
            location.hash = hash;
            location.reload();
        }
    });
}

if (location.hash == hash) location.hash = "";

function getCaptcha(link, tries) {
    var str = "";
    if (tries && tries > 3) str = "Sorry for the inconvenience, you still can disable this"
    if (tries) $("span#tryNum").show().text(" (Attempt " + tries + "... " + str + " )");
    xhr = $.ajax({
        dataType: 'html',
        type: 'get',
        url: link,
        success: function (responseData) {
            if (responseData.includes('Please wait 5 seconds...')) {
                if (location.href.includes("#noredirect") && parent.destroy)
                    parent.destroy(/#noredirect(\d+)/g.exec(location.href)[1]);
                else location = link;
                return;
            }
            if ($(responseData).find("#divContentVideo").length) {
                if (location.href.includes("#noredirect") && parent.destroy)
                    parent.destroy(/#noredirect(\d+)/g.exec(location.href)[1]);
                else location = link;
                return;
            }
            if ($(responseData).find(".specialButton").length) {
                if (location.href.includes("#noredirect") && parent.destroy)
                    parent.destroy(/#noredirect(\d+)/g.exec(location.href)[1]);
                else location = $(responseData).find(".specialButton").attr("href");
                return;
            }
            var query1 = $(responseData).find("*[id^=formVerify] span").eq(0).text().trim(),
                query2 = $(responseData).find("*[id^=formVerify] span").eq(1).text().trim();
            imgs = $(responseData).find("*[id^=formVerify] img") /*.attr('opacity', '0')*/ ;
            //$("body").append(imgs);
            //console.log(desc2);
            //console.log(responseData);
            imgMatchesQuery(imgs, query1, query2, function (result, ctxs) {
                var index1 = imgs.eq(result[0]).attr('indexvalue'),
                    index2 = imgs.eq(result[1]).attr('indexvalue');
                var answerCap = index1 + "," + index2,
                    reUrl = $(responseData).find("input[name='reUrl']").val(),
                    formUrl = $(responseData).find("*[id^=formVerify]").attr('action');
                //$("body").append(query1 + "," + query2);
                //$("body").append(answerCap);
                //return;
                $.ajax({
                    dataType: 'html',
                    type: 'POST',
                    url: formUrl,
                    data: {
                        answerCap: answerCap,
                        reUrl: reUrl
                    },
                    success: function (responseData) {
                        if (responseData.includes("Wrong answer")) {
                            getCaptcha(link, tries ? tries + 1 : 2);
                        } else {
                            reportCaptcha(query1, imgs[result[0]], ctxs[0], query2, imgs[result[1]], ctxs[1]);
                            
                            if (location.href.includes("#noredirect") && parent.destroy)
                                parent.destroy(/#noredirect(\d+)/g.exec(location.href)[1]);
                            else location = reUrl;
                        }
                    },
                    error: function (responseData, err) {
                        if (err != "abort") {
                            console.error("couldnt get verification page");
                            if (location.href.includes("#noredirect") && parent.destroy)
                                location.reload();
                            else location = reUrl;
                        }
                    }
                });

            });

        },
        error: function (responseData, err) {
            if (err != "abort") $(".bigChar").html("Couldn't reach the website, reloading...");
            if (location.href.includes("#noredirect") && parent.destroy)
                location.reload();
            else location = link;
        }
    });
}

function changeFavicon(src) {
    var link = document.createElement('link'),
        oldLink = document.getElementById('dynamic-favicon');
    link.id = 'dynamic-favicon';
    link.rel = 'shortcut icon';
    link.href = src;
    if (oldLink) {
        document.head.removeChild(oldLink);
    }
    document.head.appendChild(link);
}
