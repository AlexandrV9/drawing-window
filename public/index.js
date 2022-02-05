const customCursor = document.querySelector('.customPointer');
const scaleValue = document.querySelector('.scale__value');
const gridSelection = document.querySelector('.settings-panel__select');
const canvas = new fabric.Canvas(
    document.getElementById('canvasId'),
    {
        fireMiddleClick: true,
        isDrawingMode: true,
    },
);

const pathUsualGrid = "./images/grids/usual-grid.svg";
const pathTriangularGrid = "./images/grids/triangular-grid.svg";

const MAX_ZOOM_IN = 4;
const MAX_ZOOM_OUT = 0.05;
const SCALE_STEP = 0.05;

let currentRadiusCursor = 10;
let currentValueZoom = 1;

scaleValue.textContent = currentValueZoom * 100 + '%';

canvas.freeDrawingBrush.width = 5;
canvas.freeDrawingBrush.color = '#00aeff';

canvas.setBackgroundColor({
        source: pathUsualGrid,
        repeat: 'repeat',
        scaleX: 1,
        scaleY: 1
    }, canvas.renderAll.bind(canvas));

const socket = io();

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
        this.off('mouse:move');
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
                // console.log(e.e)
                // Calculate deltas

                if (lastClientX) {
                    deltaX = e.e.clientX - lastClientX; // смещение по оси X
                                                        // (если вниз передвигаемся, то
                                                        // это значение уменьшается иначе увеличивается)
                }
                if (lastClientY) {
                    deltaY = e.e.clientY - lastClientY; // смещение по оси Y
                                                        // (если влево передвигаемся, то
                                                        // это значение увеличивается иначе уменьшается)
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
            object.evented = object.prevEvented !== undefined ? object.prevEvented : object.evented;
            object.selectable = object.prevSelectable !== undefined ? object.prevSelectable : object.selectable;
        });
        // Reset the cursor
        this.defaultCursor = "default";
        // Remove the event listeners
        this.off("mouse:up");
        this.off("mouse:down");
        this.off("mouse:move");
        this.on('mouse:move', (event) => handleMouseMovement(event));
        // Restore selection ability on the canvas
        this.selection = true;
    }
};
canvas.toObject = (function (toObject) {
    return function () {
        return fabric.util.object.extend(toObject.call(this), {
            id: this.id
        })
    }

})(canvas.toObject)

const handleMouseMovement = (event) => {
    const cursorCoordinate = canvas.getPointer(event.e);
    let data = {
        userId: socket.id,
        coords: cursorCoordinate,
    }
    socket.emit('cursor-data', data);
}
const resizeCanvas = () => {
    canvas.setHeight(window.innerHeight);
    canvas.setWidth(window.innerWidth);
    canvas.renderAll();
}
const handleScale = (delta) => {
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

canvas.on('path:created', (e) => {
    e.path.set();
    // newLine.id = canvas.size() - 1;
    console.log('1');
    console.log(e.path);
    socket.emit('new-picture', JSON.stringify(e.path))
    // socket.emit('json_to_board', JSON.stringify(canvas));
});
canvas.on('mouse:move', (event) => handleMouseMovement(event));
canvas.on('mouse:wheel', (opt) => {
    const delta = opt.e.deltaY;
    handleScale(delta);
    scaleValue.textContent = (currentValueZoom * 100).toFixed(0) + '%';
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, currentValueZoom);

    opt.e.preventDefault();
    opt.e.stopPropagation();
});
// canvas.on('mouse:down', () => {
// })
// canvas.on('mouse:up', () => {
//
// })

const cursorUser = new fabric.Circle({
    radius: currentRadiusCursor,
    fill: 'red',
    left: -10,
    top: -10,
    originX: 'center',
    originY: 'center',
});

canvas.add(cursorUser);

socket.on('saveImg', (data) => {
    if(data) {
        let buffer = JSON.parse(data);
        fabric.util.enlivenObjects(buffer, function (objects) {
            const origRenderOnAddRemove = canvas.renderOnAddRemove;
            canvas.renderOnAddRemove = false;
            // let id = 0;
            objects.forEach(function (obj) {
                // obj.id = id
                canvas.add(obj)
                // id++;
            });
            canvas.renderOnAddRemove = origRenderOnAddRemove;
            canvas.renderAll();
        });
        // const objects = canvas.getObjects();
        // const selection = new fabric.ActiveSelection(objects, { canvas: canvas });
        // const widthGroups = selection.width;
        // const heightGroups = selection.height;
        // selection.center();
        // selection.scale(1);
        // selection.destroy();
        // const groupCenterCoordinates = selection.getCenterPoint();
        // const optimalScaleX = canvas.width / widthGroups;
        // const optimalScaleY = canvas.height / heightGroups;
        // console.log(optimalScaleX, optimalScaleY)
        // currentValueZoom = (optimalScaleX > optimalScaleY ?
        //     optimalScaleY >= 1 ? 1 : optimalScaleY
        //     :
        //     optimalScaleX >=1 ? 1 : optimalScaleY
        // )- 0.02;
        // canvas.zoomToPoint({ x:  groupCenterCoordinates.x, y: groupCenterCoordinates.y}, currentValueZoom);
        // scaleValue.textContent = (currentValueZoom * 100).toFixed(0) + '%';
    }

});
socket.on('new-picture', (data) => {
    const dar = JSON.parse(data.coords);
    if(data.id !== socket.id) {
        const newElement = new fabric.Object(dar);
        console.log('Загрузка одно объекта')
        fabric.util.enlivenObjects([newElement], function (objects) {
            objects.forEach(function (obj) {
                canvas.add(obj)
            });
            canvas.renderAll();
        });
    }
});
socket.on('cursor-data', (data) => {
    cursorUser.left = data.cursorCoordinates.x;
    cursorUser.top = data.cursorCoordinates.y;
    canvas.renderAll();
});

window.addEventListener('resize', (e) => {
    e.preventDefault();
    resizeCanvas();
}, false);
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
gridSelection.addEventListener('change', (event) => {
    if(event.target.value === 'triangular') {
        canvas.setBackgroundColor({ source: pathTriangularGrid }, canvas.renderAll.bind(canvas));
    } else {
        canvas.setBackgroundColor({ source: pathUsualGrid }, canvas.renderAll.bind(canvas));
    }
})