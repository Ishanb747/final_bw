from fact_checker import run_fact_check

# Simulate a long transcript or selected text
long_input = """Germany has announced it will send troops to Greenland for the first time, along with other European countries. It's part of measures to boost defense on the Arctic Island as U.S. President Donald Trump insists the Danish territory is essential for U.S. national security. The announcement came after Denmark and Greenland's foreign ministers held inconclusive talks in Washington with U.S. Vice President J.D. Vance and Secretary of State Mark Rubio."""

print("Testing with long input...")
result = run_fact_check(long_input)
print("\nFinal Result:")
print(result)
