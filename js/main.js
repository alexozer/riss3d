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
