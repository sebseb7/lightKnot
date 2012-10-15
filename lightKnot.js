#!/usr/local/bin/node

/*
 *
 * todo
 * - prio buffers allways have transparency
 * - completely disconnect wall drawing from bufferupdates (async) 
 * - throttle all connections to max wall speed
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */


var fs = require('fs');
var myFile = process.argv[1];
fs.watch(myFile, function (event, filename) {
	console.log('file event : terminate ' + event);
	process.exit(0);
});

process.on('uncaughtException', function (err) {

	console.log('uncaught exception: '+ err)
	console.log(err.stack);

});

var wall = require('./wall.js');
var wallConn = require('./wallConnection.js');


{
	var serialDevice1 = '/dev/cu.usbserial-AE018X8S';
	//var serialDevice1 = '/dev/cu.usbserial-A100DDXG';
	//var serialDevice = '/dev/cu.usbserial-A8008I0K';
		
	var hardwareAvailable = true;


	try{
		var stats = fs.lstatSync(serialDevice1);
		console.log("running with hardware");
//		fs.watch(serialDevice1, function (event, filename) {
//			console.log('file event2 : terminate ' + event);
//			process.exit(0);
//		});
	} catch(e) {
		hardwareAvailable = false;
		console.log("running without hardware");
		
		setInterval(function(){
			fs.lstat(serialDevice1,function(err,stats){
				if(stats && stats.dev)
				{
					console.log('restart a');
					process.exit(0);
				}
			});	
		},5000);
	}

	var connectionCeil = new wallConn.newConn(hardwareAvailable,serialDevice1,500000);

	var pentawallHD = wall.newWall('PentawallHD',connectionCeil);
	var ceilingLED = wall.newWall('CeilingLED',connectionCeil);
}


{
	var serialDevice = '/dev/cu.usbserial-A100DDXG';
		
	var hardwareAvailable = true;

	try{
		var stats = fs.lstatSync(serialDevice);
		console.log("running with hardware");
//		fs.watch(serialDevice, function (event, filename) {
//			console.log('file event3 : terminate ' + event);
//			process.exit(0);
//		});
	} catch(e) {
		hardwareAvailable = false;
		console.log("running without hardware");

		setInterval(function(){
			fs.lstat(serialDevice,function(err,stats){
				if(stats && stats.dev)
				{
					console.log('restart b');
					process.exit(0);
				}
			});	
		},5000);

	}

	var g3d2Conn = new wallConn.newConn(hardwareAvailable,serialDevice,500000);

	var g3d2 = wall.newWall('g3d2',g3d2Conn);
}







