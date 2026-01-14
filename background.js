chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_RECORDING') {
        handleStartRecording(msg).then(sendResponse);
        return true;
    } else if (msg.type === 'STOP_RECORDING') {
        sendMessageToOffscreen(msg, sendResponse);
        return true;
    }
});

async function handleStartRecording(msg) {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length === 0) {
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Recording tab audio for speech-to-text'
        });
    }

    // Just forward the message
    chrome.runtime.sendMessage(msg);
}

function sendMessageToOffscreen(msg, sendResponse) {
    chrome.runtime.sendMessage(msg, (response) => {
        // Pass response back to original sender (popup)
        if (chrome.runtime.lastError) {
            // Offscreen might not be open?
            sendResponse({ success: true, warning: "Offscreen not reachable" });
        } else {
            sendResponse(response);
        }
    });
}
