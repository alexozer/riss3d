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
