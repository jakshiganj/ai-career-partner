import asyncio
import websockets
import json
import httpx

async def test_ws():
    # 1. Login to get token
    async with httpx.AsyncClient() as client:
        res = await client.post("http://localhost:8000/auth/login", data={"username": "test@example.com", "password": "password123"})
        if res.status_code != 200:
            print("Login failed:", res.text)
            return
        token = res.json()["access_token"]
        
        # 2. Start session
        res = await client.post("http://localhost:8000/api/interview/start", headers={"Authorization": f"Bearer {token}"})
        if res.status_code != 200:
            print("Start failed:", res.text)
            return
        session_id = res.json()["session_id"]
        print("Got session:", session_id)
        
    # 3. Connect via WS
    uri = f"ws://localhost:8000/ws/interview/{session_id}"
    async with websockets.connect(uri) as websocket:
        print("Connected to WS")
        
        async def listen():
            try:
                while True:
                    msg = await websocket.recv()
                    if isinstance(msg, bytes):
                        pass # Ignore audio chunks
                    else:
                        print(f"Server JSON: {msg}")
            except Exception as e:
                print("Listen error:", e)
                
        listen_task = asyncio.create_task(listen())
        
        # await asyncio.sleep(1)  # Immediately reply
        # print("Sending reply...")
        # await websocket.send(json.dumps({"type": "candidate_transcript", "text": "Can you hear me?"}))
        
        await asyncio.sleep(20)
        listen_task.cancel()

asyncio.run(test_ws())
