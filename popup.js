document.addEventListener('DOMContentLoaded', () => {
    const captureBtn = document.getElementById('captureBtn');
    const textBtn = document.getElementById('textBtn');
    const outputDiv = document.getElementById('output');
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');

    let audioContext = null;
    let mediaStream = null;
    let analyser = null;
    let mediaRecorder = null;
    let isRecording = false;
    let visualizerAnimationId = null;
    let audioChunks = [];
    let transcriptText = '';

    // Get selected text from active tab
    textBtn.addEventListener('click', async () => {
        try {
            // Query for the active tab in the LAST focused window (not this popup)
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

            if (!tab) {
                outputDiv.innerHTML = `<div style="padding:15px; background:#fff3cd; border-left:4px solid #ffc107; border-radius:6px;">` +
                    `<b>⚠️ No active tab found</b><br><br>` +
                    `Please make sure you have a webpage open.` +
                    `</div>`;
                return;
            }

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection().toString()
            });

            const selectedText = results && results[0] && results[0].result;

            if (selectedText && selectedText.trim().length > 0) {
                renderSelectedText(selectedText);
            } else {
                outputDiv.innerHTML = `<div style="padding:15px; background:#fff3cd; border-left:4px solid #ffc107; border-radius:6px;">` +
                    `<b>⚠️ No text selected</b><br><br>` +
                    `Please select some text on a webpage first, then click this button.` +
                    `</div>`;
            }
        } catch (error) {
            console.error('Error getting selected text:', error);
            outputDiv.innerHTML = `<div style="padding:15px; background:#f8d7da; border-left:4px solid #dc3545; border-radius:6px;">` +
                `<b>❌ Error:</b> ${error.message}<br><br>` +
                `Make sure you have an active tab open and try again.` +
                `</div>`;
        }
    });

    // Capture audio from tab
    captureBtn.addEventListener('click', async () => {
        if (isRecording) {
            stopAll();
            return;
        }

        try {
            outputDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#e3f2fd; border-radius:8px;">` +
                `<div style="font-size:18px; font-weight:600; color:#1976d2;">🎤 Getting stream access...</div>` +
                `</div>`;

            // Get stream ID using chrome.tabCapture (works in popup window context)
            const streamId = await new Promise((resolve, reject) => {
                chrome.tabCapture.getMediaStreamId({ consumerTabId: undefined }, (streamId) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(streamId);
                    }
                });
            });

            if (!streamId) {
                throw new Error('Failed to get stream ID');
            }

            await startAudioCapture(streamId);

        } catch (error) {
            console.error('Error starting audio capture:', error);
            outputDiv.innerHTML = `<div style="padding:20px; background:#f8d7da; border-left:4px solid #dc3545; border-radius:6px;">` +
                `<b style="font-size:16px;">❌ Cannot capture audio</b><br><br>` +
                `<b>Error:</b> ${error.message}<br><br>` +
                `<b>Common fixes:</b><br>` +
                `• Make sure a tab with audio is open<br>` +
                `• Try refreshing the page<br>` +
                `• Check that you have active tabs open<br>` +
                `</div>`;
        }
    });

    function renderSelectedText(text) {
        outputDiv.innerHTML = `<div style="padding:20px; background:#f8f9fa; border-left:4px solid #007bff; border-radius:8px;">` +
            `<b style="font-size:16px;">📝 Selected Text:</b><br>` +
            `<div style="margin-top:12px; white-space:pre-wrap; word-wrap:break-word; line-height:1.8;">"${text}"</div>` +
            `</div>` +
            `<button id="factCheckBtn" style="width:100%; padding:14px; background:#6f42c1; color:white; border:none; cursor:pointer; border-radius:8px; margin-top:15px; font-size:15px; font-weight:600;">🔍 Fact Check This</button>`;

        setupFactCheckButton(text);
    }

    async function startAudioCapture(streamId) {
        outputDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#e3f2fd; border-radius:8px;">` +
            `<div style="font-size:18px; font-weight:600; color:#1976d2;">🎤 Connecting to audio...</div>` +
            `</div>`;

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
            source.connect(audioContext.destination);

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            drawVisualizer();

            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
            mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data);
                    const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);
                    outputDiv.innerHTML = `<div style="padding:20px; background:#fff3cd; border-left:4px solid #ffc107; border-radius:8px;">` +
                        `<div style="font-size:18px; font-weight:600; color:#856404; margin-bottom:10px;">🔴 Recording Audio...</div>` +
                        `<div style="font-size:14px;">Size: ${(totalSize / 1024).toFixed(1)} KB | Chunks: ${audioChunks.length}</div>` +
                        `<div style="margin-top:15px; font-size:13px; color:#666;"><i>Click "Stop Recording" when finished</i></div>` +
                        `</div>`;
                }
            };

            mediaRecorder.onstop = async () => {
                canvas.style.display = 'none';

                if (audioChunks.length === 0) {
                    outputDiv.innerHTML = `<div style="padding:20px; background:#f8d7da; border-left:4px solid #dc3545; border-radius:8px;">` +
                        `<b style="font-size:16px;">⚠️ No audio data captured</b><br><br>` +
                        `Make sure audio is playing in the tab and try again.` +
                        `</div>`;
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: mimeType });
                const audioUrl = URL.createObjectURL(audioBlob);
                const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
                const sizeKB = (audioBlob.size / 1024).toFixed(1);

                outputDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#e3f2fd; border-radius:8px;">` +
                    `<div style="font-size:18px; font-weight:600; color:#1976d2;">⏳ Transcribing audio...</div>` +
                    `<div style="margin-top:10px; font-size:14px; color:#666;">This may take a moment</div>` +
                    `</div>`;

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
                        renderTranscript(transcriptText, audioUrl, sizeMB, sizeKB, mimeType);
                    } else {
                        throw new Error(result.error || 'Transcription failed');
                    }

                } catch (error) {
                    console.error('Transcription error:', error);
                    const errorMsg = error.message.includes('Failed to fetch') ?
                        'Backend server not running. Please start: <code>python server.py</code>' :
                        error.message;

                    outputDiv.innerHTML = `<div style="padding:20px;">` +
                        `<div style="padding:15px; background:#d4edda; border-left:4px solid #28a745; border-radius:8px; margin-bottom:15px;">` +
                        `<b style="font-size:16px;">✅ Audio captured!</b>` +
                        `</div>` +
                        `<audio controls src="${audioUrl}" style="width:100%; margin-bottom:15px;"></audio>` +
                        `<div style="padding:15px; background:#fff3cd; border-left:4px solid #ffc107; border-radius:8px;">` +
                        `<b>⚠️ Transcription failed</b><br><br>` +
                        `<div style="font-size:13px;">${errorMsg}</div>` +
                        `</div></div>`;
                }
            };

            mediaRecorder.start();
            outputDiv.innerHTML = `<div style="padding:30px; text-align:center; background:#d4edda; border-radius:8px;">` +
                `<div style="font-size:24px; font-weight:700; color:#155724; margin-bottom:10px;">🎵 PLAY AUDIO NOW</div>` +
                `<div style="font-size:16px; color:#155724;">Recording from your tab...</div>` +
                `</div>`;

        } catch (err) {
            console.error(err);
            outputDiv.innerHTML = `<div style="padding:20px; background:#f8d7da; border-left:4px solid #dc3545; border-radius:8px;">` +
                `<b style="font-size:16px;">❌ Error</b><br><br>` +
                `${err.message}` +
                `</div>`;
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
            barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

            if (barHeight > 5) {
                const gradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, '#6f42c1');
                gradient.addColorStop(1, '#28a745');
                canvasCtx.fillStyle = gradient;
            } else {
                canvasCtx.fillStyle = '#cccccc';
            }

            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    function stopAll() {
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
        captureBtn.innerText = "⏹️ Stop Recording";
        captureBtn.classList.add("recording");
        textBtn.disabled = true;
    }

    function stopRecordingState() {
        isRecording = false;
        captureBtn.innerText = "🎤 Capture Audio";
        captureBtn.classList.remove("recording");
        textBtn.disabled = false;
        mediaRecorder = null;
        audioChunks = [];
    }

    function renderTranscript(text, audioUrl = null, sizeMB = null, sizeKB = null, mimeType = null, language = "") {
        const audioHtml = audioUrl ?
            `<audio controls src="${audioUrl}" style="width:100%; margin:15px 0;"></audio>` : '';

        const fileInfo = audioUrl ?
            `<div style="text-align:center; font-size:12px; color:#666; margin-bottom:15px;">` +
            `Size: ${parseFloat(sizeMB) > 1.0 ? sizeMB + ' MB' : sizeKB + ' KB'} | Format: ${mimeType}` +
            `</div>` : '';

        outputDiv.innerHTML = `<div style="padding:20px;">` +
            `<div style="padding:15px; background:#d4edda; border-left:4px solid #28a745; border-radius:8px; margin-bottom:15px;">` +
            `<b style="font-size:16px;">✅ Content Captured Successfully!</b>` +
            `</div>` +
            audioHtml +
            fileInfo +
            `<div style="padding:20px; background:#f8f9fa; border-left:4px solid #28a745; border-radius:8px;">` +
            `<b style="font-size:16px; color:#28a745;">📝 Transcript:</b><br>` +
            `<div style="margin-top:15px; white-space:pre-wrap; word-wrap:break-word; line-height:1.8; font-size:14px;">${text}</div>` +
            `</div>` +
            `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">` +
            `<button id="copyBtn" style="padding:14px; background:#007bff; color:white; border:none; cursor:pointer; border-radius:8px; font-size:14px; font-weight:600;">📋 Copy Transcript</button>` +
            `<button id="factCheckBtn" style="padding:14px; background:#6f42c1; color:white; border:none; cursor:pointer; border-radius:8px; font-size:14px; font-weight:600;">🔍 Fact Check This</button>` +
            `</div>` +
            `</div>`;

        setupCopyButton(text);
        setupFactCheckButton(text);
    }

    function setupCopyButton(text) {
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

    function setupFactCheckButton(text) {
        const factCheckBtn = document.getElementById('factCheckBtn');
        if (factCheckBtn) {
            factCheckBtn.addEventListener('click', async () => {
                const originalText = factCheckBtn.innerText;
                factCheckBtn.innerHTML = '⏳ Checking... <span class="loading"></span>';
                factCheckBtn.disabled = true;

                try {
                    const response = await fetch('http://localhost:5001/factcheck', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: text })
                    });

                    if (!response.ok) throw new Error('Fact check failed');
                    const data = await response.json();

                    displayFactCheckResult(data.result, data.articles, data.perspectives, data.article_count);

                } catch (e) {
                    outputDiv.innerHTML += `<div style="padding:20px; background:#f8d7da; border-left:4px solid #dc3545; border-radius:8px; margin-top:20px;">` +
                        `<b>❌ Error checking facts:</b><br>${e.message}` +
                        `</div>`;
                } finally {
                    factCheckBtn.innerText = originalText;
                    factCheckBtn.disabled = false;
                }
            });
        }
    }

    function displayFactCheckResult(markdownResult, articles = [], perspectives = {}, articleCount = 0) {
        // Parse sections
        const coreFactMatch = markdownResult.match(/\*\*Core Fact\*\*:\s*(.*?)(?=\*\*Input Bias|\*\*Perspectives\*\*|$)/s);
        const inputBiasMatch = markdownResult.match(/\*\*Input Bias Analysis\*\*:\s*(.*?)(?=\*\*Perspectives\*\*|$)/s);
        const perspectivesMatch = markdownResult.match(/\*\*Perspectives\*\*:\s*(.*?)(?=\*\*Article Count|$)/s);
        const sourcesMatch = markdownResult.match(/\*\*Key Sources\*\*:(.*?)(?=\*\*Media Bias|$)/s);
        const biasMatch = markdownResult.match(/\*\*Media Bias Analysis\*\*:(.*?)(?=\*\*Conclusion\*\*|$)/s);
        const conclusionMatch = markdownResult.match(/\*\*Conclusion\*\*:\s*(.*)/s);

        const coreFact = coreFactMatch ? coreFactMatch[1].trim() : "Analysis available.";
        const inputBiasText = inputBiasMatch ? inputBiasMatch[1].trim() : "";
        const perspectivesText = perspectivesMatch ? perspectivesMatch[1].trim() : "";
        const sources = sourcesMatch ? sourcesMatch[1].trim() : "";
        const biasAnalysis = biasMatch ? biasMatch[1].trim() : "";
        const conclusionFull = conclusionMatch ? conclusionMatch[1].trim() : "See details.";

        // Error handling
        if (markdownResult.toLowerCase().includes("error")) {
            const resultDiv = `<div class="fact-check-result">` +
                `<div class="fact-header" style="background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%);">` +
                `<span>Error</span>` +
                `<span class="status-badge status-false">FAILED</span>` +
                `</div>` +
                `<div class="fact-section">` +
                `<div class="fact-content" style="color: #dc3545; font-size:14px;">` +
                `${formatLinks(markdownResult)}` +
                `</div>` +
                `</div></div>`;

            outputDiv.innerHTML += resultDiv;
            return;
        }

        // Determine status
        let statusClass = 'status-unknown';
        let statusText = 'UNKNOWN';

        if (conclusionFull.toLowerCase().includes('true') && !conclusionFull.toLowerCase().includes('false')) {
            statusClass = 'status-true';
            statusText = 'VERIFIED TRUE';
        } else if (conclusionFull.toLowerCase().includes('false')) {
            statusClass = 'status-false';
            statusText = 'FALSE';
        } else if (conclusionFull.toLowerCase().includes('misleading')) {
            statusClass = 'status-complex';
            statusText = 'MISLEADING';
        } else if (conclusionFull.toLowerCase().includes('complex')) {
            statusClass = 'status-complex';
            statusText = 'COMPLEX';
        } else if (conclusionFull.toLowerCase().includes('unverified')) {
            statusClass = 'status-unknown';
            statusText = 'UNVERIFIED';
        }

        // Build result HTML
        const resultHTML = `
            <div class="fact-check-result">
                <div class="fact-header">
                    <span>TruthLens Analysis</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="fact-section">
                    <div class="fact-label">Core Fact</div>
                    <div class="fact-content">${formatLinks(coreFact)}</div>
                </div>

                ${inputBiasText ? `
                <div class="fact-section" style="background: #f1f3f9;">
                    <div class="fact-label">Input Bias Analysis</div>
                    <div class="fact-content">${formatLinks(inputBiasText)}</div>
                </div>` : ''}

                <div class="fact-section">
                    <div class="fact-label">Political Perspectives</div>
                    <div class="fact-content">${formatMarkdown(perspectivesText)}</div>
                </div>

                ${perspectives && Object.keys(perspectives).length > 0 ? `
                <div class="fact-section">
                    <div class="fact-label">Coverage Distribution</div>
                    <div class="coverage-grid">
                        <div class="coverage-item coverage-left">
                            <div style="font-size:24px; font-weight:700;">${perspectives.left || 0}</div>
                            <div style="font-size:11px; margin-top:4px;">Left Sources</div>
                        </div>
                        <div class="coverage-item coverage-right">
                            <div style="font-size:24px; font-weight:700;">${perspectives.right || 0}</div>
                            <div style="font-size:11px; margin-top:4px;">Right Sources</div>
                        </div>
                        <div class="coverage-item coverage-center">
                            <div style="font-size:24px; font-weight:700;">${perspectives.center || 0}</div>
                            <div style="font-size:11px; margin-top:4px;">Center Sources</div>
                        </div>
                        <div class="coverage-item coverage-international">
                            <div style="font-size:24px; font-weight:700;">${perspectives.international || 0}</div>
                            <div style="font-size:11px; margin-top:4px;">International</div>
                        </div>
                    </div>
                </div>` : ''}

                ${biasAnalysis ? `
                <div class="fact-section">
                    <div class="fact-label">Media Bias Analysis</div>
                    <div class="fact-content">${formatLinks(biasAnalysis)}</div>
                </div>` : ''}

                ${sources ? `
                <div class="fact-section">
                    <div class="fact-label">Key Sources</div>
                    <div class="fact-content" style="font-size:13px;">${formatLinks(formatList(sources))}</div>
                </div>` : ''}

                <div class="fact-section">
                    <div class="fact-label">Conclusion</div>
                    <div class="fact-content" style="font-style:italic;">${formatLinks(conclusionFull)}</div>
                </div>

                ${articles && articles.length > 0 ? `
                <div class="fact-section" style="border-top:3px solid #e0e0e0;">
                    <div class="fact-label">
                        📰 Articles Found (${articleCount || articles.length})
                        <button class="toggle-btn" id="toggleArticles">Show All ▼</button>
                    </div>
                    <div id="articlesList" style="display:none; margin-top:15px;">
                        ${formatArticleList(articles)}
                    </div>
                </div>` : ''}
            </div>
        `;

        outputDiv.innerHTML += resultHTML;

        // Setup article toggle
        const toggleBtn = document.getElementById('toggleArticles');
        const articlesList = document.getElementById('articlesList');
        if (toggleBtn && articlesList) {
            toggleBtn.addEventListener('click', () => {
                if (articlesList.style.display === 'none') {
                    articlesList.style.display = 'block';
                    toggleBtn.innerText = 'Hide ▲';
                } else {
                    articlesList.style.display = 'none';
                    toggleBtn.innerText = 'Show All ▼';
                }
            });
        }

        // Scroll to result
        document.querySelector('.fact-check-result').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    function formatArticleList(articles) {
        return articles.map((art, idx) => `
            <div class="article-item">
                <div class="article-title">${idx + 1}. ${art.title}</div>
                <div class="article-meta">
                    <span class="meta-badge domain-badge">${art.domain}</span>
                    <span class="meta-badge country-badge">${art.sourcecountry}</span>
                    <span class="meta-badge tone-badge">Tone: ${art.tone}</span>
                </div>
                <a href="${art.url}" target="_blank" class="article-link">🔗 Read Full Article</a>
            </div>
        `).join('');
    }

    function formatList(text) {
        return text.replace(/\*\s+(.*?)(?=\n|$)/g, '• $1<br>');
    }

    function formatMarkdown(text) {
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        formatted = formatList(formatted);
        return formatLinks(formatted);
    }

    function formatLinks(text) {
        return text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    }
});