from duckduckgo_search import DDGS
import json

def test_ddg():
    print("Testing DuckDuckGo Search...")
    try:
        with DDGS() as ddgs:
            query = "Python developer jobs demand Sri Lanka 2025"
            print(f"Querying: {query}")
            results = list(ddgs.text(query, max_results=2))
            print(f"Result Count: {len(results)}")
            print(json.dumps(results, indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ddg()
