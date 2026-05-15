import pytest
import sys
import os

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

def test_imports():
    """Verify that key libraries are installed."""
    import langgraph
    import google.genai
    pass

def test_graph_compilation():
    """Verify that the LangGraph compiles successfully."""
    from app.graph.graph import build_graph
    app = build_graph()
    assert app is not None

if __name__ == "__main__":
    test_imports()
    test_graph_compilation()
    print("All tests passed!")
