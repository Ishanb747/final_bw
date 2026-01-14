document.addEventListener('DOMContentLoaded', () => {
    const captureBtn = document.getElementById('captureBtn');
    const outputDiv = document.getElementById('output');
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');

    let audioContext = null;
    let mediaStream = null;
    let analyser = null;
    let mediaRecorder = null;
    let recognition = null;
    let isRecording = false;
    let visualizerAnimationId = null;
    let audioChunks = [];
    let transcriptText = '';

    // Load saved state
    chrome.storage.local.get(['transcript'], (result) => {
        if (result.transcript) {
            transcriptText = result.transcript;
            renderTranscript(transcriptText);
        } else {
            outputDiv.innerText = "Ready to capture text or audio.";
        }
    });

    captureBtn.addEventListener('click', async () => {
        if (isRecording) {
            stopAll();
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            outputDiv.innerText = "No active tab.";
            return;
        }

        outputDiv.innerText = "Checking for selected text...";

        chrome.tabCapture.getMediaStreamId({ consumerTabId: undefined }, (streamId) => {
            const streamError = chrome.runtime.lastError;
            if (streamError) console.error("Stream ID Error", streamError);

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection().toString()
            }, (results) => {
                const selectedText = results && results[0] ? results[0].result : null;

                if (selectedText && selectedText.trim().length > 0) {
                    outputDiv.innerText = selectedText;
                } else {
                    if (!streamId) {
                        outputDiv.innerText = "Capture ID Error: " + (streamError ? streamError.message : "None");
                        return;
                    }
                    startAudioCapture(streamId);
                }
            });
        });
    });

    async function startAudioCapture(streamId) {
        outputDiv.innerText = "Status: Connecting to audio...";
        startRecordingState();
        canvas.style.display = 'block';
        audioChunks = [];
        transcriptText = '';

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'tab',
                        chromeMediaSourceId: streamId
                    }
                }
            });

            audioContext = new AudioContext();

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const source = audioContext.createMediaStreamSource(mediaStream);

            // 1. Connect to speakers (Loopback)
            source.connect(audioContext.destination);

            // 2. Connect to Visualizer
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            drawVisualizer();

            // MediaRecorder to capture audio
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
            mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data);
                    const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);
                    const transcriptPreview = transcriptText ?
                        `<div style="margin-top:10px; padding:8px; background:#f8f9fa; border-left:3px solid #007bff; font-size:11px; max-height:60px; overflow-y:auto;">${transcriptText}</div>` : '';
                    outputDiv.innerHTML = `<b>🔴 Recording & Transcribing...</b><br>` +
                        `Size: ${(totalSize / 1024).toFixed(1)} KB | Chunks: ${audioChunks.length}<br>` +
                        transcriptPreview +
                        `<div style="margin-top:10px; font-size:11px; color:#666;"><i>Click "Stop" when finished</i></div>`;
                }
            };

            mediaRecorder.onstop = async () => {
                if (audioChunks.length === 0) {
                    outputDiv.innerHTML = `<b>⚠️ No audio data captured</b><br><br>` +
                        `Make sure audio is playing in the tab and try again.`;
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: mimeType });
                const audioUrl = URL.createObjectURL(audioBlob);
                const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
                const sizeKB = (audioBlob.size / 1024).toFixed(1);

                // Show audio player immediately


                // Send audio to backend for transcription
                try {
                    const formData = new FormData();
                    formData.append('audio', audioBlob, `audio.${mimeType.split('/')[1]}`);

                    const response = await fetch('http://localhost:5001/transcribe', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`Server error: ${response.status}`);
                    }

                    const result = await response.json();

                    if (result.success && result.transcript) {
                        transcriptText = result.transcript;

                        // Update UI with transcript
                        const transcriptSection = `<div style="margin-top:15px; padding:10px; background:#f8f9fa; border-left:3px solid #28a745; border-radius:4px;">` +
                            `<b>📝 Transcript:</b><br><div style="margin-top:8px; white-space:pre-wrap; word-wrap:break-word;">${transcriptText}</div>` +
                            `<div style="margin-top:8px; font-size:10px; color:#666;">Language: ${result.language} | Duration: ${result.duration.toFixed(1)}s</div></div>`;

                        outputDiv.innerHTML = `<b>✅ Audio captured & transcribed!</b><br>` +
                            `<audio controls src="${audioUrl}" style="width:100%; margin-top:10px;"></audio><br>` +
                            transcriptSection +
                            `<div style="margin-top:10px; font-size:11px; color:#666;">` +
                            `Size: ${audioBlob.size > 1024 * 1024 ? sizeMB + ' MB' : sizeKB + ' KB'} | ` +
                            `Format: ${mimeType}</div><br>` +
                            `<button id="downloadBtn" style="width:100%; padding:8px; background:#28a745; color:white; border:none; cursor:pointer; border-radius:4px; margin-top:5px;">⬇️ Download Audio</button>` +
                            `<button id="copyBtn" style="width:100%; padding:8px; background:#007bff; color:white; border:none; cursor:pointer; border-radius:4px; margin-top:5px;">📋 Copy Transcript</button>`;
                    } else {
                        throw new Error(result.error || 'Transcription failed');
                    }

                } catch (error) {
                    console.error('Transcription error:', error);

                    const errorMsg = error.message.includes('Failed to fetch') ?
                        'Backend server not running. Please start the server:<br><code style="background:#f5f5f5; padding:2px 6px;">python backend/server.py</code>' :
                        error.message;

                    outputDiv.innerHTML = `<b>✅ Audio captured!</b><br>` +
                        `<audio controls src="${audioUrl}" style="width:100%; margin-top:10px;"></audio><br>` +
                        `<div style="margin-top:15px; padding:10px; background:#fff3cd; border-left:3px solid #ffc107; border-radius:4px;">` +
                        `<b>⚠️ Transcription failed</b><br>` +
                        `<div style="margin-top:8px; font-size:11px;">${errorMsg}</div></div>` +
                        `<div style="margin-top:10px; font-size:11px; color:#666;">` +
                        `Size: ${audioBlob.size > 1024 * 1024 ? sizeMB + ' MB' : sizeKB + ' KB'} | ` +
                        `Format: ${mimeType}</div><br>` +
                        `<button id="downloadBtn" style="width:100%; padding:8px; background:#28a745; color:white; border:none; cursor:pointer; border-radius:4px; margin-top:5px;">⬇️ Download Audio</button>`;
                }

                // Add button event listeners
                const downloadBtn = document.getElementById('downloadBtn');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', () => {
                        const a = document.createElement('a');
                        a.href = audioUrl;
                        a.download = `tab_audio_${Date.now()}.${mimeType.split('/')[1]}`;
                        a.click();
                    });
                }

                const copyBtn = document.getElementById('copyBtn');
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(transcriptText).then(() => {
                            copyBtn.innerText = '✅ Copied!';
                            setTimeout(() => copyBtn.innerText = '📋 Copy Transcript', 2000);
                        });
                    });
                }
            };

            mediaRecorder.onerror = (err) => {
                console.error("MediaRecorder error:", err);
                outputDiv.innerHTML = `<b>❌ Recording error</b><br>${err.toString()}`;
            };

            // Start recording
            mediaRecorder.start();

            outputDiv.innerHTML = "Status: <b>PLAY AUDIO NOW</b><br>Recording tab audio...";

        } catch (err) {
            console.error(err);
            outputDiv.innerHTML = "Error: " + err.message +
                "<br><br>If this is 'NotAllowedError', please click: <button id='permBtn'>Fix Mic Permission</button>";

            const btn = document.getElementById('permBtn');
            if (btn) {
                btn.addEventListener('click', () => chrome.tabs.create({ url: 'permission.html' }));
            }
            stopRecordingState();
        }
    }

    function drawVisualizer() {
        if (!isRecording || !analyser) return;

        visualizerAnimationId = requestAnimationFrame(drawVisualizer);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = '#f0f0f0';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;

            if (barHeight > 5) {
                canvasCtx.fillStyle = '#28a745';
            } else {
                canvasCtx.fillStyle = '#cccccc';
            }

            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    function stopAll() {
        if (recognition) {
            recognition.onend = null;
            try { recognition.stop(); } catch (e) { }
            recognition = null;
        }
        if (visualizerAnimationId) cancelAnimationFrame(visualizerAnimationId);
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        canvas.style.display = 'none';
        stopRecordingState();
    }

    function startRecordingState() {
        isRecording = true;
        captureBtn.innerText = "Stop";
        captureBtn.classList.add("recording");
    }

    function stopRecordingState() {
        isRecording = false;
        captureBtn.innerText = "Capture";
        captureBtn.classList.remove("recording");
        mediaRecorder = null;
        audioChunks = [];
    }

    function renderTranscript(text) {
        outputDiv.innerHTML = `<div style="margin-top:15px; padding:10px; background:#f8f9fa; border-left:3px solid #28a745; border-radius:4px;">` +
            `<b>📝 Transcript:</b><br><div style="margin-top:8px; white-space:pre-wrap; word-wrap:break-word;">${text}</div>` +
            `</div>` +
            `<button id="copyBtn" style="width:100%; padding:8px; background:#007bff; color:white; border:none; cursor:pointer; border-radius:4px; margin-top:5px;">📋 Copy Transcript</button>`;

        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(text).then(() => {
                    copyBtn.innerText = '✅ Copied!';
                    setTimeout(() => copyBtn.innerText = '📋 Copy Transcript', 2000);
                });
            });
        }
    }
});
