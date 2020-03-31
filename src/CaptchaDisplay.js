class CaptchaDisplay {
    static init() {
        window.stop();
        document.documentElement.innerHTML = `
            <link href="/Content/css/tpl_style.css?v=7" rel="stylesheet" type="text/css">
            <body></body>
        `;
        const size = 200;
        const css = { height: size, width: size };
        this.log = $('<div/>', {
            class: 'bigChar',
            css: {
                margin: '40px', width: '70%', 'text-align': 'left'
            }
        });
        this.q1 = $('<div/>', { class: 'query', text: '1st query' });
        this.q2 = $('<div/>', { class: 'query', text: '2nd query' });
        this.img1 = $('<img/>', { src: chrome.extension.getURL('/imgs/angry-loli.png'), css: css });
        this.img2 = $('<img/>', { src: chrome.extension.getURL('/imgs/angry-loli.png'), css: css });
        css.left = '50%';
        css.transform= 'translateX(-50%)';
        css.position = 'absolute';
        this.num1 = $('<img/>', { css: css });
        this.num2 = $('<img/>', { css: css });
        this.table = Assets.table([
            {
                tag: 'tr',
                data: [
                    { tag: 'td', contents: this.q1 }, {
                        tag: 'td',
                        option: { css: { position: 'relative', 'text-align': 'center' } },
                        contents: this.img1.add(this.num1)
                    }
                ]
            }, {
                tag: 'tr',
                data: [
                    { tag: 'td', contents: this.q2 }, {
                        tag: 'td',
                        option: { css: { position: 'relative', 'text-align': 'center' } },
                        contents: this.img2.add(this.num2)
                    }
                ]
            }
        ]);
        const center = $('<center/>', { class: 'centered' }).append(this.table);
        $('body').append($('<div/>', { class: 'display' }).append(center));

        this.table.after(this.log.text('Let\'s do the hacks.'));

    }

    static solve() {
        const reurl = decodeURIComponent(/reUrl=([^&]+)/g.exec(location.href)[1]);
        c(reurl).onUpdate((obj, step) => {
            this.log.text(`[ Attempt ${obj.attempt} ]: ${step}`);
            switch (step) {
                case Captcha.steps.ARGUMENTS:
                    this.q1.text(Object.values(obj.q1).join(', '));
                    this.q2.text(Object.values(obj.q2).join(', '));
                    break;

                case Captcha.steps.BYPASSING:

                    break;

                case Captcha.steps.COMPARISON1:
                    this.img1[0].src = obj.imgs[obj.prob1.index].src;
                    break;

                case Captcha.steps.COMPARISON2:
                    this.img2[0].src = obj.imgs[obj.prob2.index].src;
                    break;

                case Captcha.steps.NUM:
                    this.img1[0].src = obj.imgs[obj.prob1.index].src;
                    this.img2[0].src = obj.imgs[obj.prob2.index].src;

                    setTimeout(() => {
                        this.num1[0].src = ImgProc.cache[obj.imgs[obj.prob1.index].src];
                        this.num2[0].src = ImgProc.cache[obj.imgs[obj.prob2.index].src];
                    }, 300);

                    break;

                case Captcha.steps.SUCCESS:

                    break;

                case Captcha.steps.FAILURE:

                    break;

                default:
                    break;
            }
        }).solve().then(html => location = reurl);
    }

}
if (location.href.includes('kissanime.ru/Special/AreYouHuman')) {
    CaptchaDisplay.init();
    CaptchaDisplay.solve();
}