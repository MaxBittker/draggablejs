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

  // Gesture handling methods
  startGesture(event) {
    this.updateFromCurrentTransform();
    
    if (event.touches?.length >= 2) {
      // Multi-touch gesture
      const [touch1, touch2] = event.touches;
      this.gestureData = {
        type: 'multi-touch',
        startMidpoint: midpoint(touch1, touch2),
        startDistance: distance(touch1, touch2),
        startAngle: angle(touch1, touch2),
        initialMatrix: this.getCurrentMatrix()
      };
    } else {
      // Single touch/mouse gesture
      const point = event.touches?.[0] ?? event;
      this.gestureData = {
        type: 'single-touch',
        startPoint: { x: point.clientX, y: point.clientY },
        initialMatrix: this.getCurrentMatrix()
      };
    }

    return this.gestureData;
  }

  endGesture() {
    // Store final transform as our new base
    this.updateFromCurrentTransform();
    this.gestureData = null;
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

  // Gesture handling methods
  startGesture(event) {
    this.updateFromCurrentTransform();
    
    if (event.touches?.length >= 2) {
      // Multi-touch gesture
      const [touch1, touch2] = event.touches;
      this.gestureData = {
        type: 'multi-touch',
        startMidpoint: midpoint(touch1, touch2),
        startDistance: distance(touch1, touch2),
        startAngle: angle(touch1, touch2),
        initialMatrix: this.getCurrentMatrix()
      };
    } else {
      // Single touch/mouse gesture
      const point = event.touches?.[0] ?? event;
      const bounds = getElementBounds(this.element);
      
      this.gestureData = {
        type: 'single-touch',
        startPoint: { x: point.clientX, y: point.clientY },
        elementStart: { x: bounds.x, y: bounds.y },
        initialMatrix: this.getCurrentMatrix()
      };
    }

    return this.gestureData;
  }

  updateGesture(event) {
    if (!this.gestureData) return null;

    const { type, initialMatrix } = this.gestureData;
    let gestureUpdate;

    if (type === 'multi-touch' && event.touches?.length >= 2) {
      const [touch1, touch2] = event.touches;
      const currentMidpoint = midpoint(touch1, touch2);
      const currentDistance = distance(touch1, touch2);
      const currentAngle = angle(touch1, touch2);

      return {
        type: 'multi-touch',
        scale: currentDistance / this.gestureData.startDistance,
        rotation: currentAngle - this.gestureData.startAngle,
        translation: Vector.subtract(currentMidpoint, this.gestureData.startMidpoint),
        pivot: this.gestureData.startMidpoint
      };
    } else {
      const point = event.touches?.[0] ?? event;
      const currentPoint = { x: point.clientX, y: point.clientY };
      
      return {
        type: 'single-touch',
        translation: Vector.subtract(currentPoint, this.gestureData.startPoint),
        scale: 1,
        rotation: 0
      };
    }
  }

  endGesture() {
    // Store final transform as our new base
    this.updateFromCurrentTransform();
    this.gestureData = null;
  }

  // Calculate new transform matrix based on gesture update
  calculateGestureMatrix(gestureUpdate) {
    if (!this.gestureData || !gestureUpdate) return this.getCurrentMatrix();

    let gestureMatrix = new DOMMatrix();
    
    if (gestureUpdate.type === 'multi-touch') {
      const { scale, rotation, translation, pivot } = gestureUpdate;
      const rotationDeg = rotation * (180 / Math.PI);
      
      gestureMatrix = gestureMatrix
        .translate(pivot.x, pivot.y)
        .rotate(rotationDeg)
        .scale(scale)
        .translate(-pivot.x, -pivot.y)
        .translate(translation.x, translation.y);
        
    } else {
      const { translation } = gestureUpdate;
      gestureMatrix = gestureMatrix.translate(translation.x, translation.y);
    }

    return this.baseMatrix.multiply(gestureMatrix);
  }

  // Update transform based on gesture
  updateFromGesture(gestureUpdate) {
    const newMatrix = this.calculateGestureMatrix(gestureUpdate);
    this.applyMatrix(newMatrix);
    return newMatrix;
  }
}

// Vector operations
const Vector = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  subtract: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (v, s) => ({ x: v.x * s, y: v.y * s }),
  magnitude: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v) => {
    const mag = Vector.magnitude(v);
    return mag ? Vector.scale(v, 1/mag) : { x: 0, y: 0 };
  }
};

// Gesture geometry calculations
function midpoint(p1, p2) {
  return {
    x: (p1.clientX + p2.clientX) / 2,
    y: (p1.clientY + p2.clientY) / 2
  };
}

function distance(p1, p2) {
  const dx = p2.clientX - p1.clientX;
  const dy = p2.clientY - p1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function angle(p1, p2) {
  return Math.atan2(
    p2.clientY - p1.clientY,
    p2.clientX - p1.clientX
  );
}

// Matrix operations
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

function createTransformMatrix({ translate, rotate, scale, pivot }) {
  let matrix = new DOMMatrix();
  
  if (pivot) {
    // Transform around pivot point
    matrix = matrix
      .translate(pivot.x, pivot.y)
      .rotate(rotate * (180 / Math.PI))
      .scale(scale)
      .translate(-pivot.x, -pivot.y);
  } else {
    // Transform around origin
    matrix = matrix
      .translate(translate.x, translate.y)
      .rotate(rotate * (180 / Math.PI))
      .scale(scale);
  }
  
  return matrix;
}

function transformPoint(point, matrix) {
  const domPoint = new DOMPoint(point.x, point.y);
  const transformedPoint = domPoint.matrixTransform(matrix);
  return { x: transformedPoint.x, y: transformedPoint.y };
}

// Get element bounds in screen coordinates
function getElementBounds(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    width: rect.width,
    height: rect.height
  };
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

// Export needed functions and classes
export {
  DraggableElement,
  getDraggableElement,
  initializeExistingElements,
  observeDraggableElements,
  createIdentityMatrix,
  decomposeMatrix,
  Vector,
  midpoint,
  distance,
  angle,
  transformPoint,
  createTransformMatrix
};