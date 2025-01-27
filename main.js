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
document.addEventListener('mousedown', handleSpawnerDrag);
document.addEventListener('touchstart', handleSpawnerDrag);

function handleSpawnerDrag(event) {
  const target = event.target;
  
  if (target.classList.contains('spawner')) {
    event.preventDefault();
    
    // Get touch or mouse coordinates
    const clientX = event.type === 'mousedown' ? event.clientX : event.touches[0].clientX;
    const clientY = event.type === 'mousedown' ? event.clientY : event.touches[0].clientY;
    
    // Create clone
    const clone = target.cloneNode(true);
    clone.classList.remove('spawner');
    clone.classList.add('draggable');
    
    // Position clone at same location as original
    const rect = target.getBoundingClientRect();
    clone.style.position = 'absolute';
    clone.style.left = (rect.left + rect.width/2) + 'px';
    clone.style.top = (rect.top + rect.height/2) + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.zIndex = window.last_z++;
    
    // Add clone to document
    document.getElementById('target').appendChild(clone);
    
    // Trigger drag start on clone
    if (event.type === 'mousedown') {
      const mouseEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: clientX,
        clientY: clientY
      });
      clone.dispatchEvent(mouseEvent);
    } else {
      const touch = new Touch({
        identifier: event.touches[0].identifier,
        target: clone,
        clientX: clientX,
        clientY: clientY,
        pageX: event.touches[0].pageX,
        pageY: event.touches[0].pageY
      });
      
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch]
      });
      clone.dispatchEvent(touchEvent);
    }
  }
}
