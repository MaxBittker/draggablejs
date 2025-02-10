import { getDraggableElement, hitTesting, resizeHandle } from './matrix-transform.js';

// Track active gesture state
const gestureState = {
  activeDraggable: null,
  activePointers: new Map(), // Track all active pointers
  lastUpdate: null,
  isMultiTouch: false
};

// Normalize pointer data from either touch or mouse event
function normalizePointer(event, pointerId = 'mouse') {
  if ('touches' in event) {
    // For touch events, find the matching touch point
    const touch = Array.from(event.touches).find(t => t.identifier === pointerId);
    if (!touch) return null;
    
    return {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      pressure: touch.force || 0,
      type: 'touch'
    };
  }
  
  // For mouse events
  return {
    id: 'mouse',
    x: event.clientX,
    y: event.clientY,
    pressure: event.pressure || 0.5,
    type: 'mouse'
  };
}

// Get all active pointers from an event
function getActivePointers(event) {
  if ('touches' in event) {
    return Array.from(event.touches)
      .map(touch => normalizePointer(event, touch.identifier))
      .filter(p => p !== null); // Filter out any null pointers
  }
  const pointer = normalizePointer(event);
  return pointer ? [pointer] : [];
}

// Calculate gesture data from pointer positions
function calculateGestureData(pointers) {
  if (!pointers.length) {
    return null;
  }
  
  if (pointers.length >= 2) {
    const [p1, p2] = pointers;
    return {
      center: {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      },
      distance: Math.hypot(p2.x - p1.x, p2.y - p1.y),
      angle: Math.atan2(p2.y - p1.y, p2.x - p1.x),
      pressure: (p1.pressure + p2.pressure) / 2
    };
  }
  
  const p = pointers[0];
  return {
    center: { x: p.x, y: p.y },
    distance: 0,
    angle: 0,
    pressure: p.pressure
  };
}

function handleGestureStart(event) {
  // Prevent default only for touch events or if target is draggable
  if ('touches' in event || event.target.classList.contains('draggable')) {
    event.preventDefault();
  }

  // Get normalized pointer data
  const pointers = getActivePointers(event);
  if (!pointers.length) return;

  // Store valid pointer states
  pointers.forEach(p => {
    if (p) { // Only store non-null pointers
      gestureState.activePointers.set(p.id, p);
    }
  });
  
  // Calculate initial gesture data
  const initialGesture = calculateGestureData(pointers);
  if (!initialGesture) return;
  
  // Find target if we don't have an active draggable
  if (!gestureState.activeDraggable) {
    const hitPoint = initialGesture.center;
    const target = hitTesting.findTopmostElementAt(hitPoint);
    
    if (!target) {
      resizeHandle.detach();
      return;
    }

    const draggable = getDraggableElement(target);
    if (!draggable) {
      resizeHandle.detach();
      return;
    }

    gestureState.activeDraggable = draggable;
  }

  // Update gesture state
  gestureState.isMultiTouch = pointers.length >= 2;
  gestureState.lastUpdate = initialGesture;
  
  // Start the gesture on the draggable
  gestureState.activeDraggable.startGesture(event);
  
  // Show resize handle for mouse interactions only
  if (!('touches' in event)) {
    resizeHandle.attachToDraggable(gestureState.activeDraggable);
  }
}

function handleGestureMove(event) {
  if (!gestureState.activeDraggable) return;

  // Prevent default to avoid scrolling
  event.preventDefault();

  // Update pointer states
  const pointers = getActivePointers(event);
  if (!pointers.length) return;

  pointers.forEach(p => {
    if (p) { // Only store non-null pointers
      gestureState.activePointers.set(p.id, p);
    }
  });
  
  // Calculate current gesture data
  const currentGesture = calculateGestureData(pointers);
  if (!currentGesture || !gestureState.lastUpdate) return;
  
  // Calculate deltas from last update
  const gestureUpdate = {
    translation: {
      x: currentGesture.center.x - gestureState.lastUpdate.center.x,
      y: currentGesture.center.y - gestureState.lastUpdate.center.y
    },
    scale: gestureState.isMultiTouch ? 
      currentGesture.distance / gestureState.lastUpdate.distance : 1,
    rotation: gestureState.isMultiTouch ? 
      currentGesture.angle - gestureState.lastUpdate.angle : 0,
    pressure: currentGesture.pressure,
    type: gestureState.isMultiTouch ? 'multi-touch' : 'single-touch'
  };

  // Update the draggable
  gestureState.activeDraggable.updateFromGesture(gestureUpdate);
  
  // Update last known state
  gestureState.lastUpdate = currentGesture;
  
  // Update resize handle position if it's attached
  if (!resizeHandle.isResizing) {
    resizeHandle.updatePosition();
  }
}

function handleGestureEnd(event) {
  if (!gestureState.activeDraggable) return;

  // Remove ended pointers
  if ('touches' in event) {
    Array.from(event.changedTouches).forEach(touch => {
      gestureState.activePointers.delete(touch.identifier);
    });
  } else {
    gestureState.activePointers.delete('mouse');
  }

  // If we still have active pointers, update the gesture
  if (gestureState.activePointers.size > 0) {
    const pointers = Array.from(gestureState.activePointers.values());
    gestureState.isMultiTouch = pointers.length >= 2;
    gestureState.lastUpdate = calculateGestureData(pointers);
    return;
  }

  // End the gesture
  gestureState.activeDraggable.endGesture();
  
  // Keep resize handle if this was a mouse interaction
  if ('touches' in event) {
    resizeHandle.detach();
  }
  
  // Reset gesture state
  gestureState.activeDraggable = null;
  gestureState.lastUpdate = null;
  gestureState.isMultiTouch = false;
}

// Initialize gesture collection
function initializeGestureCollection() {
  // Touch events
  document.addEventListener('touchstart', handleGestureStart, { passive: false });
  document.addEventListener('touchmove', handleGestureMove, { passive: false });
  document.addEventListener('touchend', handleGestureEnd);
  document.addEventListener('touchcancel', handleGestureEnd);
  
  // Mouse events
  document.addEventListener('mousedown', handleGestureStart);
  document.addEventListener('mousemove', handleGestureMove);
  document.addEventListener('mouseup', handleGestureEnd);
  
  // Handle edge cases
  document.addEventListener('mouseleave', handleGestureEnd);
  window.addEventListener('blur', () => {
    if (gestureState.activeDraggable) {
      handleGestureEnd({ type: 'mouseup' });
    }
  });
}

export {
  initializeGestureCollection,
};
