const express = require('express');
const { Server } = require("socket.io");
const http = require('http');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const arrayAllUsers = [];
const arrayOfUserCursorCoordinates = [];

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.sendfile('/index.html');
});

io.on('connection', (socket) => {
    arrayAllUsers.push(socket.id);
    arrayOfUserCursorCoordinates.push({
        userId: socket.id,
        cursorCoordinates: {
            x: 0,
            y: 0,
        },
    });

    fs.readFile( 'data.json', 'utf-8', function (err, data) {
        if (err) throw err;
        socket.emit("saveImg", data);
    })

    socket.on('cursor-data', (data) => {
        const cursorDataUser = arrayOfUserCursorCoordinates.find(item => item.userId === data.userId);
        if(cursorDataUser) {
            cursorDataUser.cursorCoordinates = data.coords;
            io.emit('cursor-data', cursorDataUser);
        }
    });
    socket.on('new-picture', (objJSON) => {
        let obj = JSON.parse(objJSON)
        fs.readFile('./data.json','utf-8', function (err, data) {
            if (err) throw err;
            let currentArrayObjects = (data === '') ?  [] : JSON.parse(data);
            currentArrayObjects.push(obj);
            fs.writeFile('data.json', JSON.stringify(currentArrayObjects), function (err) {
                console.log('Saved!');
            })
        });
        const currentData = {
            coords: objJSON,
            id: socket.id
        }
        io.emit('new-picture', currentData)
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
        const index2 = arrayOfUserCursorCoordinates.findIndex(item => item.userId === socket.id);

        if(index !== -1) {
            arrayAllUsers.splice(index, 1)
        }
        if(index2 !== -1){
            arrayOfUserCursorCoordinates.splice(index, 1)
        }
    });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log('listening on *:8080');
});