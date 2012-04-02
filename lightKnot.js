#!/usr/local/bin/node

var net = require('net');

//request.socket.removeAllListeners('timeout'); 

var openConnections = {};


function processPacket(data)
{
	switch(data.substr(0,2))
	{
		case '00':
			return 'help';
			break;
		default:
			return 'bad';
			break;
	}
}



var server = net.createServer(function (socket) {
	socket.setNoDelay(true);
	socket.write('welcome (00+<enter> for help)\r\n');
	console.log('new connection');

	openConnections[socket.remoteAddress+':'+socket.remotePort] = {
								'priority': 1, 
								'lastActivity':Date.now(), 
								'readBuffer':'',
								'socket':socket
							} 

	console.log(openConnections);

	socket.setTimeout(5*60*1000, function () {
		socket.write('timeout\r\n');
		socket.end();
	});

	socket.on('data' , function (data) {

		var completeData = openConnections[socket.remoteAddress+':'+socket.remotePort]['readBuffer'] + data.toString('ascii');

		while(completeData.indexOf('\r\n') != -1)
		{
			var pos = completeData.indexOf('\r\n');
			var dataToProcess = completeData.substr(0,pos);
			completeData = completeData.substr(pos+3,completeData.length);

			socket.write(processPacket(dataToProcess)+'\r\n');
		}
		openConnections[socket.remoteAddress+':'+socket.remotePort]['readBuffer']=completeData;

	});
	
	socket.on('end' , function () {
		//cleanup
		console.log('connection closed for '+socket.remoteAddress);
		delete openConnections[socket.remoteAddress+':'+socket.remotePort];
	});

});

server.on('connection', function (e) {
	if (e.code == 'EADDRINUSE') {
		console.log('Address in use, retrying...');
		
		setTimeout(function () {
			server.close();
			server.listen(PORT, HOST);
		}, 1000);
	}
});


server.listen(1337, '::1');

