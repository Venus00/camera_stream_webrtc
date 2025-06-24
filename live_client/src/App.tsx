import React, { useEffect, useRef, useState } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import io from 'socket.io-client';

const SERVER_URL = 'http://154.144.229.22:3009'; // change this
const socket = io(SERVER_URL);

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const start = async () => {
      console.log('VideoViewer mounted');

      // 1. Connect socket
      socket.on('connect', async () => {
        console.log('Socket connected:', socket.id);

        // 2. Get RTP Capabilities
        socket.emit('getRtpCapabilities', async (rtpCapabilities: any) => {
          console.log('1) RTP Capabilities:', rtpCapabilities);

          // 3. Create device
          const device = new mediasoupClient.Device();
          await device.load({ routerRtpCapabilities: rtpCapabilities });
          console.log('2) Device loaded');

          // 4. Create WebRTC Transport
          socket.emit('createConsumerTransport', async (transportOptions: any) => {
            console.log('3) Transport info:', transportOptions);

            const transport = device.createRecvTransport(transportOptions);

            transport.on('connect', ({ dtlsParameters }, callback, errback) => {
              console.log('4) Transport "connect" event');
              socket.emit('connectConsumerTransport', { dtlsParameters }, callback);
            });

            // 5. Start consuming
            socket.emit(
              'consume',
              { rtpCapabilities: device.rtpCapabilities },
              async (consumerParams: any) => {
                console.log('5) Consumer info:', consumerParams);

                const consumer = await transport.consume({
                  id: consumerParams.id,
                  producerId: consumerParams.producerId,
                  kind: consumerParams.kind,
                  rtpParameters: consumerParams.rtpParameters,
                });

                const stream = new MediaStream();
                stream.addTrack(consumer.track);

                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.play().catch((e) => {
                    console.error('Autoplay error:', e);
                  });
                }
              }
            );
          });
        });
      });
    };

    start();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Mediasoup Video Viewer</h1>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', maxWidth: '720px', borderRadius: '12px' }}
      />
    </div>
  );
}