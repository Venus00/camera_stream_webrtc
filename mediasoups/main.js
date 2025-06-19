// Simple mediasoup signaling server for RTP Producer + WebRTC Consumers
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');
const mediasoup = require('mediasoup');

const app = express();
app.use(cors())

const server = http.createServer(app);
const io = socketIO(server,{
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
    listenIp: '127.0.0.1',
    rtcpMux: false,
    comedia: true,
  });

  console.log('Send RTP to:', plainTransport.tuple.localIp, plainTransport.tuple.localPort);
  plainTransport.on('trace', (trace) => {
    console.log('PlainTransport trace event:', trace);
  });
  
  plainTransport.on('packet', (packet) => {
    console.log('PlainTransport received RTP packet:', packet.length, 'bytes');
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
  producer.on('score', (score) => {
    console.log('Producer score updated:', score);
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
        listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }],

      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
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
      producerId: producer.id,
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
setInterval(async () => {
    if (producer) {
      const stats = await producer.getStats();
      console.log('Producer stats:', stats);
    }
  }, 5000);
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

