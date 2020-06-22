
/** Class presents Slickiss custom video player */
class Player {

    /** Setter for qualities
     * @param {QualityManager} qs Sources for other qualities 
     */
    setQualities(qs) {
        qs.forEach(
            q => this.qContainer.append(
                this.qualities[q.label] = $('<a/>', {
                    class: q.file == qs.preferredQ.file ? 'disabled btn-light' : 'btn-outline-light',
                    href: '#', data: q, text: q.label
                }).on('click', e => {
                    e.preventDefault();
                    this.qContainer.find('.disabled')
                        .removeClass('disabled btn-light').addClass('btn-outline-light');
                    const data = $(e.currentTarget).addClass('disabled btn-light')
                        .removeClass('btn-outline-light')
                        .data();

                    $('#currentQ').show().text(data.label);
                    this.notified = false;
                    this.v.trigger('beforeunload');
                    if (this.v[0].src != data.file) this.v[0].src = data.file;
                })[q.file == qs.preferredQ.file ? 'click' : 'show']().addClass('btn btn-sm rounded-pill')
            ).show()
        )

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

    /** Whether the controls are permanently pinned
     * @returns {boolean}
     */
    get pinned() {
        return this.container.hasClass('controls');
    }
    set pinned(v) {
        this.container[v ? 'addClass' : 'removeClass']('controls');
        this.buttons.pin[v ? 'addClass' : 'removeClass']('pinned');
    }

    /** Whether the player is ready
     * @returns {boolean}
     */
    get enabled() {
        return !this.container.find('.slickBtn.disabled').length;
    }
    set enabled(b) {
        if (!this.enabled && b && settings.thumbnails) {
            this.loadThumbnails();
            // this.thumbnail.onTLoad(ev => {
            //     const s = ev.from;
            //     const e = ev.to;
            //     const buf = this.buffer.sample.clone().css({
            //         'background-color': 'lightgreen',
            //         opacity: .4
            //     });
            //     this.bar.append(buf);
            //     const mLeft = (s / this.v[0].duration) * 95;
            //     const length = ((e - s) / this.v[0].duration) * 95;
            //     buf.css("margin-left", mLeft.toFixed(2) + "%");
            //     buf.css("width", length.toFixed(2) + "%");
            // });
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


    /** Load and refer to initialize components */
    async init() {
        this.container = await Assets.player();
        this.firstTime = true;
        this.v = this.container.find('video#mainVid').attr('src', this.src);

        /** Audio element for videos that that have audio separated
         * @type {JQuery<HTMLAudioElement>}
         */
        this.au = this.v.find('audio');
        this.loader = this.container.find(".loadingImg");
        this.toolbarContainer = this.container.find(".toolbarContainer");
        this.timgTime = this.container.find(".timeDisplay");
        this.timgTime.time = this.timgTime.children('strong');
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
        this.remover = this.container.find('#remove, #disable');
        /** MediaRecorder management for recording clips
         * @type {VideoRecorder}
         */
        this.recorder = new VideoRecorder(this.v[0]);
        /** Overlay for screenshots */
        this.shooting = {
            container: this.container.find('.overlay.screenshot'),
            clickEffect: this.container.find('.screenshot-effect'),
            sizeLogger: this.container.find('.size-logger'),
            image: this.container.find('.overlay.screenshot img'),
            video: this.container.find('.overlay.screenshot video'),
            download: this.container.find('.overlay.screenshot .fa-download').parent(),
            upload: this.container.find('.overlay.screenshot .fa-upload').parent(),
            exit: this.container.find('.overlay.screenshot .fa-times-circle').parent(),
        };
        this.shooting.showResults = (blob, isVideo = false) => {
            this.pinned = true;
            this.shooting.container.css({ opacity: 1, 'pointer-events': '' });
            this.shooting.image[isVideo ? 'hide' : 'show']();
            this.shooting.video[!isVideo ? 'hide' : 'show']();
            const oldSrc = this.shooting.download[0].href;
            if (oldSrc) URL.revokeObjectURL(oldSrc);
            const src = URL.createObjectURL(blob);
            this.shooting[isVideo ? 'video' : 'image'][0].src = src;
            this.shooting.download[0].href = src;
            this.shooting.download.attr('title', convertSize(blob.size + 'B', undefined, 2));
        };
        this.shooting.close = () => {
            this.pinned = false;
            this.shooting.container.css({ opacity: 0, 'pointer-events': 'none' });
            this.shooting.image.removeAttr('src');
            this.shooting.video.removeAttr('src');
        };

        /** Player control buttons */
        this.buttons = {
            mediaControl: this.container.find(".slickBtn.media-control"),
            next: this.container.find(".slickBtn.next"),
            prev: this.container.find(".slickBtn.prev"),
            skipForward: this.container.find(".slickBtn.skipForward"),
            skipBackward: this.container.find(".slickBtn.skipBackward"),
            volumeLvl: this.container.find(".slickBtn.volumeLvl"),
            star: this.container.find(".slickBtn.star"),
            reload: this.container.find(".slickBtn.reload"),
            setting: this.container.find(".slickBtn.setting"),
            download: this.container.find(".slickBtn.download"),
            screen: this.container.find(".slickBtn.screen"),
            pin: this.container.find(".slickBtn.pin"),
            screenshot: this.container.find(".slickBtn.screenshot"),
            record: this.container.find(".slickBtn.record"),
            thumbnails: this.container.find(".slickBtn.thumbnails")
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

        if (settings.thumbnails) this.buttons.thumbnails.removeClass('fa-eye-slash');

        if (!Player.HAS_NEXT) this.buttons.next.attr('style', 'display:none !important');
        else this.buttons.next.attr('title', Player.HAS_NEXT);
        if (!Player.HAS_PREV) this.buttons.prev.attr('style', 'display:none !important');
        else this.buttons.prev.attr('title', Player.HAS_PREV);


        MessageManager.attachListener(e => { if (e.data.type) $(document).trigger(e.data) });

        $(window).on('resize', e => this.onVidTimeupdate() || this.onVidProgress());
        $(window).add(this.v).on('beforeunload pause', _ => {
            if (this.v[0].currentTime > Player.SKIP_TIMESPAN && settings.notifyLastTime &&
                this.v[0].currentTime <= this.v[0].duration - Player.TRIGGER_TIMESPAN) {
                const leftAt = this.v[0].currentTime - 5;
                if (top == self) LocalStorage.set('lastTimeLeftAt', {
                    [md5(location.pathname)]: {
                        leftAt: leftAt,
                        time: Date.now()
                    }
                });
                else {
                    if (Player.TIMES) Player.TIMES[Player.KEY] = { time: Date.now(), leftAt: leftAt };
                    top.postMessage({ request: 'saveTime', leftAt: leftAt }, '*');
                }
            }
        });

        $(document).on('mousemove', e => this.onmousemove(e));
        $(document).on('mouseup',
            e => e.preventDefault() || (this.isDraggingPointer = 0));

        this.container.on('click', e => this.onContainerClick(e));
        this.container.on('mouseleave', _ => this.idle(this.enabled));

        this.volumeBar.on('input', _ => this.v[0].volume = this.volumeBar.val() / 100);

        this.bar.on('mousemove', e => this.onMouseOverBar(e));
        this.bar.on('mouseleave', e => this.timgTime.css('opacity', 0) && this.container.removeClass('pinned'));
        this.toolbarContainer.add(this.v).add(this.bar).on('mouseenter mousemove', e => this.playerHover(e));
        this.pointer.add(this.bar).on('mousedown',
            e => e.preventDefault() || (this.isDraggingPointer = 1) && this.onmousemove(e));


        this.shooting.exit.on('click', this.shooting.close);


        this.buttons.mediaControl.on('click', e => !$(e.currentTarget).is('.disabled') && this.toggleVideo());
        this.buttons.screen.on('click', _ => this.toggleFullScreen());
        this.buttons.download.on('click', _ => this.downloadVideo());
        this.buttons.volumeLvl.on('click', _ => this.v[0].muted = !this.v[0].muted);
        this.buttons.pin.on('click', _ => this.pinned = !this.pinned);
        this.buttons.prev.on('click', _ => parent.postMessage({ request: "prevEp" }, '*'));
        this.buttons.next.on('click', _ => parent.postMessage({ request: "nextEp" }, '*'));
        this.buttons.record.on('click', _ => this.toggleClipRecording());
        this.buttons.thumbnails.on('click', _ => {
            const value = !this.buttons.thumbnails.toggleClass('fa-eye-slash').hasClass('fa-eye-slash');
            Chrome.set({ thumbnails: value });
            if (value) this.loadThumbnails();
            else this.thumbnail && this.timgTime.thumbnail.width(0).height(0) && this.thumbnail.destroy();
        })
        this.buttons.screenshot.on('click', async _ => {
            if (!this.enabled) return;
            this.pinned = true;
            const im = new Img();
            im.img = this.v[0];
            im.img.width = im.img.videoWidth;
            im.img.height = im.img.videoHeight;

            this.v[0].pause();
            this.shooting.clickEffect.removeClass('animate').css('opacity', .9);
            await im.load();
            this.shooting.showResults(await im.canvas.convertToBlob());
            this.shooting.clickEffect.addClass('animate').css('opacity', 0);
            this.shooting.download[0].download = Player.SHOW_DATA.title.trim();
            this.shooting.download[0].download += ' ' + Assets.formatSecs(im.img.currentTime).replace(':', '_');
            this.shooting.download[0].download += '_' + Math.round(im.img.currentTime % 1) * 1e3;
        });
        this.buttons.skipForward.on('click', e => {
            if ($(e.currentTarget).is('.disabled')) return;
            this.v[0].currentTime += Player.SKIP_TIMESPAN;
            this.displayIcon(this.icons.forward);
        });
        this.buttons.skipBackward.on('click', e => {
            if ($(e.currentTarget).is('.disabled')) return;
            this.v[0].currentTime -= Player.SKIP_TIMESPAN;
            this.displayIcon(this.icons.backward);
        });
        this.buttons.reload.on('click', async e => {
            const onyes = (e) => {
                p.destroyable = false;
                p.bigTitle.html('Reloading ...');
                p.subTitle.add(p.yes.parent()).hide();
                Chrome.set({ confirmPlayerReload: dontShow[0].checked });
                location.reload();
            };
            const onno = e => this.pinned = false;
            const noconfirm = settings.confirmPlayerReload;
            const p = await new Prompt(onyes, onno, this.container).load();
            this.pinned = true;
            p.bigTitle.html('Are you sure you want to reload ?');
            const dontShow = $('<input/>', { type: 'checkbox', checked: noconfirm });
            p.subTitle.html('This will only reload the player<br>')
                .append(dontShow)
                .append(' Don\'t confirm next time.');

            p.show();

            if (e.ctrlKey || noconfirm) p.yes.click();
        });

        this.v.on('click', _ => this.toggleVideo());
        this.v.on('play pause', e => this.toggleVideo(e.type == 'play'));
        this.v.on('dblclick', _ => this.toggleFullScreen());
        this.v.on('canplay', e => this.onVidCanPlay(e));
        this.v.on('timeupdate', e => this.onVidTimeupdate(e));
        this.v.on('progress', _ => this.onVidProgress());
        this.v.on('volumechange', _ => this.onVolumeChange());
        this.v.on('error', _ => this.onVidError());
        this.v.on('waiting',
            e => this.container.addClass('loading') &&
                this.icons.loadingImg.css('filter', 'grayscale(1)') &&
                (this.totalBuffered = this.buffered) &&
                this.au[0].pause()
        );
        this.v.on('loadstart',
            async _ => {
                if (this.m3u8) {
                    const src = await Player.prepareM3u8(this.v[0].src);
                    if (src) {
                        this.v.attr('src', src);
                        this.hls = this.hls || new Hls({
                            loader: new p2pml.hlsjs.Engine({ segments: { swarmId: src } }).createLoaderClass(),
                            liveSyncDurationCount: 7
                        });
                        this.hls.loadSource(this.v[0].src);
                        this.hls.attachMedia(this.v[0]);
                        clearInterval(this.hlsIntvl);
                        this.hlsIntvl = setInterval(_ => this.hls && this.hls.startLoad(), 1e4);
                    }
                }
                this.buttons.download.removeClass('disabled');
            });



        if (this.qContainer) this.qContainer.children('a').on('click', e => this.changeServer(e));
        if (this.remover) this.remover.on('click', e => this.removePlayer(1, e.currentTarget.id));

        if (settings.shortcuts) $(document).on('keydown', e => this.setShortcuts(e));
        if (settings.autoplay) this.v.attr('autoplay', '');
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
    idle(toggler = 1) { this.container[toggler ? 'addClass' : 'removeClass']('idle') };

    /** Handle mouse moving over the document
     * @param {JQuery.MouseEventBase} e Mouse move event
     */
    onmousemove(e) {
        if (e.which != 1) return;
        if (this.isDraggingPointer) {
            const x = (e.clientX - this.bar.offset().left) / this.bar.width();
            this.navigateTo(x * this.v[0].duration);
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
        let time = this.v[0].duration * pos / this.bar.width();
        time = Math.max(0, Math.min(time, this.v[0].duration));
        this.timgTime.time.html(Assets.formatSecs(time));
        pos *= 95 / this.bar.width();
        const halfW = this.timgTime.outerWidth() / 2;
        pos = Math.min(Math.max(pos, 0), 95);
        const calc = extrm => extrm ? `${halfW}px` : `calc(95% - ${halfW}px)`;
        this.timgTime.css({
            opacity: 1,
            'margin-left': `max(min(${calc(false)}, ${pos}%), ${calc(true)})`
        });
        if (this.thumbnail) {
            const newCanvas = this.thumbnail.retrieve(time) || this.timgTime.thumbnail[0];
            this.timgTime.thumbnail.replaceWith(newCanvas);
            this.timgTime.thumbnail = $(newCanvas);
        }
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
            this.toolbarContainer.is(e.currentTarget) || this.bar.is(e.currentTarget) ?
                Player.LONG_TIMEOUT : Player.SHORT_TIMEOUT
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
        switch (e.code || e.originalEvent.code) {
            case Player.SHORTCUTS.PLAY_PAUSE: this.buttons.mediaControl.click(); break;
            case Player.SHORTCUTS.FULLSCREEN: this.buttons.screen.click(); break;
            case Player.SHORTCUTS.NEXT_EP: this.buttons.next.click(); break;
            case Player.SHORTCUTS.PREV_EP: this.buttons.prev.click(); break;
            case Player.SHORTCUTS.DOWNLOAD: this.buttons.download.click(); break;
            case Player.SHORTCUTS.THEATER: top.postMessage({ request: 'theater' }, '*'); break;
            case Player.SHORTCUTS.LIGHT: top.postMessage({ request: 'light' }, '*'); break;
            case Player.SHORTCUTS.SKIP:
                this.buttons[e.shiftKey ? 'skipBackward' : 'skipForward'].click(); break;
            case Player.SHORTCUTS.FORWARD:
                this.v[0].currentTime += Player.FORWARD_BACKWARD_TIMESPAN;
                this.displayIcon(this.icons.forward);
                break;
            case Player.SHORTCUTS.BACKWARD:
                this.v[0].currentTime -= Player.FORWARD_BACKWARD_TIMESPAN;
                this.displayIcon(this.icons.backward);
                break;
            case Player.SHORTCUTS.VOLUME_UP:
                try { this.v[0].volume += Player.VOLUME_SPAN; } catch (e) { }
                // this.displayIcon(this.icons.forward);
                break;
            case Player.SHORTCUTS.VOLUME_DOWN:
                try { this.v[0].volume -= Player.VOLUME_SPAN; } catch (e) { }
                // this.displayIcon(this.icons.forward);
                break;
            case Player.SHORTCUTS.abortPreload: /* To implement (deprecated ??) */ break;
        }
    }




    /** Play or pause video
     * @param {boolean} action Plays on true, pauses on false and toggle if undefined
     */
    async toggleVideo(action) {
        if (!this.enabled || this.v[0].toggling) return;
        if (this.firstTime) {
            this.pinned = false;
            this.firstTime = false;
        }
        action = typeof action == 'undefined' ? this.v[0].paused : action;
        this.v[0].toggling = 1;
        if (action) {
            await this.v[0].play();
            if (this.au[0].currentSrc) await this.au[0].play();
            this.displayIcon(this.icons.play);
            this.buttons.mediaControl.removeClass('fa-play');
        } else {
            this.v[0].pause();
            if (this.au[0].currentSrc) this.au[0].pause();
            this.displayIcon(this.icons.pause);
            this.buttons.mediaControl.addClass('fa-play');
        }
        this.v[0].toggling = 0;
    }

    /** Display time formatted as XX:XX(current time) / XX:XX(duration)
     * @param {number} time Time to display
     * @param {boolean} change Whether to change the video currentTime to the given one
     */
    navigateTo(time, change = false) {
        if (typeof time == 'undefined') time = this.v[0].currentTime;
        if (change) return this.au[0].currentTime = this.v[0].currentTime = time;

        time = Math.min(time, this.v[0].duration);
        time = Math.max(time, 0);
        let l = this.bar.width() * time / this.v[0].duration;
        this.filler.width(l);
        l *= 95 / this.bar.width();
        this.pointer.css('margin-left', l + '%');
        const text = `${Assets.formatSecs(time)} / ${Assets.formatSecs(this.v[0].duration)}`;
        if (this.time.text() != text)
            this.time.text(text);
    }

    /** Download video using its source if available */
    downloadVideo() {
        if (!this.v[0].currentSrc) return alert('No video found!');
        if (this.m3u8) return Assets.toast('Downloading is not available yet for this type of files');
        $('<a/>', { href: this.v[0].currentSrc, download: document.title, target: '_blank' })[0].click();
    }

    /** Put video on or off fullscreen mode */
    toggleFullScreen() {
        const d = document.fullscreenElement;

        if (!this.container.is(':visible'))
            if (d) document.exitFullscreen();
            else this.v[0].requestFullscreen();

        this.buttons.screen[d ? 'addClass' : 'removeClass']('fa-expand');
        if (d) document.exitFullscreen();
        else this.container[0].requestFullscreen();

    }

    /** Start/Stop recording a clip from the current video stream */
    async toggleClipRecording() {
        if (this.enabled)
            if (!this.recorder.recording) {
                this.recorder.record();
                this.shooting.sizeLogger.show().text('0B');
                this.recorder.onsizeupdate =
                    size => this.shooting.sizeLogger.text(convertSize(size + 'B', undefined, 2));

                this.container.addClass('border border-danger');
                this.buttons.record.addClass('text-danger');
            } else {
                this.container.removeClass('border border-danger');
                this.buttons.record.removeClass('text-danger');
                this.shooting.sizeLogger.hide();
                this.shooting.download[0].download = Player.SHOW_DATA.title.trim();
                this.shooting.showResults(await this.recorder.stop(), true);

            }
    }

    /** Handle canplay event on video: Enables player controls and get it ready to control */
    async onVidCanPlay() {
        let len = this.v[0].buffered.length;
        let total = 0;
        while (len--) total += this.v[0].buffered.end(len) - this.v[0].buffered.start(len);
        this.enabled = true;
        this.volumeBar.prop('disabled', false).val(this.v[0].volume * 100);
        if (!this.v[0].paused && this.au[0].currentSrc) this.au[0].play();
        if (!this.v[0].currentTime)
            this.navigateTo();
        if (settings.notifyLastTime && Player.TIMES && !this.notified)
            for (const k in Player.TIMES)
                if (typeof Player.TIMES[k].leftAt == 'undefined') delete Player.TIMES[k];
                else if (k == Player.KEY) {
                    const onyes = e => {
                        this.pinned = false;
                        this.v[0].currentTime = Player.TIMES[k].leftAt;
                        delete Player.TIMES[k];
                        if (top == self)
                            LocalStorage.set('lastTimeLeftAt', Player.TIMES, false);
                        else
                            top.postMessage({ request: 'removeTime', time: k }, '*');
                    };
                    const onno = e => {
                        this.pinned = false;
                        delete Player.TIMES[k];
                        if (top == self)
                            LocalStorage.set('lastTimeLeftAt', Player.TIMES, false);
                        else
                            top.postMessage({ request: 'removeTime', time: k }, '*');
                    };
                    const p = await new Prompt(onyes, onno, this.container).load();
                    this.pinned = true;
                    p.bigTitle.html(`Do you want to continue from where you left of ?`);
                    p.subTitle.html(`You previously left this video at ${Assets.formatSecs(Player.TIMES[k].leftAt)}`);
                    p.show();
                    break;
                }

        this.notified = true;
    }

    /** Handle timeupdate event on video: Display updated time and its buffer */
    async onVidTimeupdate() {
        if (!this.v[0].duration) this.enabled = false;
        if (!this.isDraggingPointer) this.navigateTo();
        if (Math.abs(this.au[0].currentTime - this.v[0].currentTime) > .3 && this.au[0].duration)
            this.au[0].play() && (this.au[0].currentTime = this.v[0].currentTime);
        if (this.v[0].currentTime > this.v[0].duration - Player.TRIGGER_TIMESPAN) {
            if (settings.markAsSeen) {
                parent.postMessage({ request: "finished" }, '*');
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
        }
    }

    /** Handle volume being changed */
    onVolumeChange() {
        const value = this.v[0].muted ? 0 : this.v[0].volume * 100;
        if (value > 0) this.v[0].muted = false;
        if (this.v[0].muted) value = 0;
        this.volumeBar.val(value);
        let cls = "fa-volume-mute";
        if (!this.v[0].muted)
            cls = 'fa-volume' + (this.v[0].volume > .3 ? (this.v[0].volume > .6 ? '-up' : '') : '-down');
        this.buttons.volumeLvl.removeClass("fa-volume-up volume fa-volume-down fa-volume-mute").addClass(cls);
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
            const mLeft = (s / this.v[0].duration) * 95;
            const length = ((e - s) / this.v[0].duration) * 95;
            this.buffer[s].css("margin-left", mLeft.toFixed(2) + "%");
            this.buffer[s].css("width", length.toFixed(2) + "%");

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
        if (![this.v[0].NETWORK_IDLE, this.v[0].NETWORK_LOADING].includes(this.v[0].networkState)) {
            this.enabled = false;
            if (this.au[0].currentSrc)
                this.au[0].pause();
        }
    }

    /** Correctly set chunks' by redirecting to the actually urls
     * @param {string} url Url of the m3u8 file
     * @returns {Promise<string>} Blob object as url
     */
    static async prepareM3u8(url) {
        if (url.includes('master.m3u8')) return url;
        if (!url.includes('GetM3U8')) return;
        let m3u8 = await req(url);
        const domains = (await Chrome.get('m3u8_domains')) || ['http%3A%2F%2Frv22pak.xyz%2F'];
        // if (!m3u8.includes('urlRe='))
        //     m3u8.split(/[\n\r]/g)
        //         .forEach(
        //             v => /https(.*?)/g.test(v) &&
        //                 (m3u8 = m3u8.replace(
        //                     v,
        //                     'https://api.replay.watch/Child/Redir2?identity=default&urlRe=' + encodeURIComponent(v)
        //                 ))
        //         );

        return URL.createObjectURL(new Blob([m3u8]));
    }


    /** Start loading snapshots of the video to preview seeked time */
    loadThumbnails() {
        if (this.thumbnail) this.thumbnail.destroy();
        this.thumbnail = new Thumbnail(this.seekPreviewAvailable && this.v[0].src);
    }


    /** Remove / Disable Slickiss custom video
     * @param {boolean} alert Whether it is called from the user or programatically
     * @param {'remove'|'disable'} cmd `remove` to use html5 player, `disable` to use server's player
     */
    async removePlayer(alert = 1, cmd = 'remove') {
        this.settings.hide();
        const EVENTS = 'click play pause dblclick canplay timeupdate progress volumechange waiting error';
        if (alert) {
            this.pinned = true;
            const yes = async e => {
                p.destroyable = false;
                p.bigTitle.html('Alright!');
                p.subTitle.add(p.yes.parent()).hide();
                if (cmd == 'disable') {
                    await Chrome.set({ [`servers.${DlGrabber.getServerName(location.href)}`]: false });
                    location.reload();
                    return;
                }
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
            const no = _ => this.pinned = false;
            const p = await new Prompt(yes, no, this.container).load();
            if (cmd == 'disable') {
                const s = DlGrabber.getServerName(location.href).toUpperCase();
                p.bigTitle.html('Disable Slickiss player');
                p.subTitle.html(`This action will switch to ${s}'s player.<br>
                You can always use Slickiss player again in the settings`);
            }
            p.show();
        } else $("body").empty().append(this.v.off(EVENTS).attr({ controls: '' }));
    }


    /** Deploy player on the current document
     * @param {string} [data] Data of the video if available
     */
    static async deploy(data) {
        settings = await Chrome.get();
        if (top != self)
            await new Promise(r => {
                setTimeout(r, 3e3);
                const token = md5(Math.random().toString());
                top.postMessage({ request: 'data', token: token }, '*');
                const list = MessageManager.attachListener(
                    e => {
                        if (e.data.token == token) {
                            this.SHOW_DATA = e.data.showData;
                            this.KEY = e.data.key;
                            this.OPACITY = e.data.light;
                            this.TIMES = e.data.times;
                            this.HAS_NEXT = e.data.hasNext;
                            this.HAS_PREV = e.data.hasPrev;
                            MessageManager.removeListener(list)
                            r();
                        }
                    }
                );
            });
        let url = location.href;
        if (location.protocol == "chrome-extension:") {
            url = decodeURIComponent(location.hash.slice(1));
            const player = new Player();
            await player.init();
            player.m3u8 = true;
            $('body').css('margin', 0).append(player.container);
            $('html').attr('overflow', 'hidden');
            player.v[0].src = url;
            try {
                const quals = new QualityManager(JSON.parse(url), settings.quality || '720p');
                player.setQualities(quals);
                player.v[0].src = quals.preferredQ.file;
                quals.data.audio && (player.au[0].src = quals.data.audio);
            } catch (e) { console.error(e) }
            $('input').val(Number(Player.OPACITY) * 100);
            return player;
        }
        const sName = DlGrabber.getServerName(url);
        if (!sName.includes('beta') && !settings[`servers.${sName}`]) {
            localStorage.slickiss_ignore = (localStorage.slickiss_ignore || '') + location.host + '|';
            location.reload();
            return;
        }
        const player = new Player();
        await player.init();
        if (!$('body').length)
            document.documentElement.innerHTML = '<body></body>';

        $('body').css('margin', 0).append(player.container);
        $('input').val(Number(Player.OPACITY) * 100);
        $('html').attr('overflow', 'hidden');
        if (!(sName in DlGrabber.handlers))
            return Assets.toast('Whoops! Server not supported by Slickiss. Try switching to kissanime version in Settings > Appearance', 5e3) && player;
        const r = data || await DlGrabber.handlers.auto(url);
        if (!r.success) return Assets.toast('No video found') && player;
        player.seekPreviewAvailable = !Player.THUMBNAIL_PREVIEW_BLACKLIST.includes(r.server);
        if (!player.seekPreviewAvailable) Assets.toast('Seeking preview not available on this server');
        if (r.response && /GetM3U8/.test(r.response.toString())) {
            player.m3u8 = true;
            // Assets.toast('Reloading once more..');
            // const urls = r.additional && r.additional.qualities ?
            //     JSON.stringify(r.additional.qualities) : r.response;
            // return location.href = chrome.extension.getURL('/html/m3u8.html') + '#' + urls;
        }
        r.additional && r.additional.crossorigin ?
            player.v[0].crossorigin = 'anonymous' : player.v.removeAttr('crossorigin');

        if (!player.v[0].crossorigin)
            player.buttons.screenshot.add(player.buttons.record).remove();

        if (sName == 'streamhls') player.m3u8 = true;

        player.v[0].src = r.response;
        try {
            if (r.additional) {
                player.v[0].poster = r.additional.poster || '';
                if (r.additional.qualities) {
                    const quals = new QualityManager(r.additional.qualities, settings.quality || '720p');
                    player.setQualities(quals);
                    player.v[0].src = quals.preferredQ.file;
                    quals.data.audio && (player.au[0].src = quals.data.audio);
                }
            }
        } catch (e) { console.error(e) }

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

    /** A key for storing time the video left off at
     * @type {number}
     **/
    static KEY = md5(location.href);

    /** Dim level of turned off lights
     * @type {string|number}
     **/
    static OPACITY = ".9";

    /** Data of the playing show */
    static SHOW_DATA;

    /** Whether the current episode has a previous episode
     * @type {boolean}
     **/
    static HAS_PREV = false;

    /** Whether the current episode has a next episode
     * @type {boolean}
     **/
    static HAS_NEXT = false;

    /** Last video times left off
     * @type {number}
     **/
    static TIMES = LocalStorage.get('lastTimeLeftAt') || {};

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


    /** Whether the server requires manual chunks loader
    * @type {boolean}
    **/
    m3u8;

}

/** Shortcuts definitions to control media using keyboard **/
Player.SHORTCUTS = {
    PLAY_PAUSE: "Space",
    FULLSCREEN: "KeyF",
    NEXT_EP: "KeyN",
    PREV_EP: "KeyP",
    SKIP: "KeyS",
    DOWNLOAD: "KeyD",
    VOLUME_UP: "ArrowUp",
    VOLUME_DOWN: "ArrowDown",
    BACKWARD: "ArrowLeft",
    FORWARD: "ArrowRight",
    THEATER: 'KeyT',
    LIGHT: 'KeyL'
};