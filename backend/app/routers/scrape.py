from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import aiohttp
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.core.database import get_session
from app.models.profile import CandidateProfile
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

class ScrapeRequest(BaseModel):
    url: str

@router.post("/scrape")
async def scrape_linkedin_url(
    req: ScrapeRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Scrapes publicly visible fields from a LinkedIn URL to supplement CandidateProfile data.
    If private or fails, returns empty scraped data smoothly.
    """
    url = req.url
    if not url.startswith("https://www.linkedin.com/in/"):
        return {"scraped_data": {}, "merged": False, "error": "Not a valid LinkedIn profile URL"}
        
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
    }

    scraped_data = {}
    
    try:
        async with aiohttp.ClientSession() as http_session:
            async with http_session.get(url, headers=headers, timeout=10) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "html.parser")
                    
                    # Try targeting basic public elements (LinkedIn's DOM is obfuscated and frequently changes)
                    name_el = soup.find("h1", class_="top-card-layout__title")
                    headline_el = soup.find("h2", class_="top-card-layout__headline")
                    
                    if name_el:
                        scraped_data['name'] = name_el.get_text(strip=True)
                    if headline_el:
                        scraped_data['headline'] = headline_el.get_text(strip=True)
                        
    except Exception as e:
        print(f"Scrape attempt failed or profile is private: {e}")
        # Mute exception per requirements: "skip silently and continue with CV data only"
        pass
        
    # Merge scraped data with Candidate Profile (CV takes priority)
    result = await session.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    merged = False
    if profile:
        # Update only if profile doesn't have it yet since CV takes priority
        if not profile.headline and scraped_data.get('headline'):
            profile.headline = scraped_data['headline']
            merged = True
        
        if merged:
            session.add(profile)
            await session.commit()
            
    return {
        "scraped_data": scraped_data,
        "merged": merged
    }
