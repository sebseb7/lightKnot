#!/usr/local/bin/node

/*	process.on('uncaughtException', function (err) {

		console.log('uncaught exception: '+ err)
		console.log(err.trace());

	});
*/
var wall = require('./wall.js');
var wallConn = require('./wallConnection.js');
var serialDevice = '/dev/cu.usbserial-AE018X8S';
	
var hardwareAvailable = true;

try{
	var stats = fs.statSync(serialDevice);
	console.log("running with hardware");
} catch(e) {
	hardwareAvailable = false;
	console.log("running without hardware");
}

wallConn.init(false,serialDevice,500000);

var pentawallHD = wall.newWall('PentawallHD',wallConn);
var ceilingLED = wall.newWall('CeilingLED',wallConn);


