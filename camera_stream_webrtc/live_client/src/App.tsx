import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

const VideoViewer = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const socket = io('http://localhost:3000'); // connect to signaling server
    let device;
    let transport;

    async function start() {
      // 1. Get router RTP capabilities from server
      const rtpCapabilities = await new Promise(resolve => {
        socket.emit('getRouterRtpCapabilities', resolve);
      });
      console.log(rtpCapabilities)
      // 2. Create mediasoup device and load RTP capabilities
      device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });

      // 3. Create recv WebRTC transport on server & client
      const transportInfo = await new Promise(resolve => {
        socket.emit('createWebRtcTransport', {}, resolve);
      });
      console.log(transportInfo)
      transport = device.createRecvTransport(transportInfo);
      console.log('transport', transport)
      // 4. Connect transport DTLS parameters to server
  
      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectWebRtcTransport', { dtlsParameters });
        callback();
      });

      // 5. Create consumer for the producer (FFmpeg stream)
      const consumerInfo = await new Promise(resolve => {
        socket.emit('consume', resolve);
      });
      console.log("conso",consumerInfo)
      const consumer = await transport.consume({
        id: consumerInfo.id,
        producerId: consumerInfo.producerId,
        kind: consumerInfo.kind,
        rtpParameters: consumerInfo.rtpParameters,
      });
      console.log(consumer)
      // 6. Create MediaStream from consumer track and attach to video element
      const stream = new MediaStream();
      stream.addTrack(consumer.track);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }

    start();

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1></h1>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        style={{ width: '100%', maxWidth: '800px' }}
      />
    </div>
  );
};

export default VideoViewer;
