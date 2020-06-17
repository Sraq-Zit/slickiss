
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
            BETAXGUIDE: 8
        };
    };
    static get hrefPatterns() {
        return {
            [S.cts.HOME]: /(https?:\/\/)?kissanime\.ru\/?(#.*)?$/g,
            [S.cts.ANIME]: /(https?:\/\/)?kissanime\.ru\/Anime\/[^/]+?\/?(#.*)?$/g,
            [S.cts.EPISODE]: /(https?:\/\/)?kissanime\.ru\/Anime\/[^/]+?\/[^/]+?\/?(#.*)?$/g,
            [S.cts.CAPTCHA]: /(https?:\/\/)?kissanime\.ru\/Special\/AreYouHuman.*/g,
            [S.cts.LISTING]: /(https?:\/\/)?kissanime\.ru\/(AnimeList.*|.+LatestUpdate)(#.*)?/g,
            [S.cts.BOOKMARKS]: /.+?BookmarkList\/?(#.*)?$/g,
            [S.cts.BANNED]: /(https?:\/\/)?kissanime\.ru\/ToYou\/Banned\/?$/g,
            [S.cts.BETAXGUIDE]: /(https?:\/\/)?kissanime\.ru\/Message\/BetaXGuide.+$/g,
        };
    };
    constructor(href) {
        this.href = S.absolute(typeof href == 'string' ? href : location.href);
        this.base = typeof href == 'undefined';
        if (this.isBase()) {
            if (!$('.logo[href="/"]').length) {
                $("html, body").css({
                    "background-color": "white",
                    "overflow": "hidden"
                });
                $("body").css("font-size", "1em");
                $("head").prepend("<link href='/Content/css/tpl_style.css?v=7' rel='stylesheet' type='text/css'>")
                $('.slickExtra').remove();
                throw new Error("Cloudflare");
            }
            switch (this.getContext()) {
                case S.cts.BETAXGUIDE:
                    var bar;
                    $('.bigBarContainer').before(bar = $('.bigBarContainer').clone());
                    bar.find('.barTitle').html('Slickiss can handle this');
                    bar.find('.barContent')
                        .html(`Slickiss change user-agent only for domains that need to have user-agent changed.<br>
                            It's actually not that big of deal either way, but overall it'll save you time of doing
                            this manually.<br>`)
                        .append($('<a/>', { href: '#', text: 'Enable new user-agent' }).on('click', async e => {
                            e.preventDefault();
                            $(e.currentTarget).text('Alright, gimme a sec..')
                                .css('cursor', 'wait').off('click');
                            await Chrome.set({ useragent: true });
                            $(e.currentTarget).text('Done! Reloading..');
                            e.currentTarget.href += '&s=betax';
                            $('#container a[href*="/Anime/"]').each((_, el) => el.click()).length ||
                                (location.href = '/')
                        }));
                    break;
                case S.cts.BANNED:
                    var bar;
                    $('.bigBarContainer').after(bar = $('.bigBarContainer').clone());
                    bar.find('.barTitle').html('Slickiss');
                    bar.find('.barContent')
                        .html(`In general Slickiss doesn't allow Kissanime to ban
                            but if it happened, probably because something was changed<br>
                            <strike>- To undo the ban just restart your router to get a new IP</strike>
                            <br>`)
                        .append($('<a/>', { href: '#', text: 'Logout' }).on('click', async e => {
                            e.preventDefault();
                            $(e.currentTarget).text('Please wait..').css('cursor', 'wait').off('click');
                            await new Promise(r => chrome.runtime.sendMessage(undefined, { type: 'logout' }, {}, r));
                            $(e.currentTarget).text('Reloading..');
                            location.href = '/';
                        }));
                    break;
                case S.cts.EPISODE:
                    if (S.parseUrl(location.href).server == 'default')
                        return location.href = $('#selectServer').val();
                    new Episode;
                    break;
                case S.cts.ANIME:
                    new Anime;
                    break;
                case S.cts.BOOKMARKS: break;
                case S.cts.HOME:
                    $('a[href*=Episode-001].textDark').prev('a').addClass('new');
                case S.cts.LISTING:
                    $('a[href*=Episode-001]').parents('tr').find('a').addClass('new')

                default:
                    const an = $('.rightBox').eq(0).clone();
                    $('.rightBox').eq(0).before([an, $('.rightBox + div').eq(0).clone()]);
                    an.find('.barTitle').text('Slickiss Announcement');
                    an.find('.barTitle').prepend(
                        $('<i/>', { css: { cursor: 'pointer', padding: '0 5px' }, class: 'fa fa-chevron-circle-down' }
                        ).on('click', e => {
                            const el = $(e.currentTarget);
                            const body = an.find('.barContent');
                            const isOff = body.toggleClass('closed').hasClass('closed');
                            el.toggleClass('fa-chevron-circle-up');
                            localStorage.SannOff = isOff ? md5(body.text().trim()) : '';
                        })
                    );
                    an.find('.barContent > div:not(.arrow-general)').html($('<div/>', {
                        css: { 'text-align': 'center', width: '100%' }
                    }).append([
                        $('<img/>', { height: 100, src: chrome.extension.getURL('/imgs/loader.gif') }),
                        $('<div/>', { text: 'Loading..' })
                    ])).addClass('animate');
                    $('.rightBox').parent().on('DOMSubtreeModified', e => {
                        if (an.prev().length)
                            $(e.currentTarget).prepend([an, an.next()]);
                    });
                    Notifier.updatesToHTML().then(updates => {
                        if (!updates) return an.next().remove() && an.remove();
                        an.find('.barContent > div:not(.arrow-general)')
                            .empty().append(updates.children());
                        const hash = md5(an.find('.barContent').text().trim());
                        if (localStorage.SannOff == hash) an.find('i.fa')[0].click();
                    });

                    $('#navcontainer>ul').append(
                        `<li><a href="/#batch" target="slickiss_batch_manager">Downloads</a></li>`
                    );

                    $(document).on('ready', Bookmark.getBookmarks(true).then(
                        json => $("a[href*='Anime/']").each((i, a) => {
                            const info = S.parseUrl(a.href);
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
        $("html > .slickExtra").remove();
    }

    setHandlers() {
        $(document).on('mouseenter mouseleave', 'a', e => {
            if (this.isContext(S.cts.EPISODE)) return;
            const el = e.currentTarget;
            const animeInfo = S.parseUrl(el.href, S.cts.ANIME) || S.parseUrl(el.href, S.cts.EPISODE);
            const locInfo = S.parseUrl(location.href);

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
                let info = S.parseUrl(el.href, S.cts.EPISODE);
                if (info && info.server != settings.defaultserver && el.href != location.href + '#')
                    el.href = info.stripped + "&s=" + settings.defaultserver;
            }

            let data;
            if (e.shiftKey && (data = S.parseUrl(el.href)) && data.anime) {
                e.preventDefault();
                const batch = (await Chrome.get('batchQueue')) || {};
                if (data.anime in batch)
                    Assets.toast('Anime is already on the list');
                else {
                    batch[data.anime] = { date: getDisplayDate() };
                    Chrome.set({ batchQueue: batch });
                    Assets.toast(`
                        Anime was added to the batch list (${Object.keys(batch).length} items)
                        <a href='/#batch' target="slickiss_batch_manager"> Manage your batch </a>
                    `);
                }
            }
        });
    }



    isBase = () => this.base;
    isContext = ctx => typeof ctx == 'number' && S.hrefPatterns[ctx].test(this.href);

    static absolute = url => $('<a/>', { href: url })[0].href;
    static stripEpUrl = url => url.replace(/(&|\?)s=[^&]*/g, '$1').replace(/(\?|&)&/g, '$1').replace(/&$/g, '');
    static isContext = (href, ctx) => new Slickiss(href).isContext(ctx);
    static getContext = href => new Slickiss(href).getContext();
    static setServer = (url, server) => {
        const info = this.parseUrl(url, S.cts.EPISODE);
        return info && info.stripped + `&s=${server}`;
    }
    static parseUrl(url, ctx) {
        url = url.replace(/#.*$/g, '');
        if (!ctx) ctx = this.getContext(url);
        if (!S.isContext(url, ctx)) return null;
        const anime = /.+?\/Anime\/.+?(\/|$|#)/g.exec(url);
        const name = /.+?\/Anime\/(.+?)(\/|$|#)/g.exec(url);
        switch (ctx) {
            case S.cts.ANIME:
                return {
                    ctx: ctx,
                    anime: anime && anime[0],
                    name: name && name[1]
                };
            case S.cts.EPISODE:
                const server = /(\?|&)s=(.+?)(&|$|#)/g.exec(url);
                const ep = /\/([^?/]+?)\?/g.exec(url);
                const id = /(\?|&)id=(.+?)(&|$|#)/g.exec(url);
                return {
                    ctx: ctx,
                    name: name && name[1],
                    anime: anime && anime[0],
                    ep: ep && ep[1],
                    id: id && id[2],
                    server: server && server[2],
                    stripped: S.stripEpUrl(url)
                };

            default:
                break;
        }
    }

    getContext() {
        for (const c in S.cts)
            if (this.isContext(S.cts[c]))
                return S.cts[c];

        return null;
    }

}

const S = Slickiss;

if (location.protocol != 'chrome-extension:') {
    $(document).on('ready', async e => { new Slickiss; });


    if (!S.isContext(location.href, S.cts.CAPTCHA))
        $(document.documentElement).append(Assets.waitMsg());

    const ign = (localStorage.slickiss_ignore || '');
    localStorage.slickiss_ignore = ign.replace(location.host + '|', '');
    if (
        (location.host != 'kissanime.ru' && !ign.includes(location.host + '|')) ||
        S.isContext(location.href, S.cts.EPISODE) && location.hash == '#player'
    ) {
        window.stop();
        Player.deploy();
    }

} else if (location.hash.includes('GetM3U8'))
    Player.deploy();


