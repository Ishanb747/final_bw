from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
import os
import tempfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension

# Initialize Whisper model (base model for good speed/accuracy balance)
# Models: tiny, base, small, medium, large-v2, large-v3
# Using base model (~150MB) - good balance of speed and accuracy
logger.info("Loading Whisper model...")
model = WhisperModel("base", device="cpu", compute_type="int8")
logger.info("Whisper model loaded successfully!")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "model": "whisper-base",
        "message": "Transcription service is running"
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio file sent from Chrome extension
    Expects: audio file in request.files['audio']
    Returns: JSON with transcript
    """
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({
                "error": "No audio file provided",
                "transcript": ""
            }), 400

        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({
                "error": "Empty filename",
                "transcript": ""
            }), 400

        # Save audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_audio:
            audio_file.save(temp_audio.name)
            temp_path = temp_audio.name

        logger.info(f"Processing audio file: {audio_file.filename}")

        # Transcribe using faster-whisper
        segments, info = model.transcribe(
            temp_path,
            beam_size=5,
            language="en",  # Can be auto-detected by removing this
            vad_filter=True,  # Voice Activity Detection to filter silence
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        # Combine all segments into full transcript
        transcript = " ".join([segment.text.strip() for segment in segments])

        # Clean up temporary file
        try:
            os.unlink(temp_path)
        except:
            pass

        logger.info(f"Transcription successful. Length: {len(transcript)} chars")
        logger.info(f"Detected language: {info.language} (confidence: {info.language_probability:.2f})")

        return jsonify({
            "transcript": transcript,
            "language": info.language,
            "language_probability": float(info.language_probability),
            "duration": float(info.duration),
            "success": True
        })

    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return jsonify({
            "error": str(e),
            "transcript": "",
            "success": False
        }), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("TruthLens Transcription Server")
    print("="*50)
    print("Server running on http://localhost:5001")
    print("Whisper model: base")
    print("Ready to receive audio from extension")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
