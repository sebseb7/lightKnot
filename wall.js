var net = require('net');
var fs = require('fs');
var util = require("util");
var os = require('os');
require('buffertools');
require('pentawalltools');


var nnl = '\r\n'; //network new line
var currentRecFd;
var currentRecStarted;


exports.newWall = function(wallType,wall) {


	var configuration;


	var lastFrame;
	var lastCeilFrame;

	var homedir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

	if(wallType == 'g3d2') {

		configuration = {
			tcpPort            : 1339,
			width              : 72,
			height             : 32,
			bpp                : 4,
			subpixel           : 1,
			subpixelOrder      : 'g',
			alphapixel		   : 'a',
			name               : 'g3d2',
			recordingPath      : homedir+'/Sites/wallRecords_g3d2/',
		};

	}else if(wallType == 'Pentawall') {

		configuration = {
			tcpPort            : 1338,
			width              : 16,
			height             : 15,
			bpp                : 8,
			subpixel           : 3,
			subpixelOrder      : 'rrggbb',
			alphapixel		   : 'aa',
			name               : 'Pentawall',
			recordingPath      : homedir+'/Sites/wallRecords_pw/',
		};

	}else if(wallType == 'PentawallHD') {

		configuration = {
			tcpPort            : 1342,
			width              : 24,
			height             : 24,
			bpp                : 8,
			subpixel           : 3,
			subpixelOrder      : 'rrggbb',
			alphapixel		   : 'aa',
			name               : 'PentawallHD',
			recordingPath      : homedir+'/Sites/wallRecords/',
		};

	}else if(wallType == 'CeilingLED') {

		configuration = {
			tcpPort            : 1343,
			width              : 5,
			height             : 1,
			bpp                : 8,
			subpixel           : 4,
			subpixelOrder      : 'rrggbbww',
			name               : 'CeilingLED',
			recordingPath      : homedir+'/Sites/wallRecords/',
			baseAddress        : 0xF0,
		};
	}else if(wallType == 'Ledbar') {

		configuration = {
			tcpPort            : 1344,
			width              : 7,
			height             : 1,
			bpp                : 8,
			subpixel           : 4,
			subpixelOrder      : 'rrggbbww',
			name               : 'PentaFnord Ledbar',
			recordingPath      : homedir+'/Sites/wallRecords/',
			baseAddress        : 0xD0,
		};


	}

	if(wall === null)
	{
		configuration.hardware = 0;
	}
	{
		configuration.hardware = 1;
	}

	console.log('Starting Server for '+configuration.name+' on port '+configuration.tcpPort);

	var openConnections = {};
	var displayBuffers = [];
	var connectionsInPrio = [];
	var ceilBuffers = [];

	var pixelSize = configuration.bpp / 4;
	var frameSize = configuration.width*configuration.height*configuration.subpixel*pixelSize;
	var frameSizeAlpha = configuration.width*configuration.height*(configuration.subpixel+1)*pixelSize;

	var currentPrio = 0;

	for(var priolevel = 0;priolevel <= 4; priolevel++) //yes, we have 5 prio levels
	{
		displayBuffers[priolevel] = new Buffer(configuration.width*configuration.height*configuration.subpixel*(configuration.bpp / 8));
		displayBuffers[priolevel].fill(0);
		//ceilBuffers[priolevel] = new Buffer([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
		ceilBuffers[priolevel] = new Buffer(configuration.width*configuration.subpixel);
		ceilBuffers[priolevel].fill(0);
	}




	function updateCurrentPrio(){

		var newPrio = 0;

		for(var i =0;i<4;i++)
		{
			connectionsInPrio[i]=0;
		}

		for(var connId in openConnections){
			
			connectionsInPrio[openConnections[connId].priorityLevel]++;

			if(openConnections[connId].priorityLevel > newPrio){
				newPrio = openConnections[connId].priorityLevel;
			}
		}

		if(currentPrio != newPrio)
		{
			currentPrio = newPrio;
			// prio has changed, lets apply the colorsettings that was stored with that prio
			if(configuration.height == 1) {

				for (var i=0;i<configuration.width;i++) {
					wall.setCeiling(configuration.baseAddress+i+1,
							ceilBuffers[currentPrio][0+i*4],
							ceilBuffers[currentPrio][1+i*4],
							ceilBuffers[currentPrio][2+i*4],
							ceilBuffers[currentPrio][3+i*4]);
				}

/*				wall.setCeiling(0xf1,ceilBuffers[currentPrio][0],ceilBuffers[currentPrio][1],ceilBuffers[currentPrio][2],ceilBuffers[currentPrio][3]);
				wall.setCeiling(0xf2,ceilBuffers[currentPrio][4],ceilBuffers[currentPrio][5],ceilBuffers[currentPrio][6],ceilBuffers[currentPrio][7]);
				wall.setCeiling(0xf3,ceilBuffers[currentPrio][8],ceilBuffers[currentPrio][9],ceilBuffers[currentPrio][10],ceilBuffers[currentPrio][11]);
				wall.setCeiling(0xf4,ceilBuffers[currentPrio][12],ceilBuffers[currentPrio][13],ceilBuffers[currentPrio][14],ceilBuffers[currentPrio][15]);
				wall.setCeiling(0xf5,ceilBuffers[currentPrio][16],ceilBuffers[currentPrio][17],ceilBuffers[currentPrio][18],ceilBuffers[currentPrio][19]);*/
			}
			else
			{
				wall.setFrame(displayBuffers[currentPrio]);
			}
		}


	}

	function processPacket(data,connectionId,callback,socket)
	{
		var myPrio = openConnections[connectionId].priorityLevel;

	
		switch(parseInt(data.substr(0,2),16))
		{
			case 0:
				return callback('help:'+nnl+nnl+
				'00 help'+nnl+nnl+
				'01 show configuration'+nnl+nnl+
				'02xxyy'+configuration.subpixelOrder+' set Pixel'+nnl+
				'   * xxyy == FFFF : set all pixel'+nnl+nnl+
				((configuration.height==1) ? '02xxrrggbbww set CeilingLED '+nnl+'   * xx   == F1..F4 ; F0 (all) '+nnl+nnl:'')+
				'03'+configuration.subpixelOrder+'..'+configuration.subpixelOrder+' set all '+(configuration.width*configuration.height)+' pixel'+nnl+nnl+
				'03'+configuration.subpixelOrder+configuration.alphapixel+'..'+configuration.subpixelOrder+configuration.alphapixel+' set all '+(configuration.width*configuration.height)+' pixel with alpha blending'+nnl+nnl+
				'04ll set priority level 00..04 , currentLevel: '+myPrio+nnl);

			case 1:
				var infotext=   'width='+configuration.width+nnl+
						'height='+configuration.height+nnl+
						'subpixel='+configuration.subpixel+nnl+
						'bpp='+configuration.bpp+nnl+
						'name='+configuration.name+nnl+
						'subpixelOrder='+configuration.subpixelOrder+nnl+
						'hardwareAvailable='+configuration.hardware+nnl;
				if ((wallType=='CeilingLED')||(wallType='Ledbar')) 
					 infotext += 'baseAddress=0x'+configuration.baseAddress.toString(16)+nnl;
				return  callback(infotext);
			case 2:
			
				var x = parseInt(data.substr(2,2),16);
				var y = parseInt(data.substr(4,2),16);
				var r;
				var g;
				var b;

				if((configuration.subpixel == 3)||(configuration.subpixel == 4)){
					r = parseInt(data.substr(6,2),16);
					g = parseInt(data.substr(8,2),16);
					b = parseInt(data.substr(10,2),16);
					if(isNaN(x)||isNaN(y)||isNaN(r)||isNaN(g)||isNaN(b)){
						return callback('bad');
					}
				}else{
					g = parseInt(data.substr(6,1),16);
					if(isNaN(x)||isNaN(y)||isNaN(g)){
						return callback('bad');
					}
				}

				if((x == 255)&&(y==255)){
					
					if(configuration.subpixel == 3){
						var onePixel = new Buffer([r,g,b]);
						var a;
						for(a = 0 ; a < configuration.width*configuration.height; a++)
						{
							onePixel.copy(displayBuffers[myPrio],a*3);
						};
					}else{
						for(a = 0 ; a < configuration.width*configuration.height/2; a++)
						{
							displayBuffers[myPrio][a] = g*0x10+g;
						};
					} // end if (configuration.subpixel == 3)
	
					if(myPrio >= currentPrio){ // i am priorized to write stuff to the wall
						if(configuration.subpixel == 3){
							wall.setAllPixel3(r,g,b,callback,socket);
						}else{
							wall.setAllPixel(g,callback,socket);
						}
						
						if(currentRecFd){ //redording is on, write stuff to file
							
							var buf = new Buffer([x,y,r,g,b]);
							var strBuf = new Buffer(buf.toString('hex'));
							
							if(currentRecStarted == null){
								currentRecStarted = Date.now();
							};
						
							fs.writeSync(currentRecFd,parseInt(Date.now()-currentRecStarted,10)+" 02",null);
							
							fs.writeSync(currentRecFd,strBuf,0,strBuf.length,null);
							fs.writeSync(currentRecFd,"\r\n",null);
						} 
						return;
					}else{ 
						return callback('ok');
					} 
				


					for(var j = 0;j < (configuration.width*configuration.height);j++)
					{
						displayBuffers[myPrio][configuration.width*configuration.height*3] = r;
						displayBuffers[myPrio][configuration.width*configuration.height*3+1] = g;
						displayBuffers[myPrio][configuration.width*configuration.height*3+2] = b;
					}
					lastFrame = null;

				}else if ((configuration.height != 1)&&(x < configuration.width)&&(y < configuration.height)){
					//
					// ######### what we have here is a pixel for a wall #############################
					//
		
					if(configuration.subpixel == 3){
						displayBuffers[myPrio][(y*configuration.width+x)*3] = r;
						displayBuffers[myPrio][(y*configuration.width+x)*3+1] = g;
						displayBuffers[myPrio][(y*configuration.width+x)*3+2] = b;
					}else if (configuration.subpixel == 1){

						var xModulo = x % 2;
						var pixelIdx  = y*(configuration.width/2)+((x-xModulo)/2);
						
						if(xModulo == 0){
							displayBuffers[myPrio][pixelIdx] = g+
							(displayBuffers[myPrio][pixelIdx] & 0xf0);
						}else{
							displayBuffers[myPrio][pixelIdx] = g*0x10+
							(displayBuffers[myPrio][pixelIdx] & 0x0f);
						}
					}
					
					lastFrame = null;

					if(myPrio >= currentPrio){

						if(configuration.subpixel == 3){
							wall.setPixel3(x,y,r,g,b,callback,socket);
						}else{
							wall.setPixel(x,y,g,callback,socket);
						}
						
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
						return;
					}else{
						return callback('ok');
					}
					

				
				}else if ((configuration.height==1) && (x <= (configuration.baseAddress+configuration.width)) && (x >= configuration.baseAddress) ){
					//
					// ########## this one is for a LED strip (CeilingLEDs) ########## 
					//
						


					// at first we write stuff to the buffers
					// (for recording and restoring after Prio changes					
			
					if(x == configuration.baseAddress){ // this is for all leds (0xD0 or 0xF0)
						
						//ceilBuffers[myPrio] = new Buffer(configuration.width*4);
						for (var i=0;i<configuration.width;i++){
							ceilBuffers[myPrio][i*4+0] = y;  //red  yes, red, indeed ;-)
							ceilBuffers[myPrio][i*4+1] = r;  //green
							ceilBuffers[myPrio][i*4+2] = g;  //blue
							ceilBuffers[myPrio][i*4+3] = b;  //white
						}
							
						//ceilBuffers[myPrio] = new Buffer([y,r,g,b,y,r,g,b,y,r,g,b,y,r,g,b,y,r,g,b]);
					}else{
						//
						// ########### This is for one specific led ###########################
						//
						ceilBuffers[myPrio][(x-configuration.baseAddress-1)*4] = y; //red
						ceilBuffers[myPrio][(x-configuration.baseAddress-1)*4+1] = r; //green
						ceilBuffers[myPrio][(x-configuration.baseAddress-1)*4+2] = g; //blue
						ceilBuffers[myPrio][(x-configuration.baseAddress-1)*4+3] = b; //white
					}
					
					lastCeilFrame = null;


					// if we have control of the wall we write the comman to the bus
					// for this we dont need to make a distinction wheter the command
					// is for all pixels or for a single pixel
					if(myPrio >= currentPrio){
						wall.setCeiling(x,y,r,g,b,callback,socket);
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
						return;
					}else{
						return callback('ok');
					}
				
				}else{
					return callback('bad')
				}


			case 3:
		
				if(data.length == frameSize+2)
				{
					var strFrame = data.substr(2,frameSize);
					var buf;

					if(configuration.subpixel != 1){

						var buf2 = new Buffer(strFrame);
					
						try
						{
							buf = buf2.fromHex();
						}catch(e)
						{
							console.log(strFrame);
							return callback('bad');
						}

					}else{

						var buf2 = new Buffer(strFrame);
					
						try
						{
							buf = buf2.fromG3d2Encoding();
						}catch(e)
						{
							console.log(strFrame);
							return callback('bad');
						}
					}


					displayBuffers[myPrio] = buf;



					if(myPrio >= currentPrio){
						wall.setFrame(buf,callback,socket);
						if(currentRecFd){
							
							var strBuf = new Buffer(strFrame);
							
							if(currentRecStarted == null){
								currentRecStarted = Date.now();
							};
						
							fs.writeSync(currentRecFd,parseInt(Date.now()-currentRecStarted,10)+" 03",null);
							
							fs.writeSync(currentRecFd,strBuf,0,strBuf.length,null);
							fs.writeSync(currentRecFd,"\r\n",null);
						}
						return;
					}else{
						return callback('ok');
					}
				
				
				}else if(data.length == frameSizeAlpha+2)
				{
					var strFrame = data.substr(2,frameSizeAlpha);
					var buf;

					if(configuration.subpixel != 1){

						var buf2 = new Buffer(strFrame);
					
						try
						{
							buf = buf2.fromHex();
						}catch(e)
						{
							console.log(strFrame);
							return callback('bad');
						}

					}else{

						var buf2 = new Buffer(strFrame);
					
						try
						{
							if(myPrio > 0)
							{
								//console.log(displayBuffers[myPrio-1]);
								buf = buf2.fromG3d2EncodingWithAlpha(displayBuffers[myPrio-1]);
							}else{
								buf = buf2.fromG3d2EncodingWithAlpha(null);
							}
							

						}catch(e)
						{
							console.log(strFrame);
							return callback('bad');
						}
					}


					displayBuffers[myPrio] = buf;



					if(myPrio >= currentPrio){
						wall.setFrame(buf,callback,socket);
						if(currentRecFd){
							
							var strBuf = new Buffer(strFrame);
							
							if(currentRecStarted == null){
								currentRecStarted = Date.now();
							};
						
							fs.writeSync(currentRecFd,parseInt(Date.now()-currentRecStarted,10)+" 03",null);
							
							fs.writeSync(currentRecFd,strBuf,0,strBuf.length,null);
							fs.writeSync(currentRecFd,"\r\n",null);
						}
						return;
					}else{
						return callback('ok');
					}
				
				
				}else{
					return callback('bad');
				}

			
			case 4:
					
				var targetPrio = parseInt(data.substr(2,2),16);

				if(isNaN(targetPrio) || (targetPrio > 4)){
					return callback('bad');
				}

				openConnections[connectionId].priorityLevel = targetPrio;

				updateCurrentPrio();

				return callback('ok');
			
			case 5:
				// start recodring


				var filename = data.substr(2,data.length-2);
				
				if(filename == '')
				{
					return callback('bad');
				}

				fs.open(configuration.recordingPath+filename+'.rec','a',0666,function(err,fd) {
				//fs.open(configuration.recordingPath+Date.now()+'.rec','a',0666,function(err,fd) {

					console.log('start rec '+err);

					if(err === null)
					{
						currentRecFd = fd;
						currentRecStarted = null;
					}

				
				});

				return callback('ok');

			case 6:
				// stop recording
					
				if((currentRecFd)&&(currentRecFd !== null))
				{
					fs.close(currentRecFd,function() { console.log('recording done') });
					currentRecFd = null;
					currentRecStarted = null;
					return callback('ok');
				}
				else
				{
					return callback('bad'); 
				}

			case 9:
				// subscribe to message channel
				var chan = parseInt(data.substr(2,2),16);
				var cmd = parseInt(data.substr(4,2),16);

				if(isNaN(chan)){
					return callback('bad');
				}

				if(cmd == 1)
				{
					openConnections[connectionId].messageChannelSubscription[chan] = true;
					return callback('ok');
				}
				if(cmd == 0)
				{
					if(openConnections[connectionId].messageChannelSubscription[chan])
					{
						delete openConnections[connectionId].messageChannelSubscription[chan];
						return callback('ok');
					}
					return callback('bad');
				}
				return callback('bad');

			case 11:


				return callback('ioSocket:'+util.inspect(ioSockets,false,1)+'\r\n\r\nopenConnections:'+util.inspect(openConnections, false, 1)+'\r\n\r\ncurrentPrio:'+currentPrio);
			
			case 10:
				// push message
				
				var chan = parseInt(data.substr(2,2),16);
				var strData = data.substr(4,data.length-4);
		
				if(isNaN(chan)){
					return callback('bad');
				}

				var buf = new Buffer(strData.length/2);

				for(var a = 0; a < strData.length/2;a++){
					buf[a] = parseInt(strData.substr(a*2,2),16);
					if(isNaN(buf[a]))	{
						return callback('bad');
					}
				}
				for(var connId in openConnections){
					if(openConnections[connId].messageChannelSubscription[chan] == true){

						openConnections[connId].connectionSocket.write("09"+data.substr(2,2)+buf.toString('hex')+nnl);

					
					}
				}
				return callback('ok');

			default:
				return callback('bad');
		}
	}


	var connectionIdCtr = 0;
	server = net.createServer(function (socket) {
		socket.setNoDelay(true);
		socket.write('00welcome to '+configuration.name+' (00+<enter> for help)'+nnl);

		var connectionId = connectionIdCtr++;

		openConnections[connectionId] = {
									priorityLevel               : 2, 
									lastActivity                : Date.now(), 
									readBuffer                  : '',
									messageChannelSubscription  : {},
									connectionSocket            : socket
								} 
		updateCurrentPrio();
		console.log('new connection '+connectionId);

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
				completeData = completeData.substr(pos+nnl.length,completeData.length);

				processPacket(dataToProcess,connectionId,function(retVal) {
					socket.write(retVal+nnl);
				},socket);
			}
			openConnections[connectionId].readBuffer=completeData;

		});
		
		socket.on('close' , function (had_error) {
			//cleanup
			console.log('connection '+connectionId+' closed ',had_error);
			delete openConnections[connectionId];
			updateCurrentPrio();
		});

	});

	server.on('connection', function (e) {
		if (e.code == 'EADDRINUSE') {
			console.log('Address in use, retrying...');
			
			setTimeout(function () {
				server.close();
				configuration.server.listen(configuration.tcpPort, '::');
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
	io.enable('browser client minification');  // send minified client
	io.enable('browser client etag');          // apply etag caching logic based on version number
	io.enable('browser client gzip');          // gzip the file
	io.set('transports', [                     // enable all transports (optional if you want flashsocket)
		'websocket'
		, 'flashsocket'
		, 'htmlfile'
		, 'xhr-polling'
		, 'jsonp-polling'
	]);

	function handler (req, res) {
		
		var filename = '/io.html';

		if(req.url == '/background_'+configuration.name+'.jpg')
		{
			filename = req.url;
		}

		fs.readFile(__dirname + '/webgui' + filename,
		function (err, data) {
			if (err) {
				res.writeHead(500);
				return res.end('Error loading /webgui' + filename);
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

		socket.emit('init',configuration);

	});



	var pushFrames = function() {

		if( 
			lastFrame != displayBuffers[currentPrio]
		){
			var frame = '';
			for(var sockId in ioSockets){

				if(ioSockets[sockId].ioWindow < 50){

					if(frame == ''){
						try {	
							frame = displayBuffers[currentPrio].toString('binary');
						} catch(e) {
							console.log(displayBuffers[currentPrio]);
							throw(e);
						}

					}

					ioSockets[sockId].ioWindow++;
					ioSockets[sockId].ioSocket.emit('frame',{buf:frame,ioWindow:ioSockets[sockId].ioWindow,type:'wall'});
					
				}
			}
			lastFrame = displayBuffers[currentPrio];
		}

	};

	var pushCeil = function() {

		if( 
			lastCeilFrame != ceilBuffers[currentPrio]
		){
			var ceilFrame = '';
			for(var sockId in ioSockets){

				if(ioSockets[sockId].ioWindow < 50){

					if(ceilFrame == ''){
						ceilFrame = ceilBuffers[currentPrio].toString('binary');
					}

					ioSockets[sockId].ioWindow++;
					ioSockets[sockId].ioSocket.emit('frame',{buf:ceilFrame,ioWindow:ioSockets[sockId].ioWindow,type:'ceil'});
					
				}
			}
			lastCeil  = ceilBuffers[currentPrio];
		}

	};


	setInterval(pushFrames,60);
//	if(configuration.height==1){
	setInterval(pushCeil,60);
//	}


	return configuration;
};
