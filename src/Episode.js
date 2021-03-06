class Episode {
    isLight = () => settings.lite && this.isSupported &&
        (!S.parseUrl(location.href).server.includes('beta') || settings['servers.beta']);

    constructor() {
        this.isSupported = S.parseUrl(location.href).server in DlGrabber.handlers;
        this.requests = new Set([location.href]);
        Chrome.get('supported').then(async v => {
            if (v != this.isSupported) {
                await Chrome.set({ supported: this.isSupported });
                location.reload();
            }
        });
        this.backup();


        MessageManager.attachListener(e => {
            switch (e.data.request) {
                case 'data':
                    /** @type {boolean} */
                    this.lastSaved = false;
                    const d = { ...this.animeData, title: document.title, };
                    delete d.listing;
                    e.source.postMessage({
                        showData: d,
                        key: S.parseUrl(location.href).id,
                        times: LocalStorage.get('lastTimeLeftAt') || {},
                        light: localStorage.def_opct || '.9',
                        hasNext: !this.nextBtn.is('.disabled') && this.nextBtn.find('.tooltip-inner').text(),
                        hasPrev: !this.prevBtn.is('.disabled') && this.prevBtn.find('.tooltip-inner').text(),
                        token: e.data.token
                    }, '*');
                    break;

                case 'finished':
                    if (!this.lastSaved) {
                        const info = S.parseUrl(location.href);
                        Chrome.get('lastVisit', 'local').then(async lastVisit => {
                            if (!lastVisit) lastVisit = {};
                            if (!(info.name in lastVisit)) lastVisit[info.name] = {};
                            lastVisit[info.name][info.id] = Date.now();
                            await Chrome.set({ lastVisit: lastVisit }, 'local');
                            new EpisodeListing(this.listing, false);
                        });
                        this.lastSaved = true;
                    }
                    if (this.nextBtn.is('.disabled'))
                        $('.seenIcon:not(.seen)').click();
                    break;
                case 'prevEp':
                    this.prevBtn.not('.disabled').click();
                    break;
                case 'nextEp':
                    this.nextBtn.not('.disabled').click();
                    break;

                case 'saveTime':
                    LocalStorage.set('lastTimeLeftAt', {
                        [S.parseUrl(location.href).id]: {
                            leftAt: e.data.leftAt,
                            time: Date.now()
                        }
                    });
                    break;

                case 'removeTime':
                    const data = LocalStorage.get('lastTimeLeftAt') || {};
                    delete data[e.data.time];
                    LocalStorage.set('lastTimeLeftAt', data, false);
                    break;

                case 'theater':
                    $('.fa-tv')[0].click();
                    break;

                case 'light':
                    this.toggleLights(e.data.opacity);
                    break;

                default:
                    break;
            }
        });

        if ($("#btnBookmarkManager").length) $("#btnBookmarkManager")[0].click();

        if (this.isLight()) {
            this.load().then(Episode.createDummies);
            // this.lightenInterface();

        } else {
            $('iframe[id*=adsIfrme]').remove();
            $('[id*=adsIfrme] > iframe').parent().remove();
            $("#disqus_thread").show(); //hide disqus
            // $('#divVideo').attr("id", "video").css('width', ''); // change id to avoid content removal ..
            // $('#divDownload').attr("id", "dDownload"); // change id to avoid content removal caused by adblock
            // $("body").prepend(batchBoard).prepend(bmLoad); // batchboard setup

            $('.barContent .clear2').eq(0).replaceWith(
                $('<p>')
                    .html(
                        this.isSupported ?
                            `Due to some bugs that beta servers may produce, it is recommended to
                        use Slickiss display.<br>`
                            :
                            `You have been switched automatically to default display because
                        this server is not supported by Slickiss yet.`
                    )
                    .css('font-size', '18px')
                    .append(
                        this.isSupported ?
                            $(`<a href="#">Switch to Slickiss display</a>`).on('click', async e => {
                                e.preventDefault();
                                Chrome.set({ lite: 1, 'servers.beta': true });
                                location.reload();
                            })
                            :
                            $()
                    )
            )

        }

    }


    /** Load components for the player */
    async load() {
        /** Info of the curent Anime */
        window.onscroll = _ => window.scrollY && window.scrollTo(0, 0);
        const iframe = $('#divContentVideo iframe, #centerDivVideo iframe');
        const next = $('#btnNext').parent().attr('href');
        const prev = $('#btnPrevious').parent().attr('href');
        const title = document.title.split(' - Watch')[0];
        const excl = !DlGrabber.EXCL.includes(S.parseUrl(location.href).server);
        this.src = excl && iframe.length ? iframe[0].src : `${location.href}#player`;
        $('#selectServer>option').toArray()
            .map(el => this.servers[S.parseUrl(el.value).server] = { url: el.value, name: $(el).text().trim() });
        const seletedServer = $('#selectServer>option:selected').val();
        if (S.parseUrl(seletedServer).server != S.parseUrl(location.href).server)
            window.history.replaceState({}, "", seletedServer);

        $('body').empty().append(Assets.waitMsg().slice(1));
        Episode.createDummies();
        this.animeData = await Anime.getAnimeData(location.href);
        document.documentElement.innerHTML = await Assets.loadAssetFromFile('html/player_ui.html');
        document.title = title;
        this.loadUnwatchedAnimeList();
        $('#episodes').append(this.listing = this.animeData.listing);
        $('.bigChar').attr('href', this.animeData.url).text(this.animeData.name);
        new Anime;
        new EpisodeListing(this.listing, false);
        this.listing.find('tr > td:first-child').attr('title', 'Click to prepare this episode while you are watching the current one');
        this.listing.find('a').parent().on('click', e => {
            if ($(e.target).is('a')) return;

            const a = $(e.currentTarget).children('a').addClass('episodeVisited')[0];
            this.sendEpisodeRequest(S.setServer(a.href, settings.defaultserver));
        });
        this.listing.addClass('w-100');
        this.listing.find('a').each((i, el) => $(el).text($(el).text().replace(this.animeData.name, '')));
        this.listing.find('tr > th').eq(1).attr('width', '30%');
        this.listing.find('tr > th:first-child')
            .attr('width', '70%')
            .attr('title', 'Click to prepare all episodes')
            .on('click', e => $(e.currentTarget).addClass('done') && this.listing.find('td').click());
        this.iframe = $('iframe#player').attr('src', this.src);
        this.nextBtn = $('#next').data('url', next || '').addClass(next ? '' : 'disabled');
        this.prevBtn = $('#prev').data('url', prev || '').addClass(prev ? '' : 'disabled');
        this.epStatus = $('#status').text(document.title.replace(this.animeData.name, ''));
        this.srvContainer = $('#servers');

        this.resizer = $('#resizer');
        this.resizer.on('mousedown', e => {
            if ($('.col.theater').length) {
                Assets.toast('Please disable theater mode', 2e3);
                return;
            }
            e.preventDefault();
            this.resizer.dragging = true;
            this.resizer.prev().removeClass('animate');
            this.iframe.css('pointer-events', 'none');
        });

        $(document).on('mousemove mouseup', e => {
            if (!this.resizer.dragging) return;
            if (e.type == 'mouseup') {
                this.resizer.dragging = false;
                this.resizer.prev().addClass('animate');
                this.iframe.css('pointer-events', '');
                localStorage.leftResize = this.resizer.prev().attr('style');
                return;
            }
            const screen = this.resizer.prev();
            const container = this.resizer.parent();
            for (const k of ['max-width', 'flex-basis'])
                screen.css(
                    k, (100 * (e.clientX - container.offset().left) / container.width()).between(0, 100) + '%'
                ) && this.resizer.next().css(k, '');
        });

        $('body').append(`
            <script>
                var disqus_shortname = 'kissanime';
                var disqus_url = '${S.parseUrl(location.href).stripped}';

                var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
                dsq.src = '//' + disqus_shortname + '.disqus.com/embed.js';
                (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
            </script>
        `);
        this.markEpisode(location.href, 'ready', false);
        $('#bootstrap').on('load', _ => $('.slickExtra').remove() && this.update());
        $('.fa-lightbulb').on('click', _ => this.toggleLights());
        $('.fa-tv').on('click', _ => localStorage.theaterMode = this.iframe.parent().toggleClass('theater').hasClass('theater'));
        if (localStorage.theaterMode == 'true') $('.fa-tv')[0].click();
        if (localStorage.inverseLayout) $('#inverseLayout')[0].click();
        if (localStorage.leftResize)
            this.resizer.prev().attr('style', localStorage.leftResize) &&
                this.resizer.next().css({ 'max-width': '', 'flex-basis': '' });
        this.srvContainer.on('click', 'span:not(.disabled)', e => {
            const server = $(e.currentTarget);
            const activated = 'rounded-pill cursor-pointer btn btn-secondary disabled';
            const activatedEl = $('.' + activated.replace(/ /g, '.'));
            activatedEl.attr('class', server.attr('class'));
            if (server.hasClass('preloaded')) {
                this.iframe.attr('src', server.data('iframe_url'));
                window.history.pushState({}, "", server.data('url'));
            } else
                location.href = server.data('url');

            server.attr('class', activated);
        });
        this.nextBtn.add(this.prevBtn).on('click', e => {
            $(`.listing a[href*="id=${S.parseUrl($(e.currentTarget).data('url')).id}"]`)[0].click();
        });

        $(window).on('popstate', () => $(`.listing a[href*="id=${S.parseUrl(location.href).id}"]`).click());
        $(document).on(
            'click',
            e => $('.setting,.setting>.fa-cog').is(e.target) ?
                e.preventDefault() || $('#settings').toggle() : $('#settings').hide()
        );
        $('.fa-info-circle').on('mouseenter mouseleave', e => {
            $('.help')[e.type == 'mouseenter' ? 'show' : 'hide']();
        });

        if (!settings.guideSkip)
            sleep(2000).then(() => $('.help').fadeOut() && Chrome.set({ guideSkip: true }));
        else
            $('.help').hide();

        this.listenToShortcuts();
        this.prepareEpisodes();
        sleep(1000).then(_ => $('.slickExtra').remove());

    }


    /** Update components and attributes */
    update() {
        const iframe = $(`iframe[src*="/embed/comments"]`)[0];
        if (iframe) {
            const url = S.parseUrl(location.href).stripped.replace('.ru', '.to');
            iframe.src = iframe.src.replace(/t_u=.+?&/g, `t_u=${url}&`);
        }
        $('#__disqus').css('margin-top') != '0px' &&
            $('#__disqus').attr('style', (i, s) => (s || '') + 'display:none !important');

        this.srvContainer.children(':not(.sample)').remove();
        const sample = this.srvContainer.find('.sample').clone().removeClass('sample');
        const activated = 'rounded-pill cursor-pointer btn btn-secondary disabled';
        const default_ = sample.attr('class');
        const preloaded = 'preloaded ' + default_.replace('secondary', 'info');
        for (const k in this.servers) {
            let server = sample.clone()
                .data('url', this.servers[k].url)
                .text(this.servers[k].name);

            if (k == S.parseUrl(location.href).server)
                server.attr('class', activated);

            this.srvContainer.append(server.addClass(k));
        }


        const id = S.parseUrl(location.href).id;
        (id in this.cache ? new Promise(r => r(this.cache[id])) : grab(location.href)).then(dlg => {
            this.cache[id] = dlg;
            for (const k in dlg.urls)
                if (k in DlGrabber.handlers)
                    this.srvContainer.find('.' + k)
                        .data('iframe_url', dlg.urls[k])
                        .addClass('preloaded')
                        .not('.disabled')
                        .attr('class', preloaded);

        })


        for (const btn of [this.nextBtn, this.prevBtn])
            if (btn.data('url') && btn.removeClass('disabled')) {
                btn.find('.tooltip-inner').text(
                    this.listing.find(`a[href*='id=${S.parseUrl(btn.data('url')).id}']`).text()
                        .replace(this.animeData.name, '').trim()
                );
            } else btn.addClass('disabled');



        this.markEpisode();
    }


    async loadUnwatchedAnimeList() {
        let list = await Bookmark.getOngoingUnwatchedList();
        if (list) {
            if (!list.find('td').length)
                list.html('No new episodes of on-going Anime in your list');
            const ttip = $('<div/>', { class: 'col' })
                .append($('<div/>', { class: 'h-50 row info_' }))
                .append(
                    $('<h4/>', { class: 'row d-flex align-items-start h-50 justify-content-center' })
                );

            list = $('<div/>', { class: 'text-light w-100 h-100 p-4 m-5 overflow-auto row bg-k border boder-dark shadow' })
                .append(list.removeClass('listing').addClass('col-7 mr-4'))
                .append(ttip);

            list.find('td').on('mouseleave', e => list.find('.info_').html(''));
            list.find('td').on(
                'mouseenter',
                e => list.find('.info_').html(
                    ($(e.currentTarget).data('title') || '')
                        .replace(/<a .+?>/g, '<div class="h3 text-info">')
                        .replace(/<\/a>/g, '</div>')
                )
            );
            list.find('a:not(th a)').addClass('text-success');
        } else list = $('<div/>', { text: 'No bookmarks available.', class: 'display-4 text-muted' });
        $('#bList').find('.wait').remove();
        $('#bList').append(list);
    }


    // execute key actions outside the video through the iframe
    listenToShortcuts() {
        $(document).on("keypress keyup keydown", e => {
            if (e.originalEvent.code == "Escape") $('.closure').click();
            if (e.ctrlKey && e.charCode == 2) $('.iconStyle.bookmarkIcon').click();
            if (e.ctrlKey && e.charCode == 10) $('.iconStyle.seenIcon').click();
            // this.iframe[0].contentWindow.focus();
            this.iframe[0].contentWindow && this.iframe[0].contentWindow.postMessage({
                originalEvent: { code: e.originalEvent.code },
                type: e.type,
                which: e.which,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
            }, "*");
        });

    }


    prepareEpisodes() {

        this.requestPrevNextEpisode();

        $(document).on('click', '.listing a', e => {
            let id = S.parseUrl(e.currentTarget.href).id;
            if (id in this.cache) {
                e.preventDefault();
                this.quickAccess(this.cache[id]);
                this.requestPrevNextEpisode();
                $(e.currentTarget).off('click');
            }
        });
    }

    /** Toggle dim lights
     * @param {string} [opac] Opacity value
     */
    toggleLights(opac) {
        const overlay = $('#overlay');
        const opacity = overlay.css('opacity') == '0' ? localStorage.def_opct || '.9' : '0';
        overlay.css('opacity', opac ? (localStorage.def_opct = opac) : opacity);
    }

    /** Apply quick navigation to the clicked item
     * @param {DlGrabber} dlg Object containing data of the episode navigated
     */
    quickAccess(dlg) {
        let server = S.parseUrl(location.href).server;
        if (!(server in dlg.urls)) server = Object.keys(dlg.urls)[0];
        const next = dlg.doc.find('#btnNext').parent().attr('href');
        const prev = dlg.doc.find('#btnPrevious').parent().attr('href');

        this.nextBtn = $('#next').data('url', next || '').addClass(next ? '' : 'disabled');
        this.prevBtn = $('#prev').data('url', prev || '').addClass(prev ? '' : 'disabled');

        document.title = dlg.doc.filter('title').text().split('- Watch')[0];

        this.epStatus.text(document.title.replace(this.animeData.name, ''));

        this.iframe.attr('src', 'about:blank');
        sleep(100).then(() => this.iframe.attr('src', dlg.urls[server]));

        window.history.pushState({}, "", dlg.servers[server]);

        this.update();

    }

    async sendEpisodeRequest(url) {
        const id = S.parseUrl(url).id;
        if (!(id in this.cache)) {
            if (url in this.requests) return;
            this.markEpisode(url, 'retrieving', 0);
            this.requests[id] = '';
            try { this.cache[id] = await grab(url); }
            catch (e) {
                console.error(e);
                this.listing.find(`a[href*='id=${S.parseUrl(url).id}']`)
                    .parent('td')
                    .attr({ class: 'error', title: `Browsers like Brave, Opera gx, kiwi, etc.. prevent the extension from solving captcha.` });
                return;
            }
        }
        this.markEpisode(url, 'ready', 0);
    }

    requestPrevNextEpisode() {
        if (settings.prepareNextPrev && self === top)
            for (const btn of [this.nextBtn, this.prevBtn])
                this.sendEpisodeRequest(btn.data('url'));
    }

    markEpisode(url = location.href, marker = 'playing', unique = 1) {
        if (unique) $(`.${marker}`).removeClass(marker);
        const id = S.parseUrl(url).id;
        let el = this.listing.find(`a[href*='id=${id}']`).parent('td');
        if (marker == 'playing') el[0] && el[0].scrollIntoViewIfNeeded();
        el.addClass(marker);
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
    static createDummies() {
        $("body").append(`<div id='divFileName' class='dummy'></div>
                    <div id='centerDivVideo'></div>
                    <div id='divVideo'></div>
                <a id='divMessageRetry'></a>`);
        const glxTsIds = [11565, 11875, 11874, 11873, 11963, 11964, 11965, 11966];
        for (var i in glxTsIds)
            $("body > .dummy").eq(0).append("<div id='glx-" + glxTsIds[i] + "-container'></div>");

        // inject(`setTimeout = _=>_; setInterval = _=>_t;`);
    }


    /** URL of the iframe containing the episode to play
     * @type {string}
     */
    src

    /** Iframe element of the player
     * @type {JQuery<HTMLIFrameElement>}
     */
    iframe

    /** Table elements of Anime episodes
     * @type {JQuery<HTMLTableElement>}
     */
    listing

    /** Button element links to the next episode
     * @type {JQuery<HTMLDivElement>}
     */
    nextBtn

    /** Button element links to the previous episode
     * @type {JQuery<HTMLDivElement>}
     */
    prevBtn

    /** Placeholder containing the name of the episode playing
     * @type {JQuery<HTMLDivElement>}
     */
    epStatus

    /** Available servers' urls
     * @type {string[]}
     */
    servers = {}

    /** Cache servers links
     * @type {DlGrabber[]}
     */
    cache = {}

    /** Container of the available servers' components
     * @type {JQuery<HTMLDivElement>}
     */
    srvContainer

}