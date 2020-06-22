/** Clip recorder */
class VideoRecorder {

    /** @param {HTMLVideoElement} v */
    constructor(v) {
        /** Video element whose stream is to be recorded 
         * @type {HTMLVideoElement}
         */
        this.v = v

        /** Chunks of media recorded data
         * @type {Blob[]}
         */
        this.data;

        /** Whether it's recording */
        this.recording = false;

        /** Event triggered when full size updated */
        this.onsizeupdate = false;

        /** Media recorder object
         * @type {MediaRecorder}
         */
        this.recorder;

        /** Interval id
         * @type {number}
         */
        this.inrId;

        /** Size of the media */
        this.mediaSize = 0
    }

    /** Start recording */
    async record() {
        this.recorder = new MediaRecorder(this.v.captureStream());
        this.data = [];
        this.mediaSize = 0;
        if (typeof this.onsizeupdate != 'function') this.onsizeupdate = _ => _;
        this.recorder.ondataavailable = e => {
            if (!e.data.size) return;
            this.data.push(e.data)
            this.onsizeupdate(this.mediaSize += e.data.size);
        };
        this.recorder.onerror = e => this.stop() && alert(e.error.name);
        this.inrId = setInterval(() => this.recorder.requestData(), 500);
        await this.v.play();
        $(this.v).on('pause waiting', _ => this.recorder.state == "recording" && this.recorder.pause());
        $(this.v).on('play canplay', _ => this.recorder.state == "paused" && this.recorder.resume());
        this.v.onerror = _ => this.stop();
        this.recorder.start();
        this.recording = true;
    }

    /** Stop recording 
     * @returns {Promise<Blob>} 
     */
    async stop() {
        return new Promise(r => {
            this.recording = false;
            this.recorder.onstop = e => r(new Blob(this.data, { type: 'video/webm' }));
            this.recorder.stop();
            this.v.pause();
            clearInterval(this.inrId);
        })
    }


}