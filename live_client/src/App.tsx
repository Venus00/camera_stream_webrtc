import React, { useEffect, useRef } from 'react';
import { Device } from 'mediasoup-client';
import { io } from 'socket.io-client';

const Viewer = () => {
  const videoRef = useRef(null);
  const socket = useRef(null);
  const device = useRef(null);
  const recvTransport = useRef(null);

  useEffect(() => {
    socket.current = io('http://127.0.0.1:3000');

    socket.current.on('newProducer', async ({ producerId }) => {
      try {
        device.current = new Device();

        const rtpCapabilities = await new Promise((resolve) => {
          socket.current.emit('getRtpCapabilities', null, (rtpCapabilities) => {
            console.log("Got RTP Capabilities", rtpCapabilities);
            resolve(rtpCapabilities);
          });
        });

        await device.current.load({ routerRtpCapabilities: rtpCapabilities });

        const transportParams = await new Promise((resolve) =>
          socket.current.emit('createTransport', { direction: 'recv' }, resolve)
        );

        recvTransport.current = device.current.createRecvTransport(transportParams);

        recvTransport.current.on('connect', ({ dtlsParameters }, callback) => {
          socket.current.emit('connectTransport', { direction: 'recv', dtlsParameters }, callback);
        });

        const consumerParams = await new Promise((resolve) =>
          socket.current.emit('consume', {
            rtpCapabilities: device.current.rtpCapabilities,
            producerId,
          }, resolve)
        );

        const consumer = await recvTransport.current.consume(consumerParams);

        const remoteStream = new MediaStream([consumer.track]);
        videoRef.current.srcObject = remoteStream;

        socket.current.emit('resume', null, () => { });
      } catch (err) {
        console.error('Viewer error:', err);
      }
    });

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, []);

  return (
    <div>
      <h2>React Viewer</h2>
      <video ref={videoRef} autoPlay playsInline controls={false} />
    </div>
  );
};

export default Viewer;
