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

    socket.on('streamError', () => {
      console.log("stream output error please reconnect");
      start();

    })
    setup();
    async function setup() {
      const rtpCapabilities = await new Promise(resolve => {
        socket.emit('getRouterRtpCapabilities', resolve);
      });
      console.log(rtpCapabilities)
      device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });

        const rtpCapabilities = await new Promise((resolve) => {
          socket.current.emit('getRtpCapabilities', null, (rtpCapabilities) => {
            console.log("Got RTP Capabilities", rtpCapabilities);
            resolve(rtpCapabilities);
          });
        });


      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectWebRtcTransport', { dtlsParameters });
        callback();
      });
      start()
    }
    async function start() {


        const transportParams = await new Promise((resolve) =>
          socket.current.emit('createTransport', { direction: 'recv' }, resolve)
        );

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }




    }
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
      <video
        ref={videoRef}
        autoPlay
        controls

        style={{ width: '100%', maxWidth: '100%' }}
      />
    </div>
  );
};

export default Viewer;
