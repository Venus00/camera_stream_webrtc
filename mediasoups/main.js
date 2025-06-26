
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');
const mediasoup = require('mediasoup');
//ffmpeg -re -f dshow -i video="USB CAMERA" -vcodec libx264 -an -f rtp -ssrc 222222 rtp://127.0.0.1:16668
//ffmpeg -re -f dshow -i video="5MP USB Camera" -vcodec libx264 -an -f rtp -ssrc 222222 rtp://192.168.10.195:34138
//ffmpeg -re -f dshow -video_size 1280x720 -framerate 30 -rtbufsize 200M -i video="5MP USB Camera" -vcodec libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -b:v 3000k -maxrate 3000k -bufsize 6000k -g 30 -keyint_min 30 -an -f rtp -ssrc 222222 rtp://154.144.229.22:36690
const app = express();
app.use(cors())

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
  }
});

const mediaCodecs = [
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {},

  },
];

let worker, router, plainTransport, producer;
const consumers = new Map();

(async () => {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({ mediaCodecs });

  plainTransport = await router.createPlainTransport({
    listenIp: '0.0.0.0',
    rtcpMux: true,
    comedia: true,
    enableTcp: true,               
    enableUdp: false,               
    preferTcp: true, 
    port:5603
  });

  console.log('Send RTP to:', plainTransport.tuple.localIp, plainTransport.tuple.localPort);

  let lastRtpTime = Date.now();





  plainTransport.observer.on('tuple', (tuple) => {
    console.log('PlainTransport tuple event:', tuple);
  });

  plainTransport.observer.on('packet', (packet) => {
    console.log('PlainTransport received RTP packet:', packet.length, 'bytes');
    lastRtpTime = Date.now();

  });
  producer = await plainTransport.produce({
    kind: 'video',
    rtpParameters: {
      codecs: [
        {
          mimeType: 'video/H264',
          clockRate: 90000,
          payloadType: 96,
          rtcpFeedback: [],
          parameters: {},
        },
      ],
      encodings: [{ ssrc: 222222 }],
    },
  });

  setInterval(async () => {
    if (Date.now() - lastRtpTime > 5000 && producer) {
      console.log('No RTP packets received for 5s, closing producer...');
      await producer.close();
      producer = null;
      producer = await plainTransport.produce({
        kind: 'video',
        rtpParameters: {
          codecs: [
            {
              mimeType: 'video/H264',
              clockRate: 90000,
              payloadType: 96,
              rtcpFeedback: [],
              parameters: {},
            },
          ],
          encodings: [{ ssrc: 222222 }],
        },
      });
    }
  }, 1000);


  producer.on('score', (score) => {
    console.log('Producer score updated:', score);
  });
  producer.on('trace', (trace) => {
    console.log('Producer trace updated:', trace);
  });

  producer.on('transportclose', () => {
    console.log('Producer transport closed');
  });
  console.log('Producer created:', producer.id);
})();

io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('getRouterRtpCapabilities', (cb) => {
    cb(router.rtpCapabilities);
  });

  socket.on('createWebRtcTransport', async (_, cb) => {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: '54.36.62.219' }],

      enableUdp: false,
      enableTcp: true,
      preferTcp: true,
    });
    transport.on('connectionstatechange', (state) => {
      console.log(`Transport connection state for ${socket.id}: ${state}`);
    });
    console.log('RTP port:', plainTransport.tuple.localPort);

    consumers.set(socket.id, { transport });

    cb({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      producerIds: [producer.id],
    });

    socket.on('connectWebRtcTransport', async ({ dtlsParameters }) => {
      console.log('connectWebRtcTransport', dtlsParameters)
      try {
        await transport.connect({ dtlsParameters });
        console.log('WebRTC transport connected for client:', socket.id);
        transport.on('connectionstatechange', (state) => {
          console.log(`Transport state for ${socket.id}: ${state}`);
        });
      } catch (err) {
        console.error('Transport connect error:', err);
      }
    });

    socket.on('consume', async (cb) => {
      if (!producer) return;
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities,
        paused: false,
      });
      await consumer.resume();
      console.log('Consumer created:', consumer.id, consumer.kind);

      consumers.get(socket.id).consumer = consumer;

      cb({
        id: consumer.id,
        producerId: producer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    });
  });

  socket.on('disconnect', () => {
    const user = consumers.get(socket.id);
    if (user?.consumer) user.consumer.close();
    if (user?.transport) user.transport.close();
    consumers.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(3009, () => {
  console.log('Server running on http://localhost:3000');
});