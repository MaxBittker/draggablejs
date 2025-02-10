const draggableRegistry = new WeakMap();

class DraggableElement {
  constructor(element) {
    this.element = element;
    this.baseMatrix = new DOMMatrix();
    this.gestureData = null;
    this.transformOrigin = { x: 50, y: 50 }; // Default to center (50%)
    
    // Initialize from any existing transform
    this.updateFromCurrentTransform();
    
    // Store in registry
    draggableRegistry.set(element, this);
  }

  // Update transform origin in percentages (0-100)
  setTransformOrigin(x, y) {
    this.transformOrigin = { x, y };
    this.element.style.transformOrigin = `${x}% ${y}%`;
  }

  // Convert page coordinates to element-relative coordinates
  pageToElementSpace(pageX, pageY) {
    const rect = this.element.getBoundingClientRect();
    const elementMatrix = this.getCurrentMatrix();
    const inverseMatrix = elementMatrix.inverse();
    
    // Create a point in page space
    const point = new DOMPoint(pageX - rect.left, pageY - rect.top);
    
    // Transform the point to element space
    const transformedPoint = point.matrixTransform(inverseMatrix);
    return transformedPoint;
  }

  // Convert element-relative coordinates to page coordinates
  elementToPageSpace(elementX, elementY) {
    const rect = this.element.getBoundingClientRect();
    const elementMatrix = this.getCurrentMatrix();
    
    // Create a point in element space
    const point = new DOMPoint(elementX, elementY);
    
    // Transform the point to page space
    const transformedPoint = point.matrixTransform(elementMatrix);
    return {
      x: transformedPoint.x + rect.left,
      y: transformedPoint.y + rect.top
    };
  }

  startGesture(event) {
    // If we already have a gesture, transition it instead of starting new
    if (this.gestureData) {
      return this.transitionGesture(event);
    }

    this.updateFromCurrentTransform();
    
    if (event.touches?.length >= 2) {
      // Multi-touch gesture
      const [touch1, touch2] = event.touches;
      const startMidpoint = midpoint(touch1, touch2);
      
      // Convert midpoint to element space for transform origin
      const elementMidpoint = this.pageToElementSpace(startMidpoint.x, startMidpoint.y);
      const rect = this.element.getBoundingClientRect();
      
      // Set transform origin to gesture midpoint
      this.setTransformOrigin(
        (elementMidpoint.x / rect.width) * 100,
        (elementMidpoint.y / rect.height) * 100
      );
      
      this.gestureData = {
        type: 'multi-touch',
        startMidpoint,
        startDistance: distance(touch1, touch2),
        startAngle: angle(touch1, touch2),
        initialMatrix: this.getCurrentMatrix(),
        lastKnownPoints: [
          { x: touch1.clientX, y: touch1.clientY },
          { x: touch2.clientX, y: touch2.clientY }
        ]
      };
    } else {
      // Single touch/mouse gesture
      const point = event.touches?.[0] ?? event;
      const bounds = getElementBounds(this.element);
      
      this.gestureData = {
        type: 'single-touch',
        startPoint: { x: point.clientX, y: point.clientY },
        elementStart: { x: bounds.x, y: bounds.y },
        initialMatrix: this.getCurrentMatrix(),
        lastKnownPoint: { x: point.clientX, y: point.clientY }
      };
    }

    return this.gestureData;
  }

  transitionGesture(event) {
    if (!this.gestureData) return null;

    const currentPoints = event.touches ? 
      Array.from(event.touches).map(t => ({ x: t.clientX, y: t.clientY })) :
      [{ x: event.clientX, y: event.clientY }];
    
    // Preserve current transform state
    const currentMatrix = this.getCurrentMatrix();
    const bounds = getElementBounds(this.element);
    
    // Transitioning to multi-touch
    if (currentPoints.length >= 2) {
      const [touch1, touch2] = currentPoints;
      
      this.gestureData = {
        type: 'multi-touch',
        startMidpoint: midpoint(touch1, touch2),
        startDistance: distance(touch1, touch2),
        startAngle: angle(touch1, touch2),
        initialMatrix: currentMatrix,
        lastKnownPoints: [touch1, touch2],
        // Store current element position
        elementCenter: { x: bounds.x, y: bounds.y }
      };
    } 
    // Transitioning to single-touch
    else if (currentPoints.length === 1) {
      const point = currentPoints[0];
      
      this.gestureData = {
        type: 'single-touch',
        startPoint: point,
        initialMatrix: currentMatrix,
        lastKnownPoint: point,
        // Store current element position
        elementCenter: { x: bounds.x, y: bounds.y }
      };
    }

    return this.gestureData;
  }

  updateGesture(event) {
    if (!this.gestureData) return null;

    // Check if we need to transition between gesture types
    if ((event.touches?.length ?? 1) !== (this.gestureData.type === 'multi-touch' ? 2 : 1)) {
      return this.transitionGesture(event);
    }

    const currentPoints = event.touches ? 
      Array.from(event.touches).map(t => ({ x: t.clientX, y: t.clientY })) :
      [{ x: event.clientX, y: event.clientY }];

    let gestureUpdate = null;

    if (this.gestureData.type === 'multi-touch' && currentPoints.length >= 2) {
      const [touch1, touch2] = currentPoints;
      const currentMidpoint = midpoint(touch1, touch2);
      const currentDistance = distance(touch1, touch2);
      const currentAngle = angle(touch1, touch2);
      
      // Store last known points for potential transition
      this.gestureData.lastKnownPoints = [touch1, touch2];

      // Calculate changes relative to gesture start
      const scaleDelta = currentDistance / this.gestureData.startDistance;
      const rotationDelta = currentAngle - this.gestureData.startAngle;
      const translationDelta = Vector.subtract(currentMidpoint, this.gestureData.startMidpoint);

      gestureUpdate = {
        type: 'multi-touch',
        translation: translationDelta,
        scale: scaleDelta,
        rotation: rotationDelta,
        pivot: currentMidpoint
      };
    } else if (currentPoints.length === 1) {
      const currentPoint = currentPoints[0];
      
      // Store last known point for potential transition
      this.gestureData.lastKnownPoint = currentPoint;

      // Calculate translation relative to gesture start
      const translationDelta = Vector.subtract(currentPoint, this.gestureData.startPoint);

      gestureUpdate = {
        type: 'single-touch',
        translation: translationDelta,
        scale: 1,
        rotation: 0
      };
    }

    return gestureUpdate;
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

  // Calculate new transform matrix based on gesture update
  calculateGestureMatrix(gestureUpdate) {
    if (!this.gestureData || !gestureUpdate) return this.getCurrentMatrix();

    let gestureMatrix = new DOMMatrix();
    
    if (gestureUpdate.type === 'multi-touch') {
      const { scale, rotation, translation, pivot } = gestureUpdate;
      const rotationDeg = rotation * (180 / Math.PI);
      
      // Convert pivot point to element space
      const elementPivot = this.pageToElementSpace(pivot.x, pivot.y);
      
      // Apply transforms around the element-space pivot
      gestureMatrix = gestureMatrix
        .translate(elementPivot.x, elementPivot.y)
        .rotate(rotationDeg)
        .scale(scale)
        .translate(-elementPivot.x, -elementPivot.y)
        .translate(translation.x, translation.y);
    } else {
      const { translation } = gestureUpdate;
      gestureMatrix = gestureMatrix.translate(translation.x, translation.y);
    }

    return this.gestureData.initialMatrix.multiply(gestureMatrix);
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
  // Extract scale (using the magnitude of the first column vector)
  const scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
  const scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
  
  // Extract rotation (in radians)
  const rotation = Math.atan2(matrix.b, matrix.a);
  
  // Extract translation
  const translation = {
    x: matrix.e,
    y: matrix.f
  };
  
  return {
    scale: scaleX, // Assuming uniform scale
    rotation,
    translation,
    scaleX,
    scaleY
  };
}

function createTransformMatrix({ translate = { x: 0, y: 0 }, rotate = 0, scale = 1, pivot = null }) {
  let matrix = new DOMMatrix();
  
  if (pivot) {
    matrix = matrix
      .translate(pivot.x, pivot.y)
      .rotate(rotate * (180 / Math.PI))
      .scale(scale)
      .translate(-pivot.x, -pivot.y)
      .translate(translate.x, translate.y);
  } else {
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

class HitTestingManager {
  constructor() {
    // Create offscreen canvas for hit testing
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Update canvas size on window resize
    this.updateCanvasSize();
    window.addEventListener('resize', () => this.updateCanvasSize());
  }

  updateCanvasSize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // Test if a point hits an element, considering transforms
  testElementHit(element, point) {
    const draggable = getDraggableElement(element);
    if (!draggable) return true; // Non-draggable elements are always "hit"

    // Get element's transform matrix
    const matrix = draggable.getCurrentMatrix();
    const inverseMatrix = matrix.inverse();

    // Transform the point to element's local space
    const elementPoint = new DOMPoint(point.x, point.y).matrixTransform(inverseMatrix);
    const bounds = element.getBoundingClientRect();

    // Check if point is within element bounds
    if (elementPoint.x < 0 || elementPoint.x > bounds.width ||
        elementPoint.y < 0 || elementPoint.y > bounds.height) {
      return false;
    }

    // For images, check pixel transparency
    if (element.tagName === 'IMG') {
      return this.testImagePixel(element, elementPoint, matrix);
    }

    return true;
  }

  // Test if a pixel in an image is opaque
  testImagePixel(image, point, matrix) {
    if (!image.complete) return true; // Image not loaded, assume hit
    
    try {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Set up the transform
      this.ctx.setTransform(
        matrix.a, matrix.b,
        matrix.c, matrix.d,
        matrix.e, matrix.f
      );
      
      // Draw the image
      this.ctx.drawImage(
        image,
        -image.width / 2,
        -image.height / 2,
        image.width,
        image.height
      );
      
      // Reset transform for pixel testing
      this.ctx.resetTransform();
      
      // Test pixel alpha
      const pixel = this.ctx.getImageData(point.x, point.y, 1, 1);
      return pixel.data[3] > 0; // Return true if pixel is not fully transparent
      
    } catch (e) {
      console.warn('Hit testing failed - ensure images have crossorigin="anonymous"');
      return true; // Assume hit on error
    }
  }

  // Get all draggable elements at a point, sorted by z-index
  getDraggableElementsAtPoint(point) {
    // Get all elements at point
    const elements = document.elementsFromPoint(point.x, point.y);
    
    // Filter to only draggable elements
    const draggables = elements
      .filter(el => el.classList.contains('draggable'))
      .map(el => ({
        element: el,
        zIndex: parseInt(getComputedStyle(el).zIndex) || 0,
        transform: new DOMMatrix(getComputedStyle(el).transform)
      }))
      .sort((a, b) => b.zIndex - a.zIndex); // Sort by z-index, highest first
    
    return draggables;
  }

  // Find the topmost draggable element at a point that passes hit testing
  findTopmostElementAt(point) {
    // Get sorted draggable elements
    const draggables = this.getDraggableElementsAtPoint(point);
    
    // Find first element that passes hit test
    for (const { element } of draggables) {
      if (this.testElementHit(element, point)) {
        return element;
      }
    }
    
    return null;
  }
}

// Create singleton instance
const hitTesting = new HitTestingManager();

class ResizeHandle {
  constructor() {
    // Check if device has touch capability
    this.isTouchDevice = 'ontouchstart' in document.documentElement;
    
    // Create handle elements
    this.container = document.createElement('div');
    this.handle = document.createElement('div');
    
    // Set up classes
    this.container.classList.add('handle-container');
    this.handle.classList.add('resize-handle');
    
    // Add handle to container
    this.container.appendChild(this.handle);
    document.body.appendChild(this.container);
    
    // Initialize state
    this.activeDraggable = null;
    this.isResizing = false;
    this.initialData = null;
    
    // Hide handle initially
    this.detach();
    
    // Only bind mouse events if not a touch device
    if (!this.isTouchDevice) {
      this.handle.addEventListener('mousedown', this.onResizeStart.bind(this));
      document.addEventListener('mousemove', this.onResizeMove.bind(this));
      document.addEventListener('mouseup', this.onResizeEnd.bind(this));
    }
  }

  attachToDraggable(draggable) {
    // Don't show handle on touch devices
    if (this.isTouchDevice) return;
    
    if (this.activeDraggable === draggable) return;
    
    this.activeDraggable = draggable;
    this.updatePosition();
  }

  detach() {
    this.activeDraggable = null;
    this.container.style.left = '-1000px';
  }

  updatePosition() {
    if (!this.activeDraggable) return;

    const element = this.activeDraggable.element;
    const matrix = this.activeDraggable.getCurrentMatrix();
    const bounds = getElementBounds(element);
    
    // Update container position and size
    this.container.style.left = `${bounds.x}px`;
    this.container.style.top = `${bounds.y}px`;
    this.container.style.width = `${bounds.width}px`;
    this.container.style.height = `${bounds.height}px`;
    
    // Extract rotation from matrix for handle container
    const { rotation } = decomposeMatrix(matrix);
    this.container.style.transform = `
      translate(-50%, -50%)
      rotate(${rotation * (180 / Math.PI)}deg)
    `;
  }

  onResizeStart(event) {
    if (!this.activeDraggable) return;
    
    event.preventDefault();
    this.isResizing = true;
    
    // Get the initial point
    const point = event.touches?.[0] ?? event;
    const bounds = getElementBounds(this.activeDraggable.element);
    const center = { x: bounds.x, y: bounds.y };
    
    // Store initial data for the gesture
    this.initialData = {
      point: { x: point.clientX, y: point.clientY },
      center,
      matrix: this.activeDraggable.getCurrentMatrix(),
      distance: Math.sqrt(
        Math.pow(point.clientX - center.x, 2) + 
        Math.pow(point.clientY - center.y, 2)
      )
    };
  }

  onResizeMove(event) {
    if (!this.isResizing || !this.initialData) return;
    
    const point = event.touches?.[0] ?? event;
    const currentPoint = { x: point.clientX, y: point.clientY };
    const { center, matrix: initialMatrix, distance: initialDistance } = this.initialData;
    
    // Calculate new distance and angle
    const currentDistance = Math.sqrt(
      Math.pow(currentPoint.x - center.x, 2) + 
      Math.pow(currentPoint.y - center.y, 2)
    );
    
    const initialAngle = Math.atan2(
      this.initialData.point.y - center.y,
      this.initialData.point.x - center.x
    );
    
    const currentAngle = Math.atan2(
      currentPoint.y - center.y,
      currentPoint.x - center.x
    );
    
    // Create transform matrix for the resize/rotate operation
    const resizeMatrix = createTransformMatrix({
      translate: { x: 0, y: 0 },
      rotate: currentAngle - initialAngle,
      scale: currentDistance / initialDistance,
      pivot: center
    });
    
    // Apply the transform
    const newMatrix = initialMatrix.multiply(resizeMatrix);
    this.activeDraggable.applyMatrix(newMatrix);
    
    // Update handle position
    this.updatePosition();
  }

  onResizeEnd() {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    this.initialData = null;
    
    if (this.activeDraggable) {
      this.activeDraggable.updateFromCurrentTransform();
    }
  }
}

// Create singleton instance
const resizeHandle = new ResizeHandle();

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
  createTransformMatrix,
  hitTesting,
  resizeHandle
};
