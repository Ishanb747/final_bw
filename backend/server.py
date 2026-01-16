from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from fact_checker import run_fact_check  # Your enhanced fact_checker.py
from dotenv import load_dotenv
import os
import tempfile
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load env vars
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension

# Initialize Groq client
logger.info("Initializing Groq client...")
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
logger.info("Groq client initialized!")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "model": "whisper-base",
        "message": "TruthLens service is running"
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio file sent from Chrome extension
    """
    try:
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
        
        # Call Groq Whisper API (Cloud)
        with open(temp_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(temp_path, file.read()),
                model="whisper-large-v3",
                response_format="verbose_json",
            )

        transcript = transcription.text
        detected_language_code = getattr(transcription, 'language', 'en')
        
        # Language mapping for better UI feedback
        lang_map = {
            "hi": "Hindi",
            "mr": "Marathi",
            "ta": "Tamil",
            "te": "Telugu",
            "kn": "Kannada",
            "gu": "Gujarati",
            "pa": "Punjabi",
            "bn": "Bengali",
            "en": "English",
            "ur": "Urdu"
        }
        
        lang_name = lang_map.get(detected_language_code, detected_language_code.upper())

        # Clean up
        try:
            os.unlink(temp_path)
        except:
            pass

        logger.info(f"Transcription successful. Length: {len(transcript)} chars")

        return jsonify({
            "transcript": transcript,
            "language": lang_name,
            "success": True
        })

    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return jsonify({
            "error": str(e),
            "transcript": "",
            "success": False
        }), 500

@app.route('/factcheck', methods=['POST'])
def factcheck():
    """
    Enhanced fact-check endpoint with article listing and perspectives
    Expects JSON: { "text": "claim to check" }
    Returns: { "report": "...", "articles": [...], "perspectives": {...} }
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
            
        text = data['text']
        logger.info(f"Received fact check request for: {text}")
        
        # Run enhanced fact check
        result_json = run_fact_check(text)
        result = json.loads(result_json)
        
        if "error" in result and "report" not in result:
            return jsonify({
                "error": result["error"],
                "success": False,
                "articles": result.get("articles", []),
                "perspectives": result.get("perspectives", {})
            }), 500
        
        return jsonify({
            "result": result.get("report", ""),
            "articles": result.get("articles", []),
            "article_count": result.get("article_count", 0),
            "perspectives": result.get("perspectives", {}),
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Fact check error: {str(e)}")
        return jsonify({
            "error": str(e),
            "success": False,
            "articles": [],
            "perspectives": {}
        }), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("TruthLens Enhanced Server")
    print("="*60)
    print("Server running on http://localhost:5001")
    print("Features:")
    print("  - Audio Transcription (Whisper)")
    print("  - Multi-Perspective Fact Checking (GDELT)")
    print("  - Article Source Listing")
    print("  - Political Bias Analysis")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=True)