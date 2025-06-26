import io from 'socket.io-client';
import { Device } from 'mediasoup-client';

const socket = io('http://127.0.0.1:3000');

const device = new Device();
const localVideo = document.getElementById('video');

window.addEventListener('load', async () => {



  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  localVideo.srcObject = stream;

  const rtpCapabilities = await new Promise(r => socket.emit('getRtpCapabilities', null, r));
  await device.load({ routerRtpCapabilities: rtpCapabilities });

  const sendTransportInfo = await new Promise(r => socket.emit('createTransport', { direction: 'send' }, r));
  const sendTransport = device.createSendTransport(sendTransportInfo);

  sendTransport.on('connect', ({ dtlsParameters }, cb) => {
    socket.emit('connectTransport', { dtlsParameters, direction: 'send' }, cb);
  });

  sendTransport.on('produce', ({ kind, rtpParameters }, cb) => {
    socket.emit('produce', { kind, rtpParameters }, ({ id }) => cb({ id }));
  });

  const track = stream.getVideoTracks()[0];
  await sendTransport.produce({ track });
});
