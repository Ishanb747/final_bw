document.getElementById('btn').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop immediately, we just needed the grant
        stream.getTracks().forEach(t => t.stop());
        document.getElementById('status').innerText = "Permission Granted! You can close this tab and try the extension again.";
        setTimeout(() => window.close(), 2000);
    } catch (e) {
        document.getElementById('status').innerText = "Error: " + e.message;
    }
});
