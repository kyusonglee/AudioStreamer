/**
 * Created by noamc on 8/31/14.
 */

$(function () {
	var today ="temptemp.wav";
	var isChrome = window.chrome;
    var client,
        recorder,
        context,
        bStream,
        worker = new Worker('js/worker/resampler-worker.js');
		if(isChrome)
        	contextSampleRate = (new AudioContext()).sampleRate;
		else
        	contextSampleRate = (new window.webkitAudioContext()).sampleRate;
        resampleRate = contextSampleRate;
    worker.postMessage({cmd:"init",from:contextSampleRate,to:resampleRate});

    worker.addEventListener('message', function (e) {
        if (bStream && bStream.writable)
            bStream.write(convertFloat32ToInt16(e.data.buffer));
    }, false);
    $("#start-rec-btn").click(function () {
        close();
        client = new BinaryClient('wss://'+location.host);
		today = new Date().getTime();
		console.log(today);
        
		client.on('open', function () {
            bStream = client.createStream({sampleRate: resampleRate, filename:today.toString()});
        });

        if (context) {
            recorder.connect(context.destination);
            return;
        }

        var session = {
            audio: true,
            video: false
        };


        navigator.getUserMedia(session, function (stream) {
			if (isChrome)
            	context = new AudioContext()  ;
			else
            	context = new window.webkitAudioContext()  ;
				
            var audioInput = context.createMediaStreamSource(stream);
            var bufferSize = 0; // let implementation decide
            recorder = context.createScriptProcessor(bufferSize, 1, 1);
            recorder.onaudioprocess = onAudio;
            audioInput.connect(recorder);
            recorder.connect(context.destination);

        }, function (e) {
        });
    });

    function onAudio(e) {
        var left = e.inputBuffer.getChannelData(0);
        worker.postMessage({cmd: "resample", buffer: left});
        drawBuffer(left);
    }

    function convertFloat32ToInt16(buffer) {
        var l = buffer.length;
        var buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
        }
        return buf.buffer;
    }

    //https://github.com/cwilso/Audio-Buffer-Draw/blob/master/js/audiodisplay.js
    function drawBuffer(data) {
        var canvas = document.getElementById("canvas"),
            width = canvas.width,
            height = canvas.height,
            context = canvas.getContext('2d');

        context.clearRect (0, 0, width, height);
        var step = Math.ceil(data.length / width);
        var amp = height / 2;
        for (var i = 0; i < width; i++) {
            var min = 1.0;
            var max = -1.0;
            for (var j = 0; j < step; j++) {
                var datum = data[(i * step) + j];
                if (datum < min)
                    min = datum;
                if (datum > max)
                    max = datum;
            }
            context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    }

    $("#stop-rec-btn").click(function () {
        close();
    });
   
    $("#play-user-btn").click(function () {
		var audio = new Audio("wav/"+today.toString()+".wav");
		audio.play();
    });

    function close(){
        console.log('close');
		//var audio = new Audio(today.toString()+".wav");
		//audio.play();
        if(recorder)
            recorder.disconnect();
        if(client)
            client.close();
    }
});

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;
