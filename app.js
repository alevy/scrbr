const url = "/test-ep-short.mp4";
const audioCtx = new (AudioContext || webkitAudioContext)();

function visualize(clipBuffer, canvas, zoom) {
    const dpr = window.devicePixelRatio || 1;
    canvas.height = canvas.offsetHeight * dpr;

    const ctx = canvas.getContext("2d");
    const chan1 = clipBuffer.getChannelData(0);
    const chan2 = clipBuffer.getChannelData(0);
    const sampleRate = clipBuffer.sampleRate;
    
    const blockSize = sampleRate / zoom;
    const points = chan1.length / blockSize;

    canvas.width = (points * 5 + 4) * dpr;
    canvas.offsetWidth = (points * 5 + 4);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, canvas.height / 4 - 1, canvas.width, 2);
    ctx.fillRect(0, canvas.height * 3 / 4 - 1, canvas.width, 2);
    for (let i = 0; i < points; i++) {
        const idx = i * blockSize;
        const data1 = chan1.slice(idx, idx + blockSize).map(Math.abs);
        const avg1 = data1.reduce((a,b) => a + b, 0) / data1.length;
        const sample1 = avg1 * (canvas.height / 4 - 10);
        const data2 = chan2.slice(idx, idx + blockSize).map(Math.abs);
        const avg2 = data2.reduce((a,b) => a + b, 0) / data2.length;
        const sample2 = avg2 * (canvas.height / 4 - 10);

        ctx.fillRect(i * 5, canvas.height / 4 - sample1, 4, sample1 * 2);
        ctx.fillRect(i * 5, canvas.height * 3 / 4 - sample2, 4, sample2 * 2);
    }
}

function drawCursor(clipBuffer, canvas, zoom, cursorTime) {
    const dpr = window.devicePixelRatio || 1;
    canvas.height = canvas.offsetHeight * dpr;

    const ctx = canvas.getContext("2d");
    const chan1 = clipBuffer.getChannelData(0);
    const sampleRate = clipBuffer.sampleRate;
    
    const blockSize = sampleRate / zoom;
    const points = chan1.length / blockSize;
    const cursorPoint = cursorTime * zoom * 5;

    canvas.width = (points * 5 + 4) * dpr;
    canvas.offsetWidth = (points * 5 + 4);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(cursorPoint, 0, 1, canvas.height);
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
        zoom: 1,
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
        audio.src = url;
        this.audioBuffer = await fetch(url)
                                .then(response => response.arrayBuffer())
                                .then(ab => audioCtx.decodeAudioData(ab));
    },
    watch: {
        currentPlayTimeMillis(val) {
            if (this.audioBuffer) {
                const cursor = this.$el.querySelector("#cursor");
                drawCursor(this.audioBuffer, cursor, this.zoom, val / 1000);
            }
        },
        zoom(val) {
            const waveform = this.$el.querySelector("#waveform");
            visualize(this.audioBuffer, waveform, val);
        },
        audioBuffer(buffer) {
            const waveform = this.$el.querySelector("#waveform");
            visualize(buffer, waveform, this.zoom);
            const cursor = this.$el.querySelector("#cursor");
            drawCursor(buffer, cursor, this.zoom, this.currentPlayTimeMillis / 1000);
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
            const cursorPoint = currentTime * this.zoom * 5;
            const cursor = this.$el.querySelector("#cursor");
            const container = cursor.parentElement;
            const lateBreakPoint = container.offsetWidth + container.scrollLeft - 100;
            const earlyBreakPoint = container.scrollLeft + 100;
            if (cursorPoint > lateBreakPoint && movingForward) {
                container.scrollTo({ left: lateBreakPoint - 50, behavior: 'smooth' });
            } else if (cursorPoint < earlyBreakPoint && !movingForward) {
                container.scrollTo({ left: earlyBreakPoint - container.offsetWidth, behavior: 'smooth' });
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
                audio.currentTime = e.layerX / this.zoom / 5;
                const moveHandler = (e) => {
                    audio.currentTime = e.layerX / this.zoom / 5;
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