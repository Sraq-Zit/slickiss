
/** Class presents Slickiss custom video player */
class Player {

    /** Setter for qualities
     * @param {{
        '1080p'?: string;
        '720p'?:string;
        '480p'?:string;
        '320p'?:string;
    }} [qs] Sources for other qualities 
     */
    setQualities(qs) {
        if (typeof qs == 'object')
            for (const q in qs)
                this.qContainer.append(
                    this.qualities[q] = $('<a/>', {
                        class: qs[q].file == this.v[0].src ? 'active' : '',
                        href: '#', 'data-file': qs[q].file,
                        text: q
                    }).on('click', e => {
                        e.preventDefault();
                        this.qContainer.find('.active').removeClass('active');
                        this.v[0].src = $(e.currentTarget).addClass('active').data('file');
                    })
                );
    }

    /** Whether current server can allow previewing while seeking (Technically it's whether the server
     * can allow multiple requests on the url)
     * @type {boolean}
     */
    seekPreviewAvailable;

    /** Get buffered time */
    get buffered() {
        let len = this.v[0].buffered.length;
        let total = 0;
        while (len--) total += this.v[0].buffered.end(len) - this.v[0].buffered.start(len);
        return total;
    }


    /** Whether the player is ready
     * @returns {boolean}
     */
    get enabled() {
        return !this.container.find('.disabled').length;
    }
    set enabled(b) {
        if (!this.enabled && b) {
            if (this.thumbnail) this.thumbnail.destroy();
            this.thumbnail = new Thumbnail(this.seekPreviewAvailable && this.v[0].src);
            this.thumbnail.onTLoad(ev => {
                const s = ev.from;
                const e = ev.to;
                const buf = this.buffer.sample.clone().css({
                    'background-color': 'lightgreen',
                    opacity: .4
                });
                this.bar.append(buf);
                const mLeft = (s / this.v[0].duration) * this.bar.width();
                const length = ((e - s) / this.v[0].duration) * this.bar.width();
                buf.css("margin-left", mLeft.toFixed(2) + "px");
                buf.css("width", length.toFixed(2) + "px");
            });
        }
        this.container[b ? 'addClass' : 'removeClass']('canplay');
        this.container[!b ? 'addClass' : 'removeClass']('loading');
        return this.container
            .find('.slickBtn:not(.alwaysEnabled)')[!b ? 'addClass' : 'removeClass']('disabled');
    }

    /** Whether the video is being navigated over
     * @returns {boolean}
     */
    get isDraggingPointer() {
        return this.pointer.isDragging;
    }
    set isDraggingPointer(b) {
        if (!this.enabled) return this.isDraggingPointer;
        if (this.isDraggingPointer == b) return b;
        this.container[b ? 'addClass' : 'removeClass']('pinned');
        if (!b) this.navigateTo(this.v[0].duration * this.filler.width() / this.bar.width(), 1);
        return this.pointer.isDragging = b;
    }

    /** Whether the volume is being changed
     * @returns {boolean}
     */
    get isChangingVolume() {
        return this.volumeBar.isDragging;
    }
    set isChangingVolume(b) {
        if (this.isChangingVolume == b) return b;
        this.container[b ? 'addClass' : 'removeClass']('pinned');
        this.volumeBar[b ? 'addClass' : 'removeClass']('volumeChange');
        return this.volumeBar.isDragging = b;
    }

    /** Load and refer to initialize components */
    async init() {
        this.container = await Assets.player();
        this.firstTime = true;
        this.v = this.container.find('video').attr('src', this.src);
        this.loader = this.container.find(".loadingImg");
        this.toolbarContainer = this.container.find(".toolbarContainer");
        this.timgTime = this.container.find(".timeDisplay");
        this.timgTime.time = this.timgTime.children('span');
        this.timgTime.thumbnail = this.timgTime.children('canvas');
        this.buffer = { sample: this.container.find(".buffer").remove() };
        this.pointer = this.container.find(".pointer.dragDot");
        this.filler = this.container.find(".pointerFill");
        this.volumeBar = this.container.find(".volumeBar");
        this.bar = this.container.find(".bufferBar");
        this.toolbar = this.container.find(".controlBar");
        this.time = this.container.find("#time");
        this.settings = this.container.find('.settings');
        this.qContainer = this.container.find('.q');
        this.remover = this.container.find('#remove');
        this.buttons = {
            mediaControl: this.container.find(".slickBtn.media-control"),
            volumeLvl: this.container.find(".slickBtn.volumeLvl"),
            star: this.container.find(".slickBtn.star"),
            reload: this.container.find(".slickBtn.reload"),
            setting: this.container.find(".slickBtn.setting"),
            download: this.container.find(".slickBtn.download"),
            screen: this.container.find(".slickBtn.screen")
        };
        this.icons = {
            loadingImg: this.container.find(".controlIcon.loadingImg"),
            play: this.container.find(".controlIcon.svg.playIcon"),
            pause: this.container.find(".controlIcon.svg.pauseIcon"),
            backward: this.container.find(".controlIcon.svg.backwardIcon"),
            forward: this.container.find(".controlIcon.svg.forwardIcon"),
            download: this.container.find(".controlIcon.svg.downloadIcon"),
            downloadAborted: this.container.find(".controlIcon.svg.downloadAbortedIcon")
        };

        $(window).on('resize', e => this.onVidTimeupdate() || this.onVidProgress());

        $(document).on('mousemove', e => this.onmousemove(e));
        $(document).on('mouseup',
            e => e.preventDefault() || (this.isChangingVolume = this.isDraggingPointer = 0));

        this.container.on('click', e => this.onContainerClick(e));
        this.container.on('mouseleave', e => this.idle(this.enabled));

        this.bar.on('mousemove', e => this.onMouseOverBar(e));
        this.bar.on('mouseleave', e => this.timgTime.css('opacity', 0) && this.container.removeClass('pinned'));
        this.toolbarContainer.add(this.v).on('mouseenter mousemove', e => this.playerHover(e));
        this.volumeBar.on('mousedown',
            e => e.preventDefault() || (this.isChangingVolume = 1) && this.onmousemove(e));
        this.pointer.add(this.bar).on('mousedown',
            e => e.preventDefault() || (this.isDraggingPointer = 1) && this.onmousemove(e));

        this.buttons.mediaControl.on('click', e => this.toggleVideo());
        this.buttons.screen.on('click', e => this.toggleFullScreen());
        this.buttons.download.on('click', e => this.downloadVideo());
        this.buttons.volumeLvl.on('click', e => this.v[0].muted = !this.v[0].muted);
        this.buttons.reload.on('click', async e => {
            const onyes = (e) => {
                p.destroyable = false;
                p.bigTitle.html('Reloading ...');
                p.subTitle.add(p.yes.parent()).hide();
                Chrome.set({ confirmPlayerReload: dontShow[0].checked });
                location.reload();
            };
            const onno = e => this.container.removeClass('pinned');
            const noconfirm = settings.confirmPlayerReload;
            const p = await new Prompt(onyes, onno, this.container).load();
            this.container.addClass('pinned');
            p.bigTitle.html('Are you sure you want to reload ?');
            const dontShow = $('<input/>', { type: 'checkbox', checked: noconfirm });
            p.subTitle.html('This will only reload the player<br>')
                .append(dontShow)
                .append(' Don\'t confirm next time.');

            p.show();

            if (e.ctrlKey || noconfirm) p.yes.click();
        })

        this.v.on('click', e => this.toggleVideo());
        this.v.on('play pause', e => this.toggleVideo(e.type == 'play'));
        this.v.on('dblclick', e => this.toggleFullScreen());
        this.v.on('canplay', e => this.onVidCanPlay(e));
        this.v.on('timeupdate', e => this.onVidTimeupdate(e));
        this.v.on('progress', e => this.onVidProgress());
        this.v.on('volumechange', e => this.onVolumeChange());
        this.v.on('error', e => this.onVidError());
        this.v.on('waiting',
            e => this.container.addClass('loading') &&
                this.icons.loadingImg.css('filter', 'grayscale(1)') &&
                (this.totalBuffered = this.buffered));


        if (this.qContainer) this.qContainer.children('a').on('click', e => this.changeServer(e));
        if (this.remover) this.remover.on('click', e => this.removePlayer());

        if (settings.shortcuts) $(document).on('keydown', e => this.setShortcuts(e));
        if (settings.autoplay) this.toggleVideo(1);
    }

    /** Animation plays when control button with a defined function is activated (show then fadeout)
     * @param {JQuery<HTMLImageElement>} icon Icon to animate
     */
    displayIcon(icon) {
        if (this.isIconBusy) return;
        this.isIconBusy = 1;
        icon.show().fadeOut(500, e => this.isIconBusy = 0);
    }

    /** Put player on or off idle mode (a mode where control bar is hidden)
     * @param {boolean} [toggler] Enable / Disable idle status
     */
    idle = (toggler = 1) => this.container[toggler ? 'addClass' : 'removeClass']('idle');



    /** Handle mouse moving over the document
     * @param {JQuery.MouseEventBase} e Mouse move event
     */
    onmousemove(e) {
        if (e.which != 1) return;
        if (this.isDraggingPointer) {
            const x = (e.clientX - this.bar.offset().left) / this.bar.width();
            this.navigateTo(x * this.v[0].duration);
        }
        if (this.isChangingVolume) {
            let volume = (e.clientX - this.volumeBar.offset().left) / this.volumeBar.width();
            volume = Math.max(0, volume);
            volume = Math.min(1, volume);
            this.v[0].muted = false;
            this.v[0].volume = volume;
        }
    }

    /** Handle click on the player (toggling settings..)
     * @param {JQuery.ClickEvent} e Click event object
     */
    onContainerClick(e) {
        if (this.buttons.setting.is(e.target)) this.settings.toggle();
        else if (!this.settings.find(e.target).length && !this.settings.is(e.target)) this.settings.hide();
        this.container[this.settings.is(':visible') ? 'addClass' : 'removeClass']('pinned');
    }

    /** Handle mouse moving over the navigation bar and display corresponding time
     * @param {JQuery.MouseEventBase} e Mouse move event
     */
    onMouseOverBar(e) {
        if (!this.enabled) return;
        let pos = e.clientX - this.bar.offset().left;
        const time = this.v[0].duration * pos / this.bar.width();
        if (time < 0 || time > this.v[0].duration) return;
        this.timgTime.time.html(Assets.formatSecs(time));
        pos = Math.max(pos, this.timgTime.outerWidth() / 2);
        pos = Math.min(pos, this.bar.width() - this.timgTime.outerWidth() / 2);
        this.timgTime.css({ opacity: 1, 'margin-left': pos + 'px' });
        const newCanvas = this.thumbnail.retrieve(time) || this.timgTime.thumbnail[0];
        this.timgTime.thumbnail.replaceWith(newCanvas);
        this.timgTime.thumbnail = $(newCanvas);
        this.container.addClass('pinned');
    }

    /** Event handler for mouse entering the player
     * @param {JQuery.MouseEventBase} e Event object
     */
    playerHover(e) {
        if (!this.enabled) return this.idle(0);
        clearTimeout(this.timeout);
        this.idle(0);
        this.timeout = setTimeout(
            () => this.idle(1),
            this.toolbarContainer.is(e.currentTarget) ? Player.LONG_TIMEOUT : Player.SHORT_TIMEOUT
        );
    }

    /** Event handler for quality change
     * @param {JQuery.ClickEvent} e Event data
     */
    changeServer(e) {
        const a = $(e.currentTarget);
        if (!a.hasClass('current') && a.data('file'))
            this.v[0].src = a.data('file');
    }

    /** Event handler for key pressing on the player, it handles different shortcuts
     * @param {JQuery.KeyPressEvent|JQuery.KeyDownEvent} e Event data
     */
    setShortcuts(e) {
        if (document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement)
            return;
        switch (e.originalEvent.code) {
            case Player.SHORTCUTS.playAndPause: this.toggleVideo(); break;
            case Player.SHORTCUTS.fullScreen: this.toggleFullScreen(); break;
            case Player.SHORTCUTS.nextEp: parent.postMessage("nextEp", '*'); break;
            case Player.SHORTCUTS.prevEp: parent.postMessage("prevEp", '*'); break;
            case Player.SHORTCUTS.skipTheme:
                this.v[0].currentTime += Player.SKIP_TIMESPAN;
                this.displayIcon(this.icons.forward);
                break;
            case Player.SHORTCUTS.forward:
                this.v[0].currentTime += Player.FORWARD_BACKWARD_TIMESPAN;
                this.displayIcon(this.icons.forward);
                break;
            case Player.SHORTCUTS.backward:
                this.v[0].currentTime -= Player.FORWARD_BACKWARD_TIMESPAN;
                this.displayIcon(this.icons.backward);
                break;
            case Player.SHORTCUTS.volumeUp:
                try { this.v[0].volume += Player.VOLUME_SPAN; } catch (e) { }
                // this.displayIcon(this.icons.forward);
                break;
            case Player.SHORTCUTS.volumeDown:
                try { this.v[0].volume -= Player.VOLUME_SPAN; } catch (e) { }
                // this.displayIcon(this.icons.forward);
                break;
            case Player.SHORTCUTS.abortPreload: /* To implement (deprecated ??) */ break;
            case Player.SHORTCUTS.download:
                this.displayIcon(this.icons.download);
                setTimeout(() => this.downloadVideo(), 400);
                break;
        }
    }




    /** Play or pause video
     * @param {boolean} action Plays on true, pauses on false and toggle if undefined
     */
    async toggleVideo(action) {
        if (!this.enabled || this.v[0].toggling) return;
        if (this.firstTime) {
            this.container.removeClass('pinned');
            this.firstTime = false;
        }
        action = typeof action == 'undefined' ? this.v[0].paused : action;
        this.v[0].toggling = 1;
        if (action) {
            await this.v[0].play();
            this.displayIcon(this.icons.play);
            this.buttons.mediaControl.addClass('pause');
        } else {
            this.v[0].pause();
            this.displayIcon(this.icons.pause);
            this.buttons.mediaControl.removeClass('pause');
        }
        this.v[0].toggling = 0;
    }

    /** Display time formatted as XX:XX(current time) / XX:XX(duration)
     * @param {number} time Time to display
     * @param {boolean} changeCurrentTime Whether to change the video currentTime to the given one
     */
    navigateTo(time, change = false) {
        if (typeof time == 'undefined') time = this.v[0].currentTime;
        if (change) return this.v[0].currentTime = time;

        time = Math.min(time, this.v[0].duration);
        time = Math.max(time, 0);
        const l = this.bar.width() * time / this.v[0].duration;
        this.filler.width(l);
        this.pointer.css('margin-left', l + 'px');
        const text = `${Assets.formatSecs(time)} / ${Assets.formatSecs(this.v[0].duration)}`;
        if (this.time.text() != text)
            this.time.text(text);
    }

    /** Download video using its source if available */
    downloadVideo() {
        if (!this.enabled) return;
        if (!this.v[0].currentSrc) return alert('No video found!');
        $('<a/>', { href: this.v[0].currentSrc, download: document.title, target: '_blank' })[0].click();
    }

    /** Put video on or off fullscreen mode */
    toggleFullScreen() {
        const d = document.fullscreenElement;

        if (!this.container.is(':visible'))
            if (d) document.exitFullscreen();
            else this.v[0].requestFullscreen();

        if (!this.enabled) return;

        this.buttons.screen[!d ? 'addClass' : 'removeClass']('exitFullscreen');
        if (d) document.exitFullscreen();
        else this.container[0].requestFullscreen();

    }

    /** Handle canplay event on video: Enables player controls and get it ready to control */
    async onVidCanPlay() {
        let len = this.v[0].buffered.length;
        let total = 0;
        while (len--) total += this.v[0].buffered.end(len) - this.v[0].buffered.start(len);
        this.enabled = true;

        if (!this.v[0].currentTime)
            this.navigateTo();
        const data = LocalStorage.get('lastTimeLeftAt');
        if (settings.notifyLastTime && data && !this.notified)
            for (const k in data)
                if (typeof data[k].leftAt == 'undefined') delete data[k];
                else if (k == md5(location.pathname)) {
                    const onyes = e => {
                        this.container.removeClass('pinned');
                        this.v[0].currentTime = data[k].leftAt;
                        delete data[k];
                        LocalStorage.set('lastTimeLeftAt', data, false);
                    };
                    const onno = e => {
                        this.container.removeClass('pinned');
                        delete data[k];
                        LocalStorage.set('lastTimeLeftAt', data, false);
                    };
                    const p = await new Prompt(onyes, onno, this.container).load();
                    this.container.addClass('pinned');
                    p.bigTitle.html(`Do you want to continue from where you left of ?`);
                    p.subTitle.html(`You previously left this video at ${Assets.formatSecs(data[k].leftAt)}`);
                    p.show();
                    break;
                }

        LocalStorage.set('lastTimeLeftAt', data, false);
        this.notified = true;
    }

    /** Handle timeupdate event on video: Display updated time and its buffer */
    async onVidTimeupdate() {
        if (!this.v[0].duration) this.enabled = false;
        if (!this.isDraggingPointer) this.navigateTo();
        if (this.v[0].currentTime > this.v[0].duration - Player.TRIGGER_TIMESPAN) {
            if (settings.notifyLastTime) {
                const data = LocalStorage.get('lastTimeLeftAt');
                delete data[md5(location.pathname)];
                LocalStorage.set('notifyLastTime', data, false);
            }
            if (settings.markAsSeen) {
                parent.postMessage("finished", '*');
                if (!this.container.seen) {
                    this.container.seen = 1;
                    const notif = $('<span/>', {
                        class: 'iconStyle seenIcon',
                        css: { position: 'fixed', right: 40, top: 20, 'z-index': 2 }
                    });
                    this.container.prepend(notif);
                    await sleep(500);
                    notif.addClass('seen');
                    setTimeout(() => notif.fadeOut(500, e => notif.remove()), 800);
                }
            }
        } else if (this.v[0].currentTime > Player.SKIP_TIMESPAN && settings.notifyLastTime) {
            LocalStorage.set('lastTimeLeftAt', {
                [md5(location.pathname)]: {
                    leftAt: this.v[0].currentTime - 5,
                    time: Date.now()
                }
            });
        }
    }

    /** Handle volume being changed */
    onVolumeChange() {
        var perc = this.v[0].muted ? 0 : this.v[0].volume * 100;
        if (perc > 0) this.v[0].muted = false;
        if (this.v[0].muted) perc = 0;
        this.volumeBar.css("background", `linear-gradient(90deg, white ${perc}%, #fffefe52 ${1 - perc}%)`);
        let cls = "volumeMute";
        if (!this.v[0].muted) cls = 'volume' + (this.v[0].volume ? (this.v[0].volume > .5 ? 2 : 1) : 0);
        this.buttons.volumeLvl.removeClass("volume2 volume1 volume0 volumeMute").addClass(cls);
    }

    /** Handle preloaded timestamps of the video and display their buffer */
    onVidProgress() {
        const temp = {};
        let len = this.v[0].buffered.length;
        let total = 0;
        this.playbackLoad = .4;
        while (len--) {
            const s = this.v[0].buffered.start(len),
                e = this.v[0].buffered.end(len);

            temp[s] = e;
            if (!this.buffer[s]) {
                const buf = this.buffer.sample.clone();
                this.buffer[s] = buf;
                this.bar.append(buf);
            }
            const mLeft = (s / this.v[0].duration) * this.bar.width();
            const length = ((e - s) / this.v[0].duration) * this.bar.width();
            this.buffer[s].css("margin-left", mLeft.toFixed(2) + "px");
            this.buffer[s].css("width", length.toFixed(2) + "px");

            if (s - e < 5 && total > 5) this.playbackLoad = 4;
            total += e - s;
        }
        for (const key in this.buffer)
            if (!temp[key] && key != 'sample') {
                this.buffer[key].remove();
                delete this.buffer[key];
            }

        if (this.container.hasClass('loading'))
            this.icons.loadingImg.css(
                'filter', `grayscale(${1 - ((total - this.totalBuffered) / this.playbackLoad)})`
            );

    }

    /** Handle player on errors */
    onVidError() {
        if (![this.v[0].NETWORK_IDLE, this.v[0].NETWORK_LOADING].includes(this.v[0].networkState))
            this.enabled = false;
    }




    /** Remove / Disable Slickiss custom video
     * @param {boolean} alert Whether it is called from the user or programatically
     */
    async removePlayer(alert = 1) {
        const EVENTS = 'click play pause dblclick canplay timeupdate progress volumechange waiting error';
        if (alert) {
            this.container.addClass('pinned');
            const yes = async e => {
                p.destroyable = false;
                p.bigTitle.html('Alright!');
                p.subTitle.add(p.yes.parent()).hide();
                const txt = p.subTitle.find("textarea");
                if (txt.val().length > 0)
                    var f = settings.feedback;
                if (!f) f = [];
                if (typeof f == 'string') f = [f];
                f.push(txt.val());
                Chrome.set({ feedback: f });
                setTimeout(() => {
                    if (p.subTitle.find('#permanent')[0].checked)
                        Chrome.set({ player: 0 });
                    this.container.replaceWith(this.v.off(EVENTS).attr({ controls: '' }));
                }, 1000);
            };
            const no = e => this.container.removeClass('pinned');
            const p = await new Prompt(yes, no, this.container).load();
            p.show();
        } else this.container.replaceWith(this.v.off(EVENTS).attr({ controls: '' }));
    }


    /** Deploy player on the current document
     * @param {string} [data] Data of the video if available
     */
    static async deploy(data) {
        settings = await Chrome.get();
        const sName = DlGrabber.getServerName(location.href);
        if (!sName.includes('beta') && !settings[`servers.${sName}`]) {
            location.hash = 'ignore';
            location.reload();
            return;
        }
        const player = new Player();
        await player.init();
        document.documentElement.innerHTML = '<body></body>';
        $('body').css('margin', 0).append(player.container);
        if (!(sName in DlGrabber.handlers))
            return Assets.toast('Whoops! Server not supported by Slickiss.') && player;
        const r = data || await DlGrabber.handlers.auto(location.href);
        if (!r.success) return Assets.toast('No video found') && player;
        player.seekPreviewAvailable = !Player.THUMBNAIL_PREVIEW_BLACKLIST.includes(r.server);
        if (!player.seekPreviewAvailable) Assets.toast('Seeking preview not available on this server');
        player.v[0].src = r.response;
        if (r.additional) {
            player.v[0].poster = r.additional.poster;
            // document.title = r.additional.title;
            player.setQualities(r.additional.qualities);
        }
        if (!settings.player)
            Assets.toast('Slickiss player disabled') && player.removePlayer(0);


        return player;
    }

    /** Instantiate Player
     * @param {string} src Video source, if none given video source is to be grabbed from the current url
     */
    constructor(src) {
        this.timeout = 0;
        this.src = src;
    }

    /** Time before fading controls out when cursor is idle not on the toolbar
     * @type {number}
     * @default 1e4
     **/
    static LONG_TIMEOUT = 1e4;

    /** Time before fading controls out when cursor is idle on the toolbar
     * @type {number}
     * @default 2e3
     **/
    static SHORT_TIMEOUT = 2e3;

    /** Span of time presenting the skipped time when a certain key is click used mainly for skipping
     * openings and endings (default: 1min25sec)
     * @type {number}
     * @default 60 + 25
     **/
    static SKIP_TIMESPAN = 60 + 25;

    /** Seconds to navigate by when using keyboard navigation shortcuts
     * @type {number}
     * @default 4
     **/
    static FORWARD_BACKWARD_TIMESPAN = 4;

    /** Volume increasing or decreasing when using keyboard shortcuts
     * @type {number}
     * @default 0.2
     **/
    static VOLUME_SPAN = .2;

    /** Span of time presenting the time before the end of a video. It is used as trigger to mark
     * an episode as seen and / or to save video time checkpoint
     * @type {number}
     * @default 3 * 60
     **/
    static TRIGGER_TIMESPAN = 3 * 60;

    /** List of servers thumbnail preview isn't compatible with
     * @type {string[]}
     **/
    static THUMBNAIL_PREVIEW_BLACKLIST = ['mp4upload'];

    /** Shortcuts definitions to control media using keyboard
     * @type {{
        playAndPause: number;
        fullScreen: number;
        nextEp: number;
        prevEp: number;
        skipTheme: number;
        abortPreload: number;
        download: number;
        volumeUp: number,
        volumeDown: number,
        backward: number,
        forward: number,
    }}
     **/
    static SHORTCUTS = {
        playAndPause: "Space",
        fullScreen: "KeyF",
        nextEp: "KeyN",
        prevEp: "KeyP",
        skipTheme: "KeyS",
        abortPreload: "KeyA",
        download: "KeyD",
        volumeUp: "ArrowUp",
        volumeDown: "ArrowDown",
        backward: "ArrowLeft",
        forward: "ArrowRight",
    };

    /** Element containing the whole UI
     * @type {JQuery<HTMLVideoElement>}
     **/
    container;

    /** Video element of the player 
     * @type {JQuery<HTMLVideoElement>} 
     **/
    v;

    /**  Image Element of a GIF plays when loading
     * @type {JQuery<HTMLImageElement>}
     **/
    loader;

    /** Container of the toolbar
    * @type {JQuery<HTMLTableElement>}
    **/
    toolbarContainer;

    /** Previewer with thumbnails on seek bar  
    * @type {Thumbnail}
    **/
    thumbnail;

    /** Time of the displayed thumbnail / hovered time 
    * @type {JQuery<HTMLDivElement>}
    **/
    timgTime;

    /** Current time displayer
    * @type {JQuery<HTMLSpanElement>}
    **/
    time;

    /** Element displays loaded buffer timestamps of the video
    * @type {{sample: JQuery<HTMLDivElement>}}
    **/
    buffer;

    /** Total time buffed/loaded of the video
    * @type {number}
    **/
    totalBuffered;

    /** Time to buffer before the video can play
    * @type {number}
    **/
    playbackLoad;

    /** Draggable pointer to control video time
    * @type {JQuery<HTMLDivElement>}
    **/
    pointer;

    /** Fills played timestamp
    * @type {JQuery<HTMLDivElement>}
    **/
    filler;

    /** Volume control
    * @type {JQuery<HTMLDivElement>}
    **/
    volumeBar;

    /** Element containing both the filler and buffer
    * @type {JQuery<HTMLDivElement>}
    **/
    bar;

    /** Toolbar containing all control buttons of the player
    * @type {JQuery<HTMLDivElement>}
    **/
    toolbar;

    /** Video qualities container
    * @type {JQuery<HTMLTableDataCellElement>}
    **/
    qContainer;

    /** Settings container
    * @type {JQuery<HTMLDivElement>}
    **/
    settings;

    /** Remove / Disable Slickiss video player
    
    **/
    remover;

    /** Player control buttons
    * @type {{
       mediaControl: JQuery<HTMLImageElement>;
       volumeLvl: JQuery<HTMLImageElement>;
       star: JQuery<HTMLImageElement>;
       reload: JQuery<HTMLImageElement>;
       setting: JQuery<HTMLImageElement>;
       download: JQuery<HTMLImageElement>;
       screen: JQuery<HTMLImageElement>;
   }}
    **/
    buttons;

    /** Alternative video qualities anchor elements
    * @type {{
       '1080p': JQuery<HTMLAnchorElement>;
       '720p': JQuery<HTMLAnchorElement>;
       '480p': JQuery<HTMLAnchorElement>;
       '320p': JQuery<HTMLAnchorElement>;
   }}
    **/
    qualities = {};

    /** Control icons
    * @type {{
       loadingImg: JQuery<HTMLImageElement>;
       play: JQuery<HTMLImageElement>;
       pause: JQuery<HTMLImageElement>;
       backward: JQuery<HTMLImageElement>;
       forward: JQuery<HTMLImageElement>;
       download: JQuery<HTMLImageElement>;
       downloadAborted: JQuery<HTMLImageElement>;
   }}
    **/
    icons;
}
