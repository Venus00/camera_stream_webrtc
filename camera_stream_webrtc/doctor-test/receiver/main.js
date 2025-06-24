const peer = new Peer({
    id: "oussamaFARHAT",
    config: {
        iceServers: [
            { urls: "stun:stun.relay.metered.ca:80" },
            { urls: "stun:stun.sipnet.net:3478" },
            { urls: "stun:stun.sipnet.ru:3478" },
            { urls: "stun:stun.stunprotocol.org:3478" },
            { urls: 'turn:154.16.172.10:3478',username: 'key1',credential: 'password1' } 

           
        ],
    }
});

let currentCall;
peer.on("open", function (id) {
    document.getElementById("uuid").innerHTML = id;
});
function getSilentStream() {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const audioTrack = dst.stream.getAudioTracks()[0];
  
    // Create black video track
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const stream = canvas.captureStream();
    const videoTrack = stream.getVideoTracks()[0];
  
    return new MediaStream([audioTrack, videoTrack]);
  }
async function callUser() {
    const peerId = document.querySelector("input").value;
    const fakeStream = getSilentStream();

    // Do NOT get local media
    console.log("callUser");
    const call = peer.call(peerId, fakeStream);  // ❗️Call with no media stream
    if (!call) {
        console.error("Call failed: peer may be unavailable or ID is incorrect.");
        alert("Could not call the peer. Please check their ID or if they are online.");
        return;
    }


    call.peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE state:", call.peerConnection.iceConnectionState);
    };
    
    call.on("stream", (stream) => {
        console.log("stream", stream);
        const remoteVideo = document.getElementById("remote-video");
        remoteVideo.srcObject = stream;
        remoteVideo.play();
    });

    call.on("error", (err) => {
        console.log(err);
    });

    call.on("close", () => {
        endCall();
    });

    currentCall = call;
}


function endCall() {
    console.log("endCall");
    if (!currentCall) return;
    try {
        currentCall.close();
    } catch { }
    currentCall = undefined;
}
