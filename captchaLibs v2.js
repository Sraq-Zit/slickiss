ImageData.prototype.setWidth = function(w){
    this.w = w;
    this.grayscale = [];
    for (let i = 0; i < this.data.length; i+=4)
        this.grayscale.push(
            parseInt(0.299 * this.data[i] + 0.587 * this.data[i+1] + 0.114 * this.data[i+2])
        );
    return this;
}
ImageData.prototype.getImageData = function (x, y = null, grayscale = 0) {
    let i = typeof y == 'number' ? (x + y * this.w) * 4 : x;
    let data = this.data.slice(i, i+3);

    return grayscale ? this.grayscale[i] : data;
}

const getCaptchaNumber = function (img, color, crop) {



    const drawPixel = function (x, y, data) {
        var index = (x + y * w) * 4;
        var i = 0;
        canvasData.data[index + 0] = data[i++];
        canvasData.data[index + 1] = data[i++];
        canvasData.data[index + 2] = data[i++];
        canvasData.data[index + 3] = data[i];
    }

    const cropCanvas = function (x, y, width, height) {
        var Tcanvas = new OffscreenCanvas(width, height),
            Tctx = Tcanvas.getContext('2d');
        Tctx.drawImage(ctx.canvas, x, y, width, height, 0, 0, width, height);
        return ctx = Tctx;
    }



    var size = 70,
        matchCount = 0,
        w = size,
        h = size;
    if (img.naturalWidth > img.naturalHeight) {
        w = img.width = size;
        h = w * (img.naturalHeight / img.naturalWidth);
    } else {
        h = img.height = size;
        w = h * (img.naturalWidth / img.naturalHeight);
    }
    var c = new OffscreenCanvas(w, h);
    var ctx1 = c.getContext('2d');
    ctx1.drawImage(img, 0, 0, w, h);
    var c1 = ctx1.getImageData(0, 0, w, h).setWidth(w);

    var canvas = new OffscreenCanvas(w, h);
    var ctx = canvas.getContext('2d'),
        canvasData = ctx.getImageData(0, 0, w, h),
        notFound = true,
        colorCount = -1,
        cropRect = {
            startX: -1,
            endX: -1,
            startY: -1,
            endY: -1
        };

    while (matchCount < 10 && ++colorCount < database.colors.length) {
        matchCount = 0;
        var c = database.colors[colorCount];
        for (var i = 0; i < w; i++)
            for (var j = 0; j < h; j++) {
                var data = c1.getImageData(i, j);
                if (isMatch(data, database.colorData[color ? color : c].rgb, database.colorData[color ? color : c].hueCorrection)) {
                    if (cropRect.startX === -1) cropRect.startX = i;
                    else cropRect.endX = i;
                    if (cropRect.startY === -1) cropRect.startY = j;
                    else {
                        if (cropRect.endY < j) cropRect.endY = j;
                        if (cropRect.startY > j) cropRect.startY = j;
                    }
                    matchCount++;
                    var pad = 0;
                    drawPixel(i, j, [0, 0, 0, 255]);
                } else drawPixel(i, j, [255, 255, 255, 255]);
            }
        if (color && matchCount < 10) return {
            result: "",
            color: undefined
        };
        colorCount;
    }

    ctx.putImageData(canvasData, 0, 0);

    if(crop)
        cropCanvas(cropRect.startX, cropRect.startY, cropRect.endX - cropRect.startX, cropRect.endY - cropRect.startY);

    w = ctx.canvas.width; h = ctx.canvas.height;
    var temp = document.createElement('canvas');
    temp.width = w; temp.height = h;
    temp = temp.getContext('2d');
    temp.putImageData(ctx.getImageData(0, 0, w, h), 0, 0);
    //$("body").append($("<img/>").attr("src", ctx.canvas.toDataURL()));
    return {
        ctx: temp,
        result: OCRAD(ctx.canvas, {
            numeric: true
        }),
        color: color ? color : database.colors[colorCount]
    };
}


const imgMatchesQuery = function (imgs, query, query2, callback) {
    // var targets = new Set();
    // for(const q of [query.split(', '), query2.split(', ')])
    //     for (const el of database.captcha[q[0]][q[1]]) 
    //         targets.add(capLinks[el][q[2]]);
    
    // var result = [];
    // imgs.each((i, el) => {
    //     if(targets.has(el.src.split('/').reverse()[0]))
    //         result.push(i);
    // });
    // callback(result);
    // return;
    var result = [],
        images = [];
    for (var i = 0; i < imgs.length; i += 2)
        images.push(imgs[i]);
    checkQuery(images, query, -1, function (id) {
        checkNumber(images[id], query, query2, function (r, ctx1) {
            result.push(r ? 2 * id : 2 * id + 1);
            $(".query.one+td>img").attr("src", imgs[r ? 2 * id : 2 * id + 1].src);
            checkQuery(images, query2, id, function (id2) {
                checkNumber(images[id2], query, query2, function (r2, ctx2) {
                    result.push(r2 ? 2 * id2 : 2 * id2 + 1);
                    $(".query.two+td>img").attr("src", imgs[r2 ? 2 * id2 : 2 * id2 + 1].src);
                    callback(result, [ctx1, ctx2]);
                });
            });
        });
    });
}

const checkNumber = function (img, query, query2, callback) {
    var image = document.createElement("img");
    image.onload = function () {
        query = query.split(", ");
        query2 = query2.split(", ");
        var nb = getCaptchaNumber(image);
        var num = parseInt(nb.result);
        callback((num == parseInt(query[2])) || (num == parseInt(query2[2])), nb.ctx);
    }
    image.src = img.src;
}

const checkQuery = function (imgs, query, exclude, callback) {
    var image = document.createElement("img"),
        results = {
            id: 0,
            value: 0
        },
        td = $(".query." + (exclude == -1 ? "one" : "two")).text(query),
        src = imgs[0].src,
        c = 0;


    compareImgs(imgs[0].src, query, function f(result) {
        if (result > results.value) {
            td.next().find("img").attr("src", src);
            results = {
                id: c,
                value: result
            };
        }
        let id = c + 1 == exclude ? c + 2 : c + 1;
        if (id < imgs.length) {
            c = id;
            compareImgs(src = imgs[id].src, query, f);
        } else callback(results.id);
    });
}


const compareImgs = function (img, query, callback) {
    var query = query.split(", ");
    var result = 0;
    if (!database.captcha[query[0]] || !database.captcha[query[0]][query[1]]) {
        callback(result);
        return;
    }
    var ids = database.captcha[query[0]][query[1]],
        image = document.createElement("img"),
        i = 0;

    image.crossOrigin = "Anonymous";
    image.onload = function () {
        imgsMatch(img, image, function (d) {
            result = Math.max(d, result);
            if (++i < ids.length)
                image.src = chrome.extension.getURL("imgs/captcha/captcha (" + ids[i] + ").jpg");
            else callback(result);
        })

    }
    image.src = chrome.extension.getURL("imgs/captcha/captcha (" + ids[0] + ").jpg");


}

const imgsMatch = function (img1, img2, callback) {
    var size = 20,
        comparisonArea = 0,
        matchCount = 0,
        load = 0;
    img1 = $("<img/>").attr("src", img1)[0];
    img1.width = img1.height = size;
    img2.width = img2.height = size;

    img1.onload = function () {
        f();
    }

    function f() {
        var w = size,
            h = size;
        var c = new OffscreenCanvas(w, h);
        var ctx1 = c.getContext('2d');
        ctx1.drawImage(img1, 0, 0, w, h);
        var imgd1 = ctx1.getImageData(0, 0, w, h).setWidth(w);
        var c = new OffscreenCanvas(w, h);
        var ctx2 = c.getContext('2d');
        ctx2.drawImage(img2, 0, 0, w, h);
        var imgd2 = ctx2.getImageData(0, 0, w, h).setWidth(w);


        for (var i = 0; i < w; i++)
            for (var j = 0; j < h; j++) {
                var data = imgd1.getImageData(i, j);
                if (!isMatch(data, [255, 255, 255], [5, 5, 5])) {
                    comparisonArea++;
                    var diff = 6;
                    for (var k = (Math.min(i, j) > diff ? -diff : -Math.min(i, j)); k < diff; k++) {
                        var c1 = imgd2.getImageData(i + k < 0 ? 0 : i + k, j),
                            c2 = imgd2.getImageData(i, j + k < 0 ? 0 : j + k);
                        if (isMatch(data, c1) || isMatch(data, c2)) {
                            matchCount++;
                            break;
                        }
                    }
                }
            }
        callback(matchCount);
    }

}
const isMatch = function (a, b, d = [2, 2, 2]) {
    return Math.abs(a[0] - b[0]) < d[0] && Math.abs(a[1] - b[1]) < d[1] && Math.abs(a[2] - b[2]) < d[2];
}


const reportCaptcha = function (q1, img1, nctx1, q2, img2, nctx2) {
    try {
        var data = localStorage.getItem("capData");
        data = data ? JSON.parse(data) : [];
        
        var canv = document.createElement("canvas");

        var ctx1 = getCaptchaNumber(img1, undefined, 1).ctx.canvas.toDataURL().split(",")[1];
        var ctx2 = getCaptchaNumber(img2, undefined, 1).ctx.canvas.toDataURL().split(",")[1];
        
        canv.getContext('2d').drawImage(img1, 0, 0, canv.width = img1.naturalWidth, canv.height = img1.naturalHeight);
        img1 = canv.toDataURL().split(",")[1];
        
        canv.getContext('2d').drawImage(img2, 0, 0, canv.width = img2.naturalWidth, canv.height = img2.naturalHeight);
        img2 = canv.toDataURL().split(",")[1];
        
        data.push([
            `${q1}, ${img1}, ${ctx1}`,
            `${q2}, ${img2}, ${ctx2}`
        ]);
        localStorage.setItem("capData", JSON.stringify(data));
    } catch (error) {
        console.error(error);
    }
    
}

var a = document.createElement("a");

const download = function (url, caption) {
    a.href = url;
    a.download = caption;
    a.click();
}


const predictImgId = function(img, tree){
    const validateCond = function(cond){
        cond = cond.join('').replace(/(\d+)/g, 'X[$1]');
        return eval(cond);
    };
    let s = tree.size,
        t = tree.tree;
        
    var X = cv.imread(img);
    var dsize = new cv.Size(s, s);
    cv.cvtColor(X, X, cv.COLOR_RGB2GRAY, 0);
    cv.resize(X, X, dsize);
    X = X.data;

    let step = 0;

    while(1){
        if(typeof t[step].prediction == 'number') break;

        step = t[step][validateCond(t[step].condition)];

    }

    return tree.y[t[step].prediction];


}


setTimeout(() => {
    $('#formVerify1 img').each(function () {
        console.log(predictImgId(this, trees.captchaTree));
    });
}, 5000);


// let trees = {
//     'captchaTree': {
//         size: 40,
//         tree: {},
//         y: [1,2,3,4,76,77,78,79,80,81,82,83,93,99,104,119,122,127,149,151,161,162,164,176,179,180,181,182,184,186,187,188,189,191,192,194,197,198,199,200,201,202,203,206,207,208,211,214,217,219,220,221,222,223,224,225,226,227,229,230,232,234,235,239,240,242,243,245,250,252,254,256,262,263,267,269,271,273,275,278,279,283,284,287,288,290,294,295,296,298,304,305,307,308,309,310,311,312,313,314,316,317,318,319,320,321,323,324,325,326,327,328,329,330,331,332,334,335,336,337,338]
//     },
//     'numbersTree': {
//         size: 20,
//         tree: {},
//         y: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
//     }
// };
// for(var k in trees)
//     (function (k) {
//        fetch(chrome.runtime.getURL(`/decisionTrees/${k}.json`))
//             .then(t => t.text())
//             .then(t => trees[k].tree = JSON.parse(t)); 
//     })(k);
    
