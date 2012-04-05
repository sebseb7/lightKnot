#!/usr/local/bin/node

var net = require('net');
var fs = require('fs');
var util = require("util");

var nnl = '\r\n'; //network new line
var configuration;
var wallType = process.argv[2];

var wall = require('./wallOutput.js');

var currentRecFd;
var currentRecStarted;
var lastFrame;


if(wallType == 'g3d2') {

	configuration = {
		tcpPort            : 1339,
		width              : 72,
		height             : 32,
		bpp                : 4,
		subpixel           : 1,
		subpixelOrder      : 'g',
		ceilingLed 		   : false,
		name               : 'g3d2',
		recordingPath      : 'wallRecords_g3d2',
		serialDevice       : '/dev/....',
		serialSpeed        : 500000
	};

}else if(wallType == 'pentawall') {

	configuration = {
		tcpPort            : 1338,
		width              : 16,
		height             : 15,
		bpp                : 8,
		subpixel           : 3,
		subpixelOrder      : 'rrggbb',
		ceilingLed 		   : false,
		name               : 'Pentawall',
		recordingPath      : 'wallRecords_pw',
		serialDevice       : '/dev/....',
		serialSpeed        : 500000
	};

}else{

	configuration = {
		tcpPort            : 1340,
		width              : 24,
		height             : 24,
		bpp                : 8,
		subpixel           : 3,
		subpixelOrder      : 'rrggbb',
		ceilingLed 		   : true,
		name               : 'PentawallHD',
		recordingPath      : '/Users/k-ot/Sites/wallRecords/rec',
		serialDevice       : '/dev/cu.usbserial-A100DDXM',
		serialSpeed        : 500000
	};

}
//var ledWallConnection = new serialPort(configuration.serialDevice, {baudrate: configuration.serialSpeed});

//request.socket.removeAllListeners('timeout'); 

var hardwareAvailable = true;

try{
	var stats = fs.statSync(configuration.serialDevice);
	console.log("running with hardware");
} catch(e) {
	hardwareAvailable = false;
	console.log("running without hardware");
}

wall.init(hardwareAvailable,configuration.serialDevice,configuration.serialSpeed);

console.log('Starting Server for '+configuration.name+' on port '+configuration.tcpPort);

var openConnections = {};
var displayBuffers = [];

var pixelSize = configuration.bpp / 4;
var frameSize = configuration.width*configuration.height*configuration.subpixel*pixelSize;

var currentPrio = 0;

for(var i = 0;i < 4; i++)
{

	// buffer ! not a string

	var levelBuffer ='';

	for(var j = 0;j < frameSize;j++)
	{
		levelBuffer+='0';
	}
	displayBuffers[i] = levelBuffer;
}




function updateCurrentPrio(){

	var newPrio = 0;

	for(var connId in openConnections){
		if(openConnections[connId].priorityLevel > newPrio){
			newPrio = openConnections[connId].priorityLevel;
		}
	}

	if(currentPrio != newPrio)
	{
		currentPrio = newPrio;
		wall.setFrame(displayBuffers[currentPrio]);
	}


}

function processPacket(data,connectionId)
{
	switch(parseInt(data.substr(0,2),16))
	{
		case 0:
			return 'help:'+nnl+nnl+
			'00 help'+nnl+nnl+
			'01 show configuration'+nnl+nnl+
			'02xxyy'+configuration.subpixelOrder+' set Pixel'+nnl+
			'   * xxyy == FFFF : set all pixel'+nnl+nnl+
			((configuration.ceilingLed==true) ? '02xxrrggbbww set CeilingLED '+nnl+'   * xx   == F1..F4 ; F0 (all) '+nnl+nnl:'')+
			'03'+configuration.subpixelOrder+'..'+configuration.subpixelOrder+' set all '+(configuration.width*configuration.height)+' pixel'+nnl+nnl+
			'04ll set priority level 00..04 , currentLevel: '+openConnections[connectionId].priorityLevel+nnl;

		case 1:
			return  'width='+configuration.width+nnl+
					'height='+configuration.height+nnl+
					'subpixel='+configuration.subpixel+nnl+
					'bpp='+configuration.bpp+nnl+
					'name='+configuration.name+nnl+
					'subpixelOrder='+configuration.subpixelOrder+nnl+
					'ceilingLed='+configuration.ceilingLed;
		case 2:
		
			var x = parseInt(data.substr(2,2),16);
			var y = parseInt(data.substr(4,2),16);
			var r = parseInt(data.substr(6,2),16);
			var g = parseInt(data.substr(8,2),16);
			var b = parseInt(data.substr(10,2),16);

			if(isNaN(x)||isNaN(y)||isNaN(r)||isNaN(g)||isNaN(b)){
				return 'bad';
			}


			if((x == 255)&&(y==255)){
				
				//displayBuffers[openConnections[connectionId].priorityLevel] = buf;
	
				if(openConnections[connectionId].priorityLevel >= currentPrio){
					wall.setAllPixel(r,g,b);
					
					if(currentRecFd){
						
						var buf = new Buffer([x,y,r,g,b]);
						var strBuf = new Buffer(buf.toString('hex'));
						
						if(currentRecStarted == null){
							currentRecStarted = Date.now();
						};
					
						fs.writeSync(currentRecFd,parseInt(Date.now()-currentRecStarted,10)+" 02",null);
						
						fs.writeSync(currentRecFd,strBuf,0,strBuf.length,null);
						fs.writeSync(currentRecFd,"\r\n",null);
					}
				}
			


				for(var j = 0;j < (configuration.width*configuration.height);j++)
				{
					displayBuffers[openConnections[connectionId].priorityLevel][configuration.width*configuration.height*3] = r;
					displayBuffers[openConnections[connectionId].priorityLevel][configuration.width*configuration.height*3+1] = g;
					displayBuffers[openConnections[connectionId].priorityLevel][configuration.width*configuration.height*3+2] = b;
				}
				lastFrame = null;

			}else if ((x < 24)&&(y < 24)){
	
				displayBuffers[openConnections[connectionId].priorityLevel][(x*24+y)*3] = r;
				displayBuffers[openConnections[connectionId].priorityLevel][(x*24+y)*3+1] = g;
				displayBuffers[openConnections[connectionId].priorityLevel][(x*24+y)*3+2] = b;
				lastFrame = null;

				if(openConnections[connectionId].priorityLevel >= currentPrio){
					wall.setPixel(x,y,r,g,b);
					
					if(currentRecFd){
						
						var buf = new Buffer([x,y,r,g,b]);
						var strBuf = new Buffer(buf.toString('hex'));
						
						if(currentRecStarted == null){
							currentRecStarted = Date.now();
						};
					
						fs.writeSync(currentRecFd,parseInt(Date.now()-currentRecStarted,10)+" 02",null);
						
						fs.writeSync(currentRecFd,strBuf,0,strBuf.length,null);
						fs.writeSync(currentRecFd,"\r\n",null);
					}
				}

			
			}else if ((x <= 0xf4)&&(x >= 0xf0)){
	
				//displayBuffers[openConnections[connectionId].priorityLevel] = buf;
				if(openConnections[connectionId].priorityLevel >= currentPrio){
					wall.setCeiling(x,y,r,g,b);
					if(currentRecFd){
						
						var buf = new Buffer([x,y,r,g,b]);
						var strBuf = new Buffer(buf.toString('hex'));

						if(currentRecStarted == null){
							currentRecStarted = Date.now();
						};
					
						fs.writeSync(currentRecFd,parseInt(Date.now()-currentRecStarted,10)+" 02",null);
						
						fs.writeSync(currentRecFd,strBuf,0,strBuf.length,null);
						fs.writeSync(currentRecFd,"\r\n",null);
					}
				}
			
			}else{
				return 'bad'
			}

			return 'ok';

		case 3:
			
			var strFrame = data.substr(2,frameSize);
	
			if(strFrame.length != frameSize){
				return 'bad';
			}
	
			var buf = new Buffer(strFrame.length/2);

			for(var a = 0; a < strFrame.length/2;a++){
				buf[a] = parseInt(strFrame.substr(a*2,2),16);
				if(isNaN(buf[a]))	{
					return 'bad';
				}
			}

			displayBuffers[openConnections[connectionId].priorityLevel] = buf;



			if(openConnections[connectionId].priorityLevel >= currentPrio){
				wall.setFrame(buf);
				if(currentRecFd){
					
					var strBuf = new Buffer(buf.toString('hex'));
					
					if(currentRecStarted == null){
						currentRecStarted = Date.now();
					};
				
					fs.writeSync(currentRecFd,parseInt(Date.now()-currentRecStarted,10)+" 03",null);
					
					fs.writeSync(currentRecFd,strBuf,0,strBuf.length,null);
					fs.writeSync(currentRecFd,"\r\n",null);
				}

			}
	
			return 'ok';
		
		case 4:
				
			var targetPrio = parseInt(data.substr(2,2),16);

			if(isNaN(targetPrio) || (targetPrio > 4)){
				return 'bad';
			}

			openConnections[connectionId].priorityLevel = targetPrio;

			updateCurrentPrio();

			return 'ok';
		
		case 5:
			// start recodring


			fs.open(configuration.recordingPath+Date.now()+'.rec','a',0666,function(err,fd) {

				console.log('start rec '+err);

				currentRecFd = fd;
				currentRecStarted = null;

			
			});

			return 'ok';

		case 6:
			// stop recording
			
			currentRecFd = null;
			currentRecStarted = null;
			return 'ok';

		case 9:
			// subscribe to message channel
			var cmd = parseInt(data.substr(2,2),16);

			if(cmd == 1)
			{
				openConnections[connectionId].messageSubscription = true;
				return 'good';
			}
			if(cmd == 0)
			{
				openConnections[connectionId].messageSubscription = false;
				return 'good';
			}
			return 'bad';

		case 11:


			return util.inspect(iosockets,false,null)+':'+util.inspect(openConnections, false, null)+':'+currentPrio;
		
		case 10:
			// push message
			
			var strData = data.substr(2,data.length-2);
	
			var buf = new Buffer(strData.length/2);

			for(var a = 0; a < strData.length/2;a++){
				buf[a] = parseInt(strData.substr(a*2,2),16);
				if(isNaN(buf[a]))	{
					return 'bad';
				}
			}
			for(var connId in openConnections){
				if(openConnections[connId].messageSubscription == true){

					openConnections[connId].connectionSocket.write("09"+buf.toString('hex')+nnl);
				
				}
			}
			return 'ok';

		default:
			return 'bad';
	}
}


var connectionIdCtr = 0;
var server = net.createServer(function (socket) {
	socket.setNoDelay(true);
	socket.write('welcome (00+<enter> for help)'+nnl);

	var connectionId = connectionIdCtr++;

	openConnections[connectionId] = {
								priorityLevel               : 2, 
								lastActivity                : Date.now(), 
								readBuffer                  : '',
								messageChannelSubscriptions : {},
								connectionSocket            : socket,
								messageSubscription 		: false
							} 
	updateCurrentPrio();
	console.log('new connection '+connectionId);

	//console.log(openConnections);

	socket.setTimeout(5*60*1000, function () {
		socket.write('timeout'+nnl);
		socket.end();
	});

	socket.on('data' , function (data) {

		if(! openConnections[connectionId]){
			console.log('connection object '+connectionId+' gone');
			return;
		}

		var completeData = openConnections[connectionId].readBuffer + data.toString('ascii');

		var pos;
		while( (pos=completeData.indexOf(nnl)) != -1)
		{
			var dataToProcess = completeData.substr(0,pos);
			completeData = completeData.substr(pos+3,completeData.length);

			socket.write(processPacket(dataToProcess,connectionId)+nnl);
		}
		openConnections[connectionId].readBuffer=completeData;

	});
	
	socket.on('end' , function () {
		//cleanup
		console.log('connection '+connectionId+' closed');
		delete openConnections[connectionId];
		updateCurrentPrio();
	});

});

server.on('connection', function (e) {
	if (e.code == 'EADDRINUSE') {
		console.log('Address in use, retrying...');
		
		setTimeout(function () {
			server.close();
			server.listen(configuration.tcpPort, '::');
		}, 1000);
	}
});


server.listen(configuration.tcpPort, '::');

var ioSockets = {};
var ioSocketIdCtr = 0;

var httpSrv = require('http').createServer(handler);
var io = require('socket.io').listen(httpSrv);
httpSrv.listen(configuration.tcpPort+1000,'::');

io.set('log level', 1); 

function handler (req, res) {
	fs.readFile(__dirname + '/io.html',
	function (err, data) {
		if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}

		res.writeHead(200);
		res.end(data);
	});
}

io.sockets.on('connection', function (socket) {

	var  ioSocketId = ioSocketIdCtr++;

	ioSockets[ioSocketId] = {
		ioWindow : 0,
		ioSocket : socket
	}


	socket.on('ack', function () {
		if(ioSockets[ioSocketId]){
			ioSockets[ioSocketId].ioWindow--;
		};
	});
	socket.on('disconnect', function () {
		delete ioSockets[ioSocketId];
	});

});



var pushFrames = function() {

	if(lastFrame != displayBuffers[currentPrio]){
		var frame = '';
		for(var sockId in ioSockets){

			if(ioSockets[sockId].ioWindow < 5){

				if(frame == ''){
					frame = displayBuffers[currentPrio].toString('binary');
				}

				ioSockets[sockId].ioWindow++;
				ioSockets[sockId].ioSocket.emit('frame',frame);
			}
		}
		lastFrame = displayBuffers[currentPrio];
	}

};


setInterval(pushFrames,50);

