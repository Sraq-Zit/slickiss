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

    static listing(listing) {
        return new EpisodeListing(listing).addControls();
    }



}