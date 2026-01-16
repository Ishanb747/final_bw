import os
import requests
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.messages import HumanMessage
import json

# Load environment variables
load_dotenv()

def generate_gdelt_queries(topic: str, llm) -> list:
    """
    Generate multiple GDELT-optimized queries targeting different political perspectives.
    Returns a list of query strings with OR operators.
    """
    prompt = f"""Generate GDELT search queries for the topic: "{topic}"

Create 5 different query variations targeting political perspectives:
1. GENERAL: Main keywords with OR operators - 5-8 relevant terms
2. LEFT: Keywords + left-leaning sources and critical angles
3. RIGHT: Keywords + right-leaning sources and supportive angles  
4. CENTER: Keywords + mainstream/centrist sources
5. INTERNATIONAL: Keywords + international/non-US perspectives

Format each as: (keyword1 OR keyword2 OR keyword3 OR ...)
Use quotes for exact phrases like "U.S. military" or "climate change"
Include synonyms, acronyms, and related terms.

Example for "US troops Greenland":
GENERAL: ("us military" OR "u.s. military" OR pentagon OR "us troops" OR "american forces" OR "u.s. army" OR "united states military") AND greenland
LEFT: ("us military" OR pentagon OR "us troops") AND greenland AND (domain:cnn.com OR domain:msnbc.com OR domain:theguardian.com OR imperialism OR expansion OR sovereignty)
RIGHT: ("us military" OR pentagon OR "us troops") AND greenland AND (domain:foxnews.com OR domain:breitbart.com OR domain:nypost.com OR defense OR security OR strategy)
CENTER: ("us military" OR pentagon OR "us troops") AND greenland AND (domain:reuters.com OR domain:apnews.com OR domain:bbc.com)
INTERNATIONAL: ("us military" OR pentagon OR "us troops") AND greenland AND (sourcecountry:DK OR sourcecountry:GL OR sourcecountry:RU OR sourcecountry:CN OR sourcecountry:EU)

Now generate for: "{topic}"
Return ONLY the 5 queries, one per line, labeled GENERAL:, LEFT:, RIGHT:, CENTER:, INTERNATIONAL:"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        lines = response.content.strip().split('\n')
        
        queries = []
        for line in lines:
            if ':' in line:
                query = line.split(':', 1)[1].strip()
                if query:
                    queries.append(query)
        
        return queries if len(queries) >= 3 else [topic, topic, topic]
    except Exception as e:
        print(f"Query generation error: {e}")
        return [topic, topic, topic]

def analyze_input_bias(topic: str, llm) -> str:
    """
    Analyzes the political bias of the input transcript or text.
    Returns a classification: LEFT, RIGHT, or CENTER.
    """
    prompt = f"""Analyze the political bias of the following text:
"{topic}"

Classify it as one of:
- LEFT-LEANING (Progressive, Liberal, Social Justice focus)
- RIGHT-LEANING (Conservative, Traditional, Market-focus)
- CENTER/NEUTRAL (Objective reporting, balanced viewpoints)

Return ONLY the classification label and a 1-sentence explanation of why it fits that label.
Format: [LABEL]: [Explanation]"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()
    except Exception as e:
        print(f"Bias analysis error: {e}")
        return "UNKNOWN: Error during analysis"

def gdelt_search(query: str, max_records: int = 20) -> dict:
    """
    Searches the GDELT Project for news coverage.
    Returns dict with articles list and metadata.
    """
    base_url = "https://api.gdeltproject.org/api/v2/doc/doc"
    params = {
        "query": query,
        "mode": "artlist",
        "maxrecords": str(max_records),
        "format": "json",
        "sortby": "date"
    }
    
    try:
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        articles = data.get('articles', [])
        if not articles:
            return {"articles": [], "error": f"No articles found"}
        
        # Format articles with all metadata
        formatted_articles = []
        for art in articles:
            formatted_articles.append({
                "title": art.get('title', 'No Title'),
                "url": art.get('url', 'No URL'),
                "domain": art.get('domain', 'Unknown'),
                "sourcecountry": art.get('sourcecountry', 'Unknown'),
                "seendate": art.get('seendate', 'Unknown'),
                "tone": art.get('tone', 'N/A'),
                "language": art.get('language', 'Unknown')
            })
            
        return {"articles": formatted_articles, "count": len(formatted_articles)}
        
    except requests.exceptions.Timeout:
        return {"articles": [], "error": "Request timeout"}
    except Exception as e:
        return {"articles": [], "error": str(e)}

def run_fact_check(topic: str):
    """
    Enhanced Fact Check Pipeline with political perspective analysis:
    1. GENERATE: Create multiple GDELT queries for different perspectives
    2. RETRIEVE: Execute queries and collect articles
    3. REPORT: Synthesize with political perspective breakdown
    """
    load_dotenv()
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        return json.dumps({"error": "GROQ_API_KEY not found", "articles": []})

    llm = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile", api_key=groq_api_key)

    print(f"\n{'='*60}")
    print(f"FACT-CHECKING: {topic}")
    print(f"{'='*60}\n")

    # --- STEP 1: BIAS & QUERY GENERATION ---
    print("Step 1: Analyzing input bias and generating queries...")
    input_bias_result = analyze_input_bias(topic, llm)
    queries = generate_gdelt_queries(topic, llm)
    
    perspective_labels = ["GENERAL", "LEFT", "RIGHT", "CENTER", "INTERNATIONAL"]
    print(f"Generated {len(queries)} queries:")
    for i, q in enumerate(queries[:5]):
        label = perspective_labels[i] if i < 5 else f"QUERY_{i+1}"
        print(f"  {label}: {q[:80]}...")

    # --- STEP 2: RETRIEVAL ---
    print("\nStep 2: Retrieving articles from GDELT...")
    all_articles = []
    perspective_data = {}
    
    for idx, query in enumerate(queries[:5]):
        perspective = perspective_labels[idx] if idx < 5 else f"QUERY_{idx+1}"
        
        try:
            print(f"\n  Executing {perspective} query...")
            result = gdelt_search(query)
            
            if result.get("articles"):
                articles = result["articles"]
                perspective_data[perspective] = articles
                all_articles.extend(articles)
                print(f"    ✓ Found {len(articles)} articles")
            else:
                perspective_data[perspective] = []
                print(f"    ✗ No articles found")
        except Exception as e:
            perspective_data[perspective] = []
            print(f"    ✗ Error: {e}")
    
    # Deduplicate articles by URL
    seen_urls = set()
    unique_articles = []
    for art in all_articles:
        if art["url"] not in seen_urls:
            seen_urls.add(art["url"])
            unique_articles.append(art)
    
    print(f"\n  Total unique articles: {len(unique_articles)}")
    
    # Fallback to DuckDuckGo if no GDELT results
    if not unique_articles:
        print("\n  ⚠ No GDELT results. Trying DuckDuckGo fallback...")
        try:
            ddg = DuckDuckGoSearchRun()
            web_res = ddg.invoke(topic)
            perspective_data["WEB_SEARCH"] = web_res
        except Exception as e:
            print(f"    ✗ Web search failed: {e}")

    if not unique_articles and "WEB_SEARCH" not in perspective_data:
        return json.dumps({
            "error": "No data retrieved from any source",
            "articles": [],
            "perspectives": {}
        })

    # --- STEP 3: SYNTHESIS ---
    print("\nStep 3: Synthesizing perspective-based analysis...\n")
    
    # Create context from perspective data
    context_parts = []
    for perspective, articles in perspective_data.items():
        if articles and isinstance(articles, list):
            article_summaries = []
            for art in articles[:5]:  # Top 5 per perspective
                article_summaries.append(
                    f"- {art['title']} ({art['domain']}, {art['sourcecountry']}) - {art['url']}"
                )
            context_parts.append(
                f"### {perspective} PERSPECTIVE:\n" + "\n".join(article_summaries)
            )
    
    context_str = "\n\n".join(context_parts)
    
    report_prompt = f"""You are 'TruthLens', an expert fact-checker specializing in multi-perspective analysis.

TOPIC: {topic}

INPUT BIAS ANALYSIS:
{input_bias_result}

ARTICLES RETRIEVED BY POLITICAL PERSPECTIVE:
{context_str}

TASK:
Analyze the coverage from LEFT, RIGHT, CENTER, and INTERNATIONAL perspectives.
Identify what each perspective emphasizes, what they agree on, and where they diverge.

IMPORTANT: 
- ANY time you mention a specific source or claim that comes from one of the articles, you MUST hyperlink it using [Source Name](URL).
- All items in 'Key Sources' MUST be clickable hyperlinks.
- Use ONLY sources provided in the context.

OUTPUT FORMAT (Strict JSON-compatible Markdown):

**Core Fact**: [What actually happened? State the verifiable facts. 2-3 sentences]

**Input Bias Analysis**:
{input_bias_result}

**Perspectives**:
*   **Left-Leaning View**: [Summary of left-oriented coverage. What do progressive/liberal sources emphasize? What concerns do they raise?]
*   **Right-Leaning View**: [Summary of right-oriented coverage. What do conservative sources emphasize? What benefits do they highlight?]
*   **Center/Mainstream View**: [Summary of centrist coverage. What do neutral sources report? The middle ground perspective.]
*   **International View**: [Summary of non-US/international coverage. How do other countries view this? Alternative perspectives.]

**Article Count by Perspective**:
*   Left: [X articles]
*   Right: [X articles]  
*   Center: [X articles]
*   International: [X articles]

**Key Sources** (Include at least 5 with actual URLs from context):
*   [Source Name - Domain](URL)
*   [Source Name - Domain](URL)
*   [Source Name - Domain](URL)
*   [Source Name - Domain](URL)
*   [Source Name - Domain](URL)

**Media Bias Analysis**: [Which perspective dominated coverage? Any notable absences? Geographic concentration? Use hyperlinks for sources mentioned.]

**Conclusion**: [**TRUE** | **FALSE** | **MISLEADING** | **COMPLEX** | **UNVERIFIED**]
[2-3 sentence synthesis. Note if perspectives agree or diverge significantly. Hyperlink supporting evidence.]

CRITICAL: Use ONLY sources provided. Include actual URLs. If a perspective has no articles, state "No coverage found from this perspective."
"""
    
    try:
        final_response = llm.invoke([HumanMessage(content=report_prompt)])
        
        result = {
            "report": final_response.content,
            "articles": unique_articles[:30],  # Return top 30 articles
            "article_count": len(unique_articles),
            "input_bias": input_bias_result,
            "perspectives": {
                "left": len(perspective_data.get("LEFT", [])),
                "right": len(perspective_data.get("RIGHT", [])),
                "center": len(perspective_data.get("CENTER", [])),
                "international": len(perspective_data.get("INTERNATIONAL", []))
            }
        }
        
        print(f"{'='*60}")
        print("FACT-CHECK COMPLETE")
        print(f"{'='*60}\n")
        
        return json.dumps(result)
        
    except Exception as e:
        return json.dumps({
            "error": f"Synthesis error: {e}",
            "articles": unique_articles[:30],
            "perspectives": {}
        })

if __name__ == "__main__":
    import sys
    
    test_topic = sys.argv[1] if len(sys.argv) > 1 else "US military greenland"
    result_json = run_fact_check(test_topic)
    result = json.loads(result_json)
    
    if "report" in result:
        print(result["report"])
        print(f"\n\nTotal Articles Retrieved: {result.get('article_count', 0)}")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")