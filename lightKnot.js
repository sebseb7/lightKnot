#!/usr/local/bin/node

process.on('uncaughtException', function (err) {

	console.log('uncaught exception: '+ err)
	console.log(err.stack);

});

var fs = require('fs');
var wall = require('./wall.js');
var wallConn = require('./wallConnection.js');


{
	var serialDevice = '/dev/cu.usbserial-AE018X8S';
		
	var hardwareAvailable = true;


	try{
		var stats = fs.lstatSync(serialDevice);
		console.log("running with hardware");
	} catch(e) {
		hardwareAvailable = false;
		console.log("running without hardware");
	}

	var connectionCeil = wallConn.newConn(hardwareAvailable,serialDevice,500000);

	var pentawallHD = wall.newWall('PentawallHD',connectionCeil);
	var ceilingLED = wall.newWall('CeilingLED',connectionCeil);
}
{
	//var serialDevice = '/dev/cu.usbserial-A100DDXG5';
	var serialDevice = '/dev/cu.usbmodem411';
		
	var hardwareAvailable = true;

	try{
		var stats = fs.lstatSync(serialDevice);
		console.log("running with hardware");
	} catch(e) {
		hardwareAvailable = false;
		console.log("running without hardware");
	}

	var g3d2Conn = wallConn.newConn(hardwareAvailable,serialDevice,500000);

	var g3d2 = wall.newWall('g3d2',g3d2Conn);
}







