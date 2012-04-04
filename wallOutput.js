var serialPort = require('serialport').SerialPort; //needs patch for 500000 baud


var ledWallConnection;

exports.init = function(realHardwareAvailable,device,baudrate) {

	if(realHardwareAvailable)
	{
		console.log('initialize serial connection');	
		ledWallConnection = new serialPort(device, {baudrate: baudrate});
	}


}



var escapeData = function(input) {

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

exports.setAllPixel = function(r,g,b) {

	var buf = new Buffer([0,0,r,g,b]);

	if(ledWallConnection){
		ledWallConnection.write(magic_42);
		ledWallConnection.write(escapeData(buf));
	}

}


exports.setPixel = function(x,y,r,g,b) {

	var buf = new Buffer([x+1,y+1,r,g,b]);

	if(ledWallConnection){
		ledWallConnection.write(magic_42);
		ledWallConnection.write(escapeData(buf));
	}

}
exports.setCeiling = function(x,r,g,b,w) {

	var buf = new Buffer([x,r,g,b,w]);

	if(ledWallConnection){
		ledWallConnection.write(magic_42);
		ledWallConnection.write(escapeData(buf));
	}

}


exports.setFrame = function(buf) {

	if(ledWallConnection){
		ledWallConnection.write(magic_23);
		ledWallConnection.write(escapeData(buf));
	}

}

