class EpisodeListing {
    constructor(listing, process = true) {
        this.listing = listing;
        Chrome.get('lastVisit', 'local').then(lastVisit => {
            if (!this.listing.find('a').length || !lastVisit) return;
            const visits = lastVisit[S.parseUrl(this.listing.find('a')[0].href).name];
            if (visits)
                this.listing.find('a').each(
                    (_, el) => {
                        const info = S.parseUrl(el.href);
                        if (info.id in visits) {
                            const INVISIBLE = '⁣';
                            const time = (new Date(visits[info.id])).toTimeString().slice(0, 5);
                            $(el).css('text-decoration', 'underline');
                            el.title = `Watched ${getDisplayDate(new Date())} at ${time}`;
                        }
                    }
                );
        });
        if (!process) return;
        this.episodes = []
        this.selectAll = $('<input/>', { type: 'checkbox' });
        this.aborter = $('<a/>', { href: '#', text: 'Stop' });
        this.getter = $('<a/>', { href: '#', text: 'Get all download links' });
        this.halfwayGetter = $('<a/>', { href: '#', text: 'Get grabbed links' });

        this.container = $("<div/>", { css: { width: '85%', height: '80%', margin: '0 auto' } });
        this.serverOrder = $('<input/>', { type: 'text', css: { 'margin-left': '25px' } });
        this.header = Assets.infoAnchor('idman-command')
            .css('padding-bottom', '10px')
            .addClass('bigChar')
            .text('IDMan Command Line (Recommended)');
        this.command = $('<textarea/>', { css: { 'min-height': '10%', width: '100%', 'margin-top': '10px' } });
        this.copyBtn = $("<button/>", { css: { width: '15%' }, text: 'Copy Command' });
        this.confirmCopy = $('<div/>', { text: 'Command copied to the clipboard' });
        this.confirmCopy.css({ transition: 'opacity .5s ease', opacity: 0 });
        this.incTitle = $('<input/>', { type: 'checkbox', checked: '' });
        this.urlsArea = $('<textarea/>', { css: { height: '60%', width: '100%', 'margin': '10px 10px 0 0' } });
        this.serverIDs = Assets.table([
            { tag: 'tr', data: [] }, {
                tag: 'tr', data: [{
                    tag: 'td',
                    option: { text: 'Choose servers order' },
                    contents: [this.serverOrder]
                }]
            }
        ]).css({ 'margin-bottom': '10px', border: 'solid', 'font-size': '1.3em' });
        this.container.append([
            this.serverIDs, this.header, this.command, this.copyBtn, this.urlsArea, this.confirmCopy,
            this.incTitle, $('<span/>', { text: 'Titles', class: 'text-light' }), this.urlsArea
        ]);

        this.panel = $("<div/>", {
            css: {
                padding: "10px",
                border: "1px solid red",
                display: "none",
                overflow: "auto",
                height: "150px",
            }
        });
        this.loadingBar = $('<div/>', {
            css: { height: '25px', width: '.1%', 'background': 'white' }
        });
        this.pagination = $('<input/>', {
            type: 'text',
            placeholder: 'Printing syntax e.g. 1-2,4 etc..',
            css: {
                width: '165px', padding: '3px', border: '1px solid #666666', color: '#ccc',
                background: '#393939 url(../images/tpl_input_bg.gif) no-repeat top left'
            }
        });
    }

    addControls() {
        this.listing.before(Assets.infoAnchor().add(this.panel)); // help + grabbing updates
        this.listing.before(this.headerContainer = Assets.table([ // header tables
            {
                tag: 'tr',
                option: { id: 'selection' },
                data: [{ tag: 'td', option: { width: '82%' } }, { tag: 'td' }],
            }, {
                tag: 'tr',
                option: { id: 'loader' },
                data: [
                    { tag: 'td', option: { width: '80%', css: { border: 'solid 1px white' } } },
                    { tag: 'td' }
                ]
            }
        ]));
        this.listing.find('th').eq(1).width('10%');
        let th = this.listing.find('th').eq(0).width('50%');
        th.after($('<th/>', { width: '25%', text: 'Status' })); // column for progress
        th.before($('<th/>', { width: '3%', text: '#' })); // column for identifiers
        this.selection = this.headerContainer.find('#selection').removeAttr('id');
        this.selection.find('td').eq(0).append(this.elements.SELECTION); // episodes selection inputs / instructions
        this.selection.find('td').eq(1).append(this.getter);
        this.loader = this.headerContainer.find('#loader').removeAttr('id').hide();
        this.loader.find('td').each((i, el) => $(el).append([ // loading progress init
            this.loadingBar, [this.halfwayGetter, '<br>', this.aborter]
        ][i]));
        let checkbox = $('<input/>', { type: 'checkbox' });
        let anchors = this.listing.find('td > a[href*="/Anime/"]');
        anchors.each((i, el) => {
            let progress;
            $(el).wrap($('<div/>', { css: { overflow: 'hidden', 'max-width': 'unset' } }));
            $(el).before(checkbox.clone());
            $(el).parent().parent()
                .before($('<td/>').append($('<code/>', { text: (anchors.length - i).pad(0, 3) })))
                .after(progress = $('<td/>'));
            this.episodes.push({
                title: $(el).text().trim(),
                container: $(el).parent(),
                checkbox: $(el).prev(),
                anchor: el,
                progress: progress
            });
        });
        this.episodes = this.episodes.reverse();
        this.getCheckboxes;
        this.setHandlers();
        return this;
    }


    setHandlers() {
        $(document).on('keydown', e => (e.key == 'Escape' && this.msgArea && this.msgArea.fadeOut()) || 1);
        this.selectAll.on('change', e => this.check($(e.target).is(":checked")));
        this.serverOrder.on('input', e => this.serverOrder.val(this.serverOrder.val().replace(/[^0-9,]/g, '')));
        this.getCheckboxes.on('change', e => this.selectAll.prop('checked', this.getCheckboxes.not(':checked').length == 0));
        this.copyBtn.on('click', e => {
            if (this.copyBtn.hasClass('copied')) return;
            this.command[0].select();
            document.execCommand('copy');
            this.confirmCopy.css('opacity', 1);
            setTimeout(() => this.confirmCopy.css('opacity', 0), 2 * 1000);
        });
        this.serverOrder.add((this.incTitle)).on('click input', e => {
            this.urlsArea.val('');
            this.command.val('');
            if (!this.serverOrder.val()) return;
            let command = "if exist \"c:\\progra~1\\internet download manager\" (cd \"c:\\progra~1\\internet download manager\") else if exist \"c:\\progra~2\\internet download manager\" (cd \"c:\\progra~2\\internet download manager\") else set /p id=Idman not found in the defaults paths. Press Enter to exit&exit \n";
            let text = '';
            let failed = '';
            const order = this.serverOrder.val().split(',');
            for (const ep of this.episodes) {
                if (!ep.checkbox[0].checked) continue;
                let check = 0;
                for (const i of order) {
                    const res = this.servers[i] && this.downloads[ep.anchor.href][this.servers[i]];
                    if (res && res.success) {
                        text += `${this.incTitle[0].checked ? ep.title + ': ' : ''}${res.response}\n`;
                        command += `start /w idman /d "${res.response}" /f "${ep.title.filenameFriendlize()}.mp4" /n /a\n`;
                        check = 1;
                        break;
                    }
                }
                if (!check) failed += ep.title + '\n';
            }

            text += failed && `\n\nThe following episodes failed: \n${failed}`;
            this.urlsArea.val(text);
            this.command.val(command + 'idman.exe \nexit \n');
        });
        this.pagination.on('input', e => {
            let value = this.pagination.val();
            value = value.replace(/\s|[^0-9,-]/g, "");
            this.pagination.val(value);
            if (!(/^(\d+(-\d+)?,?)*$/g.test(value)) || value == '') return;

            this.check(false);
            let v = value.split(",");
            for (const q of v) {
                let val = q.split("-"),
                    min = parseInt(val[0]),
                    max = val.length == 2 ? parseInt(val[1]) : min;

                min = Math.min(min, max);
                max = Math.max(min, max);
                this.check(true, min - 1, max);
            }
        });
        this.getter.on('click', async e => {
            e.preventDefault();
            // if (
            //     (navigator.deviceMemory * 100 || 200) < this.getCheckboxes.filter(':checked').length &&
            //     !confirm(`Running on a huge amount of episodes may cause the navigator to crash\nAre you sure you want to proceed ?`)
            // ) return;

            this.loader.show();
            this.selection.hide();
            this.getCheckboxes.prop('disabled', true);
            await this.grabDownloads();
            this.selection.show();
            this.loader.hide();
            this.getCheckboxes.prop('disabled', false);
            this.showDownloads();
        });
    }

    /** Max items to process at once
     * @type {50}
     */
    static get DEFAULT_MAX_ITEMS() { return 100; }

    /** Inspect download links through slickiss method
     * @param {*[]} handlers Optional additional updates handlers
     * @returns {Promise<this>}
     */
    grabDownloads(handlers = [], maxItems = EpisodeListing.DEFAULT_MAX_ITEMS) {
        // (navigator.deviceMemory * 100 || 200)
        if (!(handlers instanceof Array)) handlers = [handlers];
        maxItems = Math.max(1, maxItems);
        this.loadingBar.css('width', '.1%');
        this.downloads = {};
        const jobs = {
            [DlGrabber.progress.RETRIEVE]: (el) => el.text(`0% Solving captcha if necessary`)
                .removeClass('text-info text-success text-danger'),
            [DlGrabber.progress.OPEN]: (el) => {
                el.text(`${rand(5, 30)}% Exploring servers..`)
                    .removeClass('text-info text-success text-danger')
                    .addClass('text-info');
                count += .33;
                this.loadingBar
                    .css('width', (100 * count / this.getCheckboxes.filter(':checked').length) + '%');
            },
            [DlGrabber.progress.RESPONSE]: (el, option) => {
                el.text(`${rand(35, 55)}% ${option.server} was accessed`)
                    .removeClass('text-info text-success text-danger')
                    .addClass('text-info');
            },
            [DlGrabber.progress.DOWNLOAD]: (el) => {
                el.text(`${rand(60, 80)}% Do bot stuff`)
                    .removeClass('text-info text-success text-danger')
                    .addClass('text-info');
                count += .33;
                this.loadingBar
                    .css('width', (100 * count / this.getCheckboxes.filter(':checked').length) + '%');
            },
            [DlGrabber.progress.FINISH]: (el, option) => {
                el.text(`80% ${option.server} ${option.response.success ? 'grabbed' : 'failed to grab'}`)
                    .removeClass('text-info text-success text-danger')
                    .addClass(option.response.success ? 'text-success' : 'text-danger');
            },
            [DlGrabber.progress.DONE]: (el, obj) => {
                el.text(`done!`).removeClass('text-info text-success text-danger')
                    .addClass('text-success');
                count += .34;
                this.loadingBar
                    .css('width', (100 * count / this.getCheckboxes.filter(':checked').length) + '%');
                this.downloads[obj.url] = obj.downloads;
            },
            [DlGrabber.progress.ERROR]: (el) => {
                el.text(`Some browsers won't let the extension solve the captcha. Please use chrome for this to work`)
                    .removeClass('text-info text-success text-danger')
                    .addClass('text-danger');
                count += .64;
                this.loadingBar
                    .css('width', (100 * count / this.getCheckboxes.filter(':checked').length) + '%');
            }
        };
        let i = 0;
        let j = 0;
        let count = 0;
        let c = 0;
        return new Promise(resolve => {
            let f = ep => {
                if (ep.checkbox[0].checked && ++c && $(ep.anchor).addClass('episodeVisited'))
                    grab(
                        ep.anchor.href,
                        (prog, option) => jobs[prog](ep.progress, option) ||
                            handlers.forEach(v => v[prog] && v[prog](ep.progress, option)),
                        true
                    ).then(() => {
                        if (this.episodes.length == ++i) resolve(this);
                        else if (c > maxItems && j < this.episodes.length) f(this.episodes[j++]);
                    });
                else i++;
            };
            for (const ep of this.episodes) {
                if (c > maxItems) {
                    ep.progress.text('pending..');
                    continue;
                }
                j++;
                f(ep);
            }
            if (this.episodes.length == i) resolve(this);
        });

    }

    showDownloads() {
        if (!this.msgArea)
            $('body').prepend(this.msgArea = Assets.msgArea().append(this.container));

        const svs = new Set;
        for (const k in this.downloads) {
            const dls = this.downloads[k];
            for (const k in dls)
                if (dls[k].success) svs.add(k);
        }
        this.servers = [];
        const t = [{ tag: 'tr', data: [] }];
        for (const s of svs) this.servers.push(s);
        for (const i in this.servers)
            t[0].data.push({
                tag: 'td', option: {
                    text: `${i}: ${this.servers[i]}`,
                    css: { 'text-transform': 'capitalize' }
                }
            });

        this.serverIDs.find('tr').eq(0).replaceWith(Assets.table(t).find('tr')[0]);
        this.serverOrder.val(Object.keys(this.servers).join(','))
            .parent().attr('colspan', this.servers.length);

        this.serverIDs.css('font-size', '1.3em').find('td').css('padding', '10px');
        this.serverOrder.click();
        this.msgArea.fadeIn();
        return this;
    }


    get getCheckboxes() {
        if (this.chkBoxCache) return this.chkBoxCache;
        let checkboxes = $();
        for (const item of this.episodes)
            checkboxes = checkboxes.add(item.checkbox);

        return this.chkBoxCache = checkboxes;
    }

    check(checked, from, to) {
        for (const item of this.episodes.slice(from, to))
            item.checkbox.prop('checked', checked);
    }

    get elements() {
        return {
            SELECTION: this.selectAll
                .add($('<span/>', { text: 'Select all  or Type identifiers ' }))
                .add(this.pagination)
                .add($('<span/>', { text: ' (Identifiers aren\'t Episodes Numbers !!)' }))
        }
    }
}