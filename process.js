const fs = require('fs');
const decode = require('audio-decode');

const buffer = fs.readFileSync('test-ep.wav');

const zoom = 20;


decode(buffer, (err, clipBuffer) => {
    console.log(clipBuffer.numberOfChannels, clipBuffer.duration, clipBuffer.length);
    const chan1 = clipBuffer.getChannelData(0);
    const chan2 = clipBuffer.getChannelData(1);
    const sampleRate = clipBuffer.sampleRate;
    
    const blockSize = sampleRate / zoom;
    const points = Math.ceil(clipBuffer.length / blockSize);
    console.log(points, zoom, blockSize, clipBuffer.length);

    const result = new ArrayBuffer(points * 8 + 8);
    const view = new DataView(result);
    view.setUint32(0, zoom); // fractions of a second in each point
    view.setUint32(4, points); // num points

    for (let i = 0; i < points; i++) {
        const idx = i * blockSize;
        const data1 = chan1.slice(idx, idx + blockSize).map(Math.abs);
        const avg1 = data1.reduce((a,b) => a > b ? a : b, 0);
        const data2 = chan2.slice(idx, idx + blockSize).map(Math.abs);
        const avg2 = data2.reduce((a,b) => a > b ? a : b, 0);

        view.setFloat32(8 + i * 8, avg1);
        view.setFloat32(8 + i * 8 + 4, avg2);
    }
    fs.writeFileSync('test-ep.pcm', new Buffer(result));
});