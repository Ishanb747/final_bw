from fact_checker import run_fact_check
import logging

# Configure logging to see full details
logging.basicConfig(level=logging.DEBUG)

try:
    print("Running fact check...")
    result = run_fact_check("The earth is flat")
    print("\nResult:")
    print(result)
except Exception as e:
    print("\nEXCEPTION CAUGHT:")
    print(e)
