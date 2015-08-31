(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/alex/code/js/riss3d/js/graph.js":[function(require,module,exports){
"use strict";

var three = THREE;
var plot = require("./plot");

function Graph() {
	three.Object3D.call(this);

	this.updateCallback = function() {};
	this.resetViewCallback = function() {};

	var plotSize = 15;
	var plotSegments = 30;

	this.plotMesh = new three.Mesh(
			new plot.PlotGeometry(plotSize, plotSize, plotSegments, plotSegments),
			plot.wireframeMaterial);
	this.plotMesh.visible = false;
	this.add(this.plotMesh);

	this.gui = new dat.GUI();

	var plotFolder = this.gui.addFolder("Plot");
	plotFolder.open();
	var plotObj = {equation: ""};
	plotFolder.add(plotObj, "equation").name("z = ").onChange(function(val) {
		plot.handleEquation(val, this.plotMesh);
		this.updateCallback();
	}.bind(this));

	this.gui.add(this, "addVector").name("Add vector");
	this.gui.add(this, "confirmRemoveAllVectors").name("Remove all vectors");
	this.gui.add(this, "resetViewCallback").name("Reset view");

	this._idBank = new IdBank();

	this.vectors = [];
	this.vectorFolders = [];
}

Graph.prototype = Object.create(three.Object3D.prototype);
Graph.prototype.constructor = Graph;

Graph.prototype.addVector = function() {
	var componLen = 3;
	var vec3 = new three.Vector3(componLen, componLen, componLen);

	var vec = new Vector(this._idBank.next(), vec3);
	this.vectors.push(vec);

	this.reloadGui();

	this.updateArrows();
};

Graph.prototype.reloadGui = function() {
	this.vectorFolders.forEach(function deleteFolder(folder) {
		folder.close();
		folder.domElement.parentNode.parentNode.removeChild(folder.domElement.parentNode);
		this.gui.__folders[folder.name] = undefined;
	}.bind(this));
	this.vectorFolders = [];

	this.vectors.forEach(function addVectorFolder(vector) {
		var folder = this.gui.addFolder(vector.getName());
		this.vectorFolders.push(folder);
		folder.open();

		vector.addToGuiFolder(folder, this);

		var tmpObj = {
			removeVector: function() {
				this.removeVector(vector);
			}.bind(this)
		};
		folder.add(tmpObj, "removeVector").name("Remove vector");
	}.bind(this));
};

Graph.prototype.refreshGui = function() {
	this.vectorFolders.forEach(function refreshFolder(folder) {
		folder.__controllers.forEach(function refreshController(controller) {
			controller.updateDisplay();
		});
	});
};

Graph.prototype.removeVector = function(vector) {
	this._idBank.remove(vector.id);
	this.vectors.splice(this.vectors.indexOf(vector), 1);

	this.reloadGui();
	this.updateArrows();
};

Graph.prototype.removeAllVectors = function() {
	var vectors = this.vectors.slice(0);
	vectors.forEach(function(vector) {
		this.removeVector(vector);
	}.bind(this));
};

Graph.prototype.confirmRemoveAllVectors = function() {
	if(confirm("Really remove all vectors?")) {
		this.removeAllVectors();
	}
};

Graph.prototype.updateArrows = function() {
	var children = this.children.slice(0);
	children.forEach(function(child) {
		if(child instanceof three.ArrowHelper) {
			this.remove(child);
		}
	}.bind(this));

	this.vectors.forEach(function addArrow(vector) {
		var direction = new three.Vector3();
		direction.copy(vector.vector3);
		direction.normalize();

		var headLength = 0.2 * vector.vector3.length;
		var headWidth = 0.1;

		var arrow = new three.ArrowHelper(direction, vector.origin, vector.length, vector.color);
		this.add(arrow);
	}.bind(this));

	this.updateCallback();
};

module.exports = Graph;

// A visual vector that dat.GUI can read
// vector3: three.Vector3
function Vector(id, vector3) {
	this.id = id;
	this.vector3 = vector3;

	this.length = this.vector3.length();

	this.origin = new three.Vector3();

	this.color = "#000000";
}

Vector.prototype = {
	constructor: Vector,

	applyLength: function() {
		this.vector3.normalize();
		this.vector3.multiplyScalar(this.length);
	},

	applyVector3: function() {
		this.length = this.vector3.length();
	},

	getName: function() {
		return "Vector " + this.id;
	},

	addToGuiFolder: function(guiFolder, graph) {
		var onArrowChange = function() {
			graph.updateArrows();
		}.bind(this);

		guiFolder.addColor(this, "color").name("Color").onChange(onArrowChange);

		var onComponChange = function() {
			this.applyVector3();

			graph.refreshGui();
			graph.updateArrows();
		}.bind(this);

		guiFolder.add(this.vector3, "x").name("X").onFinishChange(onComponChange);
		guiFolder.add(this.vector3, "y").name("Y").onFinishChange(onComponChange);
		guiFolder.add(this.vector3, "z").name("Z").onFinishChange(onComponChange);

		var onLengthChange = function() {
			this.applyLength();

			graph.refreshGui();
			graph.updateArrows();
		}.bind(this);

		guiFolder.add(this, "length").name("Length").onFinishChange(onLengthChange);

		var originFolder = guiFolder.addFolder("Origin");
		originFolder.add(this.origin, "x").name("X").onChange(onArrowChange);
		originFolder.add(this.origin, "y").name("Y").onChange(onArrowChange);
		originFolder.add(this.origin, "z").name("Z").onChange(onArrowChange);
	}
};

function IdBank() {
	this.highest = 0;
	this.holes = [];
}

IdBank.prototype = {
	constructor: IdBank,

	next: function() {
		if(this.holes.length > 0) {
			return this.holes.splice(0, 1)[0];
		}

		return ++this.highest;
	},

	remove: function(id) {
		this.holes.push(id);
		this.holes.sort();
	}
};

function randomColor() {
	return (
			(Math.floor(Math.random() * 0x22) + 0xdd) << 8 + 
			(Math.floor(Math.random() * 0x22) + 0xdd) << 4 + 
			(Math.floor(Math.random() * 0x22) + 0xdd));
}

},{"./plot":"/home/alex/code/js/riss3d/js/plot.js"}],"/home/alex/code/js/riss3d/js/grid.js":[function(require,module,exports){
"use strict";

var three = THREE;

function Grid(axesLength) {
	three.Object3D.call(this);

	// Axes

	var xDir = new three.Vector3(1, 0, 0);
	var yDir = new three.Vector3(0, 1, 0);
	var zDir = new three.Vector3(0, 0, 1);

	var halfLength = axesLength / 2;
	var xOrig = new three.Vector3(-halfLength, 0, 0);
	var yOrig = new three.Vector3(0, -halfLength, 0);
	var zOrig = new three.Vector3(0, 0, -halfLength);

	var xColor = 0xff0000;
	var yColor = 0x00ff00;
	var zColor = 0x0000ff;

	var headWidth = 1;

	var xAxis = new three.ArrowHelper(xDir, xOrig,
			axesLength, xColor, headWidth);
	var yAxis = new three.ArrowHelper(yDir, yOrig,
			axesLength, yColor, headWidth);
	var zAxis = new three.ArrowHelper(zDir, zOrig,
			axesLength, zColor, headWidth);

	this.axes = new three.Object3D();
	this.axes.add(xAxis, yAxis, zAxis);

	this.add(this.axes);
}

Grid.prototype = Object.create(three.Object3D.prototype);
Grid.prototype.constructor = Grid;

module.exports = Grid;

},{}],"/home/alex/code/js/riss3d/js/main.js":[function(require,module,exports){
"use strict";

// I don't like typing capital THREE
var three = THREE;
var OrbitControls = require("./orbitControls");
var Grid = require("./grid");
var Graph = require("./graph");
var plot = require("./plot");

var stats, renderer, scene, camera, controls;

init();

function init() {
	stats = new Stats();
	stats.domElement.style.position = "absolute";
	stats.domElement.style.left = "0";
	stats.domElement.style.bottom = "0";
	document.body.appendChild(stats.domElement);

	renderer = new three.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0xbbbbbb);
	document.body.appendChild(renderer.domElement);

	scene = new three.Scene();

	camera = new three.PerspectiveCamera(
			45,
			window.innerWidth / window.innerHeight,
			1, 1000);
	camera.position.z = 30;
	scene.add(camera);

	window.addEventListener("resize", onWindowResize);

	controls = new OrbitControls(camera, renderer.domElement);
	controls.noPan = true;
	controls.addEventListener('change', requestRender);
	initRotateControls();

	var grid = new Grid(20);
	scene.add(grid);

	var graph = new Graph();
	graph.updateCallback = requestRender;
	graph.resetViewCallback = initRotateControls;
	scene.add(graph);

	render();
}

function initRotateControls() {
	controls.reset();
	controls.rotateLeft(Math.PI / 6);
	controls.rotateUp(Math.PI / 7);
	controls.update();
}

function onWindowResize() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	requestRender();
}

function requestRender() {
	requestAnimationFrame(render);
}

function render() {
	renderer.render(scene, camera);

	stats.update();
}

},{"./graph":"/home/alex/code/js/riss3d/js/graph.js","./grid":"/home/alex/code/js/riss3d/js/grid.js","./orbitControls":"/home/alex/code/js/riss3d/js/orbitControls.js","./plot":"/home/alex/code/js/riss3d/js/plot.js"}],"/home/alex/code/js/riss3d/js/orbitControls.js":[function(require,module,exports){
/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 * @author alexozer / http://alexozer.com
 */
/*global THREE, console */

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe
//
// This is a drop-in replacement for (most) TrackballControls used in examples.
// That is, include this js file and wherever you see:
//    	controls = new THREE.TrackballControls( camera );
//      controls.target.z = 150;
// Simple substitute "OrbitControls" and the control should work as-is.

function OrbitControls( object, domElement ) {
	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the control orbits around
	// and where it pans with respect to.
	this.target = new THREE.Vector3();

	// center is old, deprecated; use "target" instead
	this.center = this.target;

	// This option actually enables dollying in and out; left as "zoom" for
	// backwards compatibility
	this.noZoom = false;
	this.zoomSpeed = 1.0;

	// Limits to how far you can dolly in and out
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// Set to true to disable this control
	this.noRotate = false;
	this.rotateSpeed = 1.0;

	// Set to true to disable this control
	this.noPan = false;
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = - Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to disable use of the keys
	this.noKeys = false;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	// Mouse buttons
	this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

	////////////
	// internals

	var scope = this;

	var EPS = 0.000001;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	var theta;
	var phi;
	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();
	var lastQuaternion = new THREE.Quaternion();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();

	// so camera.up is the orbit axis

	var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
	var quatInverse = quat.clone().inverse();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};

	this.rotateLeft = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	this.rotateUp = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );

		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );

		pan.add( panOffset );

	};

	// pass in x,y of change desired in pixel space,
	// right and down are positive
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object.fov !== undefined ) {

			// perspective
			var position = scope.object.position;
			var offset = position.clone().sub( scope.target );
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

		} else if ( scope.object.top !== undefined ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );

		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

		}

	};

	this.dollyIn = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		scale /= dollyScale;

	};

	this.dollyOut = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		scale *= dollyScale;

	};

	this.update = function () {

		var position = this.object.position;

		offset.copy( position ).sub( this.target );

		// rotate offset to "y-axis-is-up" space
		offset.applyQuaternion( quat );

		// angle from z-axis around y-axis

		theta = Math.atan2( offset.x, offset.z );

		// angle from y-axis

		phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

		if ( this.autoRotate && state === STATE.NONE ) {

			this.rotateLeft( getAutoRotationAngle() );

		}

		theta += thetaDelta;
		phi += phiDelta;

		// restrict theta to be between desired limits
		theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

		// restrict phi to be between desired limits
		phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

		// move target to panned location
		this.target.add( pan );

		offset.x = radius * Math.sin( phi ) * Math.sin( theta );
		offset.y = radius * Math.cos( phi );
		offset.z = radius * Math.sin( phi ) * Math.cos( theta );

		// rotate offset back to "camera-up-vector-is-up" space
		offset.applyQuaternion( quatInverse );

		position.copy( this.target ).add( offset );

		this.object.lookAt( this.target );

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set( 0, 0, 0 );

		// update condition is:
		// min(camera displacement, camera rotation in radians)^2 > EPS
		// using small-angle approximation cos(x/2) = 1 - x^2 / 8

		if ( lastPosition.distanceToSquared( this.object.position ) > EPS
		    || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS ) {

			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );
			lastQuaternion.copy (this.object.quaternion );

		}

	};


	this.reset = function () {

		state = STATE.NONE;

		this.target.copy( this.target0 );
		this.object.position.copy( this.position0 );

		this.update();

	};

	this.getPolarAngle = function () {

		return phi;

	};

	this.getAzimuthalAngle = function () {

		return theta

	};

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, scope.zoomSpeed );

	}

	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === scope.mouseButtons.ORBIT ) {
			if ( scope.noRotate === true ) return;

			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );

		} else if ( event.button === scope.mouseButtons.ZOOM ) {
			if ( scope.noZoom === true ) return;

			state = STATE.DOLLY;

			dollyStart.set( event.clientX, event.clientY );

		} else if ( event.button === scope.mouseButtons.PAN ) {
			if ( scope.noPan === true ) return;

			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );

		}

		if ( state !== STATE.NONE ) {
			document.addEventListener( 'mousemove', onMouseMove, false );
			document.addEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( startEvent );
		}

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( state === STATE.ROTATE ) {

			if ( scope.noRotate === true ) return;

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.DOLLY ) {

			if ( scope.noZoom === true ) return;

			dollyEnd.set( event.clientX, event.clientY );
			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				scope.dollyIn();

			} else {

				scope.dollyOut();

			}

			dollyStart.copy( dollyEnd );

		} else if ( state === STATE.PAN ) {

			if ( scope.noPan === true ) return;

			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );

			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

		}

		if ( state !== STATE.NONE ) scope.update();

	}

	function onMouseUp( /* event */ ) {

		if ( scope.enabled === false ) return;

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false || scope.noZoom === true || state !== STATE.NONE ) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail !== undefined ) { // Firefox

			delta = - event.detail;

		}

		if ( delta > 0 ) {

			scope.dollyOut();

		} else {

			scope.dollyIn();

		}

		scope.update();
		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );

	}

	function onKeyDown( event ) {

		if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;

		switch ( event.keyCode ) {

			case scope.keys.UP:
				scope.pan( 0, scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.BOTTOM:
				scope.pan( 0, - scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.LEFT:
				scope.pan( scope.keyPanSpeed, 0 );
				scope.update();
				break;

			case scope.keys.RIGHT:
				scope.pan( - scope.keyPanSpeed, 0 );
				scope.update();
				break;

		}

	}

	function touchstart( event ) {

		if ( scope.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: rotate

				if ( scope.noRotate === true ) return;

				state = STATE.TOUCH_ROTATE;

				rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			case 2:	// two-fingered touch: dolly

				if ( scope.noZoom === true ) return;

				state = STATE.TOUCH_DOLLY;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );
				dollyStart.set( 0, distance );
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;

				state = STATE.TOUCH_PAN;

				panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			default:

				state = STATE.NONE;

		}

		if ( state !== STATE.NONE ) scope.dispatchEvent( startEvent );

	}

	function touchmove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

				if ( scope.noRotate === true ) return;
				if ( state !== STATE.TOUCH_ROTATE ) return;

				rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				rotateDelta.subVectors( rotateEnd, rotateStart );

				// rotating across whole screen goes 360 degrees around
				scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
				// rotating up and down along whole screen attempts to go 360, but limited to 180
				scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

				rotateStart.copy( rotateEnd );

				scope.update();
				break;

			case 2: // two-fingered touch: dolly

				if ( scope.noZoom === true ) return;
				if ( state !== STATE.TOUCH_DOLLY ) return;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );

				dollyEnd.set( 0, distance );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					scope.dollyOut();

				} else {

					scope.dollyIn();

				}

				dollyStart.copy( dollyEnd );

				scope.update();
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;
				if ( state !== STATE.TOUCH_PAN ) return;

				panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				panDelta.subVectors( panEnd, panStart );

				scope.pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );

				scope.update();
				break;

			default:

				state = STATE.NONE;

		}

	}

	function touchend( /* event */ ) {

		if ( scope.enabled === false ) return;

		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

	this.domElement.addEventListener( 'touchstart', touchstart, false );
	this.domElement.addEventListener( 'touchend', touchend, false );
	this.domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', onKeyDown, false );

	// force an update at start
	this.update();

}

OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
OrbitControls.prototype.constructor = THREE.OrbitControls;

module.exports = OrbitControls;

},{}],"/home/alex/code/js/riss3d/js/plot.js":[function(require,module,exports){
"use strict";

var three = THREE;

function PlotGeometry(width, height, widthSegments, heightSegments) {
	three.PlaneGeometry.call(this, width, height, widthSegments, heightSegments);
}

PlotGeometry.prototype = Object.create(three.PlaneGeometry.prototype);
PlotGeometry.prototype.constructor = PlotGeometry;

// func accepts an x and y coordinate, and outputs a Z
PlotGeometry.prototype.plot = function(func) {
	this.vertices.forEach(function graphVertex(vertex) {
		vertex.z = func(vertex.x, vertex.y);
	});

	this.verticesNeedUpdate = true;
};

module.exports.PlotGeometry = PlotGeometry;

module.exports.wireframeMaterial = new three.MeshBasicMaterial({
	color: "purple",
	wireframe: true});

function formatFormulaStr(str) {
	str = str.trim().toLowerCase();

	var mathRegex = /sin|cos|tan|asin|acos|atan|abs|pow|sqrt|floor|ceil/g;
	str = str.replace(mathRegex, "Math.$&");

	return str;
}

function makeFunctionZ(str) {
	str = formatFormulaStr(str);

	return function(x, y) {
		return eval(str);
	};
}

function isFuncValid(func) {
	try {
		func(10, 10);
	} catch(err) {
		return false;
	}

	return true;
}

module.exports.handleEquation = function(inputText, plotMesh) {
	if(inputText === "") {
		plotMesh.visible = false;
		return;
	}

	var func = makeFunctionZ(inputText);
	if(isFuncValid(func)) {
		plotMesh.visible = true;
		plotMesh.geometry.plot(func);
	}
};

},{}]},{},["/home/alex/code/js/riss3d/js/main.js"]);
