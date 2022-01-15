const express = require('express');
const { Server } = require("socket.io");
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const arrayAllUsers = [];

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.sendfile('/index.html');
});

io.on('connection', (socket) => {
    arrayAllUsers.push(socket.id);
    fs.readFile( 'data.json', 'utf-8', function (err, data) {
        if (err) throw err;
        socket.emit("saveImg", data);
    })

    socket.on('json_to_board', (data) => {
        fs.writeFile('data.json', data, function (err) {
            if (err) throw err;
            console.log('Saved!');
        });

        io.emit('json_to_board', data);
    });
    socket.on('cursor_coordinates', (data) => {
        const currentData = {
            coords: data,
            id: socket.id
        }
        io.sockets.emit('cursor_coordinates', currentData);
    });
    socket.on('disconnect', () => {
        const index = arrayAllUsers.findIndex(item => item === socket.id);
        console.log(index)
        if(index !== -1) {
            arrayAllUsers.splice(index, 1)
        }
    });
});

server.listen(8080, () => {
    console.log('listening on *:8080');
});