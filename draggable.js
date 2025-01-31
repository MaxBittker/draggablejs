// you don't need to edit this file, but you can look through it to see how the draggable works!
// -Max 

let dragStartCallback = function (element, x, y, scale, rotation) {
  // the default drag callback does nothing
};
let dragMoveCallback = function (element, x, y, scale, rotation) {
  // the default drag callback does nothing
};
let dragEndCallback = function (element, x, y, scale, rotation) {
  // the default drag callback does nothing
};

function setDragStartCallback(callback) {
  if (typeof callback === "function") {
    dragStartCallback = callback;
  } else {
    throw new Error("drag callback must be a function!");
  }
}
function setDragMoveCallback(callback) {
  if (typeof callback === "function") {
    dragMoveCallback = callback;
  } else {
    throw new Error("drag callback must be a function!");
  }
}
function setDragEndCallback(callback) {
  if (typeof callback === "function") {
    dragEndCallback = callback;
  } else {
    throw new Error("drag callback must be a function!");
  }
}
let activeElement = null;
let mousedown = false;
let handle_state = false;
let offset_x;
let offset_y;

window.last_z = 1;
let initialDistance;
let initialScale;
let initialWidth;
let initialHeight;
let initialAngle;
let gestureOriginSet = false; // Track if we've set the origin for current gesture

let resizeHandle = document.createElement("div");
let handleContainer = document.createElement("div");
resizeHandle.classList.add("resize-handle");
handleContainer.classList.add("handle-container");
handleContainer.appendChild(resizeHandle);
document.body.appendChild(handleContainer);

var isTouchDevice = "ontouchstart" in document.documentElement;

// Convert global coordinates to element's local percentage coordinates
function toElementPercentage(element, x, y) {
  const rect = element.getBoundingClientRect();
  return {
    x: ((x - rect.left) / rect.width) * 100,
    y: ((y - rect.top) / rect.height) * 100
  };
}

// this moves the outline rectangle to match the current element
function updateHandleContainer() {
  if (!activeElement) {
    handleContainer.style.left = "-1000px";
    return;
  }
  let styles = window.getComputedStyle(activeElement);
  let scale = getCurrentScale(activeElement);
  let rotate = getCurrentRotation(activeElement);
  handleContainer.style.left = styles.left;
  handleContainer.style.top = styles.top;
  handleContainer.style.width = parseFloat(styles.width) * scale + "px";
  handleContainer.style.height = parseFloat(styles.height) * scale + "px";
  handleContainer.style.transform = `
   translate(-50%,-50%)
   rotate(${rotate * (180 / Math.PI)}deg)`;
}

// Add this at the start of the file, after other variable declarations
let maxZIndex = 1;
const DRAG_Z_INDEX = 100000;

function startAction(ev, isMouse) {
  let touches = Array.from(ev.touches);
  let firstTouch = touches[0];
  if (firstTouch.target.classList.contains("resize-handle")) {
    ev.preventDefault();
    initialScale = getCurrentScale(activeElement);
    initialAngle = getCurrentRotation(activeElement);
    let styles = window.getComputedStyle(activeElement);
    dragStartCallback(
      activeElement,
      parseFloat(styles.left),
      parseFloat(styles.top),
      initialScale,
      initialAngle
    );
  }
  if (firstTouch.target.classList.contains("draggable")) {
    if (firstTouch.target.tagName === "IMG") {
      ev.preventDefault();
    }
    let selectedElement = checkImageCoord(firstTouch.target, ev);
    if (!selectedElement || !selectedElement.classList.contains("draggable")) {
      return;
    }
    activeElement = selectedElement;

    let bounds = selectedElement.getBoundingClientRect();
    if (isMouse) {
      updateHandleContainer();
    }
    offset_x = firstTouch.clientX - bounds.left;
    offset_y = firstTouch.clientY - bounds.top;
    
    // Set extremely high z-index during drag
    activeElement.style.zIndex = DRAG_Z_INDEX;
    initialWidth = bounds.width;
    initialHeight = bounds.height;
    initialScale = getCurrentScale(activeElement);
    initialAngle = getCurrentRotation(activeElement);

    let secondTouch = touches[1];
    if (secondTouch) {
      let p1 = { x: firstTouch.clientX, y: firstTouch.clientY };
      let p2 = { x: secondTouch.clientX, y: secondTouch.clientY };
      let pDifference = sub(p1, p2);
      let pMid = add(p1, scale(pDifference, 0.5));

      initialDistance = distance(p1, p2);
      initialAngle = angle(pDifference) - getCurrentRotation(selectedElement);
      offset_x = pMid.x - bounds.left;
      offset_y = pMid.y - bounds.top;

      // Set initial transform origin at gesture start
      const origin = toElementPercentage(activeElement, pMid.x, pMid.y);
      activeElement.style.transformOrigin = `${origin.x}% ${origin.y}%`;
      gestureOriginSet = true;
    }
    let styles = window.getComputedStyle(activeElement);

    dragStartCallback(
      activeElement,
      parseFloat(styles.left),
      parseFloat(styles.top),
      initialScale,
      initialAngle
    );
  }
}
document.body.addEventListener("touchstart", function (ev) {
  if (activeElement) {
    handleContainer.style.left = "-1000px";
  }
  startAction(ev, false);
});

document.body.addEventListener("mousedown", function (ev) {
  if (isTouchDevice) {
    return;
  }

  if (ev.target.classList.contains("resize-handle") && activeElement) {
    let styles = window.getComputedStyle(activeElement);
    let scale = getCurrentScale(activeElement);
    let rotate = getCurrentRotation(activeElement);
    let size = {
      x: parseFloat(styles.width) * scale,
      y: parseFloat(styles.height) * scale
    };

    handleContainer.style.transform = `
     translate(-50%,-50%)
     rotate(${rotate * (180 / Math.PI)}deg)`;

    initialDistance = magnitude(size);

    handle_state = "resize";
  } else {
    handle_state = false;
    if (activeElement) {
      handleContainer.style.left = "-1000px";
      activeElement = false;
    }
  }

  mousedown = true;

  ev.touches = [ev];
  startAction(ev, true);
});
document.body.addEventListener("touchend", function (ev) {
  if (activeElement) {
    handleContainer.style.left = "-1000px";
    // Set to next available z-index when drag ends
    maxZIndex++;
    activeElement.style.zIndex = maxZIndex;
    
    // Reset transform origin and gesture state
    activeElement.style.transformOrigin = "50% 50%";
    gestureOriginSet = false;
    
    let styles = window.getComputedStyle(activeElement);
    dragEndCallback(
      activeElement,
      parseFloat(styles.left),
      parseFloat(styles.top),
      getCurrentScale(activeElement),
      getCurrentRotation(activeElement)
    );
  }

  activeElement = null;
});
document.body.addEventListener("mouseup", function (ev) {
  mousedown = false;
  handle_state = false;

  if (!activeElement) return;
  // Set to next available z-index when drag ends
  maxZIndex++;
  activeElement.style.zIndex = maxZIndex;
  
  // Reset transform origin and gesture state
  activeElement.style.transformOrigin = "50% 50%";
  gestureOriginSet = false;
  
  initialScale = getCurrentScale(activeElement);
  initialAngle = getCurrentRotation(activeElement);
  let styles = window.getComputedStyle(activeElement);
  dragEndCallback(
    activeElement,
    parseFloat(styles.left),
    parseFloat(styles.top),
    getCurrentScale(activeElement),
    getCurrentRotation(activeElement)
  );
});

function moveAction(ev, isMouse) {
  if (!activeElement) {
    return;
  }

  let touches = Array.from(ev.touches);
  let firstTouch = touches[0];

  let x = firstTouch.clientX - offset_x + initialWidth / 2;
  let y = firstTouch.clientY - offset_y + initialHeight / 2;

  let newScale = initialScale;
  let newAngle = initialAngle;

  let secondTouch = touches[1];
  if (secondTouch) {
    let p1 = { x: firstTouch.clientX, y: firstTouch.clientY };
    let p2 = { x: secondTouch.clientX, y: secondTouch.clientY };
    let pDifference = sub(p1, p2);
    let pMid = add(p1, scale(pDifference, 0.5));

    let newDistance = distance(p1, p2);
    newAngle = angle(pDifference) - initialAngle;
    newScale = initialScale * (newDistance / initialDistance);
    x = pMid.x - offset_x + initialWidth / 2;
    y = pMid.y - offset_y + initialHeight / 2;

    // Only set transform origin if it hasn't been set for this gesture
    if (!gestureOriginSet) {
      const origin = toElementPercentage(activeElement, pMid.x, pMid.y);
      activeElement.style.transformOrigin = `${origin.x}% ${origin.y}%`;
      gestureOriginSet = true;
    }
  }

  if (handle_state === "resize") {
    let b = activeElement.getBoundingClientRect();
    let p1 = { x: firstTouch.clientX, y: firstTouch.clientY };
    let center = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    let p2 = add(center, sub(p1, center));
    let newDistance = distance(p1, p2);

    newScale = initialScale * (newDistance / initialDistance);

    let pDifference = sub(p1, p2);
    let handleAngle = angle(pDifference);

    let styles = window.getComputedStyle(activeElement);
    let w = parseFloat(styles.width);
    let h = parseFloat(styles.height);
    let a = Math.atan2(h, w) + Math.PI;

    newAngle = handleAngle - a;
  } else if (!handle_state) {
    activeElement.style.left = x + "px";
    activeElement.style.top = y + "px";
  }

  activeElement.style.transform = `
  translate(-50%,-50%)
  scale(${newScale})
  rotate(${newAngle * (180 / Math.PI)}deg)`;

  dragMoveCallback(activeElement, x, y, newScale, newAngle);

  if (isMouse) {
    try {
      updateHandleContainer();
    } catch (e) {
      console.log(e);
    }
  }
}
document.body.addEventListener("mousemove", function (ev) {
  ev.touches = [ev];

  if (mousedown) {
    moveAction(ev, true);
  }
});

document.body.addEventListener(
  "touchmove",
  function (ev) {
    ev.preventDefault();
    moveAction(ev);
  },
  { passive: false }
);
let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");
// document.body.appendChild(ctx.canvas); // used for debugging

// this function checks if a pixel location in an image is opaque
// if it's not, it attemps to find the next image below it until
// it finds one
function checkImageCoord(img_element, event) {
  // non-image elements are always considered opaque
  if (img_element.tagName !== "IMG") {
    return img_element;
  }
  img_element.crossOrigin = "anonymous";
  let touches = Array.from(event.touches);
  let firstTouch = touches[0];

  // Get click coordinates
  let x = firstTouch.clientX;
  let y = firstTouch.clientY;
  let w = (ctx.canvas.width = window.innerWidth);
  let h = (ctx.canvas.height = window.innerHeight);

  ctx.clearRect(0, 0, w, h);

  let scale = getCurrentScale(img_element);
  let rotation = getCurrentRotation(img_element);

  let styles = window.getComputedStyle(img_element);
  ctx.translate(parseFloat(styles.left), parseFloat(styles.top));
  ctx.scale(scale, scale);
  ctx.rotate(rotation);

  ctx.drawImage(
    img_element,
    -img_element.width / 2,
    -img_element.height / 2,
    img_element.width,
    img_element.height
  );
  ctx.resetTransform();
  let alpha = 1;
  try {
    alpha = ctx.getImageData(x, y, 1, 1).data[3]; // [0]R [1]G [2]B [3]A
    if (!img_element.complete) {
      alpha = 1;
    }
  } catch (e) {
    console.warn(`add crossorigin="anonymous" to your img`);
  }
  // If pixel is transparent, then retrieve the element underneath
  // and trigger it's click event
  if (alpha === 0) {
    img_element.style.pointerEvents = "none";
    let nextTarget = document.elementFromPoint(
      firstTouch.clientX,
      firstTouch.clientY
    );
    let nextEl = null;
    if (nextTarget.classList.contains("draggable")) {
      nextEl = checkImageCoord(nextTarget, event);
    }
    img_element.style.pointerEvents = "auto";
    return nextEl;
  } else {
    //image is opaque at location
    return img_element;
  }
}

function getTransform(el) {
  try {
    let st = window.getComputedStyle(el, null);
    let tr =
      st.getPropertyValue("-webkit-transform") ||
      st.getPropertyValue("-moz-transform") ||
      st.getPropertyValue("-ms-transform") ||
      st.getPropertyValue("-o-transform") ||
      st.getPropertyValue("transform") ||
      "FAIL";

    return tr.split("(")[1].split(")")[0].split(",");
  } catch (e) {
    console.log(e);
    return [0, 0, 0, 0];
  }
}
function getCurrentScale(el) {
  let values = getTransform(el);

  return Math.sqrt(values[0] * values[0] + values[1] * values[1]);
}

function getCurrentRotation(el) {
  let values = getTransform(el);

  return Math.atan2(values[1], values[0]);
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a, b) {
  return { x: b.x - a.x, y: b.y - a.y };
}

function scale(a, s) {
  return { x: a.x * s, y: a.y * s };
}
function magnitude(a) {
  return Math.sqrt(Math.pow(a.x, 2) + Math.pow(a.y, 2));
}
function angle(b) {
  return Math.atan2(b.y, b.x); //radians
}

function distance(a, b) {
  return magnitude(sub(a, b));
}

export { setDragStartCallback, setDragMoveCallback, setDragEndCallback };
