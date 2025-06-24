const Peer = require('peerjs-on-node').Peer;

const peer = new Peer({debug: 2});

peer.on('open', async (localId) => {
    console.log(localId);

    // Connect to the server peer whose ID we already know
    const conn = peer.connect('oussama');

    conn.on('open', async () => {
        conn.on('data', async (data) => {
            console.log(data);
            conn.send('yes');
        });

        conn.send('ok');
    });
})

