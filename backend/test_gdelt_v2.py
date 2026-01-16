import requests
import json

def test_gdelt_v2(query):
    # GDELT 2.0 Doc API
    base_url = "https://api.gdeltproject.org/api/v2/doc/doc"
    params = {
        "query": query,
        "mode": "artlist",
        "maxrecords": "10",
        "format": "json"
    }
    print(f"Testing GDELT V2 API: {base_url} with query '{query}'")
    try:
        response = requests.get(base_url, params=params)
        print(f"Status: {response.status_code}")
        data = response.json()
        print("JSON Success!")
        # Print first article title to verify
        if 'articles' in data and len(data['articles']) > 0:
            print(f"Found {len(data['articles'])} articles.")
            print(f"First: {data['articles'][0]['title']}")
        else:
            print("No articles found in JSON.")
            print(data)
    except Exception as e:
        print(f"Error: {e}")
        print("Response Text (first 200):", response.text[:200])

if __name__ == "__main__":
    test_gdelt_v2("Germany troops Greenland")
