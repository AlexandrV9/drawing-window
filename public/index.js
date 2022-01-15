const canvas = new fabric.Canvas(document.getElementById('canvasId'));
const customCursor = document.querySelector('.customPointer');
const socket = io();

canvas.isDrawingMode = true;
canvas.freeDrawingBrush.width = 5;
canvas.freeDrawingBrush.color = '#00aeff';

canvas.on('path:created', function(e) {
    e.path.set();
    canvas.renderAll();
    socket.emit('json_to_board', JSON.stringify(canvas));
});

canvas.on('mouse:move', (event) => {
    const cursorCoordinates = canvas.getPointer(event.e);
    socket.emit('cursor_coordinates', cursorCoordinates);
});

socket.on('json_to_board', function(data) {
    canvas.loadFromJSON(data);
});

socket.on('cursor_coordinates', function(data) {
    let currentWidthCursor = parseInt(getComputedStyle(customCursor).width.match(/\d+/));
    let currentHeightCursor = parseInt(getComputedStyle(customCursor).height.match(/\d+/));

    customCursor.style.top = (data.coords.y - currentHeightCursor / 2) + 'px';
    customCursor.style.left = (data.coords.x - currentWidthCursor / 2) + 'px';
    if(data.id === socket.id) {
        customCursor.style.display = 'none'
    } else {
        customCursor.style.display = 'block';
    }
});


socket.on('saveImg', function(data) {
    if(data) canvas.loadFromJSON(data);
});
