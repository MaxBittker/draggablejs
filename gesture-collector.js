import { getDraggableElement, hitTesting, resizeHandle } from './matrix-transform.js';

// Track the active draggable element during a gesture
let activeGestureDraggable = null;

function handleGestureStart(event) {
  // Get the point from either touch or mouse event
  const point = event.touches?.[0] ?? event;
  const hitPoint = { x: point.clientX, y: point.clientY };

  // Find the actual target using hit testing
  const target = hitTesting.findTopmostElementAt(hitPoint);
  if (!target) {
    resizeHandle.detach(); // Hide handle when no target
    return;
  }

  const draggable = getDraggableElement(target);
  if (!draggable) {
    resizeHandle.detach(); // Hide handle when no draggable
    return;
  }

  // Store the active draggable for move/end events
  activeGestureDraggable = draggable;
  
  // Show resize handle for mouse interactions only
  if (!('touches' in event)) {
    resizeHandle.attachToDraggable(draggable);
  }
}

function handleGestureMove(event) {
  if (!activeGestureDraggable) {
    return;
  }

  const gestureUpdate = activeGestureDraggable.updateGesture(event);
  
  // Update resize handle position if it's attached
  if (!resizeHandle.isResizing) {
    resizeHandle.updatePosition();
  }
}

function handleGestureEnd(event) {
  if (!activeGestureDraggable) {
    return;
  }
  
  activeGestureDraggable.endGesture();
  
  // Keep resize handle if this was a mouse interaction
  if ('touches' in event) {
    resizeHandle.detach();
  }
  
  // Clear the active draggable
  activeGestureDraggable = null;
}

// Initialize gesture collection
function initializeGestureCollection() {
  // Touch events
  document.addEventListener('touchstart', handleGestureStart, { passive: false });
  document.addEventListener('touchmove', handleGestureMove, { passive: false });
  document.addEventListener('touchend', handleGestureEnd);
  
  // Mouse events
  document.addEventListener('mousedown', handleGestureStart);
  document.addEventListener('mousemove', handleGestureMove);
  document.addEventListener('mouseup', handleGestureEnd);
}

export {
  initializeGestureCollection,
};
