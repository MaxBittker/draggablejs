// gesture-collector.js
import { getDraggableElement } from './matrix-transform.js';

let ENABLE_MATRIX_GESTURES = true; // Feature flag for testing

function handleGestureStart(event) {
  if (!ENABLE_MATRIX_GESTURES) return;

  const target = event.target;
  if (!target.classList.contains('draggable')) return;

  const draggable = getDraggableElement(target);
  if (!draggable) return;

  const gestureData = draggable.startGesture(event);
  
  // Log gesture start data for testing
  console.log('Gesture Start:', {
    type: gestureData.type,
    matrix: draggable.getCurrentMatrix().toString()
  });
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
