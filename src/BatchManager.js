/** Manager for batches interface */
class BatchManager {

    /** Load batch queue and initialize elements */
    static async init() {

        const tipStyle = {
            text: 'A',
            css: {
                top: '120%', left: '50%',
                position: 'absolute', transform: 'translateX(-50%)',
                'font-family': '"Nunito", sans-serif', 'font-size': '1rem', 'font-weight': 'bolder'
            }
        };
        $('header i').addClass('position-relative')
            .each(
                (_i, el) => (tipStyle.text = el.title[0]) && $(el).append($('<span>', tipStyle))
            );
        sleep(1e3).then(() => $('header i>span, .help').fadeOut() && $('.fa-info-circle').fadeIn());

        $('.fa-info-circle').on(
            'mouseenter mouseleave', e => $('header i>span,.help')[e.type == 'mouseenter' ? 'show' : 'hide']()
        );

        chrome.storage.sync.onChanged.addListener(async v => {
            if (v.batchQueue &&
                (
                    !v.batchQueue.oldValue ||
                    Object.keys(v.batchQueue.oldValue).length < Object.keys(v.batchQueue.newValue).length
                )
            )
                for (const url in await Chrome.get('batchQueue'))
                    if (!(md5(url) in this.data)) {
                        this.createCard(url, v.batchQueue.newValue[url].date);
                        this.queue[url] = v.batchQueue.newValue[url];
                    }
        });
        this.data = this.data || {};
        this.card = this.card || $('.card.sample').remove().removeClass('sample');
        this.cardContainer = this.cardContainer || $('.anime');
        this.listings = this.listings || $('.listings');
        this.downloadBtn = this.downloadBtn || $('i.fa-download');
        this.queue = await Chrome.get('batchQueue');
        if (typeof this.queue == 'undefined')
            (this.queue = {}) && await Chrome.set({ batchQueue: {} });

        for (const url in this.queue) this.createCard(url, this.queue[url].date);
        this.downloadBtn.on('click', () => {
            if (this.isDownloading)
                return Assets.toast('Please wait until the current process finishes!');

            this.isDownloading = true;
            let c = 0;
            const board = new EpisodeListing();
            board.setHandlers();
            for (const k in this.data) {
                const mgr = this.data[k].listingMgr;
                const cbs = mgr.getCheckboxes;
                const updater = this.data[k].numVid;
                const temp = updater.text();
                if (!cbs.filter(':checked').length) continue;
                c++;
                const s = `# / ${cbs.filter(':checked').length.toString().padStart(2, 0)}`;
                let i = 0;
                this.data[k].numVid.text(s.replace('#', '00'));
                cbs.add(mgr.selectAll).prop('disabled', true);
                mgr.grabDownloads({
                    [DlGrabber.progress.DONE]: () => {
                        updater.text(s.replace('#', (++i).toString().padStart(2, 0)));
                    },
                    [DlGrabber.progress.ERROR]: () => {
                        updater.text(s.replace('#', (++i).toString().padStart(2, 0)));
                    }
                }, EpisodeListing.DEFAULT_MAX_ITEMS / Object.keys(this.data).length).then(async () => {
                    cbs.add(mgr.selectAll).prop('disabled', false);
                    updater.text('Grab complete!');
                    await sleep(1e3);
                    updater.fadeOut(500, () => updater.text(temp).fadeIn());
                    board.downloads = { ...board.downloads, ...mgr.downloads };
                    board.servers = board.servers ? mgr.servers.concat(board.servers) : mgr.servers;
                    board.episodes = board.episodes ? mgr.episodes.concat(board.episodes) : mgr.episodes;
                    board.servers = board.servers && board.servers.reverse();
                    if (!--c) {
                        $('i.show-list').off('click').on('click', e => board.showDownloads()).click();
                        this.isDownloading = false;
                    }
                });

            }
        });
        $('i.add').on('click', e => {
            const msg = Assets.msgArea();
            $('body').prepend(msg)
            msg.append($('<iframe/>', { class: 'h-75 w-75 m-5', src: '/' }))
                .append($('<div/>', {
                    class: 'position-absolute p-5 w-100 text-center h4 text-light',
                    text: `Hold shift key and click any Anime link and it should be added. 
                            You can also add from other tabs`,
                    css: { bottom: 0, 'z-index': 4 }
                }))
                .show();
        });

        $('i.done').on('click', e => {
            if (!$('.card').length) return;
            $('.card:not(.selected)').trigger(new $.Event('click', { ctrlKey: true }));
            $('i.remove-selected').click();
        });

        $('i.check-all').on('click', e => {
            const el = $(e.currentTarget);
            for (const k in this.data)
                this.data[k].listingMgr
                    .selectAll[el.hasClass('fa-circle') ? 'not' : 'filter'](':checked').click();

            el.toggleClass('fa-circle');
        });
        $('i.check-visible').on('click', e => {
            $('.listing input:visible').length == $('.listing input:visible:checked').length ?
                $('.listing input:visible').click()
                :
                $('.listing input:visible:not(:checked)').click();

            $('i.check-all')[$('.listing input:not(:checked)').length ? 'addClass' : 'removeClass']('fa-circle');
        });
        $('i.remove-selected').on('click', async e => {
            const selected = $('.card.selected').length;
            if (!selected) return Assets.toast('No selected item(s)');
            const p = await new Prompt(
                async () => $('.card.selected')
                    .data('noPrompt', true)
                    .find('i.remove')
                    .click()
            ).load();
            p.bigTitle.text(`Do you want to remove ${selected == $('.card').length ? 'All' : 'selected'} items ?`);
            p.subTitle.text(selected == $('.card').length ? '' : selected + 'items');
            p.show();
        });
    }

    /** Generate a card of anime and fetch for all its data
     * @param {string} url  URL of the anime
     * @param {string} date Date of anime addition
     */
    static createCard(url, date = 'unknown') {
        const hash = md5(url);
        if (hash in this.data) return this.data[hash];
        const card = this.card.clone().attr('id', hash);
        if (!document.hasFocus()) card.addClass('new');
        this.cardContainer.prepend(card);
        Anime.getAnimeData(url).then(data => {
            Bookmark.getAnimeBookmarkInfo(url).then(d => d.bookmarked && card.find('.fa-bookmark').show());
            const d = this.data[hash];
            if (data instanceof Error || !data) {
                d.title.text('Failed !').addClass('text-danger');
                d.numVid
                    .html('This can be caused by Internet/Kissanime<br>service unavailability.<br>' + data);
                return;
            }
            const items = Math.max(0, data.listing.find('tr').length - 2);
            d.title.text(data.name).attr('title', data.name);
            d.avatar.attr('src', data.cover);
            data.finalList = items ? data.listing : $('<div/>', { class: 'mb-4' }).append(
                $('<code/>', { class: 'text-warning', text: 'No items for ' + data.name })
            );
            d.listingMgr = new EpisodeListing(data.listing).addControls();
            data.listing.find('th').text('');
            d.listingMgr.getter.remove();
            $('a.batch-info, .listings > div').remove();
            d.list = items ? data.listing.add(data.listing.prev()) : data.finalList;
            d.list.hide();
            d.numVid.text(`${items} Items`);
            const def = d.numVid.text();
            d.numVid.data('default', def);

            if (items) d.listingMgr.getCheckboxes.add(d.listingMgr.selectAll).on('change', () => {
                let checked = d.listingMgr.getCheckboxes.filter(':checked').length;
                checked = d.listingMgr.selectAll.is(':checked') ? 'All' : checked;
                d.numVid.text(checked ? `${def} - ${checked} Selected` : d.numVid.data('default'))
            });

            for (const k in this.data) this.listings.prepend(this.data[k].list);
        });
        card.on('click', e => {

            const d = this.data[hash];
            if (!e.ctrlKey) {
                $('.card.selected').removeClass('selected');
                $('.listings>*').hide();
            }
            card[card.hasClass('selected') ? 'removeClass' : 'addClass']('selected');
            d.list[card.hasClass('selected') ? 'show' : 'hide']();
        });
        card.find('i.remove').on('click', async () => {
            const d = this.data[hash];
            const p = await new Prompt(async () => {
                delete this.queue[url];
                await Chrome.set({ batchQueue: this.queue });
                d.list.remove();
                d.card.remove();
                delete this.data[hash];
            }).load();
            p.bigTitle.text(d.title.text());
            p.subTitle.text('Do you want to remove this item ?');
            card.data('noPrompt') ? p.yes.click() : p.show();
        });
        card.find('i.open').on('click', () => window.open(url));
        return this.data[hash] = {
            url: url,
            card: card,
            title: card.find('.name').text(url.replace(/.+\/Anime\//g, '')),
            date: card.find('.date').text(date),
            avatar: card.find('.avatar-img'),
            numVid: card.find('.sub')
        };
    }



    /** Whether a download process is on going
     * @type {boolean}
     */
    static get isDownloading() { return Boolean(this.d) };
    static set isDownloading(b) {
        this.d = b;
        $('i.fa-download')[b ? 'addClass' : 'removeClass']('text-muted');
        $('i.fa-download').css('cursor', b ? 'initial' : '');
    };


    /** Container for all anime cards
     * @type {JQuery<HTMLDivElement>}
     */
    static cardContainer;

    /** Container for all anime listings of episodes
     * @type {JQuery<HTMLDivElement>}
     */
    static listings;

    /** Sample card for anime display
     * @type {JQuery<HTMLDivElement>}
     */
    static card;

    /** A trigger to start the proccess when it's clicked
     * @type {JQuery<HTMLEelement>}
     */
    static downloadBtn;

    /** Wishlist of anime
     * @type {{url:string; date:string;}[]}}
     */
    static queue;

    /** Summary of all anime data and corresponding elements
     * @type {{
            url: string;
            card: JQuery<HTMLDivElement>;
            title: JQuery<HTMLDivElement>;
            date: JQuery<HTMLDivElement>;
            avatar: JQuery<HTMLImageElement>;
            numVid: JQuery<HTMLDivElement>;
            listingMgr: EpisodeListing;
            list: JQuery<HTMLTableElement>;
        }[]}
     */
    static data;
}

window.stop();

(async () => {
    document.documentElement.innerHTML = await Assets.loadAssetFromFile('/batch.html');
    BatchManager.init();
})();


$(document).on('keydown', e => {
    if ($(':focus').length) return;
    if (e.ctrlKey && e.originalEvent.code == 'KeyQ') {
        e.preventDefault();
        $('.card:not(.selected)').trigger(new $.Event('click', { ctrlKey: true }));
        return;
    }
    $(`header i[title^=${e.key.toUpperCase()}]`).click();
});
window.onfocus = async e => {
    await sleep(2000);
    $('.new.card').removeClass('new');
};