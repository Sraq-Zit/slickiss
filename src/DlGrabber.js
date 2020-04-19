const grab = async (url, onprogress, downloads) => await new DlGrabber(url, onprogress, downloads).grab();
class DlGrabber {
    constructor(url, onprogress, downloads = false) {
        this.url = url;
        this.downloadUrls = downloads
        this.onprogress = onprogress || (() => { });
    }

    async grab() {
        if (!S.isContext(this.url, S.cts.EPISODE)) {
            console.warn(this.url, `The url provided is not for an episode`);
            return null;
        }
        this.onprogress(DlGrabber.progress.RETRIEVE);
        this.doc = $(await c(S.stripEpUrl(this.url)).solve());
        this.getServers();

        this.onprogress(DlGrabber.progress.OPEN);
        await this.getServerUrls();

        if (this.downloadUrls) {
            this.onprogress(DlGrabber.progress.DOWNLOAD);
            await this.getDownloadUrls();
        }


        this.onprogress(DlGrabber.progress.DONE, this);
        return this;
    }

    async getServerUrls() {
        return new Promise(resolve => {
            this.urls = {};

            for (const server in this.servers) {
                c(this.servers[server]).solve().then(html => {
                    this.onprogress(DlGrabber.progress.RESPONSE, { server: server });
                    this.urls[server] = DlGrabber.extractMovieIframe(html);
                    this.urls[server] = this.urls[server] || (this.servers[server] + '#player');
                    if (Object.keys(this.urls).length == Object.keys(this.servers).length)
                        resolve();
                });
            }
        })

    }

    getDownloadUrls() {
        return new Promise(resolve => {
            this.downloads = {};
            let count = 0;
            for (const server in this.urls)
                if (server in DlGrabber.handlers) {
                    count++;
                    DlGrabber.handlers[server](this.urls[server] || this.servers[server])
                        .then(src => {
                            this.onprogress(DlGrabber.progress.FINISH, {
                                server: src.server,
                                response: src
                            });
                            this.downloads[src.server] = src;
                            if (Object.keys(this.downloads).length == count)
                                resolve();
                        });
                }

        })
    }

    getServers() {
    this.servers = {};
        this.doc.find('#selectServer > option').each((i, el) => {
            const data = S.parseUrl(el.value);
            if ($(el).is(':selected')) this.default = data.server;
            this.servers[data.server] = el.value;
        });
        return this;
    }

    static get progress() {
        return {
            RETRIEVE: 0,
            OPEN: 1,
            RESPONSE: 2,
            DOWNLOAD: 3,
            FINISH: 4,
            DONE: 5
        }
    }

    /** Gets handlers which are processes of grabbing download links from differents servers */
    static get handlers() {
        return {
            /** @param {string} url */
            hydrax: url => this.grabs('https://ping.idocdn.com/', 'hydrax', r => {
                const id = /v=(.+?)(#|&|$)/g.exec(url)[1];
                r = JSON.parse(r);
                r.url && fetch('https://' + r.url + '/', {
                    "method": "POST",
                    "credentials": "same-origin",
                    "headers": { "Content-Type": "application/x-www-form-urlencoded" },
                    "body": "slug=" + id
                }).then(t => t.text());
                $('<img/>', { src: `https://ping.${r.url}/ping.gif` });
                return {
                    src: r.url && 'https://' + r.url + '/?track=' + id
                };
            }, 'post', { slug: /v=(.+?)(#|&|$)/g.exec(url)[1] }),
            /** @param {string} url */
            mp4upload: url => this.grabs(url, 'mp4upload', r => {
                const output = eval(/eval(\(.*\))/.exec(r)[1]);
                let res, src;
                if (res = /setup\(({.*?(\(.*?\))*.*?})\)/.exec(output)) {
                    const setup = JSON.parse(res[1].replace(/'/g, '"').replace(/([,{]"[^"]+?":)([^[{"]+?)([,\]}])/g, '$1"$2"$3'));
                    src = setup.file;
                } else src = (res = /player\.src\("(.+?)"\)/.exec(output)) && res[1];
                return {
                    src: src,
                    option: { poster: (res = /player\.poster\("(.+?)"\)/.exec(output)) && res[1] }
                };
            }),
            /** @param {string} url */
            nova: url => this.grabs(url.replace(/\/v\//g, "/api/source/"), 'nova', r => {
                let q = settings.quality,
                    data = JSON.parse(r).data, src;
                for (let k in data) {
                    data[data[k].label] = data[k];
                    delete data[k];
                }
                while (!(src = data[q]) && q)
                    q = { "1080p": "720p", "720p": "480p", "480p": "360p" }[q];

                q = settings.quality;
                while (!(src = data[q]) && q)
                    q = { "720p": "1080p", "480p": "720p", "360p": "480p" }[q];

                return { src: src && src.file, option: { qualities: { ...data } } };
            }, 'post'),
            /** 
             * @param {string} url
             * @param {string} srv Server name
             * @returns {Promise<{
                    server: string;
                    success: boolean;
                    response: string
                }>}
             **/
            alpha: (url, srv = 'alpha') => new Promise(async resolve => {
                let html = await c(url).solve();
                html = html.replace(`$('#slcQualix').val()`, `'${$(html.noImgs).find('#slcQualix').val()}'`);
                const match = /ovelWrap\(.+'\)/g.exec(html);
                const css = await fetch("/Scripts/css.js").then(t => t.text()),
                    vr = await fetch("/Scripts/vr.js?v=1").then(t => t.text());

                window.eval(css);
                window.eval(vr);
                $(html.noImgs).find("script").each((index, el) => {
                    if (el.tagName.toLowerCase() == "script" && $(el).html().toLowerCase().includes('crypto'))
                        try { eval(el.innerHTML); } catch (err) { }
                });

                if (!match || match[0].length < 50) resolve({
                    server: srv,
                    success: 0,
                    response: 'Failed to find video source'
                }); else {
                    match[0] = eval(match[0]);
                    if (!match[0].indexOf('https://')) match[0] = $('<a/>', { href: match })[0].outerHTML;
                    let a = $("<div>" + match[0] + "</div>").find("a");
                    resolve({
                        server: srv,
                        success: a.length,
                        response: a.length ? a.eq(0).attr("href") : 'Failed to find video source'
                    });
                }
            }),
            /** @param {string} url */
            beta: url => this.handlers.alpha(url, 'beta'),
            /** @param {string} url */
            beta3: url => this.handlers.alpha(url, 'beta3'),
            /** @param {string} url */
            beta4: url => this.handlers.alpha(url, 'beta4'),
            /** @param {string} url */
            beta360p: url => this.handlers.alpha(url, 'beta360p'),
            /** @param {string} url */
            auto: url => {
                return this.handlers[this.getServerName(url)](url);
            }
        }
    }

    /** Get the name of the server of the given url 
     * @param {string} url Url concerned 
     */
    static getServerName(url) {
        if (url.includes('hydrax')) return 'hydrax';
        if (url.includes('mp4upload')) return 'mp4upload';
        if (url.includes('novelplanet')) return 'nova';
        if (url.includes('s=alpha')) return 'alpha';
        if (url.includes('s=beta')) return /s=(beta.*?)([#&]|$)/g.exec(url)[1];
    }

    /** Finds the iframe source hidden in the website's scripts
     * @param {string} html Source of the page
     */
    static extractMovieIframe(html) {
        let iframe = /\$\('#divMyVideo'\).html\('(.+?)'/g.exec(html);
        return iframe && $(iframe[1]).attr('src');
    }

    /** Grabs video link along with additional info of the given url
     * @param {string} url URL of the requested server
     * @param {string} srv Label of the server / identifier
     * @param {(html: string) => {
     * src: string;
     * option?: {poster?:string,title?:string,qualities?:{'1080p'?:string'720p'?:string'480p'?:string}};
     * } | Promise<{
     * src: string;
     * option?: {poster?:string,title?:string,qualities?:{'1080p'?:string'720p'?:string'480p'?:string}};
     * }>} process Hacks correspponding to the given server
     * @param {'get'|'post'} method GET / POST
     * @param {object} data Data containing query
     * @param {number} tries Number of tries before giving up
     * @returns {Promise<{
     * server: string, success: boolean, response: string,
     * additional?: {poster?:string,title?:string,qualities?:{'1080p'?:string'720p'?:string'480p'?:string}}
     * }>}
     */
    static grabs = (url, srv, process, method = 'get', data = null, tries = 0) => new Promise(resolve => $.ajax({
        dataType: 'html', type: method, url: url, data: data,
        success: r => {
            try {
                const results = process(r);
                resolve({
                    server: srv,
                    success: results.src ? 1 : 0,
                    response: results.src || 'Failed to find video source',
                    additional: results.option
                });
            } catch (error) {
                resolve({
                    server: srv,
                    success: 0,
                    response: error
                });
            }
        },
        error: (xhr, err, status) => {
            if (!tries) resolve({ server: srv, success: 0, response: err });
            setTimeout(() => this.grabs(url, srv, process, method, data, --tries).then(r => resolve(r)), 1000);
        }
    }));
}
