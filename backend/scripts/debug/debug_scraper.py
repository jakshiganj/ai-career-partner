import requests
from bs4 import BeautifulSoup

def test_topjobs():
    url = "http://topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=SD" # Functional Area: Software Development
    print(f"Fetching {url}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            # TopJobs structure is often messy, let's look for any job links or rows
            # This is a guess at their structure based on common patterns
            rows = soup.find_all('tr')
            print(f"Found {len(rows)} table rows.")
            
            # Based on output, Row 8 is header, Rows 9+ are data
            # Header: #, Job Ref No, Position and Employer, Job Description, ...
            
            job_rows = rows[9:]
            print(f"Found {len(job_rows)} job rows.")
            
            for i, row in enumerate(job_rows[:5]): # Check first 5 items
                cols = row.find_all('td')
                print(f"\n--- Job {i+1} ---")
                # Print each cell's text to understand mapping
                for idx, col in enumerate(cols):
                    # Clean up text
                    text = col.get_text(" | ", strip=True) 
                    print(f"Col {idx}: {text[:100]}")
                    
                # Try to guess specific fields from Col 2 (Position and Employer?)
                if len(cols) > 2:
                    # Often TopJobs puts Title <br> Company in one cell, or separate <h1>/<h2>
                    # Let's print raw HTML of the interesting column (likely index 2 or 3)
                    print(f"HTML of Col 2: {str(cols[2])[:300]}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_topjobs()
