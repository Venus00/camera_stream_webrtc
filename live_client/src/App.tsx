import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

const VideoViewer = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3009`);
    let device;
    let transport;

    async function start() {
      const rtpCapabilities = await new Promise(resolve => {
        socket.emit('getRouterRtpCapabilities', resolve);
      });
      console.log(rtpCapabilities)
      device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });

      const transportInfo = await new Promise(resolve => {
        socket.emit('createWebRtcTransport', {}, resolve);
      });
      console.log(transportInfo)
      transport = device.createRecvTransport(transportInfo);
      console.log('transport', transport)

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectWebRtcTransport', { dtlsParameters });
        callback();
      });

      const consumerInfo = await new Promise(resolve => {
        socket.emit('consume', resolve);
      });
      console.log("conso", consumerInfo)
      const consumer = await transport.consume({
        id: consumerInfo.id,
        producerId: consumerInfo.producerId,
        kind: consumerInfo.kind,
        rtpParameters: consumerInfo.rtpParameters,
      });
      console.log(consumer)
      const stream = new MediaStream();
      stream.addTrack(consumer.track);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }

    start();

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>tt</h1>
      <video
        ref={videoRef}
        autoPlay
        controls

        style={{ width: '100%', maxWidth: '800px' }}
      />
    </div>
  );
};

export default VideoViewer;
