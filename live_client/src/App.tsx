import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

const RECONNECT_DELAY_MS = 5000;

const VideoViewer = () => {
  const videoRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isOffline, setIsOffline] = useState(false); // ✅ NEW

  const deviceRef = useRef(null);
  const transportRef = useRef(null);
  const consumerRef = useRef(null);

  const reconnectTimer = useRef(null);
  let isUnmounted = false;

  useEffect(() => {
    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      cleanup(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    try {
      if (isUnmounted) return;

      cleanup(false);

      const newSocket = io('http://54.36.62.219:3009', { reconnection: false });
      setSocket(newSocket);

      newSocket.on('connect', async () => {
        console.log(' Socket connected');
        setIsOffline(false); 

        const rtpCapabilities = await new Promise((resolve) =>
          newSocket.emit('getRouterRtpCapabilities', resolve)
        );

        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device;

        const transportInfo = await new Promise((resolve) =>
          newSocket.emit('createWebRtcTransport', {}, resolve)
        );

        const transport = device.createRecvTransport(transportInfo);
        transportRef.current = transport;

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          newSocket.emit('connectWebRtcTransport', { dtlsParameters });
          callback();
        });

        transport.on('connectionstatechange', (state) => {
          console.log('Transport state:', state);
          if (state === 'failed' || state === 'closed' || state === 'disconnected') {
            scheduleReconnect();
          }
        });

        await consume(newSocket, transport);
      });

      newSocket.on('streamError', () => {
        console.warn(' Stream error — showing offline banner');
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsOffline(true); 
      });

      newSocket.on('disconnect', (reason) => {
        console.warn('Socket disconnected:', reason);
        scheduleReconnect();
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connect error:', err);
        scheduleReconnect();
      });
    } catch (err) {
      console.error('Connection error:', err);
      scheduleReconnect();
    }
  };

  const consume = async (socketInstance, transport) => {
    try {
      if (consumerRef.current) {
        console.log(' Reusing existing consumer');
        bindTrack(consumerRef.current.track);
        return;
      }

      const consumerInfo = await new Promise((resolve) =>
        socketInstance.emit('consume', resolve)
      );

      const consumer = await transport.consume({
        id: consumerInfo.id,
        producerId: consumerInfo.producerId,
        kind: consumerInfo.kind,
        rtpParameters: consumerInfo.rtpParameters,
      });

      consumerRef.current = consumer;

      consumer.on('transportclose', () => {
        console.warn('Consumer transport closed');
        scheduleReconnect();
      });

      consumer.on('trackended', () => {
        console.warn('Track ended — showing offline');
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsOffline(true); 
      });

      consumer.track.onunmute = () => {
        console.log('Track resumed — hiding offline banner');
        setIsOffline(false); 
        bindTrack(consumer.track);
      };

      bindTrack(consumer.track);
    } catch (err) {
      console.error('Consume error:', err);
      scheduleReconnect();
    }
  };

  const bindTrack = (track) => {
    const stream = new MediaStream();
    stream.addTrack(track);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer.current || isUnmounted) return;

    console.log(` Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      connect();
    }, RECONNECT_DELAY_MS);
  };

  const cleanup = (full = true) => {
    if (consumerRef.current && full) {
      try {
        consumerRef.current.close();
      } catch (e) {}
      consumerRef.current = null;
    }

    if (transportRef.current) {
      try {
        transportRef.current.close();
      } catch (e) {}
      transportRef.current = null;
    }

    if (deviceRef.current) {
      deviceRef.current = null;
    }

    if (socket) {
      try {
        socket.disconnect();
      } catch (e) {}
      setSocket(null);
    }

    if (videoRef.current && full) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        controls
        style={{ width: '100%', maxWidth: '100%' }}
      />
      {isOffline && (
        <div style={{
          position: 'absolute',
          top: '10%',
          left: 0,
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '1rem',
          fontSize: '1.2rem'
        }}>
           Stream Offline — waiting for recovery...
        </div>
      )}
    </div>
  );
};

export default VideoViewer
