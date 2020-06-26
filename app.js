const mp3Url = "/test-ep.mp3";
const pcmUrl = "/test-ep.pcm";
const dpr = window.devicePixelRatio || 1;

function visualize(clipBuffer, canvas) {
    canvas.height = canvas.offsetHeight * dpr;

    const ctx = canvas.getContext("2d");

    const view = clipBuffer.buffer;
    const nativeZoom = clipBuffer.zoom;
    const points = clipBuffer.length;
    canvas.width = points;
    canvas.offsetWidth = points * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#43da97';
    ctx.fillRect(0, canvas.height / 4 - 1, canvas.width, 2);
    ctx.fillRect(0, canvas.height * 3 / 4 - 1, canvas.width, 2);
    for (let i = 0; i < points; i++) {
        const idx = i * 8 + 8;
        const sample1 = view.getFloat32(idx) * (canvas.height / 4 - 10);
        const sample2 = view.getFloat32(idx + 4) * (canvas.height / 4 - 10);
        ctx.fillRect(i, canvas.height / 4 - sample1, 1, sample1 * 2);
        ctx.fillRect(i, canvas.height * 3 / 4 - sample2, 1, sample2 * 2);
    }
}

function drawCursor(clipBuffer, canvas, cursorTime) {
    canvas.height = canvas.offsetHeight * dpr;

    const ctx = canvas.getContext("2d");
    const view = clipBuffer.buffer;
    const nativeZoom = clipBuffer.zoom;
    const points = clipBuffer.length;
    const cursorPoint = cursorTime * nativeZoom;

    canvas.width = points;
    canvas.offsetWidth = points * dpr;

    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(cursorPoint, 0, 2, canvas.height);
}

function millisToTimestring(ms) {
    const millis = Math.floor(ms % 1000);
    const secs = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 1000 / 60);
    let millisStr = millis < 100 ? (millis < 10 ? "00" + millis : "0" + millis) : millis;
    let secsStr = secs < 10 ? "0" + secs : secs;
    let minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return minutesStr + ":" + secsStr + ":" + millisStr
}

class Timestamp {
    constructor(milliseconds) {
        this.milliseconds = milliseconds;
    }
    toString() {
        return millisToTimestring(this.milliseconds);
    }
}

var app = new Vue({
    el: ".workspace",
    data: {
        currentPlayTime: new Timestamp(0),
        audioBuffer: null,
        currentUser: "",
        comments: [
            {
                user: "Shannen Blaie",
                posted: Date.parse("June 22, 2020"),
                timestamp: new Timestamp(95001),
                comment: "This Target is generally clean, but the shelves are always empty and aisles full of baskets with things that need to be put away. If you come here there’s a good chance one of the things on y",
            },
            {
                user: "Oren iShii",
                posted: Date.parse("June 22, 2020"),
                timestamp: new Timestamp(92002),
                comment: "So goood! Food prices are lower than Safeway’s as far as I can tell. 1 lb of cherries $2.99 sale - 2 baskets of raspberries $5 bucks. Everything under the sun here plus friendly and helpful staff. Making this",
            },
        ],
    },
    async mounted() {
        const audio = this.$el.querySelector("audio");
        audio.src = mp3Url;
        let buffer = await fetch(pcmUrl)
                           .then(response => response.arrayBuffer());
        const view = new DataView(buffer);
        const points = view.getUint32(4);
        const nativeZoom = view.getUint32(0); // 1 / nativeZoom = seconds/point
        this.audioBuffer = {
            buffer: view,
            length: points,
            zoom: nativeZoom,
        }
    },
    watch: {
        currentPlayTimeMillis(val) {
            if (this.audioBuffer) {
                const cursor = this.$el.querySelector("#cursor");
                drawCursor(this.audioBuffer, cursor, val / 1000);
            }
        },
        audioBuffer(buffer) {
            const waveform = this.$el.querySelector("#waveform");
            visualize(buffer, waveform);
            const cursor = this.$el.querySelector("#cursor");
            drawCursor(buffer, cursor, this.currentPlayTimeMillis / 1000);
        }
    },
    methods: {
        play() {
            const audio = this.$el.querySelector("audio")
            if (audio.paused) {
                this.$el.querySelector("audio").currentTime = this.currentPlayTimeMillis / 1000;
                this.$el.querySelector("audio").play();
            }
        },
        pause() {
            this.$el.querySelector("audio").pause();
        },
        stop() {
            const audio = this.$el.querySelector("audio")
            audio.pause();
            audio.currentTime = 0;
        },
        rewind() {
            const audio = this.$el.querySelector("audio")
            audio.currentTime -= 30;
        },
        fastforward() {
            const audio = this.$el.querySelector("audio")
            audio.currentTime += 30;
        },
        updateCurrentTime() {
            const currentTime = this.$el.querySelector("audio").currentTime
            const movingForward = currentTime * 1000 > this.currentPlayTimeMillis;
            this.currentPlayTime.milliseconds = currentTime * 1000;
            const cursorPoint = currentTime * this.audioBuffer.zoom / dpr;
            const cursor = this.$el.querySelector("#cursor");
            const container = cursor.parentElement;
            const lateBreakPoint = container.offsetWidth + container.scrollLeft - 100;
            const earlyBreakPoint = container.scrollLeft + 100;
            if (cursorPoint > lateBreakPoint && movingForward) {
                container.scrollTo({ left: cursorPoint - 100, behavior: 'smooth' });
            } else if (cursorPoint < earlyBreakPoint && !movingForward) {
                container.scrollTo({ left: cursorPoint + 100 - container.offsetWidth , behavior: 'smooth' });
            }
            this.comments.forEach((comment) => {
                if (Math.abs(this.currentPlayTimeMillis - comment.timestamp.milliseconds) < 1000) {
                        comment.highlighted = true;
                    } else {
                        comment.highlighted = false;
                    }
            });
        },
        startScrub(e) {
            if (this.audioBuffer) {
                const audio = this.$el.querySelector("audio");
                audio.currentTime = e.layerX * dpr / this.audioBuffer.zoom;
                const moveHandler = (e) => {
                    audio.currentTime = e.layerX * dpr / this.audioBuffer.zoom;
                }
                const mouseupHandler = () => {
                    e.target.removeEventListener("mousemove", moveHandler);
                    e.target.removeEventListener("mouseup", mouseupHandler);
                }
                e.target.addEventListener("mousemove", moveHandler);
                e.target.addEventListener("mouseup", mouseupHandler);
            }
        },
        makeComment(e) {
            this.comments.push({
                comment: prompt("What's your comment?"),
                user: this.currentUser,
                posted: Date.now(),
                timestamp: new Timestamp(this.currentPlayTime.milliseconds),
            });
        },
        scrollAndPauseTo(ts) {
            const audio = this.$el.querySelector("audio")
            audio.pause();
            audio.currentTime = ts.milliseconds / 1000;
        }
    },
    computed: {
        currentPlayTimeMillis() {
            return this.currentPlayTime.milliseconds;
        },
        orderedComments: function() {
            let res = this.comments;
            res.sort(function(e1, e2) {
                if (e1.timestamp.milliseconds < e2.timestamp.milliseconds) {
                    return -1;
                }
                if (e1.timestamp.milliseconds > e2.timestamp.milliseconds) {
                    return 1;
                }
                if (e1.posted < e2.posted) {
                    return -1;
                }
                if (e1.posted > e2.posted) {
                    return 1
                }
                return 0;
            });
            return res;
        },
    }
})