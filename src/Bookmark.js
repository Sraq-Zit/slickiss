/** Bookmarks manager */
class Bookmark {
    /** Cache for anime IDs */
    static cache = {
        bookmarks: {},
        animeIDs: {}
    };


    /** Retrieves bookmarks either as html element or structured to json
     * @param {boolean} json If the return value is a json object
     * @returns {Promise<{name: string; url: string; watched: boolean;}[]|JQuery<HTMLTableElement>>}
     */
    static async getBookmarks(json) {
        const cached = this.cache.bookmarks.time && Date.now() - this.cache.bookmarks.time < 1000 * 60 * 5;
        if (json) {
            if (cached && this.cache.bookmarks.json) return this.cache.bookmarks.json;
            const listing = await this.getBookmarks();
            if (!listing) return listing;
            const data = {};
            listing.find('.aAnime').each((i, a) => data[S.parseUrl(a.href).name] = {
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

    /** Generate a list of bookmarked Anime with new episodes not yet watched
     * @returns {Promise<JQuery<HTMLTableElement>>}
     */
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

        return listing;
    }

    /** Get Anime id through its page
     * @param {string|number} anime Anime URL, or ID in which case it's returned
     * @returns {Promise<number>}
     */
    static async getAnimeID(anime) {
        return await new Promise(resolve => {
            if (anime in this.cache.animeIDs && this.cache.animeIDs[anime])
                return resolve(this.cache.animeIDs[anime]);
            if (typeof anime == 'number')
                resolve(anime);
            else if (typeof anime == 'string')
                fetch(S.parseUrl(anime).anime).then(t => t.text())
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

    /** Get Anime info wrt the current account's bookmark list
     * @param {string|number} anime Anime URL or ID
     */
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
    /** Bookmark / Unbookmark Anime opposed to its current status
     * @param {string|number} anime Anime URL or ID
     * @returns {{
            success: boolean,
            bookmarked?: boolean,
            response: string
        }}
     */
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

    /** Bookmark Anime
     * @param {string|number} anime Anime URL or ID
     * @returns {string} Response of the request
     */
    static async addBookmark(anime) {
        return await this.editBookmark(anime, 'add');
    }

    /** Unbookmark Anime
     * @param {string|number} anime Anime URL or ID
     * @returns {string} Response of the request
     */
    static async removeBookmark(anime) {
        return await this.editBookmark(anime, 'remove');
    }

    /** Bookmark / Unbookmark Anime
     * @param {string|number} anime Anime URL or ID
     * @param {'add'|'remove'} action Wether to add or remove from bookmarks
     * @returns {string} Response of the request
     */
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
    /** Mark Anime watched / unwatched opposed to its current status
     * @param {string|number} anime Anime URL or ID
     * @returns {{
            success: boolean,
            watched?: boolean,
            response: string
        }}
     */
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

    
    /** Mark Anime watched / Unwatched
     * @param {string|number} bdid Anime bdid
     * @param {boolean} watched Mark as watched if true, unwatched otherwise
     * @returns {string} Response of the request
     */
    static async setWatched(bdid, watched) {
        let response = await fetch(`/MarkBookmarkDetail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `bdid=${bdid}&strAlreadyRead=${watched ? 1 : 0}`
        }).then(t => t.text());
        this.cache.bookmarks = {};
        return response;
    }

    /** Mark Anime watched
     * @param {string|number} bdid Anime bdid
     * @returns {string} Response of the request
     */
    static async markWatched(bdid) {
        return await this.setWatched(bdid, 1);
    }

    /** Mark Anime unwatched
     * @param {string|number} bdid Anime bdid
     * @returns {string} Response of the request
     */
    static async markUnwatched(bdid) {
        return await this.setWatched(bdid, 0);
    }
    // ^^^^^^^^^^^^ End watched marking ^^^^^^^^^^


}