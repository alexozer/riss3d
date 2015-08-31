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
