import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.fact_checker import run_fact_check
except ImportError:
    # If run from backend dir directly
    sys.path.append(os.getcwd())
    from fact_checker import run_fact_check

print("Starting reproduction script...")
try:
    result = run_fact_check("The earth is flat")
    print("Result:", result)
except Exception as e:
    print("Caught exception:")
    print(e)
    import traceback
    traceback.print_exc()
