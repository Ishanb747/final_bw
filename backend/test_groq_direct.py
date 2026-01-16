import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
print(f"API Key present: {bool(api_key)}")

try:
    llm = ChatGroq(
        api_key=api_key,
        model_name="llama-3.3-70b-versatile"
    )
    print("ChatGroq initialized.")
    
    print("Invoking model...")
    response = llm.invoke("Hello, are you working?")
    print("Response received:")
    print(response.content)

except Exception as e:
    print(f"Error: {e}")
