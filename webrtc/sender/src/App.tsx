import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

export default function MediasoupSender() {
  const videoRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [device, setDevice] = useState(null);
  const [sendTransport, setSendTransport] = useState(null);

  useEffect(() => {
    let localStream;
    let sock;

    async function start() {
      sock = io('http://127.0.0.1:3000');
      setSocket(sock);

      await new Promise(resolve => {
        if (sock.connected) resolve();
        else sock.on('connect', resolve);
      });

      // 1. Create mediasoup Device and load router RTP capabilities
      const deviceInstance = new mediasoupClient.Device();
      const routerRtpCapabilities = await new Promise(resolve => {
        sock.emit('getRtpCapabilities', null, resolve);
      });
      await deviceInstance.load({ routerRtpCapabilities });
      setDevice(deviceInstance);

      // 2. Create send transport
      const transportOptions = await new Promise(resolve => {
        sock.emit('createTransport', { direction: 'send' }, resolve);
      });

      const transport = deviceInstance.createSendTransport(transportOptions);
      setSendTransport(transport);

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        sock.emit('connectTransport', { transportId: transport.id, dtlsParameters }, (err) => {
          if (err) errback(err);
          else callback();
        });
      });

      transport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
        sock.emit('produce', { transportId: transport.id, kind, rtpParameters }, ({ id }) => {
          callback({ id });
        });
      });

      // 3. Get user media
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = localStream;
      }

      // 4. Produce video track
      const videoTrack = localStream.getVideoTracks()[0];
      await transport.produce({ track: videoTrack });

      console.log('Streaming started');
    }

    start();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (sock) sock.disconnect();
      if (sendTransport) sendTransport.close();
    };
  }, []);

  return (
    <div>
      <h2>Mediasoup Camera Sender</h2>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '480px', border: '1px solid #ccc' }}
      />
    </div>
  );
}
