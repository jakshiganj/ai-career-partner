import aiohttp
from typing import Optional

class HttpClient:
    session: Optional[aiohttp.ClientSession] = None

    @classmethod
    async def get_session(cls) -> aiohttp.ClientSession:
        if cls.session is None or cls.session.closed:
            cls.session = aiohttp.ClientSession()
        return cls.session

    @classmethod
    async def close_session(cls):
        if cls.session and not cls.session.closed:
            await cls.session.close()

async def get_http_session() -> aiohttp.ClientSession:
    return await HttpClient.get_session()
