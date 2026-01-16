import requests

def debug_gdelt_raw(query):
    base_url = "https://api.gdeltproject.org/api/v1/search_ftxtsearch/search_ftxtsearch"
    params = {
        "query": query,
        "mode": "artlist",
        "maxrecords": "10",
        "format": "json",
        "sortby": "date"
    }
    print(f"Requesting: {base_url}?query={query}&format=json...")
    try:
        response = requests.get(base_url, params=params)
        print(f"Status Code: {response.status_code}")
        print("Response Headers:", response.headers)
        print("Raw Content Sample (first 500 chars):")
        print(response.text[:500])
        
        data = response.json()
        print("\nJSON Valid!")
        print(data)
    except Exception as e:
        print(f"\nEXCEPTION: {e}")

if __name__ == "__main__":
    debug_gdelt_raw("Germany troops Greenland")
