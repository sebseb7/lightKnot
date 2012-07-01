#!/usr/local/bin/node


var io = require('socket.io-client');
var SDL = require( 'sdl' );

var socket = io.connect('http://localhost:2350');

socket.on('disconnect', function () {


});

socket.on('connecting', function (transport) {


});

socket.on('init', function(configuration) {

	console.log(configuration);


	SDL.init( SDL.INIT.VIDEO );

	var factor = 10;

	var screen = SDL.setVideoMode( configuration.width*factor, configuration.height*factor, 32, SDL.SURFACE.SWSURFACE );

	SDL.events.on( 'KEYDOWN', function ( evt ) {
		if( ( ( evt.sym === 99 ) && ( evt.mod === 64 ) ) || 
			( ( evt.sym === 27 ) && ( evt.mod === 0  ) ) ) {
		
			process.exit( 0 );
		}
	} );

	socket.on('frame', function (data) {
		
		socket.emit('ack');
		
		var buf = data.buf;
		var i = 0;
		
		if(configuration.subpixelOrder == 'rrggbb')
		{
			
			for(i = 0; i < configuration.height;i++)
			{
				var j=0;
				for(j = 0; j < configuration.width;j++)
				{
				
					var r = buf.charCodeAt(((23-i)*24+(23-j))*3);
					var g = buf.charCodeAt(((23-i)*24+(23-j))*3+1);
					var b = buf.charCodeAt(((23-i)*24+(23-j))*3+2);

					SDL.fillRect( screen, [j*factor,i*factor,factor,factor ], SDL.mapRGB( screen.format,r,g,b ) );
				}
			}
		}else if (configuration.subpixelOrder == 'g')
		{
			for(i = 0; i < configuration.height;i++)
			{
				var j=0;
				for(j = 0; j < configuration.width/2;j++)
				{
					var g = buf.charCodeAt( i * (configuration.width/2) + j );
					var g1 = Math.floor( ( (g & 0x0f)*0x10 )*1.06);
					var g2 = Math.floor(( g- (g & 0x0f))*1.06);
					SDL.fillRect( screen, [j*2*factor,i*factor,factor,factor ], SDL.mapRGB( screen.format,0,g1,0 ) );
					SDL.fillRect( screen, [(j*2+1)*factor,i*factor,factor,factor ], SDL.mapRGB( screen.format,0,g2,0 ) );
				}
			}
		}

		SDL.flip( screen );
		

	});
});


