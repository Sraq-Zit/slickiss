class Tooltip {
    static panel = $('<div/>', {
        class: 'ttip',
        css: { position: 'fixed', transition: 'all .5s ease' }
    });
    static xhr = new XMLHttpRequest();
    static visibility = 0;
    static init() {
        $(document).on('keypress', e => {
            if (!this.visibility || !this.anime || !e.ctrlKey) return;
            e.charCode == 2 && this.anime.bkManager.click();
            e.charCode == 10 && this.anime.sManager.click();
        }).on('keydown', e => {
            const msg = 'Anime previews won\'t show up again but you can re-enable it in the extension settings.\nConfirm ?';
            if (e.keyCode == 27 && this.visibility && confirm(msg))
                this.hide() && chrome.storage.sync.set({ ttip: settings.ttip = false });
        });
    }

    static showAnime(url) {
        if (!settings.ttip) return;
        this.hide();
        this.visibility = 1;
        $('body').prepend(this.panel);
        this.xhr.abort();
        this.xhr.open('get', url, true);
        this.xhr.onload = (e) => {
            if (!this.visibility) return;
            const doc = $(this.xhr.responseText),
                img = doc.find(".rightBox .barContent img").eq(0).attr({ width: "160px", height: "210px" }).css({ float: "left", margin: "10px" }),
                card = doc.find(".bigBarContainer").eq(0).css("font-size", ".8em"),
                listing = doc.find('.listing').css('margin', '10px');

            const clear = '&nbsp;'.repeat(10);
            card.find('p').eq(2).append(
                `${clear}<span class='info'>CTRL + B: </span>&nbsp;Bookmark/UnBookmark`
            );
            card.find('p').eq(3).append(
                `<span class='info'>CTRL + M: </span>&nbsp;Mark Watched/Unwatched`
            );

            card.find('br + br').replaceWith($('<div/>', { css: { margin: '5px' } }));
            card.find('.bigChar').parent().css({ 'max-height': '43vh', overflow: 'hidden' });
            listing.find('tr').slice(5, -2).remove();
            listing.find('tr').eq(4).find('td').html('⋮');

            card.append(listing).find('p').css('margin', '2px');
            card.children(".barTitle").after(img).css('font-family', 'monospace')
                .text("You can disable this by clicking Escape key or using the extension settings");

            this.anime = new Anime(url, doc, 1);
            this.panel.empty().append(card);

            this.show();

        };
        this.xhr.send();
    }

    static show = () => this.panel.css('opacity', this.visibility = .85);
    static hide = () => this.panel.css('opacity', this.visibility = 0) && this.xhr.abort();
}
Tooltip.init();