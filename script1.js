
var pageIsLoaded = false;
var canvas, ctx;

function pageLoaded() {
  /* Define canvas */
  canvas = document.getElementById("can");
  ctx = canvas.getContext("2d");

  /* Config resizable canvas */
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cam.hw = window.innerWidth/2;
    cam.hh = window.innerHeight/2;
  }
  window.addEventListener('resize', resizeCanvas, false);
  resizeCanvas();

  /* Update flag */
  pageIsLoaded = true;
}
if (!("hypot" in Math)) {  // Polyfill
	Math.hypot = function(x, y) {
		return Math.sqrt(x * x + y * y);
	};
}


// v v v Main program v v v

/** Variables **/
var me, builder;
var timestamp = wasTimestamp = 0;
var frameCount = 0;
var mouseX = mouseY = pmouseX = pmouseY = revMouseX = revMouseY = scroll = 0;
var organisms = [];
var downKeys = Object.create({});
var mouseIsPressed = mouseIsPressedInstant = false;
var cam = {// Camera variables
  ht : 0.001,// ht = height, the number of pixels high the camera is from the ground
  gotoHt: 0.01,// Used for the smooth effect when zooming with the mouse scroll
  x: 0,
  y: 0,
  dragForceX: 0,// Used for the smooth effect when panning around the map
  dragForceY: 0,// ^
  minHt: 0.0001,// Inwards zoom limit
  maxHt: 1,// Outwards zoom limit
  hw: 355,/// hw = half width of canvas
  hh: 355,// hh = half height of canvas
};
var images = {
  algae: "Cells/ghost.png",///
  eater: "Cells/eater.png",
  protector: "Cells/protector.png",
  motor: "Cells/motor.png",///
  ghost: "Cells/ghost.png",


  load: function(that) {
    var keys = Object.keys(that);
    for (var i = 0; i < keys.length; i ++) {
      var ke = keys[i];
      if (ke !== "load") {
        var newImg = new Image();
        newImg.src="Images/"+that[ke];
        that[keys[i]] = newImg;
      }
    }
  },
}
images.load(images);


/** "Classes" **/

var AlgaeCell = function(parent, x, y) {
  this.parent = parent;
  this.parent.cells.push(this);
  this.x = x;
  this.y = y;
  this.r = 1;
  this.hr = this.r/2;
  this.img = images.algae;

  this.update = function() {};

  this.draw = function() {
    ctx.drawImage(this.img, X(this.x-this.hr), Y(this.y-this.hr), S(this.r), S(this.r));
  };
};

var EaterCell = function(parent, x, y) {
  this.parent = parent;
  this.parent.cells.push(this);
  this.x = x;
  this.y = y;
  this.r = 1;
  this.hr = this.r/2;
  this.img = images.eater;

  this.update = function() {


  };

  this.draw = function() {
    ctx.drawImage(this.img, X(this.x-this.hr), Y(this.y-this.hr), S(this.r), S(this.r));
  };
};

var ProtectorCell = function(parent, x, y) {
  this.parent = parent;
  this.parent.cells.push(this);
  this.x = x;
  this.y = y;
  this.r = 1;
  this.hr = this.r/2;
  this.img = images.protector;

  this.update = function() {};

  this.draw = function() {
    ctx.drawImage(this.img, X(this.x-this.hr), Y(this.y-this.hr), S(this.r), S(this.r));
  };
};

var MotorCell = function(parent, x, y, angle) {
  this.parent = parent;
  this.parent.cells.push(this);
  this.x = x;
  this.y = y;
  this.speed = 0.001;
  this.angle = angle;
  this.velX = Math.cos(angle)*this.speed;
  this.velY = Math.sin(angle)*this.speed;
  this.r = 1;
  this.hr = this.r/2;
  this.img = images.motor;

  this.update = function() {
    this.x += this.velX;
    this.y += this.velY;

  };

  this.draw = function() {
    ctx.translate(X(this.x), Y(this.y));
    ctx.rotate(this.angle);
    ctx.drawImage(this.img, S(-this.hr), S(-this.hr), S(this.r), S(this.r));
    ctx.resetTransform();/////////////////////////////////////////////////wii
  };
}



var Organism = function(name, x, y) {
  organisms.push(this);
  this.name = name;
  this.x = x;
  this.y = y;
  this.r = 1;
  this.cells = [];
  new EaterCell(this, x, y);
  new EaterCell(this, x+1, y);

  this.calculateCenter = function() {
    var points = [];
    for (var i = 0; i < this.cells.length; i++) {
      points.push({x:this.cells[i].x, y:this.cells[i].y});
    }
    var center = makeCircle(points);
    this.x = center.x;
    this.y = center.y;
    this.r = center.r + 0.5;
  };

  this.update = function() {
    for (var i = this.cells.length-1; i >= 0; i --) {
      this.cells[i].update();
    }

    // Calculate center
    if (frameCount%30 == 21) this.calculateCenter();// Every

    ///debugging
    ctx.beginPath();
ctx.arc(X(this.x), Y(this.y), S(this.r), 0, 2 * Math.PI, false);
ctx.lineWidth = 5;
      ctx.strokeStyle = '#003300';
      ctx.stroke();

  };

  this.draw = function() {
    for (var i = this.cells.length-1; i >= 0; i --) {
      this.cells[i].draw();
    }
  };
};


var Builder = function() {

  this.toolbarSize = 90;
  this.fractionSize = this.toolbarSize/20;
  this.fractionSize2 = this.toolbarSize/10;
  this.almostSize = this.toolbarSize-this.fractionSize;
  this.almostSize2 = this.toolbarSize-this.fractionSize*3;

  this.isBuilding = false;
  this.options = [
    {
      img: images.eater,
      ref: EaterCell
    },{
      img: images.protector,
      ref: ProtectorCell
    },{
      img: images.motor,
      ref: MotorCell
    },
  ];
  this.selected = 0;
  this.isInsideMenu = false;

  this.updatedraw = function() {


    if (this.isBuilding) {

      // Calculate closest cell position
      var bestDist = 99999;
      var bestCell = bestCellX = bestCellY = null;
      var maybeCellX, maybeCellY, maybeCell;
      for (var i = 0; i < me.cells.length; i++) {
        var chX = revMouseX-me.cells[i].x;
        var chY = revMouseY-me.cells[i].y;
        var distance = Math.hypot(chX, chY);
        if (distance < bestDist) {

          // Check for collisions with "maybe best" cell
          maybeCell = me.cells[i]
          maybeCellX = maybeCell.x+chX/distance;
          maybeCellY = maybeCell.y+chY/distance;
          var isCollidesWithACell = false;
          for (var j = 0; j < me.cells.length; j++) {
            if (i !== j && Math.hypot(maybeCellX-me.cells[j].x, maybeCellY-me.cells[j].y) < 0.9) {
              isCollidesWithACell = true;
              break;
            }
          }
          if (!isCollidesWithACell) {
            bestCell = maybeCell;
            bestCellX = maybeCellX;
            bestCellY = maybeCellY;
            bestDist = distance;
          }
        }
      }

      if (bestCell !== null) {


        // Display ghost


        // Build
        var canBuild = mouseIsPressedInstant && mouseButton === 1 && !this.isInsideMenu;

        switch (this.selected) {
          case 2:// Motor cells


            ctx.translate(X(bestCellX), Y(bestCellY));
            ctx.rotate(Math.atan2(revMouseY-bestCellY, revMouseX-bestCellX));
            ctx.drawImage(this.options[this.selected].img, S(-0.5), S(-0.5), S(1), S(1));
            ctx.resetTransform();
            if (canBuild) {
              new this.options[this.selected].ref(me, bestCellX, bestCellY, Math.atan2(revMouseY-bestCellY, revMouseX-bestCellX));
            }
            break;
          default:// Normal cells

            ctx.drawImage(this.options[this.selected].img, X(bestCellX-0.5), Y(bestCellY-0.5), S(1), S(1));
            if (canBuild) {
              new this.options[this.selected].ref(me, bestCellX, bestCellY);
            }
        }

    }

    } else {}

      /* Build toolbar at the bottom */

      // Background rectangles
      for (var i = 0; i < this.options.length; i ++) {
        if (this.isBuilding && i === this.selected) {
          ctx.fillStyle = "rgba(0, 0, 0, 1)";
        } else {
          ctx.fillStyle = "rgba(0, 0, 0, 0.33)";
        }
        ctx.fillRect(this.fractionSize+i*this.toolbarSize, canvas.height-this.toolbarSize, this.almostSize, this.almostSize);
      }

      // Image
      for (var i = 0; i < this.options.length; i ++) {
        ctx.drawImage(this.options[i].img, this.fractionSize2+i*this.toolbarSize, canvas.height+this.fractionSize-this.toolbarSize, this.almostSize2, this.almostSize2);
      }

    // Select
    this.isInsideMenu = false;
    if (mouseY > canvas.height-this.toolbarSize) {
      var index = Math.floor(mouseX / this.toolbarSize);
      if (index >= 0 && index < this.options.length) {
        this.isInsideMenu = true;
        if (mouseIsPressed) {
          this.selected = index;
          this.isBuilding = true;
        }
      }
    }
  };

}

/** Functions **/
var X = function(cor){// Calculate on-screen position based on camera variables (x, y, height)
  return (cor-cam.x)/cam.ht+cam.hw;
};
var Y = function(cor){
  return (cor-cam.y)/cam.ht+cam.hh;
};
var S = function(size){
  return size/cam.ht;
};
var RevX = function(pos){
  return (pos-cam.hw)*cam.ht+cam.x;
};
var RevY = function(pos){
  return (pos-cam.hh)*cam.ht+cam.y;
};
var RevS = function(size){
  return size*cam.ht;
};
var cameraUpdate = function() {
  /* Mouse drag logic */
  if(mouseIsPressed && mouseButton === 2){
    cam.dragForceX = (pmouseX-mouseX)*cam.ht;
    cam.dragForceY = (pmouseY-mouseY)*cam.ht;
    cam.x += cam.dragForceX;
    cam.y += cam.dragForceY;
  } else{
    cam.x += cam.dragForceX;
    cam.y += cam.dragForceY;
    cam.dragForceX *= 0.7;
    cam.dragForceY *= 0.7;
  }

  /* UP/DOWN arrow key zoom logic */
  if (downKeys[38] && cam.gotoHt > cam.minHt) {
    cam.gotoHt *= 0.95;
  } else if ((downKeys[40] || scroll < 0) && cam.gotoHt < cam.maxHt) {
    cam.gotoHt /= 0.95;
  }

  /* Scroll up/down logic */
  if (scroll < 0) {
    cam.gotoHt *= 0.8;
  } else if (scroll > 0) {
    cam.gotoHt /= 0.8;
  }

  /* Smooth zoom logic */
  if(cam.ht < cam.gotoHt/1.01){
    cam.ht += (cam.gotoHt-cam.ht)*0.4;
  }else if(cam.ht > cam.gotoHt*1.01){
    cam.ht -= (cam.ht-cam.gotoHt)*0.4;
  }else{cam.ht = cam.gotoHt;}
};



var makeCircle = function(points) {// Modified from free source: https://www.nayuki.io/res/smallest-enclosing-circle/smallest-enclosing-circle.js

  // One boundary point known
  function makeCircleOnePoint(points, p) {
  	var c = {x: p.x, y: p.y, r: 0};
  	points.forEach(function(q, i) {
  		if (!isInCircle(c, q)) {
  			if (c.r == 0)
  				c = makeDiameter(p, q);
  			else
  				c = makeCircleTwoPoints(points.slice(0, i + 1), p, q);
  		}
  	});
  	return c;
  }
  // Two boundary points known
  function makeCircleTwoPoints(points, p, q) {
  	var circ = makeDiameter(p, q);
  	var left  = null;
  	var right = null;
  	// For each point not in the two-point circle
  	points.forEach(function(r) {
  		if (isInCircle(circ, r))
  			return;
  		// Form a circumcircle and classify it on left or right side
  		var cross = crossProduct(p.x, p.y, q.x, q.y, r.x, r.y);
  		var c = makeCircumcircle(p, q, r);
  		if (c === null)
  			return;
  		else if (cross > 0 && (left === null || crossProduct(p.x, p.y, q.x, q.y, c.x, c.y) > crossProduct(p.x, p.y, q.x, q.y, left.x, left.y)))
  			left = c;
  		else if (cross < 0 && (right === null || crossProduct(p.x, p.y, q.x, q.y, c.x, c.y) < crossProduct(p.x, p.y, q.x, q.y, right.x, right.y)))
  			right = c;
  	});
  	// Select which circle to return
  	if (left === null && right === null)
  		return circ;
  	else if (left === null && right !== null)
  		return right;
  	else if (left !== null && right === null)
  		return left;
  	else if (left !== null && right !== null)
  		return left.r <= right.r ? left : right;
  	else
  		throw "Assertion error";
  }
  function makeDiameter(a, b) {
  	var cx = (a.x + b.x) / 2;
  	var cy = (a.y + b.y) / 2;
  	var r0 = distance(cx, cy, a.x, a.y);
  	var r1 = distance(cx, cy, b.x, b.y);
  	return {x: cx, y: cy, r: Math.max(r0, r1)};
  }
  function makeCircumcircle(a, b, c) {
  	// Mathematical algorithm from Wikipedia: Circumscribed circle
  	var ox = (Math.min(a.x, b.x, c.x) + Math.max(a.x, b.x, c.x)) / 2;
  	var oy = (Math.min(a.y, b.y, c.y) + Math.max(a.y, b.y, c.y)) / 2;
  	var ax = a.x - ox,  ay = a.y - oy;
  	var bx = b.x - ox,  by = b.y - oy;
  	var cx = c.x - ox,  cy = c.y - oy;
  	var d = (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) * 2;
  	if (d == 0)
  		return null;
  	var x = ox + ((ax*ax + ay*ay) * (by - cy) + (bx*bx + by*by) * (cy - ay) + (cx*cx + cy*cy) * (ay - by)) / d;
  	var y = oy + ((ax*ax + ay*ay) * (cx - bx) + (bx*bx + by*by) * (ax - cx) + (cx*cx + cy*cy) * (bx - ax)) / d;
  	var ra = distance(x, y, a.x, a.y);
  	var rb = distance(x, y, b.x, b.y);
  	var rc = distance(x, y, c.x, c.y);
  	return {x: x, y: y, r: Math.max(ra, rb, rc)};
  }
  /* Simple mathematical functions */
  var MULTIPLICATIVE_EPSILON = 1 + 1e-14;
  function isInCircle(c, p) {
  	return c !== null && distance(p.x, p.y, c.x, c.y) <= c.r * MULTIPLICATIVE_EPSILON;
  }
  // Returns twice the signed area of the triangle defined by (x0, y0), (x1, y1), (x2, y2).
  function crossProduct(x0, y0, x1, y1, x2, y2) {
  	return (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  }
  function distance(x0, y0, x1, y1) {
  	return Math.hypot(x0 - x1, y0 - y1);
  }

	// Clone list to preserve the caller's data, do Durstenfeld shuffle
	var shuffled = points.slice();
	for (var i = points.length - 1; i >= 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		j = Math.max(Math.min(j, i), 0);
		var temp = shuffled[i];
		shuffled[i] = shuffled[j];
		shuffled[j] = temp;
	}

	// Progressively add points to circle or recompute circle
	var c = null;
	shuffled.forEach(function(p, i) {
		if (c === null || !isInCircle(c, p))
			c = makeCircleOnePoint(shuffled.slice(0, i + 1), p);
	});
	return c;
}





var init = function() {
  builder = new Builder();

  me = new Organism("Me", 0, 0);
};

var main = function() {
  // Calculate some events
  frameCount ++;
  revMouseX = RevX(mouseX);
  revMouseY = RevY(mouseY);

  // Blue background
  ctx.fillStyle = "rgb(0, 105, 148)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update stuff
  cameraUpdate();
  for (var i = 0; i < organisms.length; i++) {
    organisms[i].update();
  }

  // Draw stuff
  for (var i = 0; i < organisms.length; i++) {
    organisms[i].draw();
  }

  // Helper objects
  builder.updatedraw();

  // Calculate some events
  scroll = 0;
  pmouseX = mouseX;
  pmouseY = mouseY;
  mouseIsPressedInstant = false;

};

/** Interval **/
init();
setInterval(function () {
  timestamp = performance.now();
  ///  console.log(timestamp-wasTimestamp);
  wasTimestamp = timestamp;

  main();

}, 33);

/** Events **/
document.onkeydown = function(evt) {
  evt = evt || window.event;
  downKeys[evt.keyCode] = true;
};
document.onkeyup = function(evt) {
  evt = evt || window.event;
  downKeys[evt.keyCode] = false;
};
document.onmousedown = function(evt) {
  mouseButton = evt.button || evt.which;
  mouseIsPressed = true;
  mouseIsPressedInstant = true;
};
document.onmouseup = function() {
  mouseIsPressed = false;
};
document.onmousemove = function(evt) {
  mouseX = evt.clientX;
  mouseY = evt.clientY;
};
document.oncontextmenu = function() {
  return false;
};
window.onwheel = function(evt) {
  scroll = evt.deltaY;
}
