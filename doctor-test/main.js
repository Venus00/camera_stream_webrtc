const peer = new Peer({
    id: "oussamaFARHAT",
    iceServers: [
        { "urls": "stun.l.google.com:19302" },
        { "urls": "stun1.l.google.com:19302" },
        { "urls": "stun2.l.google.com:19302" },
        { "urls": "stun3.l.google.com:19302" },
        { "urls": "stun4.l.google.com:19302" },
        { "urls": "stun01.sipphone.com" },
        { "urls": "stun.ekiga.net" },
        { "urls": "stun.fwdnet.net" },
        { "urls": "stun.ideasip.com" },
        { "urls": "stun.iptel.org" },
        { "urls": "stun.rixtelecom.se" },
        { "urls": "stun.schlund.de" },
        { "urls": "stunserver.org" },
        { "urls": "stun.softjoys.com" },
        { "urls": "stun.voiparound.com" },
        { "urls": "stun.voipbuster.com" },
        { "urls": "stun.voipstunt.com" },
        { "urls": "stun.voxgratia.org" },
        { "urls": "stun.xten.com" },

        {
            "urls": "turn:relay1.expressturn.com:3478",
            "username": "efMGSZNRN0AXK8IB5I",
            "credential": "mSh16Q6ZqgRonosj+4dL7Fn",
        },
    ]
});
var currentCall;
var key = 0;
peer.on("open", function (id) {
    document.getElementById("uuid").innerHTML = id;

});
async function callUser() {
    // get the id entered by the user
    const peerId = document.querySelector("input").value; // grab the camera and mic
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    }); // switch to the video call and play the camera preview
    document.getElementById("local-video").srcObject = stream;
    document.getElementById("local-video").play(); // make the call
    const call = peer.call(peerId, stream);
    call.on("stream", (stream) => {
        document.getElementById("remote-video").srcObject = stream;
        document.getElementById("remote-video").play();
    });
    // call.on("data", (stream) => {
    //     document.querySelector("#remote-video").srcObject = stream;
    //     document.getElementById("remote-video").play();

    // });
    call.on("error", (err) => {
        console.log(err);
    });
    call.on('close', () => {
        endCall()
    }) // save the close function
    currentCall = call;
}


peer.on("call", (call) => {
    key++
    if (confirm(`Accept call from ${call.peer}?`)) {
        // grab the camera and mic
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
                console.log("yes")
                // play the local preview
                document.querySelector("#local-video").srcObject = stream;
                document.querySelector("#local-video").play(); // answer the call
                call.answer(stream); // save the close function
                currentCall = call; // change to the video view
                call.on("stream", (remoteStream) => {
                    // when we receive the remote stream, play it
                    document.getElementById("remote-video" + key.toString()).srcObject = remoteStream;
                    document.getElementById("remote-video" + key.toString()).play();
                });
            })
            .catch((err) => {
                console.log("Failed to get local stream:", err);
            });
    } else {
        // user rejected the call, close it
        call.close();
    }
});


function endCall() {
    if (!currentCall) return; // Close the call, and reset the function
    try {
        currentCall.close();
    } catch { }
    currentCall = undefined;
}