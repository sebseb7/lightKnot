var serialPort = require('serialport_sebseb7').SerialPort; //needs patch for 500000 baud




exports.newConn = function(realHardwareAvailable,device,baudrate) {

	var ledWallConnection;
	
	var wallConn = {};

	if(realHardwareAvailable)
	{
		console.log('initialize serial connection');	
		
		try{
			ledWallConnection = new serialPort(device, {baudrate: baudrate});
		} catch(e) {
			console.log('connection error',e);
			ledWallConnection = null;
			console.log('restart c');
			process.exit(0);
			//setTimeout(function() {exports.newConn(true,device,baudrate)},5000);
			return;
		}

		ledWallConnection.on ('error', function(e) {
			console.log('serial device error 1');
			console.log(e);
			try {
				ledWallConnection.close();
			} catch (e) {
			
				console.log(e);
			
			}
			ledWallConnection = null;
			console.log('restart d');
			process.exit();
			//setTimeout(function() {exports.newConn(true,device,baudrate)},5000);
		});

		ledWallConnection.realWrite = ledWallConnection.write;


		var conn_buffer = new Array();
		var write_busy = 0;


		ledWallConnection.checkBuffer = function() {

			if(conn_buffer.length != 0)
			{
				
				var buf = conn_buffer.shift();
				
				write_busy = 1;
				
				ledWallConnection.realWrite(buf.data, function(err,result) {
					if(err)
					{
						console.log(err);
						console.log('restart e');
						process.exit();
					}
					write_busy = 0;
					if(buf.sock && (conn_buffer.length < 10))
					{
						buf.sock.resume();
					}
					if(buf.cb){
						buf.cb('ok',conn_buffer.length);
					};
					ledWallConnection.checkBuffer();
				});

			}


		}



		ledWallConnection.write = function(buf,callback,socket) {
		
			if(socket && (conn_buffer.length > 20))
			{
				socket.pause();
			}

			if(write_busy == 1)
			{
				conn_buffer.push({data:buf,cb:callback,sock:socket});
			}
			else
			{
				write_busy = 1;
				
				ledWallConnection.realWrite(buf, function(err,result) {
					if(err)
					{
						console.log(err);
						console.log('restart e');
						process.exit();
					}
					write_busy = 0;
					if(socket && (conn_buffer.length < 10))
					{
						socket.resume();
					}
					if(callback){
						callback('ok');
					};
					ledWallConnection.checkBuffer();
				});

			};
			/*} catch(e) {
				console.log('serial device error 2');
				console.log(e);
				try {
					ledWallConnection.close();
				} catch (e) {
			
					console.log(e);
			
				}
				ledWallConnection = null;
				setTimeout(function() {exports.init(true,device,baudrate)},5000);

			}

			if(bytes_send == -1){
				console.log('serial device error 3');
				try {
					ledWallConnection.close();
				} catch (e) {
			
					console.log(e);
			
				}
				ledWallConnection = null;
				setTimeout(function() {exports.init(true,device,baudrate)},5000);
			}*/

		};
	}




	var escapeData = function(input) {

		if(!input){
			return;
		}

		var output = new Buffer(2*input.length);
		var bufPtr = 0;
		
		for(var a = 0;a < input.length;a++)
		{
			switch (input[a])
			{
				case 0x65:
					output[bufPtr++]=0x65;
					output[bufPtr++]=0x03;
					break;
				case 0x23:
					output[bufPtr++]=0x65;
					output[bufPtr++]=0x01;
					break;
				case 0x42:
					output[bufPtr++]=0x65;
					output[bufPtr++]=0x02;
					break;
				case 0x66:
					output[bufPtr++]=0x65;
					output[bufPtr++]=0x04;
					break;
				default:
					output[bufPtr++]=input[a];
					break;
			}
		}

		return output.slice(0,bufPtr);
	}

	var magic_42 = new Buffer([0x42]);
	var magic_23 = new Buffer([0x23]);

	wallConn.setAllPixel3 = function(r,g,b,callback,socket) {

		var buf = new Buffer([0,0,r,g,b]);

	
		if(ledWallConnection){
			ledWallConnection.write(magic_42);
			ledWallConnection.write(escapeData(buf),callback,socket);
		}
		else
		{
			if(callback)
			{
				callback('ok');
			}
		}

	}

	wallConn.setAllPixel = function(g,callback,socket) {

		var buf = new Buffer([0,0,g]);

		if(ledWallConnection){
			ledWallConnection.write(magic_42);
			ledWallConnection.write(escapeData(buf),callback,socket);
		}
		else
		{
			if(callback)
			{
				callback('ok');
			}
		}

	}


	wallConn.setPixel3 = function(x,y,r,g,b,callback,socket) {
		var buf = new Buffer([x+1,y+1,r,g,b]);

		if(ledWallConnection){
			ledWallConnection.write(magic_42.concat(escapeData(buf)),callback,socket);
		}
		else
		{
			if(callback)
			{
				callback('ok');
			}
		}
	}

	wallConn.setPixel = function(x,y,g,callback,socket) {

		var buf = new Buffer([x+1,y+1,g]);

		if(ledWallConnection){
			ledWallConnection.write(magic_42.concat(escapeData(buf)),callback,socket);
		}
		else
		{
			if(callback)
			{
				callback('ok');
			}
		}

	}

	wallConn.setCeiling = function(x,r,g,b,w,callback,socket) {

		var buf = new Buffer([x,r,g,b,w]);
		console.log(x.toString(16)+' '+r.toString(16)+' '+g.toString(16)+' '+b.toString(16)+' '+w.toString(16));
		if(ledWallConnection){
			ledWallConnection.write(magic_42.concat(escapeData(buf)),callback,socket);
		}
		else
		{
			if(callback)
			{
				callback('ok');
			}
		}

	}


	wallConn.setFrame = function(buf,callback,socket) {

		if(ledWallConnection){
			ledWallConnection.write(magic_23.concat(escapeData(buf)),callback,socket);
		}
		else
		{
			if(callback)
			{
				callback('ok');
			}
		}

	}


	return wallConn;
}
