
# draggable.js

A lightweight JavaScript library that adds drag, resize, and rotate functionality to HTML elements.

## Setup

1. Include the required files:

```html
<link rel="stylesheet" href="draggable.css">
<script type="module" src="draggable.js"></script>

<img class="draggable" src="image.png">
<div class="draggable">Drag me</div>

```

2. Add the `draggable` class to any element you want to make interactive:



## Features

- Drag elements by clicking/touching and moving
- Resize and rotate using the handle in the bottom right corner
- Multi-touch support for mobile devices
- Works with both images and other HTML elements
- Transparent image areas are click-through

## Callbacks

You can hook into drag events using these functions:

```javascript
import { setDragStartCallback, setDragMoveCallback, setDragEndCallback } from './draggable.js';
setDragStartCallback((element, x, y, scale, angle) => {
// Called when dragging starts
});
setDragMoveCallback((element, x, y, scale, angle) => {
// Called while dragging
});
setDragEndCallback((element, x, y, scale, angle) => {
// Called when dragging ends
});
```


Each callback receives:
- element: The DOM element being dragged
- x: Current x position
- y: Current y position
- scale: Current scale factor
- angle: Current rotation angle (in radians)

## Notes

- Elements are automatically centered using transform: translate(-50%, -50%)
- Z-index is managed automatically to bring dragged elements to front
- Touch events are handled with passive: false to prevent scrolling while dragging
