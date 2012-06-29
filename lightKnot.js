#!/usr/local/bin/node

	process.on('uncaughtException', function (err) {

		console.log('uncaught exception: '+ err)
		console.log(err.trace());

	});

var wall = require('./wall.js');
var wallConn = require('./wallConnection.js');

	
	/*var hardwareAvailable = true;

	try{
		var stats = fs.statSync(configuration.serialDevice);
		console.log("running "+configuration.name+" with hardware on port "+configuration.tcpPort);
	} catch(e) {
		hardwareAvailable = false;
		console.log("running "+configuration.name+" without hardware on port "+configuration.tcpPort);
	}*/

wallConn.init(true,'/dev/cu.usbserial-AE018X8S',500000);

var pentawallHD = wall.newWall('PentawallHD',wallConn);
var ceilingLED = wall.newWall('CeilingLED',wallConn);


