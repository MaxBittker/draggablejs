import {
  setDragStartCallback,
  setDragMoveCallback,
  setDragEndCallback
} from "./draggable.js";

// if you want to attach extra logic to the drag motions, you can use these callbacks:
setDragStartCallback(function (element, x, y, scale, angle) {
  // console.log(element)
});
setDragMoveCallback(function (element, x, y, scale, angle) {
  // console.log(element)
});
setDragEndCallback(function (element, x, y, scale, angle) {
  // console.log(element)
});

// Add event listener for spawner elements
document.addEventListener('pointerdown', handleSpawnerDrag);

function handleSpawnerDrag(event) {
  const target = event.target;
  
  if (target.classList.contains('spawner')) {
    event.preventDefault();
    
    // Create clone
    const clone = target.cloneNode(true);
    clone.classList.remove('spawner');
    clone.classList.add('draggable');
    
    // Position clone at same location as original
    const rect = target.getBoundingClientRect();
    clone.style.position = 'absolute';
    clone.style.left = (rect.left + rect.width/2) + 'px';  // Add half width to center
    clone.style.top = (rect.top + rect.height/2) + 'px';   // Add half height to center
    clone.style.width = rect.width + 'px';
    clone.style.zIndex = window.last_z++;
    
    // Add clone to document
    document.getElementById('target').appendChild(clone);
    
    // Trigger drag start on clone
    const pointerEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      pressure: event.pressure
    });
    clone.dispatchEvent(pointerEvent);
  }
}
