#!/usr/local/bin/node


var io = require('socket.io-client');
var SDL = require( 'sdl' );

var socket = io.connect('http://bender.hq.c3d2.de:2350');

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
		//console.log(data.ioWindow);			
		var i = 0;
		for(i = 0; i < configuration.width;i++)
		{
			var j=0;
			for(j = 0; j < configuration.height ;j++)
			{
			
				var r = buf.charCodeAt(((23-i)*24+(23-j))*3);
				var g = buf.charCodeAt(((23-i)*24+(23-j))*3+1);
				var b = buf.charCodeAt(((23-i)*24+(23-j))*3+2);

				SDL.fillRect( screen, [i*factor,(configuration.height-j-1)*factor,factor,factor ], SDL.mapRGB( screen.format,r,g,b ) );

			}
		}

		SDL.flip( screen );
		

	});
});


