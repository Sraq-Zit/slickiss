
class Slickiss {
    static msgArea;
    static get cts() {
        return {
            HOME: 0,
            ANIME: 1,
            EPISODE: 2,
            CAPTCHA: 3,
            BOOKMARKS: 5,
            LISTING: 6,
            BANNED: 7,
        };
    };
    static get hrefPatterns() {
        return {
            [Slickiss.cts.HOME]: /(https?:\/\/)?kissanime\.ru\/?(#.*)?$/g,
            [Slickiss.cts.ANIME]: /(https?:\/\/)?kissanime\.ru\/Anime\/[^/]+?\/?(#.*)?$/g,
            [Slickiss.cts.EPISODE]: /(https?:\/\/)?kissanime\.ru\/Anime\/[^/]+?\/[^/]+?\/?(#.*)?$/g,
            [Slickiss.cts.CAPTCHA]: /(https?:\/\/)?kissanime\.ru\/Special\/AreYouHuman.*/g,
            [Slickiss.cts.LISTING]: /(https?:\/\/)?kissanime\.ru\/(AnimeList.*|.+LatestUpdate)(#.*)?/g,
            [Slickiss.cts.BOOKMARKS]: /.+?BookmarkList\/?(#.*)?$/g,
            [Slickiss.cts.BANNED]: /(https?:\/\/)?kissanime\.ru\/ToYou\/Banned\/?$/g,
        };
    };
    constructor(href) {
        this.href = Slickiss.absolute(typeof href == 'string' ? href : location.href);
        this.base = typeof href == 'undefined';
        if (this.isBase()) {
            if ($("body").html().includes("One more step")) {
                $("html, body").css({
                    "background-color": "white",
                    "overflow": "hidden"
                });
                $("body").css("font-size", "1em");
                $("head").prepend("<link href='/Content/css/tpl_style.css?v=7' rel='stylesheet' type='text/css'>")
                throw new Error("Cloudflare");
            }
            switch (this.getContext()) {
                case Slickiss.cts.BANNED:
                    let bar;
                    $('.bigBarContainer').after(bar = $('.bigBarContainer').clone());
                    bar.find('.barTitle').html('Slickiss\'s Magical Tips');
                    bar.find('.barContent')
                        .html(
                            `In general I don't allow Kissanime to report ban to the server but if it
                            happened, probably because they changed something so kindly let me know
                            through review or email: kingofmestry@gmail.com<br>
                            - To undo the ban just restart your router to get a new IP`
                        );
                    break;
                case Slickiss.cts.EPISODE:
                    if (Slickiss.parseUrl(location.href).server == 'default')
                        return location.href = $('#selectServer').val();
                    new Episode;
                    break;
                case Slickiss.cts.ANIME:
                    new Anime;
                    break;
                case Slickiss.cts.BOOKMARKS: break;
                case Slickiss.cts.HOME:
                    $('a[href*=Episode-001].textDark').prev('a').addClass('new');
                case Slickiss.cts.LISTING:
                    $('a[href*=Episode-001]').parents('tr').find('a').addClass('new')

                default:
                    const an = $('.rightBox').eq(0).clone();
                    $('.rightBox').eq(0).before([an, $('.rightBox + div').eq(0).clone()]);
                    an.find('.barTitle').text('Slickiss Announcement');
                    an.find('.barContent > div:not(.arrow-general)').html($('<div/>', {
                        css: { 'text-align': 'center', width: '100%' }
                    }).append([
                        $('<img/>', { height: 100, src: chrome.extension.getURL('/imgs/loader.gif') }),
                        $('<div/>', { text: 'Loading..' })
                    ]));
                    Notifier.updatesToHTML().then(updates => {
                        if (!updates) return an.next().remove() && an.remove();
                        an.find('.barContent > div:not(.arrow-general)')
                            .empty().append(updates.children());
                    });
                    $(document).on('ready', Bookmark.getBookmarks(true).then(
                        json => $("a[href*='Anime/']").each((i, a) => {
                            const info = Slickiss.parseUrl(a.href);
                            if (info && json[info.name])
                                $(a).addClass(json[info.name].watched ? 'bookmarked_seen' : 'bookmarked');
                        })
                    ));

            }

            this.setup();
        }
    }

    setup() {
        this.setHandlers();
        $(".slickExtra").remove();
    }

    setHandlers() {
        $(document).on('mouseenter mouseleave', 'a', e => {
            if (this.isContext(Slickiss.cts.EPISODE)) return;
            const el = e.currentTarget;
            const animeInfo = Slickiss.parseUrl(el.href, Slickiss.cts.ANIME) || Slickiss.parseUrl(el.href, Slickiss.cts.EPISODE);
            const locInfo = Slickiss.parseUrl(location.href);

            if (!animeInfo) return Tooltip.hide();
            if (locInfo && locInfo.name == animeInfo.name) return Tooltip.hide();

            if (e.type == 'mouseenter' && animeInfo.anime)
                Tooltip.showAnime(animeInfo.anime);
            else
                Tooltip.hide();

        });
        $(document).on('click', 'a:not(a[href="#"])', async e => {
            const el = e.currentTarget;
            if (settings.defaultserver != "default") {
                let info = Slickiss.parseUrl(el.href, Slickiss.cts.EPISODE);
                if (info && info.server != settings.defaultserver && el.href != location.href + '#')
                    el.href = info.stripped + "&s=" + settings.defaultserver;
            }

            let data;
            if (e.shiftKey && (data = Slickiss.parseUrl(el.href)) && data.anime) {
                e.preventDefault();
                const batch = await Chrome.get('batchQueue');
                if (data.anime in batch)
                    Assets.toast('Anime is already on the list');
                else {
                    batch[data.anime] = { date: getDisplayDate() };
                    Chrome.set({ batchQueue: batch });
                    Assets.toast('Anime was added to the batch list');
                }
            }
        });
    }



    isBase = () => this.base;
    isContext = ctx => typeof ctx == 'number' && Slickiss.hrefPatterns[ctx].test(this.href);

    static absolute = url => $('<a/>', { href: url })[0].href;
    static stripEpUrl = url => url.replace(/(&|\?)s=[^&]*/g, '$1').replace(/(\?|&)&/g, '$1').replace(/&$/g, '');
    static isContext = (href, ctx) => new Slickiss(href).isContext(ctx);
    static getContext = href => new Slickiss(href).getContext();
    static setServer = (url, server) => {
        const info = this.parseUrl(url, Slickiss.cts.EPISODE);
        return info && info.stripped + `&s=${server}`;
    }
    static parseUrl(url, ctx) {
        url = url.replace(/#.*$/g, '');
        if (!ctx) ctx = this.getContext(url);
        if (!Slickiss.isContext(url, ctx)) return null;
        const anime = /.+?\/Anime\/.+?(\/|$|#)/g.exec(url);
        const name = /.+?\/Anime\/(.+?)(\/|$|#)/g.exec(url);
        switch (ctx) {
            case Slickiss.cts.ANIME:
                return {
                    ctx: ctx,
                    anime: anime && anime[0],
                    name: name && name[1]
                };
            case Slickiss.cts.EPISODE:
                const server = /(\?|&)s=(.+?)(&|$|#)/g.exec(url);
                const id = /(\?|&)id=(.+?)(&|$|#)/g.exec(url);
                return {
                    ctx: ctx,
                    anime: anime && anime[0],
                    name: name && name[1],
                    server: server && server[2],
                    id: id && id[2],
                    stripped: Slickiss.stripEpUrl(url)
                };

            default:
                break;
        }
    }

    getContext() {
        for (const c in Slickiss.cts)
            if (this.isContext(Slickiss.cts[c]))
                return Slickiss.cts[c];

        return null;
    }

}
if (location.protocol != 'chrome-extension:') {
    $(document).on('ready', async e => { new Slickiss; });


    if (!Slickiss.isContext(location.href, Slickiss.cts.CAPTCHA))
        $(document.documentElement).append([
            $('<style/>', { class: 'slickExtra', text: 'body{display:none;}' }),
            $("<img/>", {
                id: 'pageLoading',
                src: chrome.extension.getURL("imgs/mobchara_3.png"),
                class: 'slickExtra slickFloating'
            }),
            $('<h1/>', { class: 'bigChar slickExtra', text: 'Loading...' })
        ]);

    if (
        (location.host != 'kissanime.ru' && (location.hash != '#ignore' || (location.hash = ''))) ||
        Slickiss.isContext(location.href, Slickiss.cts.EPISODE) && location.hash == '#player'
    ) {
        window.stop();
        Player.deploy();
    }

}


