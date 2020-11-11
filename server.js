const express = require('express');
const http = require('http');
const cors = require('cors');
const { Socket } = require('socket.io');

const app = express();
const server = http.createServer(app);


const io = require("socket.io")(server, {
    cors: {
        origin:"*",
        methods: ["PUT, GET, POST, DELETE, OPTIONS"],
    }
});

let connectedUsers = [];
console.log(connectedUsers);


io.on("connection", (socket) => {
    console.log(`A user connected: ${socket.id}`);
    socket.emit("socket_connected", "connected");
    socket.emit('test', 'test');

    socket.emit("loadMarkers", connectedUsers);

    socket.on("newMarker", (currentLocation) => {
      const data = {
        type: "mobile",
        id: socket.id,
        location: currentLocation,
        title: "Amb - AAA1",
      };

      connectedUsers.push(data);
      socket.broadcast.emit("newMapMarker", data);
    });

    socket.on("change_location", (new_location) => {
      socket.broadcast.emit("change_device_location", {
        id: socket.id,
        location: { new_location },
      });
    });

    socket.on("disconnect", () => {
      for (var i = 0; i < connectedUsers.length; i++) {
        if (i.id === socket.id) {
          connectedUsers.slice(i);
        }
      }
      socket.broadcast.emit("removeMarker", socket.id);
      console.log(`user disconnected : ${socket.id}:(`);
    });
  });


server.listen(3000);

console.log('Listening to port 3000');