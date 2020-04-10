/** Manager for batches interface */
class BatchManager {

    /** Load batch queue and initialize elements */
    static async init() {
        chrome.storage.sync.onChanged.addListener(async v => {
            if (v.batchQueue && Object.keys(v.batchQueue.oldValue).length < Object.keys(v.batchQueue.newValue).length)
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
        if (!this.queue) return;
        for (const url in this.queue) this.createCard(url, this.queue[url].date);
        this.downloadBtn.on('click', () => {
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
                    }
                }, EpisodeListing.DEFAULT_MAX_ITEMS / Object.keys(this.data).length).then(async () => {
                    cbs.add(mgr.selectAll).prop('disabled', false);
                    updater.text('Grab complete!');
                    await sleep(1e3);
                    updater.fadeOut(500, () => updater.text(temp).fadeIn());
                    board.downloads = { ...board.downloads, ...mgr.downloads };
                    board.servers = board.servers ? mgr.servers.concat(board.servers) : mgr.servers;
                    board.episodes = board.episodes ? mgr.episodes.concat(board.episodes) : mgr.episodes;
                    if (!--c) board.showDownloads();
                });

            }
        });
        $('i.check-all').on('click', e => {
            const el = $(e.currentTarget);
            for (const k in this.data)
                this.data[k].listingMgr
                    .selectAll[el.hasClass('fa-circle') ? 'not' : 'filter'](':checked').click();

            el.toggleClass('fa-circle');
        });
        $('i.remove-selected').on('click', async e => {
            if (!$('.card.selected').length) return Assets.toast('No selected item(s)');
            const p = await new Prompt(
                async () => $('.card.selected')
                    .data('noPrompt', true)
                    .find('i.remove')
                    .click()
            ).load();
            p.bigTitle.text('Do you want to remove selected items ?');
            p.subTitle.text(`${$('.card.selected').length} items`);
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
    if (e.ctrlKey && e.originalEvent.code == 'KeyQ' && !$(':focus').length) {
        e.preventDefault();
        $('.card:not(.selected)').trigger(new $.Event('click', { ctrlKey: true }));
    }
});
window.onfocus = async e => {
    await sleep(2000);
    $('.new.card').removeClass('new');
};