const draggableRegistry = new WeakMap();

class DraggableElement {
  constructor(element) {
    this.element = element;
    this.baseMatrix = new DOMMatrix();
    this.gestureData = null;
    
    // Initialize from any existing transform
    this.updateFromCurrentTransform();
    
    // Store in registry
    draggableRegistry.set(element, this);
  }

  updateFromCurrentTransform() {
    const currentTransform = getComputedStyle(this.element).transform;
    this.baseMatrix = currentTransform === 'none' 
      ? new DOMMatrix()
      : new DOMMatrix(currentTransform);
  }

  // Get current matrix state
  getCurrentMatrix() {
    return this.baseMatrix.translate(0, 0); // Create a copy
  }

  // Update transform directly from a matrix
  applyMatrix(matrix) {
    this.element.style.transform = matrix.toString();
  }

  // Reset gesture state
  resetGestureData() {
    this.gestureData = null;
  }
}

// Utility function to get or create DraggableElement instance
function getDraggableElement(element) {
  let draggable = draggableRegistry.get(element);
  if (!draggable && element.classList.contains('draggable')) {
    draggable = new DraggableElement(element);
  }
  return draggable;
}

// Initialize existing draggable elements
function initializeExistingElements() {
  document.querySelectorAll('.draggable').forEach(element => {
    getDraggableElement(element);
  });
}

// Watch for new draggable elements
function observeDraggableElements() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.classList?.contains('draggable')) {
          getDraggableElement(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Matrix utility functions
function createIdentityMatrix() {
  return new DOMMatrix();
}

function decomposeMatrix(matrix) {
  // Extract scale, rotation, and translation from matrix
  const scale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
  const rotation = Math.atan2(matrix.b, matrix.a);
  return {
    scale,
    rotation,
    translateX: matrix.e,
    translateY: matrix.f
  };
}

// Export needed functions and classes
export {
  DraggableElement,
  getDraggableElement,
  initializeExistingElements,
  observeDraggableElements,
  createIdentityMatrix,
  decomposeMatrix
};
