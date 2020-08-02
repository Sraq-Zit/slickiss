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
            try { await this.getDownloadUrls(); } catch (error) {
                this.onprogress(DlGrabber.progress.ERROR);
                return this;
            }

        }


        this.onprogress(DlGrabber.progress.DONE, this);
        return this;
    }

    static EXCL = ['beta7'];
    async getServerUrls() {
        return new Promise(resolve => {
            this.urls = {};

            for (const server in this.servers) {
                c(this.servers[server]).solve().then(html => {
                    this.onprogress(DlGrabber.progress.RESPONSE, { server: server });
                    this.urls[server] = !DlGrabber.EXCL.includes(server) && DlGrabber.extractMovieIframe(html);
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
                            const qs = src.additional && src.additional.qualities;
                            if (src.success && qs && Object.keys(qs).length)
                                src.response = (new QualityManager(qs, settings.quality)).preferredQ.file
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
            if (el.selected) this.default = data.server;
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
            DONE: 5,
            ERROR: -1
        }
    }

    /** Gets handlers which are processes of grabbing download links from differents servers */
    static get handlers() {
        return {
            /** @param {string} url */
            hydrax: url => this.grabs('https://ping.idocdn.com/', 'hydrax', r => {
                const id = /v=(.+?)(#|&|$)/g.exec(url)[1];
                r = JSON.parse(r);
                // r.url = atob(r.url.split("").reverse().join(""));
                r.url = r.url.split('');
                r.url.unshift(r.url.pop());
                r.url = atob(r.url.join(''));
                r.url && fetch('https://' + r.url + '/', {
                    "method": "POST",
                    "credentials": "same-origin",
                    "headers": { "Content-Type": "application/x-www-form-urlencoded" },
                    "body": "slug=" + id
                }).then(t => t.text());
                $('<img/>', { src: `https://ping.${r.url}/ping.gif` });
                let qualities;
                if (r.sources && r.sources.length && (qualities = {})) {
                    const d = {
                        'sd': { quality: '360p', prefix: '' },
                        'hd': { quality: '720p', prefix: 'www.' },
                        'fullHd': { quality: '1080p', prefix: 'whw.' }
                    }
                    r.sources.forEach(
                        q => qualities[d[q].quality] = {
                            file: `https://${d[q].prefix + r.url}/?track=${id}`,
                            label: d[q].quality,
                            type: 'mp4'
                        }
                    );
                } else qualities = {
                    '360p': {
                        file: `https://${r.url}/?track=${id}`,
                        label: '360p',
                        type: 'mp4'
                    }
                };
                return {
                    src: 1,
                    option: { qualities: { ...qualities }, poster: `https://img.iamcdn.net/${id}.jpg` }
                };
            }, 'post', { slug: /v=(.+?)(#|&|$)/g.exec(url)[1] }),
            /** @param {string} url */
            moe: url => new Promise(async r => {
                var require;
                window.eval((await req("https://play.p2ps.io/js/app.min.js")).replace(/document\.add.+?}\),/g, ''))
                const ref = url.split('/').pop(),
                    info_url = "https://play.p2ps.io/get-info",
                    hash = makeid(15),
                    key = CryptoJS.AES.encrypt(ref, hash).toString(),
                    qualities = {};

                let info;
                try { info = await req({ url: info_url, headers: { key: key, hash: hash } }) } catch {
                    try {
                        info = await req({
                            dataType: 'json', url: info_url + '?ios=true', headers: { key: key, hash: hash }
                        });
                        if (info.success && info.data && info.data.url)
                            return r({ server: 'moe', success: true, response: info.data.url, });
                    } catch{ }

                }

                if (!info.success || !info.data || !info.data.url) return r({
                    server: 'moe', success: false, response: 'Failed to find video source'
                });

                const xmlDoc = $(await req({
                    url: "https://play.p2ps.io" + info.data.url, dataType: 'text',
                    headers: { "x-proxy-pass": "king" },
                }));

                xmlDoc.find('AdaptationSet[contentType="video"] Representation').each((_, el) => {
                    const q = el.id.split(' ').shift().toLowerCase()
                    qualities[q] = {
                        file: $(el).find('BaseURL').text().trim(),
                        type: $(el).attr('mimeType').split('/').pop(),
                        label: q
                    }
                });
                qualities.audio = xmlDoc.find('AdaptationSet[contentType="audio"] BaseURL').text().trim();


                r({
                    success: true, response: 1, server: 'moe',
                    additional: { qualities: { ...qualities }, crossorigin: true }
                });
            }),
            /** @param {string} url */
            mp4upload: url => this.grabs(url, 'mp4upload', r => {
                let output = /eval\((.*?return .+?\})(\(.+)\)/.exec(r);
                output = eval(`(${output[1]})${output[2]}`);
                output = eval(
                    'output=' + /player\.source=(\{.+?\});/
                        .exec(output)[1]
                        .replace(/,(\]|\})/g, '$1')
                );
                return {
                    src: output.sources[0].src,
                    option: { poster: output.poster }
                };
            }),
            /** @param {string} url */
            nova: url => this.grabs(url.replace(/\/v\//g, "/api/source/"), 'nova', r => {
                let data = JSON.parse(r).data;
                for (let k in data) {
                    data[data[k].label] = data[k];
                    delete data[k];
                }
                return { src: 1, option: { qualities: { ...data }, crossorigin: true } };
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
                if (html == null) return resolve({
                    server: srv,
                    success: 0,
                    response: 'Failed to find video source'
                });
                html = html.replace(`$('#slcQualix').val()`, `'${$(html.noImgs).find('#slcQualix').val()}'`)
                    .replace(`ovelWrap($(this).val()`, `ovelWrap('${$(html.noImgs).find('#slcQualix').val()}'`);
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
                    let qualities;
                    match[0] = eval(match[0]);
                    if (!match[0].indexOf('https://')) match[0] = $('<a/>', { href: match[0] })[0].outerHTML;
                    const a = $("<div>" + match[0] + "</div>").find("a");
                    if (a.length > 0)
                        a.each((i, el) => {
                            const r = /(1080|720|480|360)\.(.+?)$/.exec($(el).text());
                            if (r && r[1]) {
                                qualities = qualities || {};
                                qualities[r[1] + 'p'] = {
                                    file: el.href, label: r[1] + 'p', type: r[2]
                                }
                            }
                        });
                    resolve({
                        server: srv,
                        success: a.length,
                        response: a.length ? a.eq(0).attr("href") : 'Failed to find video source',
                        additional: { qualities: qualities, crossorigin: ['streamhls'].includes(srv) }
                    });
                }
            }),
            beta6: (url, srv = 'beta6', directMode = false) => new Promise(async resolve => {
                const data = await this.handlers.alpha(url);
                if (!directMode && !data.success) resolve({
                    server: srv,
                    success: false,
                    response: 'Failed to find video source'
                }); else {
                    let html = await c(url).solve();
                    const qualities = {};
                    try {
                        c(url).solve().then(html => {
                            let domains = JSON.parse(/domainArray = (\[.+?\])/s.exec(html));
                            if (domains && (domains = domains[1])) {
                                domains = domains.map(v => encodeURIComponent(`http://${v}/`));
                                Chrome.set({ m3u8_domains: domains });
                            }
                        });

                    } catch (error) { }

                    for (const el of $(html.noImgs).find('select#slcQualix>option').toArray()) {
                        const item = qualities[el.textContent.trim()] = {
                            label: el.textContent.trim(),
                            file: (_GET(el.value).vidUrl || ovelWrap(el.value)) + '&ext=.m3u8'
                        };
                        if (el.selected) data.response = item.file;

                    }

                    resolve({
                        server: srv,
                        success: true,
                        response: data.response,
                        additional: { qualities: qualities, crossorigin: true }
                    });

                }
            }),
            /** @param {string} url */
            beta: url => this.handlers.alpha(url, 'beta'),
            /** @param {string} url */
            betax: url => this.handlers.alpha(url, 'betax'),
            /** @param {string} url */
            beta3: url => this.handlers.alpha(url, 'beta3'),
            /** @param {string} url */
            beta4: url => this.handlers.alpha(url, 'beta4'),
            /** @param {string} url */
            beta5: url => this.handlers.alpha(url, 'beta5'),
            /** @param {string} url */
            beta7: url => this.handlers.beta6(url, 'beta7', true),
            /** @param {string} url */
            beta8: url => this.handlers.alpha(url, 'beta8'),
            /** @param {string} url */
            streamhls: url => this.handlers.alpha(url, 'streamhls'),
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
        if (url.includes('play.p2ps')) return 'moe';
        if (url.includes('mp4upload')) return 'mp4upload';
        if (url.includes('novelplanet')) return 'nova';
        if (url.includes('s=alpha')) return 'alpha';
        if (url.includes('s=streamhls')) return 'streamhls';
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
