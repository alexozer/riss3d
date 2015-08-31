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
