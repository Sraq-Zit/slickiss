const c = url => new Captcha(url);
class Captcha {
    static bypassingCf = false;
    callback;

    constructor(url) {
        this.url = url;
        this.attempt = 1;
    }

    async solve() {
        let status = await this.fetch();
        if (status == null || status) return status ? this.html : null;

        let form = $(this.html).find("*[id^=formVerify]");
        this.formAction = form.attr('action');
        // this.url = S.absolute(form.find("input[name='reUrl']").val());
        this.imgs = form.find('img');
        this.q1 = form.find('span').eq(0).text().trim();
        this.q2 = form.find('span').eq(1).text().trim();
        this.q1 = this.splitQuery(this.q1);
        this.q2 = this.splitQuery(this.q2);

        this.update(Captcha.steps.ARGUMENTS);

        this.prob1 = { max: 0, index: 0 };
        this.prob2 = { max: 0, index: 0 };
        for (let i = 0; i < this.imgs.length; i += 2) {
            this.prob1[i] = await this.countMatch(this.imgs[i].src, this.q1);
            if (this.prob1[i] > this.prob1.max) this.prob1.max = this.prob1[this.prob1.index = i];

            this.update(Captcha.steps.COMPARISON1);

            this.prob2[i] = await this.countMatch(this.imgs[i].src, this.q2);
            if (this.prob2[i] > this.prob2.max) this.prob2.max = this.prob2[this.prob2.index = i];

            this.update(Captcha.steps.COMPARISON2);
        }
        if (this.prob2.index == this.prob1.index) {
            const prob = this.prob1.max > this.prob2.max ? this.prob2 : this.prob1;
            delete prob[prob.index];
            prob.max = prob.index = -1;
            for (let i in prob)
                if (!isNaN(i) && prob[i = Number(i)] > prob.max)
                    prob.max = prob[prob.index = i];
        }

        let num = await ImgProc.numberRecognition(this.imgs[this.prob1.index].src);
        if (this.q1.nb != num) {
            this.prob1.index++;
            if ((num = await ImgProc.numberRecognition(this.imgs[this.prob1.index].src)) != -1 && this.q1.nb != num)
                this.prob1.index--;
        }

        num = await ImgProc.numberRecognition(this.imgs[this.prob2.index].src);
        if (this.q2.nb != num) {
            this.prob2.index++;
            if ((num = await ImgProc.numberRecognition(this.imgs[this.prob2.index].src)) != -1 && this.q2.nb != num)
                this.prob2.index--;
        }

        this.update(Captcha.steps.NUM);


        return this.solve();

    }

    async fetch(tries = 5) {
        try {
            /** @type {Response} */
            this.response = await fetch(this.formAction || this.url, {
                method: this.formAction ? 'POST' : 'GET',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: this.formAction && `reUrl=${encodeURIComponent(this.url)}&answerCap=${this.prob1.index},${this.prob2.index}`
            });
            if (S.getContext(this.response.url) == null) return null;
            if (this.response.status == 503) {
                this.update(Captcha.steps.BYPASSING);
                await Captcha.bypassCf();
                return this.fetch();
            }
            this.html = await this.response.text();
            if (this.html.toLowerCase().includes('wrong answer')) {
                this.update(Captcha.steps.FAILURE);
                this.attempt++;
                this.formAction = undefined;
                return this.fetch();
            }
            if (this.html.includes('selectEpisode'))
                return this.update(Captcha.steps.SUCCESS) || 1;

            return 0;
        } catch (er) {
            console.warn(er);
            return tries ? await this.fetch(--tries) : null;
        }
    }

    findQueryIDs(q) {
        return q.k1 in Captcha.CAPTCHA && q.k2 in Captcha.CAPTCHA[q.k1] ? Captcha.CAPTCHA[q.k1][q.k2] : [1];
    }
    splitQuery(q) {
        q = q.split(', ');
        return {
            k1: q[0],
            k2: q[1],
            nb: Number(q[2])
        };
    }
    captchaSrcFromID = id => chrome.extension.getURL(`imgs/captcha/captcha (${id}).jpg`);

    onUpdate(callback) { this.callback = callback; return this; }

    update(step) { return typeof this.callback == 'function' && this.callback(this, step) }

    async countMatch(src, q) {
        let max = 0;
        for (const id of this.findQueryIDs(q))
            max = Math.max(max, await ImgProc.countMatch(src, this.captchaSrcFromID(id)));

        return max;
    }


    static async bypassCf() {
        if (this.bypassingCf) return await sleep(1e3);
        this.bypassingCf = 1;
        const bypasser = $('<iframe/>', {
            src: location.protocol == "chrome-extension:" ? 'https://kissanime.ru' : '/'
        }).hide();
        $(document.documentElement).append(bypasser);
        await sleep(6e3);
        bypasser.remove();
        this.bypassingCf = 0;
    }



    static get steps() {
        return {
            ARGUMENTS: 'Got captcha queries and images',
            BYPASSING: 'Whoops! Gotta bypass Cloudflare',
            COMPARISON1: 'First query image updated',
            COMPARISON2: 'Second query image updated',
            NUM: 'Digits analysis completed',
            SUCCESS: 'Captcha solved!',
            FAILURE: 'Wrong answer, trying again...'
        };
    }

    static get CAPTCHA() {
        return {
            "arm": {
                "phone": [201],
                "muscle": [318],
                "violet": [201],
                "brown": [318]
            },
            "bear": {
                "green hat": [314],
                "brown": [
                    314,
                    325
                ],
                "black and white": [320],
                "panda": [320],
                "armor": [325],
                "green tie": [314]
            },
            "bird": {
                "sing": [307],
                "blue feather": [
                    319,
                    307
                ],
                "yellow peak": [267],
                "white cloud": [267],
                "yellow": [119],
                "coffee": [77],
                "white belly": [319],
                "farmer": [],
                "drink": [77],
                "red": [267]
            },
            "boy": {
                "no eyebrow": [242],
                "injured": [235],
                "golf": [206],
                "brown hair": [122],
                "black hair": [
                    189,
                    192,
                    269
                ],
                "scythe": [273],
                "swim": [1],
                "basketball": [83],
                "horse": [316],
                "black clothes": [
                    93,
                    122,
                    269
                ],
                "yellow hair": [
                    151,
                    329,
                    335
                ],
                "glasses": [321],
                "orange clothes": [
                    151,
                    336
                ],
                "red cloak": [189],
                "bicycle": [332],
                "green hair": [
                    230,
                    235
                ],
                "running": [321],
                "sword": [
                    93,
                    192
                ],
                "fight me": [187],
                "black hat": [122],
                "sport": [
                    206,
                    332,
                    83,
                    1
                ],
                "tail": [335],
                "basket ball": [83],
                "violet hair": [321],
                "red hair": [242],
                "green cloak": [192],
                "black boot": [192],
                "red clothes": [242],
                "blue clothes": [335],
                "yellow backpack": [230],
                "gray hair": [273]
            },
            "burger": {
                "red background": [245],
                "two layers": [245],
                "white background": [279],
                "green flag": [164],
                "premium quality": [164],
                "fries": [164],
                "three layers": [279]
            },
            "cat": {
                "eat": [296],
                "iphone": [208],
                "lazy": [79],
                "easily": [232],
                "zzz": [80],
                "food": [283],
                "not fat": [184],
                "heart": [208],
                "glasses": [219],
                "birthday": [181],
                "meowy": [211],
                "iphone love": [208],
                "cant move": [79],
                "amused": [232],
                "read": [219],
                "ermmy": [181],
                "christmas": [211],
                "yes": [283],
                "poofy": [184],
                "knife": [317],
                "pillow": [80],
                "sleep": [80]
            },
            "cloud": {
                "rain": [
                    161,
                    220
                ],
                "storm": [220],
                "sun": [161]
            },
            "couple": {
                "boy black clothes": [180],
                "girl gray hair": [180],
                "yawn": [207],
                "cat": [305],
                "girl black skirt": [304],
                "girl gray clothes": [304],
                "dog": [305],
                "yellow pikachu": [207],
                "married": [180],
                "girl white clothes": [180],
                "boy black hair": [
                    180,
                    304
                ],
                "brown hair": [207],
                "girl brown hair": []
            },
            "cup": {
                "black mask": [194],
                "white hair": [194]
            },
            "dice": {
                "red": [76],
                "green": [197],
                "one": [
                    197,
                    217,
                    250
                ],
                "brown": [217],
                "white": [250],
                "six": [76]
            },
            "dog": {
                "brown fur": [4],
                "sit": [313],
                "flower": [225],
                "bone": [224],
                "dark green fur": [313],
                "no color": [224]
            },
            "emoticon": {
                "coffee": [284],
                "apple": [312],
                "brown hat": [200],
                "red hat": [328],
                "pizza": [287],
                "beer": [78],
                "police": [179],
                "fork": [317],
                "blue pillow": [278],
                "red tail": [182],
                "red scarf": [200],
                "ice cream": [221],
                "sleep": [278],
                "eat": [
                    312,
                    287
                ],
                "lick": [221],
                "blue hat": [179],
                "drink": [
                    284,
                    78
                ],
                "artist": [328],
                "devil": [182]
            },
            "girl": {
                "lion": [308],
                "yellow slug": [252],
                "blue hair": [
                    222,
                    263
                ],
                "red clothes": [240],
                "black hair": [
                    234,
                    127
                ],
                "green clothes": [
                    162,
                    234
                ],
                "pink hair": [
                    252,
                    334
                ],
                "white clothes": [329],
                "glasses": [81],
                "yellow skirt": [275],
                "pink cloak": [3],
                "green cloak": [
                    162,
                    81
                ],
                "yellow hair": [
                    329,
                    308
                ],
                "crawl": [234],
                "brown hair": [
                    127,
                    275,
                    162
                ],
                "black clothes": [334],
                "green hair": [234],
                "guitar": [127],
                "pink hat": [
                    222,
                    334
                ],
                "pink clothes": [222],
                "red ribbon": [240]
            },
            "green": {
                "base ball": [330],
                "hat": [330]
            },
            "hand": {
                "left": [
                    188,
                    337
                ],
                "clap": [
                    223,
                    309
                ],
                "write": [
                    198,
                    256
                ],
                "brown": [
                    198,
                    203,
                    99,
                    227,
                    254,
                    298,
                    309,
                    337
                ],
                "yellow": [
                    188,
                    191,
                    223,
                    226,
                    239,
                    256,
                    262,
                    338
                ],
                "right": [
                    191,
                    254
                ],
                "up": [
                    99,
                    226
                ],
                "fist": [
                    203,
                    262
                ],
                "down": [
                    239,
                    298
                ],
                "ok": [
                    227,
                    338
                ]
            },
            "lion": {
                "no color": [243],
                "pink": [326],
                "smile": [295]
            },
            "medal": {
                "gold": [
                    186,
                    271
                ],
                "copper": [214],
                "silver": [310],
                "one": [186],
                "two": [310],
                "three": [214],
                "star": [271]
            },
            "penguin": {
                "doll": [176],
                "king": [229],
                "fishing": [290],
                "ice": [290]
            },
            "rabbit": {
                "eating": [331],
                "white": [199],
                "hold a carrot": [311],
                "blue": [331],
                "smile": [199],
                "yellow": [311]
            },
            "sheep": {
                "white fur": [327],
                "smile": [327]
            },
            "tiger": {
                "rawr": [104],
                "above hand": [323],
                "cup": [288],
                "girl": [104]
            },
            "turtle": {
                "green shell": [149],
                "stand": [294],
                "brown shell": [82],
                "doll": [2],
                "yellow skin": [149],
                "white flag": [149],
                "four": [
                    82,
                    2
                ],
                "no color": [294]
            },
            "yellow": {
                "candy": [324],
                "pikachu": [202],
                "angry": [202]
            }
        }
    }
}
