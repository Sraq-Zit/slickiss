class Anime {
    constructor(url, doc, ignoreListing) {
        this.url = url || location.href;
        this.doc = doc || $('html');

        this.ignoreListing = ignoreListing;

        this.title = this.doc.find('a.bigChar[href*=\Anime\]');
        this.doc.find('span[id^=spanBookmark]').remove();
        this.doc.find('#imgLoader').replaceWith(this.bkManager = $('<span/>', {
            class: 'iconStyle bookmarkIcon disabled',
            id: 'bkManager',
            title: 'Click to bookmark'
        }));
        this.title.after(this.bkManager);
        this.bkManager.after(
            this.sManager = this.bkManager.clone().attr('class', 'iconStyle seenIcon disabled')
        );

        if (Slickiss.isContext(this.url, Slickiss.cts.EPISODE)) this.url = Slickiss.parseUrl(this.url).anime;
        this.listing = this.doc.find('#leftside .listing');
        Bookmark.getAnimeBookmarkInfo(this.url).then(info => {
            for (const k in info)
                this[k] = info[k];

            this.init();
        });
    }

    init() {
        this.bkManager.removeClass('disabled');
        if (this.bookmarked) this.playBookmarkAnimation();
        this.updateBookmarkIcons();
        this.bkManager.on('click', async e => {
            if (this.bookmarking) return;
            this.toggleFreezeBookmarking();
            let res = await Bookmark.toggleBookmark(this.url);
            this.toggleFreezeBookmarking();
            if (!res.success) {
                this.updateBookmarkIcons();
                return alert(`Operation failed: ${res.response}`);
            }

            this.watched &= (this.bookmarked = res.bookmarked);
            this.playBookmarkAnimation();
            this.updateBookmarkIcons();
        });
        this.sManager.on('click', async e => {
            if (this.bookmarking || !this.bookmarked) return;
            this.toggleFreezeBookmarking();
            let res = await Bookmark.toggleWatched(this.url);
            this.toggleFreezeBookmarking();
            if (!res.success) {
                this.updateBookmarkIcons();
                return alert(`Operation failed: ${res.response}`);
            }

            this.watched = !this.watched;
            this.playBookmarkAnimation();
            this.updateBookmarkIcons();
        });
        if (!this.ignoreListing) Anime.listing(this.listing);

    }

    playBookmarkAnimation() {
        this.bkManager[this.bookmarked ? 'addClass' : 'removeClass']('bookmarked');
        this.sManager[this.watched ? 'addClass' : 'removeClass']('seen');
    }

    updateBookmarkIcons() {
        this.bkManager.attr('title', this.bookmarked ? 'Click to unbookmark' : 'Click to bookmark');
        if (!this.bookmarked)
            this.sManager.addClass('disabled').attr('title', 'You have to bookmark first');
        else
            this.sManager.removeClass('disabled')
                .attr('title', 'Click to mark ' + (this.watched ? 'unwatched' : 'watched'));
    }

    toggleFreezeBookmarking() {
        this.bookmarking = !this.bookmarking;
        this.bkManager.add(this.sManager)[this.bookmarking ? 'addClass' : 'removeClass']('disabled');
    }

    /** Retrieves anime data from url
     * @param {*} url URL of the requested anime
     * @return {Promise<{
            url: string;
            name: string;
            cover: string;
            listing: JQuery<HTMLTableElement>;
            namings: string[];
            genres: string[];
            aired: string;
            status: string;
            views: string;
            summary: string;
        }>}
     */
    static async getAnimeData(url) {
        if (!Slickiss.isContext(url, Slickiss.cts.ANIME))
            return console.error('Requested URL isn\'t an Anime URL') || null;
        const req = await fetch(url);
        if (req.status == 503) {
            await Captcha.bypassCf();
            return this.getAnimeData();
        }
        const html = await req.text();
        const doc = $(html.noImgs);
        return {
            url: url,
            name: doc.find('.barContent .bigChar').text(),
            cover: doc.find('.rightBox im').attr('src'),
            listing: doc.find('.listing'),
            namings: doc.find('span.info:contains("Other name:") ~ a').toArray().map(el => $(el).text()),
            genres: doc.find('span.info:contains("Genres:") ~ a').toArray().map(el => $(el).text()),
            aired: doc.find('span.info:contains("Date aired:")').parent().text().split(':')[1].trim(),
            status: doc.find('span.info:contains("Status:")').parent().text().split(/:| {3,}/)[1].trim(),
            views: doc.find('span.info:contains("Status:")').parent().text().split(/:| {3,}/)[4].trim(),
            summary: doc.find('span.info:contains("Summary:")').parent().next().html().trim()
        };
    }

    static listing(listing) {
        return new EpisodeListing(listing).addControls();
    }



}