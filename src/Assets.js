class Assets {

    /** Array of elements for wait display
     * @returns {JQuery<HTMLElement>[]}
     */
    static waitMsg() {
        return [
            $('<style/>', { class: 'slickExtra', text: 'body{display:none;}' }),
            $("<img/>", {
                id: 'pageLoading',
                src: chrome.extension.getURL("imgs/mobchara_3.png"),
                class: 'slickExtra slickFloating'
            }),
            $('<h1/>', { class: 'bigChar slickExtra text-light', text: 'Loading...' })
        ]
    }

    /** Element presenting an area over the page to show desired notice
     * @returns {JQuery<HTMLDivElement>}
     */
    static msgArea() {
        return $('<div/>', {
            css: {
                display: 'none', position: 'fixed', height: '100vh', width: '100vw', 'text-align': 'center',
                'background-color': 'rgba(0,0,0,.8)', padding: '30px 10px', 'z-index': '2'
            }
        }).append([
            $('<a/>', {
                text: 'X',
                css: {
                    href: '#', position: 'absolute', top: '20px', left: '20px', color: 'white',
                    border: '1px solid white', padding: '0px 5px', cursor: 'pointer', 'z-index': 1
                }
            }).on('click', (e) => e.preventDefault() || $(e.currentTarget).parent().fadeOut()),
        ]);
    }

    /** A floating notifier
     * @returns {JQuery<HTMLDivElement>}
     */
    static floatingNotif() {
        return $('<div/>', { class: 'floatingNotif banner' })
            .append($('<img/>', { src: chrome.extension.getURL('/imgs/prepare.png') }))
            .append($('<div/>', { class: 'text', text: '4 anime' }));
    }

    /** Video player components
     * @returns {Promise<JQuery<HTMLDivElement>>}
     */
    static async player() {
        const html = await this.loadAssetFromFile('html/player.html');
        return $(html);
    }

    /** Load file from relative path
     * @param {string} file Relative path to fetch
     * @returns {Promise<string>}
     */
    static async loadAssetFromFile(file) {
        return fetch(chrome.extension.getURL(file))
            .then(t => t.text())
            .then(t => t.replace(/([("])\/{4}(.+?[")])/g, `$1${chrome.extension.getURL('')}$2`));
    }

    /** Create html table based on the given data
     * @param {{
        tag: string;
        option?: object;
        attr?: object;
        data?: {
            tag:string;
            option?: object;
            attr?: object;
            contents?: *;
        }[];
       }[]} data Table components
     * @param {JQuery<HTMLTableElement>} [table] If given, data is appended to this table
     * @returns {JQuery<HTMLTableElement>}
     */
    static table(data, table) {
        table = table || $('<table/>', { width: '100%' });
        if (typeof data != 'undefined')
            for (const row of data) {
                let el = $(`<${row.tag}/>`, row.option).attr(row.attr ? row.attr : {});
                if (row.data)
                    for (const t of row.data)
                        el.append($(`<${t.tag}/>`, t.option).append(t.contents).attr(t.attr ? t.attr : {}));

                table.append(el);
            }
        return table;
    }

    /** Create select html element based on the given data
     * @param {*[]} options Jquery element options formatted object for each option of the select element
     * @param {*} format Jquery element options formatted object for the select element
     */
    static select(options, format) {
        const obj = $('<select/>', format);
        for (const op of options)
            obj.append($('<option/>', op));
        return obj;
    }

    /** Create an anchor for documentation
     * @param {string} id ID of the function on the documentation
     * @returns {JQuery<HTMLAnchorElement>}
     */
    static infoAnchor(id) {
        id = (id ? id : '');
        return $('<a/>', {
            href: '#' + id,
            class: 'batch-info',
            css: { cursor: 'help' }
        });
    }

    /** Convert plain seconds to HH:MM:SS format
     * @param {number} time Seconds to convert
     * @returns {string}
     */
    static formatSecs(time) {
        let t = [],
            x;
        if ((x = parseInt(time / 3600)) >= 1) {
            t.push((x || 0).toString().padStart(2, 0));
            time %= 3600;
        }
        t.push((parseInt(time / 60) || 0).toString().padStart(2, 0));
        time %= 60;
        t.push((parseInt(time) || 0).toString().padStart(2, 0));
        return t.join(":");
    }

    /** Display a toast with given msg
     * @param {string} msg Message to show
     * @param {number} timeout Duration before the toast fades out
     * @param {(JQuery<HTMLDivElement>)} onfadeout Callback after toast has faded out
     * @returns {JQuery<HTMLDivElement>}
     */
    static toast(msg, timeout = 2000, onfadeout) {
        const toast = ($('#slickiss-toast').length && $('#slickiss-toast')) || $('<div/>', { id: 'slickiss-toast' });
        toast.html(msg).show();
        $(document.documentElement).append(toast);
        clearTimeout(toast[0].timer);
        toast[0].timer = setTimeout(() => toast.fadeOut(500, onfadeout), timeout);
        return toast;
    }
}
