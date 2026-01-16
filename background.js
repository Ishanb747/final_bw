// background.js or service_worker.js
// This handles opening the popup window

// background.js - Simple version that just opens the popup window
chrome.action.onClicked.addListener((tab) => {
    // Open a popup window instead of extension popup
    chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 900,
        height: 800,
        focused: true
    });
});

// Listen for messages from popup window
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSelectedText') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => window.getSelection().toString()
                }, (results) => {
                    sendResponse({
                        text: results && results[0] ? results[0].result : null,
                        tabId: tabs[0].id
                    });
                });
            }
        });
        return true; // Keep channel open for async response
    }

    if (request.action === 'getStreamId') {
        chrome.tabCapture.getMediaStreamId({ consumerTabId: undefined }, (streamId) => {
            sendResponse({
                streamId: streamId,
                error: chrome.runtime.lastError ? chrome.runtime.lastError.message : null
            });
        });
        return true;
    }
});