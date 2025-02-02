import { getDraggableElement } from './matrix-transform.js';

let ENABLE_MATRIX_GESTURES = true; // Feature flag for testing

function handleGestureStart(event) {
  if (!ENABLE_MATRIX_GESTURES) return;

  const target = event.target;
  if (!target.classList.contains('draggable')) return;

  const draggable = getDraggableElement(target);
  if (!draggable) return;

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
      console.log('Gesture Start:', {
        type: gestureData.type,
        matrix: draggable.getCurrentMatrix().toString(),
        eventType: event.type,
        isTouchEvent: 'touches' in event
      });
    }
  } catch (error) {
    console.error('Error starting gesture:', error);
  }
}

function handleGestureMove(event) {
  if (!ENABLE_MATRIX_GESTURES) return;

  const target = event.target;
  if (!target.classList.contains('draggable')) return;

  const draggable = getDraggableElement(target);
  if (!draggable || !draggable.gestureData) return;

  const gestureUpdate = draggable.updateGesture(event);
  
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
    
    console.log('Gesture Update:', logData);
  }
}

function handleGestureEnd(event) {
  if (!ENABLE_MATRIX_GESTURES) return;

  const target = event.target;
  if (!target.classList.contains('draggable')) return;

  const draggable = getDraggableElement(target);
  if (!draggable) return;

  draggable.endGesture();
  console.log('Gesture End:', {
    matrix: draggable.getCurrentMatrix().toString()
  });
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
  ENABLE_MATRIX_GESTURES
};