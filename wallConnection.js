var serialPort = require('serialport').SerialPort; //needs patch for 500000 baud




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
			setTimeout(function() {exports.init(true,device,baudrate)},5000);
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
			setTimeout(function() {exports.init(true,device,baudrate)},5000);
		});

		ledWallConnection.realWrite = ledWallConnection.write;

		ledWallConnection.write = function(buf) {

			var bytes_send;

			try {
				bytes_send = ledWallConnection.realWrite(buf);
			} catch(e) {
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
			}

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

	wallConn.setAllPixel3 = function(r,g,b) {

		var buf = new Buffer([0,0,r,g,b]);

		if(ledWallConnection){
			ledWallConnection.write(magic_42);
			ledWallConnection.write(escapeData(buf));
		}

	}

	wallConn.setAllPixel = function(g) {

		var buf = new Buffer([0,0,g]);

		if(ledWallConnection){
			ledWallConnection.write(magic_42);
			ledWallConnection.write(escapeData(buf));
		}

	}


	wallConn.setPixel3 = function(x,y,r,g,b) {
		var buf = new Buffer([x+1,y+1,r,g,b]);

		if(ledWallConnection){
			ledWallConnection.write(magic_42.concat(escapeData(buf)));
		}
	}

	wallConn.setPixel = function(x,y,g) {

		var buf = new Buffer([x+1,y+1,g]);

		if(ledWallConnection){
			ledWallConnection.write(magic_42.concat(escapeData(buf)));
		}

	}

	wallConn.setCeiling = function(x,r,g,b,w) {

		var buf = new Buffer([x,r,g,b,w]);

		if(ledWallConnection){
			ledWallConnection.write(magic_42.concat(escapeData(buf)));
		}

	}


	wallConn.setFrame = function(buf) {

		if(ledWallConnection){
			ledWallConnection.write(magic_23.concat(escapeData(buf)));
		}

	}


	return wallConn;
}
