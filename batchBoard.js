chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
    if(msg.cm && msg.link){
        var link = msg.link;
        while (link.lastIndexOf("/") != link.indexOf(animeLink) + animeLink.length - 1)
            link = link.substring(0, link.lastIndexOf("/"));
        if (!selectedHistory.includes(link))
            addToBar(link);
        return;
    }
});


var barBusy,
    selectedAnime = [], // {name, href, status, eps}
    selectedHistory = [],
    temp = JSON.parse(localStorage.getItem(toDownloadKey) || "[]");

for (var i in temp)
    addToBar(temp[i]);
delete temp;

$(document).on("click", ".clearBoard", (e) => {
    e.preventDefault();
    freeUpBar();
});
$(document).on("click", ".closeBoard", function (e) {
    e.preventDefault();
    e.stopPropagation();
    barBusy = false;
    $("#batchSideBar").css({
        cursor: "pointer",
        right: "-150px",
        //left: "",
        top: "50%",
        width: "200px",
        height: "20px",
        transform: ""
    }).children().hide();
    $("#batchSideBar>span").text(selectedAnime.length).show();
    if (!selectedAnime.length) $("#batchSideBar").hide();
});

$(document).on("mouseenter mouseleave click", "#batchSideBar", function (e) {
    if (!selectedAnime.length) {
        $(this).hide();
        return;
    }
    if (barBusy) return;
    if (e.type != "click") $(this).css("right", e.type == "mouseenter" ? "-10px" : "-150px");
    else {
        barBusy = true;
        $(this).css({
            cursor: "",
            right: "-42%",
            top: "50%",
            //left: "",
            transform: "translate(-50%, -50%)",
            width: "90vw",
            height: "90vh",
            "z-index": "2"
        }).children().hide();
        if ($(this).find("#tableBody").length) {
            $("#tableBody").show();
        } else $(this).append(batchTable);

        if(!$("td#all").length) $("#batchSideBar .anime .listing").append("<tr><td id='all'>All</tr></td>");
        for (var i in selectedAnime) addElementToBoard(selectedAnime[i]);
        $("#batchSideBar .anime .listing td").css("cursor", "pointer");
    }
});

$(document).on("click", "#batchSideBar .listing td", function (e) {
    var id = this.id;
    if (!id.length || !$(".anime .listing").find("#" + id).length) return;
    $("div[id^='eps-']").hide();
    if (id == "all") $("div[id^='eps-']").show();
    else $("#eps-" + id).show();
});



function addElementToBoard(el) {
    if (!$("#batchSideBar").length) return;

    var id = md5(el.href);
    if ($("#batchSideBar #" + id).length) {
        $("#batchSideBar #" + id).text(el.name);
        $("#batchSideBar #eps-" + id).html("").append(el.eps);
    } else {
        $("#batchSideBar .anime .listing").append("<tr><td id='" + id + "'>" + el.name + "</tr></td>");
        $("#batchSideBar .episodes>div").append($("<div/>").css("display", "none").attr("id", "eps-" + id).append(el.eps));
    }
}

function grabAnimeInfo(link, index) {
    $.ajax({
        dataType: 'html',
        type: 'GET',
        url: link,
        success: function (r) {
            if (!$(r).find(".bigChar").length) {
                grabAnimeInfo(link, index);
                return;
            }
            var list = $(r).find(".listing").eq(0);
            list.find("a").each(function () {
                $(this).before("<input class='ep' type='checkbox' data-href='" + this.href + "'>");
            });
            selectedAnime[index].name = $(r).find(".bigChar").eq(0).text().trim();
            selectedAnime[index].eps = list;
            selectedAnime[index].status = epStatus.success;
            addElementToBoard(selectedAnime[index]);
        },
        error: function (responseData) {
            grabAnimeInfo(link, index);
        }
    });
}

function addToBar(link) {
    selectedHistory.push(link);
    localStorage.setItem(toDownloadKey, JSON.stringify(selectedHistory));
    var index = selectedAnime.length;
    selectedAnime.push({
        name: "loading " + link,
        href: link,
        status: epStatus.progress,
        eps: "<div> loading... </div>"
    });
    grabAnimeInfo(link, index);
    $("#batchSideBar img").css("transition", "").css("opacity", "1");
    setTimeout(function () {
        $("#batchSideBar img").css("transition", "opacity 1s ease").css("opacity", "0");
    }, 10);

    if (barBusy) return;
    barBusy = true;
    $("#batchSideBar").show().css("right", "-10px");
    $("#batchSideBar > span").fadeOut(500, function () {
        $(this).text("Anime added!").fadeIn(400, function () {
            $(this).fadeOut(500, function () {
                $(this).text(selectedAnime.length + " Anime for download").fadeIn(400);
            });

        });

    })
    setTimeout(function () {
        $("#batchSideBar > span").fadeOut(500, function () {
            $(this).text(selectedAnime.length).fadeIn(400);
        });
        $("#batchSideBar").show().css("right", "-150px");
        barBusy = false;
    }, 3000);
}

function freeUpBar() {
    selectedAnime = [];
    selectedHistory = [];
    localStorage.removeItem(toDownloadKey);
    $(".closeBoard").click();
    $("#tableBody").remove();
}
