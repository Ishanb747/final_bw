import requests
import json
import time

def test_factcheck():
    url = "http://localhost:5001/factcheck"
    payload = {
        "text": "The earth is flat and the moon is made of cheese."
    }
    
    print(f"Testing {url} with payload: {payload['text']}")
    
    try:
        # Wait a bit for server to start if running immediately
        time.sleep(2)
        
        response = requests.post(url, json=payload)
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_factcheck()
