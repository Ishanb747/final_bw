let recognition;
let audioContext;
let mediaStreamSource;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_RECORDING') {
        startRecording(msg.streamId);
    } else if (msg.type === 'STOP_RECORDING') {
        stopRecording();
        sendResponse({ success: true });
    }
});

async function startRecording(streamId) {
    stopRecording();
    chrome.runtime.sendMessage({ type: 'TRANSCRIPT_UPDATE', text: 'Status: Connecting to tab audio...' });

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            }
        });

        chrome.runtime.sendMessage({ type: 'TRANSCRIPT_UPDATE', text: 'Status: Audio stream acquired. Playing to speakers...' });

        audioContext = new AudioContext();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(audioContext.destination);

        // Optional: Check audio levels to see if there is valid input
        const analyser = audioContext.createAnalyser();
        mediaStreamSource.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Simple interval to check if audio is silent
        // This is just for debugging "Why is nothing happening"
        const checkAudioInterval = setInterval(() => {
            if (!audioContext) { clearInterval(checkAudioInterval); return; }
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            if (sum > 0) {
                // Audio is playing
            } else {
                // Silence
            }
        }, 1000);


        chrome.runtime.sendMessage({ type: 'TRANSCRIPT_UPDATE', text: 'Status: Listening via Mic (Loopback)...' });
        startRecognition();

    } catch (err) {
        console.error("Offscreen capture error:", err);
        chrome.runtime.sendMessage({ type: 'TRANSCRIPT_ERROR', error: "Offscreen Stream Error: " + err.toString() });
    }
}

function startRecognition() {
    if (!('webkitSpeechRecognition' in self)) {
        chrome.runtime.sendMessage({ type: 'TRANSCRIPT_ERROR', error: "Speech API not supported" });
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        console.log("Recognition started");
        // Don't overwrite status immediately if we want to see "Listening..."
    };

    recognition.onresult = (event) => {
        let final = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
            } else {
                interim += event.results[i][0].transcript;
            }
        }
        chrome.runtime.sendMessage({
            type: 'TRANSCRIPT_UPDATE',
            text: final + (interim ? '\n[' + interim + ']' : '')
        });
    };

    recognition.onerror = (e) => {
        console.error("Recognition error:", e);
        if (e.error === 'no-speech') {
            // useful to know
        } else {
            chrome.runtime.sendMessage({ type: 'TRANSCRIPT_ERROR', error: "Speech Error: " + e.error });
        }
    };

    recognition.start();
}

function stopRecording() {
    if (recognition) {
        try { recognition.stop(); } catch (e) { }
        recognition = null;
    }
    if (audioContext) {
        try { audioContext.close(); } catch (e) { }
        audioContext = null;
    }
    if (mediaStreamSource && mediaStreamSource.mediaStream) {
        mediaStreamSource.mediaStream.getTracks().forEach(t => t.stop());
        mediaStreamSource = null;
    }
}
