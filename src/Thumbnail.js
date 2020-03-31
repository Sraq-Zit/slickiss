class Thumbnail {
    static counter = 0;

    /** Video element to grab thumbnails from
     * @type {JQuery<HTMLVideoElement>}
     */
    v;

    /** Array of thumbnails
     * @type {{canvas:HTMLCanvasElement; ready:boolean;}[]}
     */
    preview;

    /** Queue of requested thumbnails 
     * @type {number[]}
     */
    queue;

    /** Indexing of thumbnails' order
     * @type {number[]}
     */
    order;

    /** Whether the video is ready to preview
     * @type {boolean}
     */
    isReady;

    /** Handlers when a new thumbnail is loaded
     * @type {((e: {obj: Thumbnail; from: number; to: number;}) => void)[]}
     */
    handlers;

    /** Preview span of time
     * @DEFAULT 5
     */
    static PREVIEW_SPAN = 5;

    /** Max number of thumbnails
     * @DEFAULT 500
     */
    static MAX_THUMBNAILS = 500;

    /** Thumbnail width
     * @DEFAULT 142
     */
    static WIDTH = 142;

    /** Thumbnail height
     * @DEFAULT 80
     */
    static HEIGHT = 80;

    /** Inistantiate object of this class
     * @param {string} src Video source
     */
    constructor(src) {
        this.id = Thumbnail.counter++;
        if (!src) return;
        this.v = $('<video/>');
        this.preview = [];
        this.queue = [];
        this.order = [];
        this.isReady = false;
        this.v.on('canplay', e => {
            if (this.isReady === false) {
                this.isReady = true;
                Thumbnail.PREVIEW_SPAN = Math.max(
                    Thumbnail.PREVIEW_SPAN, Math.floor(this.v[0].duration / Thumbnail.MAX_THUMBNAILS)
                );
                for (let i = 0; i < Math.floor(this.v[0].duration / Thumbnail.PREVIEW_SPAN); i++) {
                    this.preview.push({ canvas: null, ready: false });
                    this.queue.push(i);
                    this.order.push(i);
                }
                this.queue = this.queue.reverse();
                this.order = this.order.reverse();
                this.queue.pop();
                this.v[0].currentTime = 0;
            }
        });
        this.v.on('seeked', e => {
            if (!this.isReady) return;
            this.v[0].pause();


            const t = this.timeToIndex(this.v[0].currentTime);
            if (this.preview[t].isReady) console.log('wtf already ready!');
            this.preview[t].ready = true;

            this.preview[t].canvas = this.preview[t].canvas || document.createElement('canvas');
            this.preview[t].canvas.width = Thumbnail.WIDTH;
            this.preview[t].canvas.height = Thumbnail.HEIGHT;

            this.preview[t].canvas.getContext('2d')
                .drawImage(this.v[0], 0, 0, Thumbnail.WIDTH, Thumbnail.HEIGHT);

            this.dispatch({
                obj: this,
                from: this.v[0].currentTime,
                to: this.v[0].currentTime + Thumbnail.PREVIEW_SPAN
            });

            if (this.queue.length)
                this.v[0].currentTime = this.queue.pop() * Thumbnail.PREVIEW_SPAN;
        });

        this.v[0].src = src;

    }

    /** Give the given thumbnail priority to load
     * @param {number} t Thumbnail index
     */
    prioritize(t) {
        if (!this.isReady || t == this.queue[this.queue.length - 1]) return;
        const last = this.queue.pop();
        this.queue.splice(this.order[t], 1);
        this.order[last] = this.queue.push(last) - 1;
        this.order[t] = this.queue.push(t) - 1;
    }

    /** Get thumbnail on given time and higher its priority if not loaded yet
     * @param {number} time Time in seconds
     */
    retrieve(time) {
        if (!this.isReady) return;

        time = this.timeToIndex(time);
        if (!this.preview[time].ready) {
            this.prioritize(time);
            const c = document.createElement('canvas');
            c.width = Thumbnail.WIDTH;
            c.height = Thumbnail.HEIGHT / 2;
            const ctx = c.getContext('2d');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '20px Arial';
            ctx.fillText('Loading..', c.width / 2, c.height / 2);
            return this.preview[time].canvas = c;
        }

        return this.preview[time].canvas;
    }

    /** Convert given time to its index according to the preview splitting
     * @param {number} time Time in seconds
     * @returns {number}
     */
    timeToIndex(time) {
        return Math.floor(time / Thumbnail.PREVIEW_SPAN);
    }


    /** Attach handler when a new thumbnail is loaded 
     * @param {(e: {obj: Thumbnail; from: number; to: number;}) => void} callback Handler to attach
     */
    onTLoad(callback) {
        if (!this.handlers) this.handlers = [];
        this.handlers.push(callback);
    }

    /** Dispatch triggered event on all handlers
     * @param {{obj: Thumbnail; from: number; to: number;}} ev Event data 
     */
    dispatch(ev) {
        for (const h of this.handlers) h(ev);
    }

    /** Abort all the process the destroy objects */
    destroy() {
        this.isReady = false;
        this.preview = this.queue = this.order = null;
        if (this.v) {
            this.v[0].src = '';
            this.v.off('canplay seeked');
            this.v.remove();
            this.v = null;
        }
    }

}