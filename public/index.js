const scaleValue = document.querySelector('.scale-panel__value');
const gridSelection = document.querySelector('.settings-panel__select-grid');
const buttonCursorMove = document.querySelector('.tool-panel__item-button-moving');
const buttonFreeDrawing = document.querySelector('.tool-panel__item-button-free-drawing');
const figureSelection = document.querySelector('.settings-panel__grid-figure');
const toolPanelList = document.querySelector('.tool-panel__list');
const inputChangeColor = document.querySelector('.sub-tool-panel__item-list-color-selection > input');
const subToolPanel = inputChangeColor.closest('.sub-tool-panel__change-color');



const buttonNoGrid = document.querySelector('.grid-panel__item-no-grid');
const buttonUsualGrid = document.querySelector('.grid-panel__item-usual-grid');
const buttonTriangularGrid = document.querySelector('.grid-panel__item-triangular-grid');

buttonNoGrid.addEventListener('click', () => {
    canvas.setBackgroundColor(null, canvas.renderAll.bind(canvas))
})
buttonUsualGrid.addEventListener('click', () => {
    canvas.setBackgroundColor({
        source: pathUsualGrid,
        repeat: 'repeat',
        scaleX: 1,
        scaleY: 1
    }, canvas.renderAll.bind(canvas));
})
buttonTriangularGrid.addEventListener('click', () => {
    canvas.setBackgroundColor({
        source: pathTriangularGrid,
        repeat: 'repeat',
        scaleX: 1,
        scaleY: 1
    }, canvas.renderAll.bind(canvas));
})



let selectedButton = buttonFreeDrawing;
buttonFreeDrawing.classList.add('settings-panel__button_active');

const handleClickOpenInputChangeColor = () => {
    subToolPanel.classList.add('sub-tool-panel_visible');
}
const handleClickCloseInputChangeColor = (event) => {
    if (event.target !== inputChangeColor) {
        subToolPanel.classList.remove('sub-tool-panel_visible');
    }
}

window.addEventListener('click', handleClickCloseInputChangeColor);
inputChangeColor.addEventListener('click', handleClickOpenInputChangeColor);



const socket = io();

const canvas = new fabric.Canvas(document.getElementById('canvasId'), {
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

let isCursorMove = false;

canvas.setBackgroundColor({
        source: pathUsualGrid,
        repeat: 'repeat',
        scaleX: 1,
        scaleY: 1
}, canvas.renderAll.bind(canvas));


fabric.Canvas.prototype.toggleDragMode = function () {
    const STATE_IDLE = "idle";
    const STATE_PANNING = "panning";
    // Remember the previous X and Y coordinates for delta calculations
    let lastClientX;
    let lastClientY;
    // Keep track of the state

    let deltaX;
    let deltaY;
    let state = STATE_IDLE;
    // We're entering dragmode
    if (isCursorMove) {
        console.log('isDrawingMode = true');
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
        this.on("mouse:move", (event) => handleMouseMovement(event))
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

const cursorUser = new fabric.Circle({
    radius: currentRadiusCursor,
    fill: 'red',
    left: -10,
    top: -10,
    originX: 'center',
    originY: 'center',
});

const removeEvents = () => {
    canvas.selection = false;
    canvas.off('mouse:down');
    canvas.off('mouse:up');
    canvas.off('mouse:move');
}

const handleMouseMovement = (event) => {
    const cursorCoordinate = canvas.getPointer(event.e);
    let data = {
        userId: socket.id,
        coords: cursorCoordinate,
    }
    socket.emit('cursor-data', data);
}          // Курсор
const resizeCanvas = () => {
    canvas.setHeight(window.innerHeight);
    canvas.setWidth(window.innerWidth);
    canvas.renderAll();
}                      // Установка холста на весь экран
const handleCreateNewLine = (event) => {
    event.path.set();
    // newLine.id = canvas.size() - 1;
    socket.emit('new-picture', JSON.stringify(event.path))
}          // Создание новой линии
const handleMouseWheel = (opt) => {
    const delta = opt.e.deltaY;
    handleScale(delta);
    scaleValue.textContent = (currentValueZoom * 100).toFixed(0) + '%';
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, currentValueZoom);

    opt.e.preventDefault();
    opt.e.stopPropagation();
}               // Масштабирование
const handleScale = (delta) => {
    if(delta < 0) {
        if(currentValueZoom <= MAX_ZOOM_OUT) return;
        currentValueZoom = (parseFloat(currentValueZoom) - SCALE_STEP).toFixed(2);
    } else {
        if(currentValueZoom >= MAX_ZOOM_IN) return;
        currentValueZoom = (parseFloat(currentValueZoom) + SCALE_STEP).toFixed(2);
    }
}                  // Вспомогательная функция для масштабирования
const handleGetAllPicture = (data) => {
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

}           // Первая загрузка всех сохранённых картинок
const getNewPicture = (data) => {
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
}                 // Получение новой картинки
const getCursorData = (data) => {
    if(data.userId !== socket.id) {
        canvas.add(cursorUser);
        cursorUser.left = data.cursorCoordinates.x;
        cursorUser.top = data.cursorCoordinates.y;
    }
    canvas.renderAll();
}                 // Получение координат курсора
const handleChangeResizeWindow = (event) => {
    event.preventDefault();
    resizeCanvas();
}     // Растягивание холста на весь экран
const handleDownKeySpace = (event) => {
    if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        canvas.toggleDragMode();
        canvas.isDrawingMode = false;
        buttonCursorMove.classList.add('settings-panel__button-cursor-move_active');
        buttonCursorMove.classList.add('settings-panel__button-cursor-move_disabled');
        isCursorMove = true;
    }
}           // Нажатие на пробел
const handleUpKeySpace = (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
        canvas.toggleDragMode();
        canvas.isDrawingMode = true;
        buttonCursorMove.classList.remove('settings-panel__button-cursor-move_active');
        buttonCursorMove.classList.remove('settings-panel__button-cursor-move_disabled');
        isCursorMove = false;
        if(!isCursorMove) {
            document.body.addEventListener('keydown', handleDownKeySpace)
        }
    }
}             // Отпускание пробела
const changeGridSelection = (event) => {
    if(event.target.value === 'triangular') {
        canvas.setBackgroundColor({ source: pathTriangularGrid }, canvas.renderAll.bind(canvas));
    } else {
        canvas.setBackgroundColor({ source: pathUsualGrid }, canvas.renderAll.bind(canvas));
    }
}          // Смена сетки
const handleButtonCursorMoveClick = () => {
    isCursorMove = !isCursorMove;
    console.log(isCursorMove)
    // if(isCursorMove){
    //     document.body.removeEventListener('keydown', handleDownKeySpace);
    // } else {
    //     document.body.addEventListener('keydown', handleDownKeySpace);
    // }
    canvas.toggleDragMode();
    canvas.isDrawingMode = false;
}       // Перемещение с помощью кнопки
const handleSelectedButton = (event) => {
    let currentButton = event.target.closest('.tool-panel__item-button');
    if(currentButton === null || currentButton === buttonText){
        return;
    } else if (selectedButton === currentButton) {
        selectedButton.classList.toggle('settings-panel__button_active');
    } else {
        currentButton.classList.toggle('settings-panel__button_active');
        if(selectedButton) {
            selectedButton.classList.remove('settings-panel__button_active');
        }
        selectedButton = currentButton;
    }

}         // Подсветка выбранной кнопки
const handleDraw = () => {
    canvas.isDrawingMode = !canvas.isDrawingMode;
}                        // Разрешение рисования
const changeObjectSelection = (value) => {
    canvas.forEachObject(function (obj) {
        obj.selectable = value;
    });
    canvas.renderAll();
}        // Функция разрешающая/запрещающая выбор элементов

resizeCanvas();

canvas.on('mouse:move', handleMouseMovement);         // Отображение чужих курсоров
canvas.on('path:created',handleCreateNewLine);        // Добавление новой линии
canvas.on('mouse:wheel', handleMouseWheel);           // Реагируем на масштабирование

// Получаем какие-либо данные от сервера

socket.on('saveImg', handleGetAllPicture);            // первая загрузка всего сохранённого в файле
socket.on('cursor-data', getCursorData);              // отображаем курсоры чужих пользователей
socket.on('new-picture', getNewPicture);              // получаем новый рисунок, созданный другими пользователями


// Навешиваем слушатели событий на нужные нам элементы
window.addEventListener('resize', handleChangeResizeWindow, false);

document.body.addEventListener('keydown', handleDownKeySpace);
document.body.addEventListener('keyup', handleUpKeySpace);

// gridSelection.addEventListener('change', changeGridSelection);



const drawCircle = () => {
    let circle, isDown, origX, origY;
    console.log(canvas.__eventListeners)
    removeEvents();
    changeObjectSelection(false);
    console.log(canvas.__eventListeners)

    canvas.on('mouse:down', function(o) {

        console.log('mouse:down')
        isDown = true;
        const pointer = canvas.getPointer(o.e);
        origX = pointer.x;
        origY = pointer.y;
        circle = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 1,
                fill: 'red',
                selectable: false,
                originX: 'center',
                originY: 'center'
            });
        canvas.add(circle);
        // socket.emit("circle:add", circle);
        // socket.emit("circle:add",circle);
    });
    canvas.on('mouse:move', function(o) {
        console.log('mouse:move')
        if (!isDown) return;
        let pointer = canvas.getPointer(o.e);
        circle.set({ radius: Math.abs(origX - pointer.x) });
        // socket.emit("circle:edit", circle);
        canvas.renderAll();
    });
    canvas.on('mouse:up', function(o) {
        console.log('mouse:up')
        isDown = false;
        circle.setCoords();
        removeEvents();
    });
}
const drawLine = () => {
    let line, isDown;
    removeEvents();
    changeObjectSelection(false);

    canvas.on('mouse:down', function(o) {
        isDown = true;
        let pointer = canvas.getPointer(o.e);
        let points = [pointer.x, pointer.y, pointer.x, pointer.y];
        line = new fabric.Line(points, {
            strokeWidth: '10',
            fill: 'red',
            // stroke: hexToRgbA(drawing_color_fill.value,drawing_figure_opacity.value),
            // strokeDashArray: [stroke_line, stroke_line],
            ///stroke: '#07ff11a3',
            originX: 'center',
            originY: 'center',
            selectable: false
        });
        canvas.add(line);
        // socket.emit("line:add",points);
        // console.log("line:add",points);
    });
    canvas.on('mouse:move', function(o) {
        if (!isDown) return;
        let pointer = canvas.getPointer(o.e);
        line.set({
            x2: pointer.x,
            y2: pointer.y
        });
        canvas.renderAll();
        // socket.emit("line:edit",{x1:line.x1,y1:line.y1,x2:line.x2,y2:line.y2});
        //socket.emit("line:edit",line);
        // console.log("line:edit",{x1:line.x1,y1:line.y1,x2:line.x2,y2:line.y2},line);
    });

    canvas.on('mouse:up', function(o) {
        isDown = false;
        line.setCoords();
        // socket.emit('canvas_save_to_json',canvas.toJSON());
    });
}
const handleDrawSquare = (element) => {
    switch (element) {
        case 'circle': drawCircle();
        case 'line': drawLine();
    }

}

let downFigureButton = false;

// figureSelection.addEventListener('click', (event) => {
//     console.log(canvas.__eventListeners)
//     if(event.target.tagName.toLowerCase() !== 'button') return;
//     downFigureButton = !downFigureButton;
//     const value = event.target.dataset.value;
//     const currentButton = event.target;
//     if(downFigureButton) {
//         canvas.isDrawingMode = false;
//         currentButton.classList.add('settings-panel__button-figure_active');
//         handleDrawSquare(value);
//     } else {
//         currentButton.classList.remove('settings-panel__button-figure_active');
//         canvas.isDrawingMode = true;
//     }
// })
buttonCursorMove.addEventListener('click', handleButtonCursorMoveClick);
buttonFreeDrawing.addEventListener('click', handleDraw);
toolPanelList.addEventListener('click', handleSelectedButton);






const buttonText = document.querySelector('.tool-panel__item-button-text'); // *
const formTextTextarea = document.querySelector('.form-text__textarea');
const modalTextWrapper = document.querySelector('.modal-text-wrapper');
const formTextInput = document.querySelector('.form-text__input');
const textSettings = document.querySelector('.text-settings');
const formTextButtonSubmit = document.querySelector('.form-text__button-submit');

const buttonFontSizeUp = document.querySelector('.text-settings__button-font-size-up');
const buttonFontSizeDown = document.querySelector('.text-settings__button-font-size-down');
const fontSizeValue = document.querySelector('.text-settings__font-size-value');
const buttonOpenListFontFamily = document.querySelector('.text-settings__button-open-list');
const fontFamilyListWrapper = document.querySelector('.text-settings__font-family-list_wrapper');
const fontFamilyList = document.querySelector('.text-settings__font-family-list');


let selectedFontFamily = "Open Sans";
let newFontSizeValue = "25";

fontFamilyList.addEventListener('click', (event) => {
    selectedFontFamily = event.target.textContent;
    formTextInput.style.fontFamily = selectedFontFamily;
})

buttonOpenListFontFamily.addEventListener('click', () => {
    fontFamilyListWrapper.classList.toggle('text-settings__font-family-list_wrapper_active');
})

buttonFontSizeUp.addEventListener('click',() => {
    const currentFontSize = Number(fontSizeValue.textContent);
    newFontSizeValue = currentFontSize + 1;
    fontSizeValue.textContent = newFontSizeValue + '';
    formTextInput.style.fontSize = newFontSizeValue + 'px';
});


buttonFontSizeDown.addEventListener('click', () => {
    const currentFontSize = Number(fontSizeValue.textContent);
    const newFontSizeValue = currentFontSize - 1;
    fontSizeValue.textContent = newFontSizeValue + '';
    formTextInput.style.fontSize = newFontSizeValue + 'px';
})


let mouseCursorCoordinatesCanvas = {
    x: 0,
    y: 0,
}

formTextTextarea.addEventListener('input', () => {
    formTextInput.value = formTextTextarea.value;

})

formTextButtonSubmit.addEventListener('click', (event) => {
    event.preventDefault();
    console.log(selectedFontFamily, newFontSizeValue)
    const text = new fabric.Text(formTextInput.value, {
        left: mouseCursorCoordinatesCanvas.x,
        top: mouseCursorCoordinatesCanvas.y,
        fill: 'black',
        fontFamily: selectedFontFamily,
        fontSize: newFontSizeValue
    })
    canvas.add(text);
    canvas.renderAll();
    mouseCursorCoordinatesCanvas = {
        x: 0,
        y: 0
    };
    formTextTextarea.value ='';
    formTextInput.value = '';
})

let isDown = false

buttonText.addEventListener('click', (event) => {
    let origX, origY;
    buttonText.classList.add('settings-panel__button_active');
    textSettings.classList.toggle('text-settings_active');
    console.log(isDown)
    if(isDown) {
        console.log('dddd')
        buttonText.classList.remove('settings-panel__button_active');
        canvas.off('mouse:down');
        canvas.off('mouse:up');
    }
    changeObjectSelection(false);
    console.log(canvas.__eventListeners);
    removeEvents();
    if(modalTextWrapper.classList.contains('modal-text-wrapper_active')) {
        removeEvents();
        modalTextWrapper.classList.remove('modal-text-wrapper_active');
        return;
    }

    canvas.on('mouse:down', function(o) {
        console.log('mouse:down');
        const pointer = canvas.getPointer(o.e);
        if(formTextTextarea.value !== ''){
            canvas.renderAll();
            modalTextWrapper.classList.remove('modal-text-wrapper_active');
        } else {
            mouseCursorCoordinatesCanvas = {
                x: pointer.x,
                y: pointer.y,
            }
            origX = o.pointer.x;
            origY = o.pointer.y;
            modalTextWrapper.style.left = origX + 'px';
            modalTextWrapper.style.top = origY + 'px';
            modalTextWrapper.classList.add('modal-text-wrapper_active');
        }

    });

    canvas.on('mouse:up', function(o) {
        console.log('mouse:up')
        formTextInput.value = '';
        formTextTextarea.value ='';
        // isDown = false;
        // removeEvents();
    });
    isDown = true;
})








const formFormulasWrapper = document.querySelector('.form-formulas__wrapper');
const buttonShowModalWindowFormulas = document.querySelector('.button__show-modal-window-formulas');
const buttonAddFormulas = document.querySelector('.button__add-formulas');
const fieldFormFormulas = document.querySelector('.form-formulas__field');


buttonAddFormulas.addEventListener('click', (event) => {
    event.preventDefault();
    formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
})



buttonShowModalWindowFormulas.addEventListener('click', (event) => {
    let origX, origY;
    if(isDown) {
        formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
        canvas.off('mouse:down');
        canvas.off('mouse:up');
    } else {
        changeObjectSelection(false);
        removeEvents();
        canvas.on('mouse:down', function(o) {
            console.log('mouse:down');
            const pointer = canvas.getPointer(o.e);
            // if(formulaTextarea.value !== ''){
            //     canvas.renderAll();
            //     formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
            // } else {
            mouseCursorCoordinatesCanvas = {
                x: pointer.x,
                y: pointer.y,
            }
            origX = o.pointer.x;
            origY = o.pointer.y;
            formFormulasWrapper.style.left = origX + 'px';
            formFormulasWrapper.style.top = origY + 'px';
            formFormulasWrapper.classList.add('form-formulas__wrapper_visible');
            // }

        });
        canvas.on('mouse:up', function(o) {
            console.log('mouse:up');
        });
    }
    isDown = true;
})