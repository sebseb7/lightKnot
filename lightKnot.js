#!/usr/local/bin/node

var net = require('net');


var configuration = {
	tcpPort       : 1339,
	width         : 24,
	height        : 24,
	bpc           : 8,
	channels      : 3,
	name          : 'PentawallHD',
	recordingPath : '~/wallRecords'
};


//request.socket.removeAllListeners('timeout'); 


var openConnections = {};


function processPacket(data)
{
	switch(data.substr(0,2))
	{
		case '00':
			return 'help:i\r\n'+
			'00 help\r\n'+
			'01 show configuration\r\n'+
			'02xxyyrrggbb set Pixel\r\n'+
			'   * xxyy == FFFF set all pixel\r\n'+
			'   * xx   == F0..F4 set ceilingLed, yy == whiteChannel\r\n'+
			'03rrggbb..rrggbb set all 576 pixel\r\n'+
			'04ll set priority level 00..04';
			break;
		case '01':
			return 'width='+configuration.width+
					'\r\nheight='+configuration.height+
					'\r\nchannels='+configuration.channels+
					'\r\nbitsPerChannel='+configuration.bpc+
					'\r\nname='+configuration.name;
		default:
			return 'bad';
			break;
	}
}


var connectionId = 0;
var server = net.createServer(function (socket) {
	socket.setNoDelay(true);
	socket.write('welcome (00+<enter> for help)\r\n');
	console.log('new connection');


	openConnections[++connectionId] = {
								priorityLevel               : 1, 
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

			socket.write(processPacket(dataToProcess)+'\r\n');
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


