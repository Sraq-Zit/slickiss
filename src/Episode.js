class Episode {
    isLight = () => settings.lite || !settings['servers.beta'];

    constructor() {
        this.requests = new Set([location.href]);
        this.tasks = [];
        this.anime = {
            episodes: {
                [Slickiss.stripEpUrl(location.href)]: {
                    contents: $('html').clone(),
                    url: location.href
                }
            }
        };

        this.backup();

        if ($("#btnBookmarkManager").length) $("#btnBookmarkManager")[0].click();

        if (this.isLight()) {
            this.lightenInterface();
            this.loadUnwatchedAnimeList();
            this.createDummies();

        } else {
            $('iframe[id*=adsIfrme]').remove();
            $("#disqus_thread").show(); //hide disqus
            // $('#divVideo').attr("id", "video").css('width', ''); // change id to avoid content removal ..
            // $('#divDownload').attr("id", "dDownload"); // change id to avoid content removal caused by adblock
            // $("body").prepend(batchBoard).prepend(bmLoad); // batchboard setup

            $('.barContent .clear2').eq(0).replaceWith(
                $('<p>')
                    .html(
                        `In beta/alpha servers it is recommended to use Slickiss display
                        because the API used for alpha/beta player<br>has this bug that makes another
                        video playing in the background.<br>`
                    )
                    .css('font-size', '18px')
                    .append(
                        $(`<a href="#">Switch to Slickiss display</a>`).on('click', async e => {
                            e.preventDefault();
                            Chrome.set({ lite: 1 });
                            location.reload();
                        })
                    )
            )

        }

    }

    lightenInterface() {

        this.bookmark = $("#divBookmark").hide();
        let index1 = $("#selectEpisode").attr('onchange', 'window.location = this.value').parent().clone(),
            index21 = $("#btnPrevious").parent().clone(),
            index22 = $("#btnNext").parent().clone(),
            controls = $("#selectServer").parent(),
            disqus_thread = $("#disqus_thread").clone();

        this.divContent.find('#divVideo').css('width', '').replaceWith(this.divContent.find("#divMyVideo"));

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

        $("html").append(this.bookmark);
        let nav = [index21, index22];
        let navIds = ["btnPrevious", "btnNext"];
        // fill missing navigation in case of extremities
        for (const i in nav)
            if (!nav[i].length)
                nav[i] = $('<div/>', {
                    html: `<div id='${navIds[i]}'></div>`
                }).hide();

        index1.append(nav)
            .removeAttr('style')
            .css('text-align', 'center');

        if (!this.divContent.find('iframe').length) {
            this.divContent.find('#divMyVideo').html(
                `<iframe id="my_video_1" style="width: 854px; height: 552px; border: 0px;"
                    src="${location.href}#player"
                    allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" mozallowfullscreen="true">
                </iframe>`
            );
        }
        let vid = this.divContent.css({
            'display': '',
            'width': '70%',
            'height': 'calc(97% - 100px)',
            'text-align': 'center',
            'margin-bottom': '70px'
        }).prepend([index1, controls]);

        $("html").append(vid);

        $("body").html("")
            .css('position', 'relative')
            .append([
                vid,
                $("<a/>", {
                    class: 'bigChar home',
                    href: "//" + location.host,
                    style: 'margin-right: 50px;',
                    text: 'Home'
                })
            ]).prepend(this.bookmark);

        this.iframe = this.divContent.find("iframe");
        if (settings[`servers.${DlGrabber.getServerName(this.iframe.attr('src'))}`])
            this.iframe.attr('src', this.iframe.attr('src') + '#ignore');
        this.iframe.css({
            width: '100%',
            height: '100%',
            'text-align': 'center'
        }).attr('src');

        $("#switch").remove();

        $(document).ready(() => {
            if ($("#selectEpisode").length === 0)
                this.divContent.wrap('<div class="extra-wrapper"></div>');
            $(".extra-wrapper").prepend(index1);
        });

        $("*").on('click', e => $("#result_box").hide());

        $("body").prepend(
            $("<div />", {
                'id': 'captchaContainer',
                'style': 'overflow: hidden;'
            }).height(0)
        ).append(search);


        $(".wrapper > .listing a").each(e => {
            if (location.href.includes(e.currentTarget.href)) {
                this.iframe[0].contentWindow.postMessage({
                    title: $(e.currentTarget).text().trim()
                }, "*");
                return false;
            }
        });


        this.loadAnimeData();
        this.setUpShortcutsTunnel();
        this.prepareUpNextPrevEp();
    }

    async loadUnwatchedAnimeList() {
        $(".ttip").remove();
        let list = await Bookmark.getOngoingUnwatchedList();
        $("#divMyVideo").css("height", "100%")
            .prepend("<div class='ttip'></div>")
            .prepend(list);
    }

    // load episodes links and anime page
    loadAnimeData(i = 10, callback) {
        if (typeof callback != 'function') callback = r => {
            let doc = $(r.noImgs);
            $('.home').after(doc.find('.bigChar'));
            this.anime.obj = new Anime;
            $('body').prepend(doc.find('.listing').css('width', '90%'));
            this.listing = $('.listing');
            this.listing.wrap('<div class="wrapper"></div>');
            this.listing.find('tr > td:first-child').attr('title', 'Click to prepare this episode while you are watching the current one');
            this.listing.find('a')
                .each((i, el) => $(el).attr('href', el.href).parent().on('click', e => {
                    const a = $(e.currentTarget).children('a')[0];
                    this.sendEpisodeRequest(Slickiss.setServer(a.href, settings.defaultserver));
                }));
            this.listing.find('tr > th:first-child')
                .attr('title', 'Click to prepare all episodes')
                .on('click', e => {
                    $(e.currentTarget).addClass('done');
                    this.listing.find('td').click();
                });
            $('.wrapper').css({
                position: 'absolute',
                right: '0',
                top: '50px',
                'overflow-x': 'hidden',
                'text-align': 'left',
                'max-height': 'calc(97% - 100px)',
                width: '29%'
            });
            this.runTasks();
            parent.postMessage(location.href, "*");
        };

        $.ajax({
            dataType: 'html',
            type: 'get',
            url: Slickiss.parseUrl(location.href).anime,
            success: r => callback(r),
            error: r => i > 0 ? this.loadAnimeData(--i) : $("body").append("<div style='color:red'>Could not load anime info</div>")
        });
    }

    // execute key actions outside the video through the iframe
    setUpShortcutsTunnel() {
        if (!$("video").length)
            $(document).on("keypress keyup keydown", e => {
                if ($("input").is(":focus"))
                    return;
                this.divContent.find('iframe')[0].contentWindow.focus();
                this.divContent.find('iframe')[0].contentWindow.postMessage({
                    type: e.type,
                    which: e.which,
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey,
                    altKey: e.altKey,
                }, "*");
            });

        MessageManager.attachListener(function (e) {
            switch (e.data) {
                case 'finished':
                    if (!$("#btnNext").is(':visible') && $('.seenIcon:not(.seen)').length)
                        $('.seenIcon:not(.seen)').click();
                    break;
                case 'prevEp':
                    $("#btnPrevious:visible").click();
                    break;
                case 'nextEp':
                    $("#btnNext:visible").click();
                    break;

                default:
                    break;
            }
        })

    }


    prepareUpNextPrevEp() {

        this.onReady(() => {
            this.markEpisode();
            this.requestPrevNextEpisode();
        });

        $(document).on('click', 'a', e => {
            let href = Slickiss.stripEpUrl(e.currentTarget.href);
            if (href in this.anime.episodes) {
                e.preventDefault();
                this.setuptQuickAccess(this.anime.episodes[href].url, this.anime.episodes[href].contents);
                this.requestPrevNextEpisode();
                this.markEpisode();
                $(el).off('click');
            }
        });
    }

    setuptQuickAccess(href) {
        href = Slickiss.stripEpUrl(href);
        let contents = $('<div/>').append(this.anime.episodes[href].contents.clone());

        window.history.pushState({
            "pageTitle": contents.find('title').text()
        }, "", this.anime.episodes[href].url);


        let ifrm = "#divMyVideo iframe",
            selEp = "#selectEpisode",
            selSv = "#selectServer",
            prev = "#btnPrevious",
            next = "#btnNext";

        $(ifrm).attr("src", DlGrabber.extractMovieIframe(contents.html()));
        $(selEp).replaceWith(contents.find(selEp));
        $(selSv).replaceWith(contents.find(selSv));

        for (const n of [prev, next])
            if (!contents.find(n).length)
                $(n).parent().hide()
            else
                $(n).parent().replaceWith(contents.find(n).parent());


    }

    async sendEpisodeRequest(url) {
        const surl = Slickiss.stripEpUrl(url);
        if (!(surl in this.anime.episodes)) {
            if (url in this.requests) return;
            this.markEpisode(url, 'retrieving', 0);
            this.requests[surl] = '';
            this.anime.episodes[surl] = {
                contents: $(await c(url).solve()),
                url: url
            };
        }
        this.markEpisode(surl, 'ready', 0);
    }

    requestPrevNextEpisode() {
        if (settings.prepareNextPrev && window.self === window.top) {
            for (const id of ["#btnPrevious", "#btnNext"]) {
                if (!$(id).length || !$(id).parent().attr('href')) continue;
                let ep = $(id).parent().attr('href').changeServer(settings.defaultserver);
                this.sendEpisodeRequest(ep);
            }

        }
    }

    markEpisode(url = location.href, marker = 'playing', unique = 1) {
        if (unique) $(`.${marker}`).removeClass(marker);
        url = Slickiss.stripEpUrl(url);
        let el = this.listing.find(`a[href^='${url}']`).parent('td');
        if (marker == 'playing') el[0] && el[0].scrollIntoViewIfNeeded();
        el.addClass(marker);
    }

    // stack callbacks to run upon episodes load
    onReady(task) {
        if (typeof task == 'function')
            this.tasks.push(task);
    }

    // run callbacks
    runTasks() {
        for (let task of this.tasks) task();
        this.tasks = [];
    }

    // recover deleted content caused by adblock
    backup() {
        this.divContent = $("#divContentVideo")
        if (!this.divContent.length)
            this.divContent = $("#centerDivVideo")

        // this.divContent.css('width', '');

        var el = this.divContent.clone();
        $(document).ready(e => {
            if (!$("#divContentVideo iframe, #divContentVideo iframe").length)
                $("#divContentVideo, #divContentVideo").replaceWith(this.divContent = el);
        });
    }
    // dummies for player [alpha / beta]
    createDummies() {
        $("body").append(`<div id='divFileName' class='dummy'></div>
                    <div id='centerDivVideo'></div>
                    <div id='divVideo'></div>
                <a id='divMessageRetry'></a>`);
        const glxTsIds = [11565, 11875, 11874, 11873, 11963, 11964, 11965, 11966];
        for (var i in glxTsIds)
            $("body > .dummy").eq(0).append("<div id='glx-" + glxTsIds[i] + "-container'></div>");
    }
}