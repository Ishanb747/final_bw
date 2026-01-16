from fact_checker import gdelt_search

query = "Germany troops Greenland"
print(f"Querying GDELT for: '{query}'...")
result = gdelt_search(query)
print("\nGDELT Result:")
print(result)

# Try a broader query if specific one fails
if "No articles found" in result:
    print("\nTrying broader query: 'Greenland Germany'...")
    result_broad = gdelt_search("Greenland Germany")
    print(result_broad)
