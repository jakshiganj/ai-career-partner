import asyncio
from app.graph.graph import build_graph

def test_build():
    try:
        graph = build_graph()
        print("Graph built successfully!")
        print(graph.get_graph().draw_mermaid())
    except Exception as e:
        print(f"Error building graph: {e}")

if __name__ == "__main__":
    test_build()
