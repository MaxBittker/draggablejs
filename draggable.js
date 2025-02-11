// you don't need to edit this file, but you can look through it to see how the draggable works!
// -Max 

import { initializeGestureCollection } from './gesture-collector.js';
import { 
  initializeExistingElements, 
  observeDraggableElements,
  getDraggableElement,
  hitTesting,
  decomposeMatrix,
  resizeHandle,
} from './matrix-transform.js';

let dragStartCallback = function (element, x, y, scale, rotation) {
  // the default drag callback does nothing
};
let dragMoveCallback = function (element, x, y, scale, rotation) {
  // the default drag callback does nothing
};
let dragEndCallback = function (element, x, y, scale, rotation) {
  // the default drag callback does nothing
};

function setDragStartCallback(callback) {
  if (typeof callback === "function") {
    dragStartCallback = callback;
  } else {
    throw new Error("drag callback must be a function!");
  }
}
function setDragMoveCallback(callback) {
  if (typeof callback === "function") {
    dragMoveCallback = callback;
  } else {
    throw new Error("drag callback must be a function!");
  }
}
function setDragEndCallback(callback) {
  if (typeof callback === "function") {
    dragEndCallback = callback;
  } else {
    throw new Error("drag callback must be a function!");
  }
}

let maxZIndex = 1;
const DRAG_Z_INDEX = 100000;

let activeElement = null;
let isMouseDown = false;

window.last_z = 1;

function startAction(ev, isMouse) {
  // Normalize the event data for both mouse and touch
  const point = isMouse ? ev : ev.touches[0];
  
  // Early return if not a draggable or resize handle target
  if (!point.target.classList.contains("draggable") && 
      !point.target.classList.contains("resize-handle")) {
    return;
  }

  // Prevent default for images
  if (point.target.tagName === "IMG") {
    ev.preventDefault();
  }

  // Handle resize handle interaction
  if (point.target.classList.contains("resize-handle")) {
    ev.preventDefault();
    return;
  }
  
  // Get the actual draggable element (handling image click-through)
  let selectedElement = hitTesting.findTopmostElementAt({
    x: point.clientX,
    y: point.clientY
  });

  if (!selectedElement || !selectedElement.classList.contains("draggable")) {
    if (point.target.classList.contains("draggable")) {
      selectedElement = point.target;
      activeElement = selectedElement;
    } else {
      return;
    }
  } else {
    // Set the active element if hit testing succeeded
    activeElement = selectedElement;
  }

  // Get or create DraggableElement instance
  const draggable = getDraggableElement(selectedElement);
  
  if (!draggable) {
    console.error('Failed to get/create DraggableElement');
    console.groupEnd();
    return;
  }

  // Set high z-index during drag (maintaining legacy behavior)
  selectedElement.style.zIndex = DRAG_Z_INDEX;
  console.log('Set z-index to:', DRAG_Z_INDEX);

  // Start the gesture using matrix transform system
  console.log('Starting gesture with event:', ev);
  draggable.startGesture(ev);

  // Show resize handle for mouse interactions
  if (isMouse && !resizeHandle.isResizing) {
    console.log('Attaching resize handle for mouse interaction');
    resizeHandle.attachToDraggable(draggable);
    resizeHandle.updatePosition(); // Immediately update position
  }

  // Trigger legacy callback with decomposed matrix values
  const matrix = draggable.getCurrentMatrix();
  const { translation, scale, rotation } = decomposeMatrix(matrix);
  console.log('Matrix decomposition:', { translation, scale, rotation });
  
  dragStartCallback(
    selectedElement,
    translation.x,
    translation.y,
    scale,
    rotation
  );
  
  console.groupEnd();
}

// Mouse events
document.addEventListener("mousedown", function(ev) {
  isMouseDown = true;
  startAction(ev, true);
});

document.addEventListener("mousemove", function(ev) {
  if (!isMouseDown || !activeElement) return;
  moveAction(ev, true);
  
  // Ensure resize handle stays visible during movement
  const draggable = getDraggableElement(activeElement);
  if (draggable) {
    resizeHandle.attachToDraggable(draggable);
    resizeHandle.updatePosition();
  }
});

document.addEventListener("mouseup", function(ev) {
  if (!activeElement) return;
  
  const draggable = getDraggableElement(activeElement);
  if (draggable) {
    draggable.endGesture();
    
    // Keep resize handle visible after interaction ends
    resizeHandle.attachToDraggable(draggable);
    resizeHandle.updatePosition();
  }
  
  // Reset state
  activeElement = null;
  isMouseDown = false;
});

// Touch events
document.addEventListener("touchstart", function(ev) {
  startAction(ev, false);
});

document.addEventListener("touchmove", function(ev) {
  if (!activeElement) return;
  moveAction(ev, false);
});

document.addEventListener("touchend", function(ev) {
  if (!activeElement) return;
  
  const draggable = getDraggableElement(activeElement);
  if (draggable) {
    // Update the base matrix to include the current gesture
    draggable.endGesture();
    
    // Set to next available z-index when drag ends
    maxZIndex++;
    activeElement.style.zIndex = maxZIndex;
  }
  
  // Reset state
  activeElement = null;
  mousedown = false;
  handle_state = false;
  
  // Detach resize handle
  resizeHandle.detach();
});

function moveAction(ev, isMouse) {
  console.group('moveAction');
  
  if (!activeElement) {
    console.warn('No active element, returning');
    console.groupEnd();
    return;
  }

  const draggable = getDraggableElement(activeElement);
  console.log('DraggableElement instance:', draggable);
  
  if (!draggable) {
    console.error('Failed to get DraggableElement for active element');
    console.groupEnd();
    return;
  }

  // Log movement data
  console.log('Movement data:', {
    clientX: ev.clientX,
    clientY: ev.clientY,
    touches: ev.touches
  });

  // For touch events, calculate movement from touch data
  let gestureUpdate;
  
  if (ev.touches) {
    // Reference gesture-collector.js lines 129-173 for touch handling
    const currentTouch = ev.touches[0];
    const isMultiTouch = ev.touches.length >= 2;
    
    if (isMultiTouch) {
      const [t1, t2] = [ev.touches[0], ev.touches[1]];
      const currentMidpoint = midpoint(t1, t2);
      const currentAngle = angle(t1, t2);
      const startAngle = draggable.gestureData.startAngle || 0;
      
      gestureUpdate = {
        translation: {
          x: currentMidpoint.x - draggable.gestureData.startMidpoint.x,
          y: currentMidpoint.y - draggable.gestureData.startMidpoint.y
        },
        scale: 1,
        rotation: currentAngle - startAngle,
        pressure: (t1.force + t2.force) / 2 || 0.5,
        type: 'multi-touch',
        pivot: currentMidpoint
      };
    } else {
      gestureUpdate = {
        translation: {
          x: currentTouch.clientX - draggable.gestureData?.lastKnownPoint?.x || 0,
          y: currentTouch.clientY - draggable.gestureData?.lastKnownPoint?.y || 0
        },
        scale: 1,
        rotation: 0,
        pressure: currentTouch.force || 0.5,
        type: 'single-touch'
      };
    }
  } else {
    // For mouse events, calculate translation from gesture start point
    const gestureData = draggable.gestureData;
    if (!gestureData || gestureData.type !== 'single-touch') {
      console.warn('Invalid gesture data for mouse movement');
      console.groupEnd();
      return;
    }

    gestureUpdate = {
      translation: {
        x: ev.clientX - gestureData.startPoint.x,
        y: ev.clientY - gestureData.startPoint.y
      },
      scale: 1,
      rotation: 0,
      pressure: ev.pressure || 0.5,
      type: 'single-touch'
    };
  }

  console.log('Gesture update:', gestureUpdate);

  // Update the gesture
  draggable.updateFromGesture(gestureUpdate);

  // Get current transform state for callback
  const matrix = draggable.getCurrentMatrix();
  const { translation, scale, rotation } = decomposeMatrix(matrix);
  console.log('Current transform state:', { translation, scale, rotation });

  // Always update resize handle position for mouse interactions
  if (isMouse) {
    console.log('Updating resize handle position');
    resizeHandle.updatePosition();
  }

  // Call legacy callback
  dragMoveCallback(
    activeElement,
    translation.x,
    translation.y,
    scale,
    rotation
  );

  console.groupEnd();
}

let canvas = document.createElement("canvas");

function getTransform(el) {
  try {
    let st = window.getComputedStyle(el, null);
    let tr =
      st.getPropertyValue("-webkit-transform") ||
      st.getPropertyValue("-moz-transform") ||
      st.getPropertyValue("-ms-transform") ||
      st.getPropertyValue("-o-transform") ||
      st.getPropertyValue("transform") ||
      "FAIL";

    return tr.split("(")[1].split(")")[0].split(",");
  } catch (e) {
    console.log(e);
    return [0, 0, 0, 0];
  }
}
function getCurrentScale(el) {
  let values = getTransform(el);

  return Math.sqrt(values[0] * values[0] + values[1] * values[1]);
}

function getCurrentRotation(el) {
  let values = getTransform(el);

  return Math.atan2(values[1], values[0]);
}

// Initialize matrix transform system
initializeGestureCollection();
initializeExistingElements();
observeDraggableElements();

export { setDragStartCallback, setDragMoveCallback, setDragEndCallback };
