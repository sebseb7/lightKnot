#!/usr/local/bin/node

var fs = require('fs');

process.on('uncaughtException', function (err) {

		console.log('uncaught exception: '+ err)
//		console.log(err.trace());

	});

//	wallType = process.argv[2];

/*	if(!wallType || wallType == undefined){
		//on ernie we default to g3d2
		if(os.hostname() == 'ernie'){
			wallType='g3d2';
		}
		//on bender we default to PentawallHD
		if(os.hostname() == 'bender'){
			wallType='PentawallHD';
		}
		//on elmo we default to pentawall
		if(os.hostname() == 'elmo'){
			wallType='Pentawall';
		}
	}
*/
var wall = require('./wall.js');
var wallConn = require('./wallConnection.js');
var serialDevice = '/dev/cu.usbserial-AE018X8S';
	
var hardwareAvailable = true;

try{
	var stats = fs.lstatSync(serialDevice);
	console.log("running with hardware");
} catch(e) {
	hardwareAvailable = false;
	console.log("running without hardware");
}

wallConn.init(hardwareAvailable,serialDevice,500000);

var pentawallHD = wall.newWall('PentawallHD',wallConn);
var ceilingLED = wall.newWall('CeilingLED',wallConn);


