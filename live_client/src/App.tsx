import React, { useEffect, useRef, useState } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import io from 'socket.io-client';

const SERVER_URL = 'http://154.144.229.22:3009'; // change this
const socket = io(SERVER_URL);

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    console.log('VideoViewer mounted');

    const startMediasoupClient = async () => {
      console.log('Starting mediasoup client…');

      socket.on('connect', async () => {
        console.log('Socket connected:', socket.id);
        setConnected(true);

        try {
          // 1. Get RTP Capabilities from server
          const rtpCapabilities = await new Promise<any>((resolve) => {
            socket.emit('getRouterRtpCapabilities', resolve);
          });
          console.log('1) RTP Capabilities:', rtpCapabilities);

          // 2. Load Device
          const device = new mediasoupClient.Device();
          await device.load({ routerRtpCapabilities: rtpCapabilities });
          console.log('2) Device loaded');

          // 3. Create WebRTC recv transport
          const transportOptions = await new Promise<any>((resolve) => {
            socket.emit('createWebRtcTransport', { consumer: true }, resolve);
          });
          console.log('3) Transport info:', transportOptions);

          const transport = device.createRecvTransport(transportOptions);

          // 4. Connect Transport (DTLS handshake)
          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            console.log('4) Transport “connect” event');
            socket.emit('connectWebRtcTransport', { dtlsParameters }, (response: any) => {
              if (response?.error) {
                console.error('DTLS connect error:', response.error);
                return errback(response.error);
              }
              console.log('4) DTLS handshake OK');
              callback();
            });
          });

          // 5. Ask server to create consumer
          const consumerInfo = await new Promise<any>((resolve) => {
            socket.emit('consume', {
              rtpCapabilities: device.rtpCapabilities,
              transportId: transportOptions.id
            }, resolve);
          });
          console.log('5) Consumer info:', consumerInfo);

          // 6. Create local consumer
          const consumer = await transport.consume({
            id: consumerInfo.id,
            producerId: consumerInfo.producerId,
            kind: consumerInfo.kind,
            rtpParameters: consumerInfo.rtpParameters,
          });
          console.log('6) Consumer created:', consumer.id);
          console.log('7) Track readyState:', consumer.track.readyState);

          // 7. Play track in video element
          const stream = new MediaStream([consumer.track]);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().then(() => {
              console.log('8) Video.play() succeeded');
            }).catch(err => {
              console.error('8) Video.play() failed:', err);
            });
          }

        } catch (err) {
          console.error('Error during mediasoup client init:', err);
        }
      });
    };

    startMediasoupClient();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <h1 className="text-white text-xl mb-4">Mediasoup Video Viewer</h1>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-[640px] h-[360px] bg-gray-800 rounded shadow-lg"
      />
      {!connected && <p className="text-white mt-2">Connecting to server…</p>}
    </div>
  );
};

export default App;
