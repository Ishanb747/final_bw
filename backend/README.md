# TruthLens Backend - Transcription Service

Local Python backend for transcribing audio using faster-whisper (100% free, runs locally).

## Features

- 🎤 Fast, accurate transcription using Whisper
- 🆓 Completely free - runs on your machine
- 🚀 4x faster than OpenAI's Whisper
- 🔧 Easy to extend for text processing (fact-checking, summarization, etc.)

## Setup

### 1. Install Python Dependencies

**Windows:**
```bash
cd backend
start.bat
```

That's it! The `start.bat` script will automatically set up the virtual environment and start the server.

**Manual Setup (if needed):**
```bash
cd backend
python -m venv venv
.\venv\Scripts\pip.exe install -r requirements.txt
.\venv\Scripts\python.exe server.py
```

You should see:
```
🎤 TruthLens Transcription Server
✅ Server running on http://localhost:5000
✅ Whisper model: base
✅ Ready to receive audio from extension
```

**Note:** First run will download the Whisper model (~150MB). This is a one-time download.

## Usage

The server is now ready to receive audio from the Chrome extension. Just:
1. Make sure the server is running
2. Use the extension to capture tab audio
3. Click "Stop" - the audio will be sent to the server
4. The transcript will appear in the extension

## API Endpoints

### `GET /health`
Health check endpoint
```json
{
  "status": "ok",
  "model": "whisper-base",
  "message": "Transcription service is running"
}
```

### `POST /transcribe`
Transcribe audio file
- **Input:** `multipart/form-data` with `audio` file field
- **Output:** 
```json
{
  "transcript": "transcribed text here",
  "language": "en",
  "language_probability": 0.99,
  "duration": 12.5,
  "success": true
}
```

## Model Options

Edit `server.py` line 19 to change model size:

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| `tiny` | ~75MB | Fastest | Good |
| `base` | ~150MB | Fast | Very Good ⭐ (default) |
| `small` | ~500MB | Medium | Excellent |
| `medium` | ~1.5GB | Slow | Outstanding |

## Troubleshooting

### "No module named 'faster_whisper'"
Run: `pip install -r requirements.txt`

### Port 5000 already in use
Edit `server.py` line 107, change `port=5000` to another port (e.g., `5001`)

### Slow transcription
- Use `tiny` model for faster processing
- Or enable GPU support (requires CUDA)

## Future Enhancements

This backend can be extended to:
- ✅ Sentiment analysis
- ✅ Keyword extraction
- ✅ Summarization
- ✅ Fact-checking (TruthLens use case!)
- ✅ Translation
- ✅ Save transcripts to database
