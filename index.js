const express = require("express");
const socketio = require("socket.io");
const app = express();

app.use(express.static(__dirname + "/public"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(`Server has started on port ${PORT}`)
);

const io = socketio(server);
let sockets = [];
let searching = [];
let notAvailable = [];

io.on("connection", async (socket) => {
  sockets.push(socket);
  const allSockets = await io.allSockets();
  io.emit("numberOfOnline", allSockets.size);

  socket.on("start", (id) => {
    sockets = sockets.filter((s) => {
      if (s.id === id) {
        searching.push(s);
        return;
      } else {
        return s;
      }
    });

    let i = 0;
    while (i < searching.length) {
      const peer = searching[i];
      if (peer.id !== id) {
        searching = searching.filter((s) => s.id !== peer.id);
        searching = searching.filter((s) => s.id !== id);
        notAvailable.push(socket, peer);

        const socketRoomToLeave = [...socket.rooms][1];
        const peerRoomToLeave = [...peer.rooms][1];

        socket.leave(socketRoomToLeave);
        peer.leave(peerRoomToLeave);

        const roomName = `${id}#${peer.id}`;

        socket.join(roomName);
        peer.join(roomName);
        io.of("/")
          .to(roomName)
          .emit("chatStart", "You are now chatting with a random stranger");

        break;
      }

      socket.emit("searching", "Searching...");

      i++;
    }
  });

  socket.on("newMessageToServer", (msg) => {
    // get room
    const roomName = [...socket.rooms][1];
    io.of("/").to(roomName).emit("newMessageToClient", { id: socket.id, msg });
  });

  socket.on("typing", (msg) => {
    const roomName = [...socket.rooms][1];

    const ids = roomName.split("#");

    const peerId = ids[0] === socket.id ? ids[1] : ids[0];

    const peer = notAvailable.find((user) => user.id === peerId);

    peer.emit("strangerIsTyping", msg);
  });

  socket.on("doneTyping", () => {
    const roomName = [...socket.rooms][1];

    const ids = roomName.split("#");

    const peerId = ids[0] === socket.id ? ids[1] : ids[0];

    const peer = notAvailable.find((user) => user.id === peerId);

    peer.emit("strangerIsDoneTyping");
  });

  socket.on("stop", () => {
    const roomName = [...socket.rooms][1];

    const ids = roomName.split("#");

    const peerId = ids[0] === socket.id ? ids[1] : ids[0];

    const peer = notAvailable.find((user) => user.id === peerId);

    peer.leave(roomName);
    socket.leave(roomName);

    peer.emit("strangerDisconnected", "Stranger has disconnected");

    socket.emit("endChat", "You have disconnected");

    notAvailable = notAvailable.filter((user) => user.id !== socket.id);
    notAvailable = notAvailable.filter((user) => user.id !== peer.id);

    sockets.push(socket, peer);
  });

  socket.on("disconnecting", async () => {
    const roomName = [...socket.rooms][1];

    if (roomName) {
      io.of("/").to(roomName).emit("goodBye", "Stranger has disconnected");

      const ids = roomName.split("#");

      const peerId = ids[0] === socket.id ? ids[1] : ids[0];

      const peer = notAvailable.find((user) => user.id === peerId);

      peer.leave(roomName);

      notAvailable = notAvailable.filter((user) => user.id !== peerId);

      sockets.push(peer);
    }

    sockets = sockets.filter((user) => user.id !== socket.id);
    searching = searching.filter((user) => user.id !== socket.id);
    notAvailable = notAvailable.filter((user) => user.id !== socket.id);
  });

  socket.on("disconnect", async () => {
    const allSockets = await io.allSockets();

    io.emit("numberOfOnline", allSockets.size);
  });
});
