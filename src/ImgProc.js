class ImgProc {
    static QSIZE = 20;
    static NSIZE = 70;

    static cache = {};

    static async countMatch(img1, img2) {
        let matchCount = 0,
            area = 0;
        img1 = await new Img(img1).setSize(this.QSIZE, this.QSIZE).load();
        img2 = await new Img(img2).setSize(this.QSIZE, this.QSIZE).load();

        for (let i = 0; i < this.QSIZE; i++)
            for (let j = 0; j < this.QSIZE; j++) {
                const p = img1.get(i, j);
                if (!p.matches(px(255), px(5))) {
                    area++;
                    const diff = 6;
                    for (let k = (Math.min(i, j) > diff ? -diff : -Math.min(i, j)); k < diff; k++) {
                        const p1 = img2.get(i + k < 0 ? 0 : i + k, j),
                            p2 = img2.get(i, j + k < 0 ? 0 : j + k);
                        if (p.matches(p1) || p.matches(p2)) {
                            matchCount++;
                            break;
                        }
                    }
                }
            }

        return Number((area ? matchCount / area : 0).toPrecision(3));
    }

    static async numberRecognition(img) {
        const src = img;
        img = await new Img(img).limitSize(this.NSIZE).load();
        let frame = await new Img().setSize(img.img.width, img.img.height).load();
        let matchCount = 0, colIndex = -1;

        while (matchCount < 10 && ++colIndex < this.COLOR_NAMES.length) {
            matchCount = 0;
            const c = this.COLOR_NAMES[colIndex];
            for (let i = 0; i < img.img.width; i++)
                for (let j = 0; j < img.img.height; j++) {
                    const data = img.get(i, j);
                    if (data.matches(this.COLORS[c].rgb, this.COLORS[c].threshold)) {
                        matchCount++;
                        frame.draw(i, j, px(0));
                    } else frame.draw(i, j, px(255));
                }
        }

        frame.updateContext();
        const result = OCRAD(frame.ctx.canvas, { numeric: true }).trim();

        this.cache[src] = await frame.removeWhiteBg(.6).updateContext().toDataURL();

        return /\d/g.test(result) ? Number(result) : -1;
    }



    static get COLOR_NAMES() { return ["violet", "blue", "green", "red", "yellow"] }
    static get COLORS() {
        return {
            yellow: {
                name: "yellow",
                rgb: px(253, 166, 0),
                threshold: px(80, 30, 10)
            },
            red: {
                name: "red",
                rgb: px(247, 0, 0),
                threshold: px(30, 10, 10)
            },
            green: {
                name: "green",
                rgb: px(0, 141, 0),
                threshold: px(30, 60, 30)
            },
            blue: {
                name: "blue",
                rgb: px(0, 0, 245),
                threshold: px(50, 50, 50)
            },
            violet: {
                name: "violet",
                rgb: px(125, 0, 126),
                threshold: px(50, 30, 50)
            }
        }
    }
}


class Img {
    constructor(img) {
        this.loaded = typeof img == 'undefined';
        this.jImg = $('<img/>', { src: img, crossOrigin: 'anonymous' }).on('load', e => this.loaded = 1);
        this.img = this.jImg[0];
    }

    setSize(w, h) {
        this.img.width = w;
        this.img.height = typeof h == 'undefined' ? this.img.height : h;
        return this;
    }

    limitSize(s) {
        this.sizeLimit = s;
        return this;
    }

    async load() {
        await new Promise(resolve => {
            this.loaded ? resolve() : (this.img.onload = e => resolve())
        });
        if (this.sizeLimit) {
            if (this.img.naturalWidth > this.img.naturalHeight) {
                this.img.width = this.sizeLimit;
                this.img.height = this.img.width * (this.img.naturalHeight / this.img.naturalWidth);
            } else {
                this.img.height = this.sizeLimit;
                this.img.width = this.img.height * (this.img.naturalWidth / this.img.naturalHeight);
            }
        }
        this.canvas = new OffscreenCanvas(this.img.width, this.img.height);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.drawImage(this.img, 0, 0, this.img.width, this.img.height);
        this.data = this.ctx.getImageData(0, 0, this.img.width, this.img.height).data;
        return this;
    }

    updateContext() {
        const imgData = new ImageData(this.img.width, this.img.height);
        for (const i in this.data) imgData.data[i] = this.data[i];
        this.ctx.putImageData(imgData, 0, 0);
        return this;
    }

    toDataURL() {
        return new Promise(async resolve => {
            const fr = new FileReader();
            fr.onload = e => resolve(e.currentTarget.result);
            const blob = await this.canvas.convertToBlob();
            fr.readAsDataURL(blob);
        });

    }

    get(x, y) {
        let i = (x + y * this.img.width) * 4;
        return px(this.data.slice(i, i + 3));
    }
    draw(x, y, p) {
        let i = (x + y * this.img.width) * 4;
        this.data[i++] = p.r;
        this.data[i++] = p.g;
        this.data[i++] = p.b;
        this.data[i] = 255;
    }

    removeWhiteBg(alpha) {
        for (let i = 0; i < this.data.length; i += 4)
            if (this.data[i] == 255) this.data[i + 3] = alpha;

        return this;
    }
}



class Px {
    constructor(r, g, b) {
        if (typeof r == 'object') {
            b = r[2]; g = r[1]; r = r[0];
        }
        this.r = r; this.g = g; this.g = g; this.b = b; this.b = b;
        if (typeof g == 'undefined')
            this.g = this.b = this.r;
    }

    matches(p, thld = px(2)) {
        let b = true;
        for (const c of ['r', 'g', 'b'])
            b &= Math.abs(this[c] - p[c]) < thld[c];
        return b;
    }

    static compare = (px1, px2, thld) => px1.compare(px2, thld);
}
const px = (r, g, b) => new Px(r, g, b);
