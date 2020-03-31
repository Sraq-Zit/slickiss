class Bookmark {
    static cache = {
        bookmarks: {},
        animeIDs: {}
    };



    static async getBookmarks(json) {
        const cached = this.cache.bookmarks.time && Date.now() - this.cache.bookmarks.time < 1000 * 60 * 5;
        if (json) {
            if (cached && this.cache.bookmarks.json) return this.cache.bookmarks.json;
            const listing = await this.getBookmarks();
            if (!listing) return listing;
            const data = {};
            listing.find('.aAnime').each((i, a) => data[Slickiss.parseUrl(a.href).name] = {
                name: $(a).text().trim(),
                url: a.href,
                watched: $(a).parent().parent().find('a[style*=inline]')[0].className == 'aRead'
            });
            return this.cache.bookmarks.json = JSON.parse(JSON.stringify(data));

        }
        return await new Promise(resolve => {
            if (cached)
                resolve(this.cache.bookmarks.listing.clone());
            else
                fetch("/BookmarkList").then(t => t.text())
                    .then(rd => resolve((this.cache.bookmarks = {
                        time: Date.now(),
                        listing: $(rd.noImgs).find(".listing")
                    }).listing.clone()))
                    .catch(e => resolve(null) || console.error("Failed to get bookmarks"));
        });
    }




    static async getOngoingUnwatchedList() {
        let listing = await this.getBookmarks();
        let data = {};
        if (!listing.length) return;
        listing.find("tr").each(function () {
            let tds = $(this).find("td, th");
            let num;
            if ($(this).hasClass("head") || (num = /\d+/g.exec(tds.eq(1).text())) && tds.eq(2).find("a:not([style*=none])").text().trim() == "Unwatched") {
                tds.slice(0).css("text-align", "left");
                tds.eq(0).attr("data-title", tds[0].title.replace(/<im /g, '<img ')).removeAttr("title");

                $(this).find("th").eq(0)
                    .attr("width", "75%")
                    .html("New <a href='/BookmarkList'>Bookmarks</a> episodes not yet watched");

                tds.slice(2).remove();
                let index = num ? Number(num) : 0;
                if (data[index]) data[index].push($(this).clone());
                else data[index] = [$(this).clone()];

            }
            $(this).remove();
        });


        if (Object.keys(data).length == 0) return;
        for (var key in data)
            for (var i in data[key])
                listing.append(data[key][i]);

        var wrapper = $("<div/>", {
            class: 'listingWr',
            html: `<img src='${chrome.extension.getURL("imgs/Notifications.png")}' width=50>`
        }).append(listing);

        listing.wrap("<div class='listing'></div>");
        listing.on("mouseenter", "td", function () {
            if ($(this).attr("data-title"))
                $(".ttip").css("opacity", ".8")
                    .html($(this).attr("data-title"));

        }).on("mouseleave", "td", function () {
            $(".ttip").css("opacity", "");
        });

        return wrapper;
    }

    static async getAnimeID(anime) {
        return await new Promise(resolve => {
            if (anime in this.cache.animeIDs && this.cache.animeIDs[anime])
                return resolve(this.cache.animeIDs[anime]);
            if (typeof anime == 'number')
                resolve(anime);
            else if (typeof anime == 'string')
                fetch(Slickiss.parseUrl(anime).anime).then(t => t.text())
                    .then(r => {
                        let id = /animeID=(\d+)/g.exec(r);
                        resolve(this.cache.animeIDs[anime] = (id && id[1]));
                    });
            else {
                if ('self' in this.cache.animeIDs) return resolve(this.cache.animeIDs['self']);
                let id = /animeID=(\d+)/g.exec($('html').html());
                resolve(this.cache.animeIDs['self'] = (id && id[1]));
            }
        });
    }

    static async getAnimeBookmarkInfo(anime) {
        let animeID = await this.getAnimeID(anime);
        let data = await fetch('/CheckBookmarkStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'animeID=' + animeID
        }).then(t => t.text());
        return {
            animeID: Number(animeID),
            bookmarked: animeID && data != 'null',
            watched: animeID && data != 'null' && data.split('|')[0] == 'true',
            bdid: data != 'null' ? data.split('|')[1] : undefined
        };
    }


    // bookmarking
    static async toggleBookmark(anime) {
        try {
            let info = await this.getAnimeBookmarkInfo(anime);
            let res = info.bookmarked ? await this.removeBookmark(info.animeID) : await this.addBookmark(info.animeID);
            return {
                success: res == 'OK',
                bookmarked: !info.bookmarked,
                response: res
            };
        } catch (e) {
            return {
                success: false,
                response: e
            };
        }
    }

    static async addBookmark(anime) {
        return await this.editBookmark(anime, 'add');
    }

    static async removeBookmark(anime) {
        return await this.editBookmark(anime, 'remove');
    }

    static async editBookmark(anime, action) {
        let animeID = await this.getAnimeID(anime);
        if (!animeID) return 'You should be logged in to do this';
        let response = await fetch(`/Bookmark/${animeID}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).then(t => t.text());
        this.cache.bookmarks = {};
        return response;
    }
    // ^^^^^^^^^^^^ End bookmarking ^^^^^^^^^^


    // marking watched
    static async toggleWatched(anime) {
        try {
            let info = await this.getAnimeBookmarkInfo(anime);
            if (!info.bookmarked) return {
                success: false,
                response: 'You have to bookmark the Anime first.'
            };
            let res = !info.watched ? await this.markWatched(info.bdid) : await this.markUnwatched(info.bdid);
            return {
                success: res == 'OK',
                watched: !info.watched,
                response: res
            };
        } catch (e) {
            return {
                success: false,
                response: e
            };
        }
    }

    static async setWatched(bdid, watched) {
        let response = await fetch(`/MarkBookmarkDetail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `bdid=${bdid}&strAlreadyRead=${watched ? 1 : 0}`
        }).then(t => t.text());
        this.cache.bookmarks = {};
        return response;
    }

    static async markWatched(bdid) {
        return await this.setWatched(bdid, 1);
    }

    static async markUnwatched(bdid) {
        return await this.setWatched(bdid, 0);
    }
    // ^^^^^^^^^^^^ End watched marking ^^^^^^^^^^


}