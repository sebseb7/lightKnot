#!/usr/local/bin/node

var net = require('net');
var serialPort = require('serialport').SerialPort;


var configuration = {
	tcpPort            : 1339,
	width              : 24,
	height             : 24,
	bpp                : 8,
	subpixel           : 3,
	subpixelOrder      : 'rrggbb',
	ceilingLed 		   : true,
	name               : 'PentawallHD',
	recordingPath      : '~/wallRecords',
	serialDevice       : '/dev/....',
	serialSpeed        : 500000,
	runWithoutHardware : true
};

//var ledWallConnection = new serialPort(configuration.serialDevice, {baudrate: configuration.serialSpeed});

//request.socket.removeAllListeners('timeout'); 


var openConnections = {};


function processPacket(data,connectionId)
{
	switch(data.substr(0,2))
	{
		case '00':
			return 'help:\r\n\r\n'+
			'00 help\r\n\r\n'+
			'01 show configuration\r\n\r\n'+
			'02xxyy'+configuration.subpixelOrder+' set Pixel\r\n'+
			'   * xxyy == FFFF : set all pixel\r\n\r\n'+
			((configuration.ceilingLed==true) ? '02xxrrggbbww set CeilingLED \r\n   * xx   == F0..F3 ; FE (all) \r\n\r\n':'')+
			'03'+configuration.subpixelOrder+'..'+configuration.subpixelOrder+' set all '+(configuration.width*configuration.height)+' pixel\r\n\r\n'+
			'04ll set priority level 00..04 , currentLevel: '+openConnections[connectionId].priorityLevel+'\r\n';

		case '01':
			return 'width='+configuration.width+
					'\r\nheight='+configuration.height+
					'\r\nsubpixel='+configuration.subpixel+
					'\r\nbpp='+configuration.bpp+
					'\r\nname='+configuration.name+
					'\r\nsubpixelOrder='+configuration.subpixelOrder+
					'\r\nceilingLed='+configuration.ceilingLed;
		case '04':
			
		default:
			return 'bad';
	}
}


var connectionId = 0;
var server = net.createServer(function (socket) {
	socket.setNoDelay(true);
	socket.write('welcome (00+<enter> for help)\r\n');
	console.log('new connection');


	openConnections[++connectionId] = {
								priorityLevel               : 2, 
								lastActivity                : Date.now(), 
								readBuffer                  : '',
								messageChannelSubscriptions : {},
								connectionSocket            : socket
							} 

	console.log(openConnections);

	socket.setTimeout(5*60*1000, function () {
		socket.write('timeout\r\n');
		socket.end();
	});

	socket.on('data' , function (data) {

		var completeData = openConnections[connectionId].readBuffer + data.toString('ascii');

		while(completeData.indexOf('\r\n') != -1)
		{
			var pos = completeData.indexOf('\r\n');
			var dataToProcess = completeData.substr(0,pos);
			completeData = completeData.substr(pos+3,completeData.length);

			socket.write(processPacket(dataToProcess,connectionId)+'\r\n');
		}
		openConnections[connectionId].readBuffer=completeData;

	});
	
	socket.on('end' , function () {
		//cleanup
		console.log('connection closed');
		delete openConnections[connectionId];
	});

});

server.on('connection', function (e) {
	if (e.code == 'EADDRINUSE') {
		console.log('Address in use, retrying...');
		
		setTimeout(function () {
			server.close();
			server.listen(configuration.tcpPort, '::1');
		}, 1000);
	}
});


server.listen(configuration.tcpPort, '::1');


