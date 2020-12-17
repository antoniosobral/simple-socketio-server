/* eslint-disable max-len */
/* eslint-disable array-callback-return */
/* eslint-disable no-param-reassign */
/* eslint-disable camelcase */
const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['PUT, GET, POST, DELETE, OPTIONS'],
  },
});

const rooms = {};
const validateds = {};

io.on('connection', (socket) => {
  console.log('[+][TT] A wild user appeared :O ', socket.id);

  // {room,token,sender,type,metatada:{id,....,location}(ambulancia) }
  socket.on('register', (data) => {
    // validateToken(data.token, data.sender)
    // .then(v=>{
    // safeJoin(data.room);

    const room = `TT-${data.room}`;

    if (rooms[room] === undefined) {
      rooms[room] = {
        id: room, messages: [], users: [], ambulances: [], calling_queue: [],
      };
    }

    rooms[room].users.push(socket.id);
    validateds[socket.id] = room;

    console.log(`[.][TT] User: ${data.room} joined on room: TT-${data.room}`);

    if (data.type === 'ambulance') {
      let found = false;
      data.metadata.id = socket.id; // Serve para mais de um usuário conectar com a mesma senha
      rooms[room].ambulances = rooms[room].ambulances.map((ambulance) => {
        if (ambulance.id === data.metadata.id) {
          found = true;
          return data.metadata;
        } return ambulance;
      });
      if (!found) {
        rooms[room].ambulances.push(data.metadata);
      }

      rooms[room].users.map((id) => {
        if (id !== socket.id) {
          console.log(id);
          io.to(id).emit('newMapMarker', data.metadata);
        }
      });
    } else if (data.type === 'dashboard') {
      io.to(socket.id).emit('loadMarkers', rooms[room].ambulances);
    }

    console.log('====== register========', socket.id);
    // })
    // .catch(e=>{
    //     console.log("[!][TT] User failed on registration",data)
    //     socket.disconnect();
    // })
  });

  // ---------> new_location = { lat, lng };
  socket.on('change_location', (new_location) => {
    console.log('======== change location =========', socket.id);

    const room = validateds[socket.id];

    const location = { lat: new_location.latitude, lng: new_location.longitude };

    if (room !== undefined && rooms[room] !== undefined) {
      rooms[room].users.map((id) => {
        if (id !== socket.id) {
          io.to(id).emit('change_device_location', {
            id: socket.id,
            location,
          });
        }
      });

      rooms[room].ambulances = rooms[room].ambulances.map((ambulance) => {
        if (ambulance.id === socket.id) {
          ambulance.location = location;
        }
        return ambulance;
      });
    } else {
      socket.disconnect();
      console.log(`[!][TT] user ${socket.id} disconnected because the room do not exists`);
    }
  });

  socket.on('init_attendance', (attendance_data) => {
    const room = validateds[socket.id];

    if (room !== undefined && rooms[room] !== undefined) {
      rooms[room].users.map((id) => {
        if (id !== socket.id) {
          io.to(id).emit('init_attendance', {
            id: socket.id,
            patient: attendance_data.patient,
            event: attendance_data.event,
            status: 'EM ATENDIMENTO',
          });
        }
      });

      rooms[room].ambulances = rooms[room].ambulances.map((ambulance) => {
        if (ambulance.id === socket.id) {
          ambulance.ambulance.event = attendance_data.event;
          ambulance.ambulance.patient = attendance_data.patient;
          ambulance.status = 'EM ATENDIMENTO';
        }
        return ambulance;
      });
    } else {
      socket.disconnect();
      console.log(`[!][TT] user ${socket.id} disconnected because the room do not exists`);
    }
  });

  socket.on('init_forwarding', (data) => {
    const room = validateds[socket.id];

    if (room !== undefined && rooms[room] !== undefined) {
      rooms[room].users.map((id) => {
        if (id !== socket.id) {
          io.to(id).emit('init_forwarding', {
            id: socket.id,
            hospital: data.hospital,
            glasgow: data.glasgow,
            clinical: data.clinical,
            status: 'EM TRÂNSITO',
          });
        }
      });

      rooms[room].ambulances = rooms[room].ambulances.map((ambulance) => {
        if (ambulance.id === socket.id) {
          ambulance.ambulance.hospital = data.hospital;
          ambulance.ambulance.glasgow = data.glasgow;
          ambulance.ambulance.clinical = data.clinical;
          ambulance.status = 'EM TRÂNSITO';
        }
        return ambulance;
      });
    } else {
      socket.disconnect();
      console.log(`[!][TT] user ${socket.id} disconnected because the room do not exists`);
    }
  });

  socket.on('finish_attendance', () => {
    const room = validateds[socket.id];

    if (room !== undefined && rooms[room] !== undefined) {
      rooms[room].users.map((id) => {
        if (id !== socket.id) {
          io.to(id).emit('finish_attendance', {
            id: socket.id,
            status: 'LIVRE',
          });
        }
      });

      rooms[room].ambulances = rooms[room].ambulances.map((ambulance) => {
        if (ambulance.id === socket.id) {
          ambulance.status = 'LIVRE';
          delete ambulance.event;
          delete ambulance.patient;
          delete ambulance.hospital;
          delete ambulance.glasgow;
          delete ambulance.clinical;
          delete ambulance.hospital;
        }
        return ambulance;
      });
    } else {
      socket.disconnect();
      console.log(`[!][TT] user ${socket.id} disconnected because the room do not exists`);
    }
  });

  // {event:"",metadata:""} -> {event:"new_hospital",metadata:{name:"batata"}}

  socket.on('disconnect', () => {
    console.log(`[-] user disconnected ${socket.id} :(`);

    const room = validateds[socket.id];
    rooms[room].users.map((id) => {
      if (id !== socket.id) { io.to(id).emit('removeMarker', socket.id); }
    });

    if (rooms[room] !== undefined) {
      const socketIdIndex = rooms[room].users.indexOf(socket.id);
      rooms[room].users.splice(socketIdIndex, 1);
    }

    for (let i = 0; i < rooms[room].ambulances.length; i += 1) {
      if (rooms[room].ambulances[i].id === socket.id) {
        rooms[room].ambulances.splice(i, 1);
      }
    }

    delete validateds[socket.id];
  });

  // Emmit welcome message to client
  socket.emit('welcome', { server: 'teletrauma', version: '1.0' });
});

app.use(cors());

server.listen(3000);

console.log('Listening to port 3000');
