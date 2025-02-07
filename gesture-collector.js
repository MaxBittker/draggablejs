import { getDraggableElement, hitTesting, resizeHandle } from './matrix-transform.js';

let ENABLE_MATRIX_GESTURES = true; // Feature flag for testing
let DEBUG_GESTURES = true; // Debug flag for logging gesture state

// Track the active draggable element during a gesture
let activeGestureDraggable = null;
let lastMoveLog = 0; // Track last move log timestamp
let currentGestureId = null; // Track current gesture for grouping

// Debug logging helper
function logGestureState(phase, event, details = {}) {
  if (!DEBUG_GESTURES) return;
  
  // Don't log move-inactive events
  if (phase === 'move-inactive') return;
  
  // For move events, throttle logging to once every 100ms
  if (phase === 'move-update') {
    const now = Date.now();
    if (now - lastMoveLog < 100) return;
    lastMoveLog = now;
  }
  
  const baseInfo = {
    phase,
    timestamp: new Date().toISOString(),
    hasActiveDraggable: !!activeGestureDraggable,
    eventType: event.type,
    isTouchEvent: 'touches' in event,
  };

  if (activeGestureDraggable) {
    baseInfo.elementInfo = {
      tagName: activeGestureDraggable.element.tagName,
      classes: Array.from(activeGestureDraggable.element.classList),
      currentMatrix: activeGestureDraggable.getCurrentMatrix().toString(),
      hasGestureData: !!activeGestureDraggable.gestureData
    };
  }

  // Start a new gesture group if this is a start event
  if (phase === 'start-entry') {
    currentGestureId = Date.now();
    console.group(`Gesture ${currentGestureId}`);
  }

  // Log the event
  console.log(`${phase}:`, {
    ...baseInfo,
    ...details
  });

  // End the gesture group if this is a cleanup event
  if (phase === 'end-cleanup') {
    console.groupEnd();
    currentGestureId = null;
  }
}

function handleGestureStart(event) {
  if (!ENABLE_MATRIX_GESTURES) return;

  logGestureState('start-entry', event, { 
    activeGestureDraggable: activeGestureDraggable?.element.tagName 
  });

  // Get the point from either touch or mouse event
  const point = event.touches?.[0] ?? event;
  const hitPoint = { x: point.clientX, y: point.clientY };

  // Find the actual target using hit testing
  const target = hitTesting.findTopmostElementAt(hitPoint);
  if (!target) {
    logGestureState('start-no-target', event, { hitPoint });
    resizeHandle.detach(); // Hide handle when no target
    return;
  }

  const draggable = getDraggableElement(target);
  if (!draggable) {
    logGestureState('start-no-draggable', event, { 
      targetInfo: {
        tagName: target.tagName,
        classes: Array.from(target.classList)
      }
    });
    resizeHandle.detach(); // Hide handle when no draggable
    return;
  }

  // Store the active draggable for move/end events
  activeGestureDraggable = draggable;
  
  // Show resize handle for mouse interactions only
  if (!('touches' in event)) {
    resizeHandle.attachToDraggable(draggable);
  }

  logGestureState('start-draggable-set', event, {
    hitPoint,
    targetInfo: {
      tagName: target.tagName,
      classes: Array.from(target.classList)
    }
  });

  try {
    // Debug logging for touch event
    if ('touches' in event) {
      console.log('Touch Event Debug:', {
        touchCount: event.touches.length,
        targetTouchCount: event.targetTouches?.length,
        changedTouchCount: event.changedTouches?.length,
        touches: Array.from(event.touches).map(t => ({
          clientX: t.clientX,
          clientY: t.clientY,
          target: t.target?.tagName
        }))
      });
    }
    
    const gestureData = draggable.startGesture(event);
    
    // Log gesture start data for testing
    if (gestureData) {
      logGestureState('start-complete', event, {
        gestureType: gestureData.type,
        gestureData
      });
    }
  } catch (error) {
    logGestureState('start-error', event, { error: error.message });
    console.error('Error starting gesture:', error);
  }
}

function handleGestureMove(event) {
  if (!ENABLE_MATRIX_GESTURES || !activeGestureDraggable) {
    logGestureState('move-inactive', event);
    return;
  }

  const gestureUpdate = activeGestureDraggable.updateGesture(event);
  
  // Update resize handle position if it's attached
  if (!resizeHandle.isResizing) {
    resizeHandle.updatePosition();
  }
  
  // Log gesture update data for testing
  if (gestureUpdate) {
    const logData = {
      type: gestureUpdate.type,
      translation: {
        x: gestureUpdate.translation.x.toFixed(2),
        y: gestureUpdate.translation.y.toFixed(2)
      }
    };
    
    // Only include scale/rotation for multi-touch
    if (gestureUpdate.type === 'multi-touch') {
      logData.scale = gestureUpdate.scale.toFixed(2);
      logData.rotation = (gestureUpdate.rotation * 180 / Math.PI).toFixed(2) + '°';
    }
    
    logGestureState('move-update', event, { gestureUpdate: logData });
  } else {
    logGestureState('move-no-update', event);
  }
}

function handleGestureEnd(event) {
  if (!ENABLE_MATRIX_GESTURES || !activeGestureDraggable) {
    logGestureState('end-inactive', event);
    return;
  }

  logGestureState('end-entry', event);
  
  activeGestureDraggable.endGesture();
  logGestureState('end-complete', event, {
    finalMatrix: activeGestureDraggable.getCurrentMatrix().toString()
  });
  
  // Keep resize handle if this was a mouse interaction
  if ('touches' in event) {
    resizeHandle.detach();
  }
  
  // Clear the active draggable
  activeGestureDraggable = null;
  logGestureState('end-cleanup', event);
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
  
  if (DEBUG_GESTURES) {
    console.log('Gesture Collection Initialized:', {
      matrixGesturesEnabled: ENABLE_MATRIX_GESTURES,
      timestamp: new Date().toISOString()
    });
  }
}

export {
  initializeGestureCollection,
  ENABLE_MATRIX_GESTURES
};