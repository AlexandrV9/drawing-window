const customCursor = document.querySelector('.customPointer');
const as = document.querySelector('.scale__value');

const imageUrl ="./images/grids/svg.svg";

const canvas = new fabric.Canvas(
    document.getElementById('canvasId'),
    {
        fireMiddleClick: true,
        isDrawingMode: true,
    },
);

// canvas.setBackgroundImage(imageUrl, canvas.renderAll.bind(canvas), {
//     // Optionally add an opacity lvl to the image
//     backgroundImageOpacity: 0.5,
//     // should the image be resized to fit the container?
//     backgroundImageStretch: false
// });

canvas.setBackgroundColor({
    source: imageUrl,
    repeat: 'repeat',
    scaleX: 0.5,
    scaleY: 0.5
}, canvas.renderAll.bind(canvas)
);

let initialGroup = new fabric.Group([]);

const socket = io();

canvas.freeDrawingBrush.width = 5;
canvas.freeDrawingBrush.color = '#00aeff';

const MAX_ZOOM_IN = 4;
const MAX_ZOOM_OUT = 0.05;
const SCALE_STEP = 0.05;

let currentValueZoom = 1;

fabric.Canvas.prototype.toggleDragMode = function () {
    const STATE_IDLE = "idle";
    const STATE_PANNING = "panning";
    // Remember the previous X and Y coordinates for delta calculations
    let lastClientX;
    let lastClientY;
    // Keep track of the state
    let state = STATE_IDLE;
    // We're entering dragmode
    if (canvas.isDrawingMode) {
        // Discard any active object
        canvas.discardActiveObject();
        // Set the cursor to 'move'
        this.defaultCursor = "move";
        // Loop over all objects and disable events / selectable. We remember its value in a temp variable stored on each object
        this.forEachObject(function (object) {
            object.prevEvented = object.evented;
            object.prevSelectable = object.selectable;
            object.evented = false;
            object.selectable = false;
        });
        // Remove selection ability on the canvas
        this.selection = false;
        // // When MouseUp fires, we set the state to idle
        this.on("mouse:up", function (e) {
            state = STATE_IDLE;
        });
        // // When MouseDown fires, we set the state to panning
        this.on("mouse:down", (e) => {
            state = STATE_PANNING;
            lastClientX = e.e.clientX;
            lastClientY = e.e.clientY;
        });
        // When the mouse moves, and we're panning (mouse down), we continue
        this.on("mouse:move", (e) => {
            if (state === STATE_PANNING && e && e.e) {
                // let delta = new fabric.Point(e.e.movementX, e.e.movementY); // No Safari support for movementX and movementY
                // For cross-browser compatibility, I had to manually keep track of the delta

                // Calculate deltas
                let deltaX = 0;
                let deltaY = 0;
                if (lastClientX) {
                    deltaX = e.e.clientX - lastClientX;
                }
                if (lastClientY) {
                    deltaY = e.e.clientY - lastClientY;
                }
                // Update the last X and Y values
                lastClientX = e.e.clientX;
                lastClientY = e.e.clientY;

                let delta = new fabric.Point(deltaX, deltaY);
                this.relativePan(delta);
                // this.trigger("moved");
            }
        });
    } else {
        // When we exit dragmode, we restore the previous values on all objects
        this.forEachObject(function (object) {
            object.evented =
                object.prevEvented !== undefined ? object.prevEvented : object.evented;
            object.selectable =
                object.prevSelectable !== undefined
                    ? object.prevSelectable
                    : object.selectable;
        });
        // Reset the cursor
        this.defaultCursor = "default";
        // Remove the event listeners
        this.off("mouse:up");
        this.off("mouse:down");
        this.off("mouse:move");
        // Restore selection ability on the canvas
        this.selection = true;
    }
};

// canvas.setBackgroundColor({
//     source: './images/grids/svg.svg',
//     scaleX: 0.5,
//     scaleY: 0.5
// }, function () {
//     canvas.renderAll.bind(canvas)
// });

// canvas.backgroundColor = new fabric.Pattern({
//     source: './images/grids/svg.svg',
//     scaleX: 0.5,
//     scaleY: 0.5
// })

function resizeCanvas() {
    canvas.setHeight(window.innerHeight);
    canvas.setWidth(window.innerWidth);

    // const objects = canvas.getObjects();
    // console.log(objects);
    // const selection = new fabric.ActiveSelection(objects, { canvas: canvas });
    // const width = selection.width;
    // const height = selection.height;
    // let scale = canvas.width/width
    // selection.scale(0.2);
    // selection.center();
    // console.log(width, height);
    // const center = {x: w / 2, y:h / 2);
    // console.log(canvas.getObjects())

    canvas.renderAll();
}
function handleScale(delta){
    if(delta < 0) {
        if(currentValueZoom <= MAX_ZOOM_OUT) return;
        currentValueZoom = (parseFloat(currentValueZoom) - SCALE_STEP).toFixed(2);
    } else {
        if(currentValueZoom >= MAX_ZOOM_IN) return;
        currentValueZoom = (parseFloat(currentValueZoom) + SCALE_STEP).toFixed(2);
    }
}



// function draw() {
//     resizeCanvas();
//     requestAnimationFrame(draw);
// }

resizeCanvas();

// draw();

window.addEventListener('resize', (e) => {
    e.preventDefault();
    resizeCanvas();

}, false);

// const rect = new fabric.Rect({
//     top: 0,
//     right: 0,
//     fill: 'white',
//     stroke: 'black',
//     width: 20,
//     height: 20
// });


canvas.on('path:created', function(e) {
    e.path.set();
    canvas.renderAll();
    socket.emit('json_to_board', JSON.stringify(canvas));
});
canvas.on('mouse:move', (event) => {
    const cursorCoordinates = canvas.getPointer(event.e);
    socket.emit('cursor_coordinates', cursorCoordinates);
});
canvas.on('mouse:wheel', function(opt) {
    const delta = opt.e.deltaY;
    handleScale(delta);
    as.textContent = (currentValueZoom * 100).toFixed(0) + '%';
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, currentValueZoom);

    opt.e.preventDefault();
    opt.e.stopPropagation();
});
// canvas.on('object:added', function(object) {
//     console.log(object);
//     canvas.clear().renderAll();
//     initialGroup.add(new fabric.Object(object));
//     console.log(initialGroup.getCenterPoint());
//     console.log(initialGroup);
//     initialGroup.center();
//
// });

document.body.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        canvas.toggleDragMode();
        canvas.isDrawingMode = false;
    }
});
document.body.addEventListener('keyup', e => {
    if (e.code === 'Space') {
        e.preventDefault();
        canvas.toggleDragMode();
        canvas.isDrawingMode = true;
    }
});

socket.on('json_to_board', function(data) {
    console.log('1');
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
