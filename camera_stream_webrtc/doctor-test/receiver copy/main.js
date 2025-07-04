const peer = new Peer({
    id: "oussamaFARHAT",

    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:a.relay.metered.ca:80",
            username: "fa35f3aab7723b88f2f72ab0",
            credential: "B/glka1X3gSXhIRO",
        },
        {
            urls: "turn:a.relay.metered.ca:80?transport=tcp",
            username: "fa35f3aab7723b88f2f72ab0",
            credential: "B/glka1X3gSXhIRO",
        },
        {
            urls: "turn:a.relay.metered.ca:443",
            username: "fa35f3aab7723b88f2f72ab0",
            credential: "B/glka1X3gSXhIRO",
        },
        {
            urls: "turn:a.relay.metered.ca:443?transport=tcp",
            username: "fa35f3aab7723b88f2f72ab0",
            credential: "B/glka1X3gSXhIRO",
        },
    ],
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
    call.on("data", (stream) => {
        document.querySelector("#remote-video").srcObject = stream;
    });
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