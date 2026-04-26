from google.genai.types import Part
try:
    p = Part.from_bytes(data=b"123", mime_type="audio/pcm")
    print("Part has text?", bool(p.text))
    print("Text value:", p.text)
except Exception as e:
    import traceback
    traceback.print_exc()
