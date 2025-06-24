
    const peer = new Peer({
      config: {
        iceServers: [
            { urls: "stun:stun.relay.metered.ca:80" },
            { urls: "stun:stun.sipnet.net:3478" },
            { urls: "stun:stun.sipnet.ru:3478" },
            { urls: "stun:stun.stunprotocol.org:3478" },
            { urls: 'turn:154.16.172.10:3478',username: 'key1',credential: 'password1' } 
        ],
      },
    });

    let currentCall;
 

    peer.on("open", (id) => {
      document.getElementById("uuid").innerText = id;
    });

    async function callUser() {
      const peerId = document.querySelector("input").value;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      document.getElementById("local-video").srcObject = stream;
      document.getElementById("local-video").play();

      const call = peer.call(peerId, stream);

   

      call.on("error", (err) => console.error(err));
      call.on("close", endCall);
      currentCall = call;
    }
    peer.on("call", (call) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          document.getElementById("local-video").srcObject = stream;
          document.getElementById("local-video").play();
          console.log("stream", stream);
          call.answer(stream);
          call.on("stream", remoteStream => {
            console.log("Received remote stream from caller");
            const remoteVideo = document.getElementById("remote-video");
            remoteVideo.srcObject = remoteStream;
            remoteVideo.play();
          });
          call.on("close", endCall);
          call.on("error", (err) => console.error(err));
          currentCall = call;
        })
        .catch((err) => {
          console.error("Failed to get local stream:", err);
        });
    });

    function endCall() {
        console.log("endCall");
      if (!currentCall) return;
      try {
        currentCall.close();
      } catch (e) {}
      currentCall = undefined;
    }

    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
    });