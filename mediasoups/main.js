
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');
const mediasoup = require('mediasoup');
//ffmpeg -re -f dshow -i video="USB CAMERA" -vcodec libx264 -an -f rtp -ssrc 222222 rtp://127.0.0.1:16668
//ffmpeg -re -f dshow -i video="5MP USB Camera" -vcodec libx264 -an -f rtp -ssrc 222222 rtp://192.168.10.195:34138
//ffmpeg -re -f dshow -video_size 1280x720 -framerate 30 -rtbufsize 200M -i video="5MP USB Camera" -vcodec libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -b:v 3000k -maxrate 3000k -bufsize 6000k -g 30 -keyint_min 30 -an -f rtp -ssrc 222222 rtp://154.144.229.22:36690
// ffmpeg -re \
//     -f v4l2 -input_format yuyv422 -video_size 320x240 -framerate 15 -i /dev/video2 \
//     -pix_fmt yuv420p \
//     -vcodec libx264 -preset ultrafast -tune zerolatency \
//     -b:v 250k -maxrate 250k -bufsize 500k \
//     -an -f rtp -ssrc 222222 rtp://54.36.62.219:5603
//ffmpeg -re -f dshow -video_size 1280x720 -framerate 30 -rtbufsize 200M -i video="Integrated Camera" -vcodec libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -b:v 3000k -maxrate 3000k -bufsize 6000k -g 30 -keyint_min 30 -an -f rtp -ssrc 222222 rtp://192.168.10.195:5603

let isRtpError = false;

const app = express();
app.use(cors())
let lastRtpTime = Date.now();
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


  
  await recreateProducer()
  setInterval(async () => {
    console.log(lastRtpTime)
    const now = Date.now();
    const diff = now - lastRtpTime;
    if (diff > 5000) { 
      console.warn(` RTP inactivity detected. Last packet was ${diff}ms ago.`);
      await recreateProducer();
    }
  }, 4000);
 

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

  setInterval(()=>{
    if(isRtpError)
      {
        console.log("sending error producer");
        socket.emit('streamError',true);
        isRtpError = false;
      }
    
  },1000)

});

server.listen(3009, () => {
  console.log('Server running on http://localhost:3000');
});

async function recreateProducer() {
  try {
    
   
    if (producer) {
      producer.close();
    }
    if (plainTransport) {
      plainTransport.close();
      plainTransport = null;
    }
    plainTransport = await router.createPlainTransport({
      listenIp: '0.0.0.0',
      rtcpMux: true,
      comedia: true,
      enableTcp: true,               
      enableUdp: false,               
      preferTcp: true, 
      port:5603,
    });
    plainTransport.observer.on('packet', (packet) => {
      console.log('PlainTransport received RTP packet:', packet.length, 'bytes');
    });
    console.log('Send RTP to:', plainTransport.tuple.localIp, plainTransport.tuple.localPort);
  
    plainTransport.on('listenererror',(eventName,error)=>{
      console.log(eventName,error);
    })
  
    plainTransport.on('tuple',(eventName,event)=>{
      console.log('trave',eventName,event)
    })
  
    plainTransport.observer.on('trace',(eventName,event)=>{
      console.log('trace',eventName,event)
    })
    
    producer = await plainTransport.produce({
      id:'a9906fe1-b06e-4580-8eaa-e6d19023f494',
      kind: 'video',
      rtpParameters: {
        codecs: [
          {
            mimeType: 'video/H264',
            clockRate: 90000,
            payloadType: 96,
            parameters: {},
            rtcpFeedback: [],
          },
        ],
        encodings: [{ ssrc: 222222 }],
      },
    });

    producer.enableTraceEvent(['rtp']);
    console.log('Producer recreated at', new Date());
    producer.on('listenererror',(eventName,event)=>{
    
      console.log("listenError Producer",(eventName,event))
    });
  
  producer.on('trace',(traceEvent)=>{
    if(traceEvent.type === 'rtp') {
      lastRtpTime = new Date()
    }
  })
  // producer.observer.on('trace',(eventName)=>{
  //   if(eventName.type === 'rtp') {
  //     console.log("event rtp observer")
  //     lastRtpTime = new Date()
  //   }
  // })
    producer.on('score', (score) => {
      console.log('Producer score updated:', score);
    });
    console.log('Producer created:', producer.id);
    isRtpError = true;

  } catch (error) {
    console.error(error);
  }
}