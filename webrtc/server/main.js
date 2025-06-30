const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');
const cors = require('cors')
const app = express();
app.use(cors())
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let worker, router;
const peers = {}; // socket.id => transports, producers, consumers

async function init() {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({
    mediaCodecs: [{ kind: "video", mimeType: "video/VP8", clockRate: 90000 }]
  });
}
init();

io.on('connection', socket => {
  peers[socket.id] = {};

  socket.on('getRtpCapabilities', (data, cb) => cb(router.rtpCapabilities));

  socket.on('createTransport', async ({ direction }, cb) => {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '127.0.0.1', announcedIp: '127.0.0.1' }],
      enableUdp: false,
      enableTcp: true,
      preferUdp: false,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') transport.close();
    });
    peers[socket.id][`${direction}Transport`] = transport;
    cb({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });
  });

  socket.on('connectTransport', async ({ direction, dtlsParameters }, cb) => {
    await peers[socket.id][`${direction}Transport`].connect({ dtlsParameters });
    cb();
  });

  socket.on('produce', async ({ kind, rtpParameters }, cb) => {
    const producer = await peers[socket.id].sendTransport.produce({ kind, rtpParameters });
    peers[socket.id].producer = producer;
    cb({ id: producer.id });
    // Notify viewers
    socket.broadcast.emit('newProducer', { producerId: producer.id });
  });

  socket.on('consume', async ({ rtpCapabilities, producerId }, cb) => {
    if (!router.canConsume({ producerId, rtpCapabilities })) return;
    const consumer = await peers[socket.id].recvTransport.consume({
      producerId, rtpCapabilities, paused: false
    });
    peers[socket.id].consumer = consumer;
    cb({
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    });
  });

  socket.on('resume', async (_, cb) => {
    await peers[socket.id].consumer.resume();
    cb();
  });

  socket.on('disconnect', () => {
    const p = peers[socket.id];
    if (p.sendTransport) p.sendTransport.close();
    if (p.recvTransport) p.recvTransport.close();
    if (p.producer) p.producer.close();
    if (p.consumer) p.consumer.close();
    delete peers[socket.id];
  });
});

server.listen(3000, () => console.log('Mediasoup server on http://localhost:3000'));
