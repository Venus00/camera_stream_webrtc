import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

const RECONNECT_DELAY_MS = 5000;

const VideoViewer = () => {
  const videoRef = useRef(null);
  const [socket, setSocket] = useState(null);

  // Keep references outside effect for cleanup
  const deviceRef = useRef(null);
  const transportRef = useRef(null);
  const consumerRef = useRef(null);

  useEffect(() => {
    let reconnectTimer = null;
    let isUnmounted = false;

    const connect = async () => {
      try {
        if (isUnmounted) return;

        if (socket) socket.disconnect();

        const newSocket = io(`http://54.36.62.219:3009`, { reconnection: false });
        setSocket(newSocket);

        newSocket.on('connect', async () => {
          console.log('Socket connected');

          // Setup mediasoup device and transport
          const rtpCapabilities = await new Promise(resolve =>
            newSocket.emit('getRouterRtpCapabilities', resolve)
          );
          console.log('rtpCapabilities', rtpCapabilities);

          const device = new mediasoupClient.Device();
          await device.load({ routerRtpCapabilities: rtpCapabilities });
          deviceRef.current = device;

          const transportInfo = await new Promise(resolve =>
            newSocket.emit('createWebRtcTransport', {}, resolve)
          );
          console.log('transportInfo', transportInfo);

          const transport = device.createRecvTransport(transportInfo);
          transportRef.current = transport;

          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            newSocket.emit('connectWebRtcTransport', { dtlsParameters });
            callback();
          });

          transport.on('connectionstatechange', state => {
            console.log('Transport connection state:', state);
            if (state === 'failed' || state === 'closed') {
              scheduleReconnect();
            }
          });

          // Consume media
          await consume(newSocket, transport);

        });

        newSocket.on('streamError', () => {
          console.log('Stream error detected - reconnecting');
          scheduleReconnect();
        });

        newSocket.on('disconnect', reason => {
          console.log('Socket disconnected:', reason);
          scheduleReconnect();
        });

        newSocket.on('connect_error', err => {
          console.error('Socket connect error:', err);
          scheduleReconnect();
        });

      } catch (err) {
        console.error('Error in connect:', err);
        scheduleReconnect();
      }
    };

    const consume = async (socketInstance, transport) => {
      try {
        const consumerInfo = await new Promise(resolve =>
          socketInstance.emit('consume', resolve)
        );
        console.log('consumerInfo', consumerInfo);

        const consumer = await transport.consume({
          id: consumerInfo.id,
          producerId: consumerInfo.producerId,
          kind: consumerInfo.kind,
          rtpParameters: consumerInfo.rtpParameters,
        });
        consumerRef.current = consumer;

        const stream = new MediaStream();
        stream.addTrack(consumer.track);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error consuming:', err);
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      if (reconnectTimer || isUnmounted) return;
      console.log(`Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);
      cleanup();
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_DELAY_MS);
    };

    const cleanup = () => {
      if (consumerRef.current) {
        try { consumerRef.current.close(); } catch { }
        consumerRef.current = null;
      }
      if (transportRef.current) {
        try { transportRef.current.close(); } catch { }
        transportRef.current = null;
      }
      if (deviceRef.current) {
        deviceRef.current = null;
      }
      if (socket) {
        try { socket.disconnect(); } catch { }
        setSocket(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      cleanup();
    };
  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        controls
        style={{ width: '100%', maxWidth: '100%' }}
      />
    </div>
  );
};

export default VideoViewer;
