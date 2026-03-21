# AI Partner for Career Development — Feature Specification
> Hand this file to Claude Code to implement features on top of the existing multi-agent architecture described in the PID.

---

## Project Context
A multi-agent career development platform built with:
- **Orchestration:** Google ADK (LangGraph Coordinator Agent)
- **Frontend:** Next.js (Voice & Text interaction)
- **Database:** PostgreSQL (persistent candidate state), Neo4j (GraphRAG / ESCO ontology)
- **AI Models:** Gemini 2.5 Flash (text + native audio)
- **Communication:** A2A Protocol between agents
- **Privacy:** Client-side PII redaction via Transformers.js

---

## Core Architecture: Master Orchestrator Pipeline

### Overview
All features must be executable both **individually** (user triggers a single feature from the UI) and as part of a **single end-to-end pipeline** managed by the `MasterOrchestratorAgent`. When a user uploads a CV and a target job description, the orchestrator should be able to run the entire career development workflow automatically without further user input.

### MasterOrchestratorAgent

**File:** `agents/master_orchestrator_agent.py`

The `MasterOrchestratorAgent` is a `CoordinatorAgent` built on Google ADK that manages the full pipeline. It maintains a shared `PipelineState` object persisted in PostgreSQL and delegates tasks to specialist agents via the A2A protocol.

#### Full Pipeline Execution Order

```
Stage 1 — INGEST
  └── LinkedInImportAgent (if LinkedIn URL provided) OR CVParserAgent (if PDF uploaded)
        Output: structured CandidateProfile

Stage 2 — ANALYSE  [parallel execution using ADK ParallelAgent]
  ├── ATSScorerAgent         → ats_score, ats_breakdown
  ├── GraphRAGAgent          → skill_gaps, skill_match_score
  └── MarketConnectorAgent   → market_trends, salary_benchmarks

Stage 3 — OPTIMISE  [sequential execution using ADK SequentialAgent]
  ├── CVCriticAgent          → cv_critique        (depends on: skill_gaps from Stage 2)
  ├── CVCreatorAgent         → optimised_cv       (depends on: cv_critique)
  └── CoverLetterAgent       → cover_letter       (depends on: optimised_cv + job description)

Stage 4 — CLASSIFY
  └── JobClassifierAgent     → job_tier, missing_skills
        (depends on: skill_match_score from Stage 2)

Stage 5 — ROADMAP
  └── RoadmapAgent           → skill_roadmap, resource_recommendations
        (depends on: skill_gaps from Stage 2 + missing_skills from Stage 4)

Stage 6 — INTERVIEW PREP
  └── InterviewCoachHandler  → interview_question_bank
        (depends on: GraphRAGAgent output from Stage 2 + job_tier from Stage 4)

Stage 7 — PERSIST & NOTIFY
  └── DigestAgent            → saves full PipelineState to PostgreSQL, triggers email if opted in
```

#### PipelineState Schema
The orchestrator maintains this shared state object throughout execution, persisted in the `pipeline_runs` table:

```python
class PipelineState(BaseModel):
    pipeline_id: str
    user_id: str
    status: Literal["running", "completed", "failed", "partial"]
    current_stage: int
    cv_raw: str
    job_description: str
    candidate_profile: dict | None
    ats_score: int | None
    ats_breakdown: dict | None
    skill_gaps: list[str] | None
    skill_match_score: float | None
    market_trends: dict | None
    salary_benchmarks: dict | None
    cv_critique: str | None
    optimised_cv: str | None
    cover_letter: str | None
    job_tier: Literal["Realistic", "Stretch", "Reach"] | None
    missing_skills: list[str] | None
    skill_roadmap: list[dict] | None
    interview_question_bank: list[str] | None
    created_at: datetime
    completed_at: datetime | None
    error_log: list[str]
```

#### Orchestrator Behaviour Rules
- **Parallel stages:** Stage 2 agents run concurrently using ADK's `ParallelAgent` primitive to minimise total pipeline latency
- **Sequential stages:** Stage 3 agents run in strict order using ADK's `SequentialAgent` primitive, passing output forward via `PipelineState`
- **Failure isolation:** If any single specialist agent fails, the orchestrator logs the error in `error_log`, sets that field to `None`, and continues to the next stage rather than terminating the whole pipeline
- **Stage skipping:** If a stage's required dependency is `None` due to a prior failure, the orchestrator skips that stage and records it in `error_log`
- **Resumability:** If a pipeline is interrupted, the orchestrator can resume from the last completed stage using the `pipeline_id` and `current_stage` stored in PostgreSQL
- **Individual trigger:** Every specialist agent must also expose a standalone A2A endpoint so the frontend can invoke it independently without running the full pipeline (e.g., user regenerates only the cover letter)
- **Max iterations:** All loop-based agents must have `max_iterations=3` set to prevent infinite loops

#### Orchestrator API Endpoints
```
POST   /api/pipeline/start
Body:  { user_id, cv_text, job_description, options: { run_interview_prep: bool, tone: string } }
Response: { pipeline_id, status: "running" }

GET    /api/pipeline/:pipeline_id/status
Response: { status, current_stage, completed_stages, error_log }

GET    /api/pipeline/:pipeline_id/result
Response: full PipelineState object

POST   /api/pipeline/:pipeline_id/resume
Response: { pipeline_id, resumed_from_stage, status: "running" }
```

The frontend must poll `/api/pipeline/:id/status` every 2 seconds during active runs and update the UI progressively as each stage completes. Do not block the entire UI waiting for full pipeline completion.

---

## PostgreSQL Database Schema

Create all tables below in PostgreSQL. Use UUIDs for all primary keys. All user-owned tables require `user_id` as a foreign key. Enable Row Level Security (RLS) on every table so users can only read and write their own rows.

```sql
-- Candidate profiles
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  headline TEXT,
  skills TEXT[],
  experience JSONB,
  education JSONB,
  certifications JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CV versions (written at end of Stage 3)
CREATE TABLE cv_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  cv_text TEXT NOT NULL,
  ats_score INTEGER,
  match_score FLOAT,
  job_target TEXT,
  pipeline_id UUID REFERENCES pipeline_runs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline runs (single source of truth for orchestrator state)
CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  current_stage INTEGER DEFAULT 0,
  state_json JSONB NOT NULL,
  error_log TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Job matches (written at end of Stage 4)
CREATE TABLE job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES pipeline_runs(id),
  job_title TEXT,
  company TEXT,
  match_score FLOAT,
  tier TEXT CHECK (tier IN ('Realistic', 'Stretch', 'Reach')),
  missing_skills TEXT[],
  salary_min INTEGER,
  salary_max INTEGER,
  job_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary benchmarks (populated by MarketConnectorAgent scraper)
CREATE TABLE salary_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_title TEXT NOT NULL,
  experience_level TEXT,
  location TEXT,
  salary_min INTEGER,
  salary_median INTEGER,
  salary_max INTEGER,
  currency TEXT DEFAULT 'LKR',
  source_url TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview sessions (written after Stage 6 scoring)
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES pipeline_runs(id),
  question_bank JSONB,
  answers JSONB,
  scores JSONB,
  overall_score FLOAT,
  completed_at TIMESTAMPTZ
);

-- Skill roadmaps (written at end of Stage 5)
CREATE TABLE skill_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES pipeline_runs(id),
  roadmap JSONB NOT NULL,
  target_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_digest_enabled BOOLEAN DEFAULT TRUE,
  preferred_tone TEXT DEFAULT 'formal',
  target_role TEXT,
  expected_salary INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Feature 1: Authentication & Profile Ingestion
**Priority:** High
**Pipeline Stage:** 1 — INGEST
**Agent:** `CVParserAgent`

### Overview
Authentication is handled via **LinkedIn OpenID Connect** (approved instantly, no review required). This gives you the user's name, email, and profile photo to pre-fill their account. The actual career data (work experience, skills, education) comes from a CV PDF upload or optional LinkedIn URL scrape — not the LinkedIn API.

### Part A: LinkedIn Login (OpenID Connect)

**Setup steps:**
1. Go to linkedin.com/developers and create an app
2. On the **Products** tab, request **"Sign In with LinkedIn using OpenID Connect"** — approved instantly
3. On the **Auth** tab, copy your `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`
4. Add redirect URL: `http://localhost:3000/api/auth/linkedin/callback`
5. Add to `.env.local`:
```
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/auth/linkedin/callback
```

**What OpenID Connect gives you:** name, email, profile photo. Nothing else.

**Auth flow:**
1. User clicks "Sign in with LinkedIn" on the landing page
2. LinkedIn OAuth redirects back to your callback URL with an auth code
3. Exchange auth code for an access token, then call `https://api.linkedin.com/v2/userinfo` to get name + email
4. Upsert user into `users` table in PostgreSQL using email as the unique key
5. Create a session (JWT) and redirect user to onboarding if new, or dashboard if returning

**Implementation files:**
```
api/auth/linkedin/route.ts              — initiates OAuth, redirects to LinkedIn
api/auth/linkedin/callback/route.ts     — exchanges code for token, upserts user, sets session JWT
lib/linkedin-auth.ts                    — helper to call /v2/userinfo and parse response
frontend/components/LinkedInLoginButton.tsx — "Sign in with LinkedIn" button (landing page)
```

---

### Part B: CV Upload (Primary Career Data Source)

After login, user lands on onboarding and uploads their CV as a PDF. This is the primary source of career data fed into the pipeline.

**Requirements:**
- Upload UI accepts PDF only, max 5MB
- Client-side PII redaction via Transformers.js runs before the file is sent to the backend (strips emails, phone numbers)
- `CVParserAgent` extracts: work experience, education, skills, certifications and maps them into the `CandidateProfile` schema
- Parsed profile is upserted into `candidate_profiles` table in PostgreSQL
- User can re-upload a new CV at any time from the dashboard, which triggers a new pipeline run

**Implementation files:**
```
agents/cv_parser_agent.py               — PDF text extraction + structured profile mapping via Gemini
frontend/components/CVUpload.tsx        — drag-and-drop PDF uploader with PII redaction step
api/cv/upload/route.ts                  — receives redacted CV text, triggers CVParserAgent via A2A
```

---

### Part C: LinkedIn URL Scrape (Optional Supplementary Data)

Optionally, the user can paste their public LinkedIn profile URL. The system scrapes publicly visible fields to supplement the CV data.

**Requirements:**
- Input field on onboarding: "Paste your LinkedIn profile URL (optional)"
- Scrape publicly visible fields only: name, headline, current company, skills section (if public)
- Merge scraped data with CV data in `candidate_profiles` — CV data takes priority if there is a conflict
- If the profile is private or the scrape fails, skip silently and continue with CV data only
- Do not store the LinkedIn URL itself in the database

**Implementation files:**
```
lib/linkedin-scraper.ts                 — public profile scraper using Cheerio or Playwright
api/linkedin/scrape/route.ts            — receives URL, returns scraped fields, merges with profile
frontend/components/LinkedInURLInput.tsx — optional URL input field on onboarding screen
```

---

## Feature 2: CV Version History
**Priority:** Medium
**Pipeline Stage:** Written automatically at end of Stage 3 (OPTIMISE) by the orchestrator
**Agent:** Handled by `MasterOrchestratorAgent` at persist step

### Requirements
- Every time Stage 3 produces a new `optimised_cv`, the orchestrator saves it as a new row in `cv_versions`, auto-incrementing `version_number` per user
- Display a vertical timeline on the dashboard showing all versions with their ATS score and match score
- Allow users to view a diff between any two selected versions (additions highlighted green, removals highlighted red)
- Allow users to restore a previous version — this re-triggers the pipeline from Stage 3 onwards using that version's CV text

### Implementation Files
```
frontend/components/CVTimeline.tsx      — visual version timeline
frontend/components/CVDiff.tsx          — diff viewer (use diff-match-patch library)
api/cv-versions/route.ts               — GET /cv-versions/:user_id, POST /cv-versions/restore/:id
```

---

## Feature 3: ATS Score Predictor
**Priority:** High
**Pipeline Stage:** 2 — ANALYSE (runs in parallel with GraphRAGAgent and MarketConnectorAgent)
**Agent:** `ATSScorerAgent`

### Requirements
- Calculate an ATS score (0–100) based on:
  - Keyword match rate against the target job description
  - Presence of standard section headings (Experience, Education, Skills)
  - Absence of ATS-unfriendly formatting (tables, columns, images — detect via CV parse)
  - Date formatting consistency
- Return a structured `ats_breakdown` dict with a score per category
- For each category scoring below 70, return one specific actionable fix
- Score is stored in `pipeline_runs.state_json` and also written to `cv_versions.ats_score` at end of Stage 3

### Implementation Files
```
agents/ats_scorer_agent.py              — specialist agent, extends BaseAgent
schemas/ats_score.py                    — Pydantic model for ats_breakdown
frontend/components/ATSScoreCard.tsx    — radial progress chart with per-category breakdown
```

---

## Feature 4: Cover Letter Generator
**Priority:** High
**Pipeline Stage:** 3 — OPTIMISE (final step, runs after CVCreatorAgent)
**Agent:** `CoverLetterAgent`

### Requirements
- Generates a cover letter using: `optimised_cv` from Stage 3 + original `job_description` + `user_preferences.preferred_tone`
- Cover letter must: address the specific company and role, map the candidate's top 3 relevant experiences to job requirements, be 250–350 words
- Tone options: Formal / Conversational / Creative
- User can trigger standalone regeneration from the dashboard (calls `CoverLetterAgent` directly via A2A without re-running the full pipeline)
- Output is exportable as `.docx` or copyable as plain text

### Implementation Files
```
agents/cover_letter_agent.py            — specialist agent, extends BaseAgent
frontend/components/CoverLetterEditor.tsx — editable output with tone selector + export button
api/cover-letter/regenerate/route.ts    — standalone regeneration endpoint
```

---

## Feature 5: "Reach vs. Realistic" Job Classifier
**Priority:** Medium
**Pipeline Stage:** 4 — CLASSIFY (depends on `skill_match_score` from Stage 2)
**Agent:** `JobClassifierAgent`

### Requirements
- Assign a tier to each matched job based on `skill_match_score` from GraphRAGAgent:
  - 🟢 **Realistic** — score ≥ 0.80
  - 🟡 **Stretch** — score 0.50–0.79
  - 🔴 **Reach** — score < 0.50
- Store result in `job_matches` table including `tier` and `missing_skills`
- Display tier badge on each job card in the UI
- Tooltip on Stretch/Reach cards lists the specific missing skills

### Implementation Files
```
agents/job_classifier_agent.py          — extends GraphRAGAgent output, writes to job_matches
frontend/components/JobCard.tsx         — tier badge + missing skills tooltip
```

---

## Feature 6: Salary Benchmarking
**Priority:** Medium
**Pipeline Stage:** 2 — ANALYSE (extension of existing MarketConnectorAgent)
**Agent:** `MarketConnectorAgent` (extend existing)

### Requirements
- Extend the existing `MarketConnectorAgent` scraper to also extract salary data from topjobs.lk job listings
- Store aggregated salary data in `salary_benchmarks` table (upsert on role_title + experience_level + location)
- During Stage 2, fetch the salary range for the target role and attach to `PipelineState.salary_benchmarks`
- On the job match results page, display min / median / max salary range for each matched role
- If `user_preferences.expected_salary` is set, show a visual marker on the salary bar indicating where the candidate falls

### Implementation Files
```
agents/market_connector_agent.py        — extend existing scraper to extract salary fields
lib/salary_scraper.py                   — salary extraction and aggregation logic
frontend/components/SalaryBenchmark.tsx — salary range bar with candidate marker
```

---

## Feature 7: Post-Interview Scoring & Breakdown
**Priority:** High
**Pipeline Stage:** 6 — INTERVIEW PREP (post-session, after InterviewCoachHandler completes)
**Agent:** `InterviewScorerAgent`

### Requirements
- After each mock interview session, score each answer across four dimensions (0–10 each):
  - **Relevance** — did the answer address the question?
  - **Clarity** — was it well-structured and easy to follow?
  - **Depth** — did it demonstrate genuine knowledge or experience?
  - **STAR Compliance** — for behavioural questions, did it follow Situation → Task → Action → Result?
- Calculate an overall session score (average across all answers and all dimensions)
- Save full scoring results to `interview_sessions` table in PostgreSQL
- Display a radar/spider chart of the four dimensions on the post-session report page
- Include one improvement tip per dimension
- Show score trend across historical sessions on the dashboard (improving / declining)

### Implementation Files
```
agents/interview_scorer_agent.py        — post-session scoring agent, extends BaseAgent
schemas/interview_score.py              — Pydantic model for scores_json structure
frontend/components/InterviewReport.tsx — radar chart (Recharts), per-answer breakdown
frontend/components/InterviewTrend.tsx  — line chart showing overall score trend over time
```

---

## Feature 8: Visual Skill Gap Roadmap
**Priority:** Medium
**Pipeline Stage:** 5 — ROADMAP (depends on Stage 2 `skill_gaps` and Stage 4 `missing_skills`)
**Agent:** `RoadmapAgent`

### Requirements
- `RoadmapAgent` receives `skill_gaps` from GraphRAGAgent and `missing_skills` from JobClassifierAgent
- Generates an ordered learning path: skills that unblock the most job requirements are listed first
- Each roadmap step includes: skill name, why it is needed (linked to specific job requirements), estimated learning time, 2–3 free resource links (Coursera, YouTube, official docs)
- Saved to `skill_roadmaps` table in PostgreSQL
- Visualised as a vertical stepper on the dashboard — steps corresponding to skills already on the CV are shown as completed/ticked
- Roadmap auto-updates when a new pipeline run completes

### Implementation Files
```
agents/roadmap_agent.py                 — resource recommendation via Gemini, extends BaseAgent
frontend/components/SkillRoadmap.tsx    — vertical stepper with completion state per step
api/roadmap/route.ts                    — GET latest roadmap for the authenticated user
```

---

## Feature 9: Candidate Dashboard
**Priority:** High
**Pipeline Stage:** Reads from all pipeline stages (display layer only)

### Requirements
A unified home screen showing live pipeline state and all historical results. Sections:

- **Pipeline Status** — live progress indicator showing current stage when a pipeline is running, with per-stage status dots (pending / running / complete / failed)
- **CV Health** — latest ATS score, version number, last updated date, quick link to re-optimise
- **Job Matches** — top 3 current matches with tier badges and salary ranges
- **Interview Readiness** — last session overall score and trend direction arrow
- **Skill Progress** — number of roadmap steps completed vs total
- **Next Actions** — 3 AI-generated recommended next steps based on current `PipelineState`, generated by `MasterOrchestratorAgent` at end of Stage 7

All data is fetched via a single aggregated `/api/dashboard/:user_id` endpoint that joins the relevant PostgreSQL tables in one query. The frontend polls `/api/pipeline/:id/status` every 2 seconds while a pipeline is actively running and stops polling when status is `completed` or `failed`.

### Implementation Files
```
frontend/app/dashboard/page.tsx                       — main dashboard page
frontend/components/dashboard/PipelineProgress.tsx    — live stage progress bar
frontend/components/dashboard/CVHealthCard.tsx
frontend/components/dashboard/JobMatchesCard.tsx
frontend/components/dashboard/InterviewReadinessCard.tsx
frontend/components/dashboard/SkillProgressCard.tsx
frontend/components/dashboard/NextActionsCard.tsx
api/dashboard/route.ts                                — aggregated single-query endpoint
```

---

## Feature 10: Weekly Progress Digest (Email)
**Priority:** Low
**Pipeline Stage:** 7 — PERSIST & NOTIFY (triggered by DigestAgent)
**Agent:** `DigestAgent`

### Requirements
- Triggered every Monday morning via a PostgreSQL `pg_cron` job
- `DigestAgent` queries PostgreSQL to compile per-user: CV match score delta vs last week, number of interview sessions completed, top skill gap to focus on, 2 new job matches from the most recent pipeline run
- Email sent only to users where `user_preferences.email_digest_enabled = TRUE`
- Use Resend for email delivery
- User can toggle opt-in/out from the profile settings page, which updates `user_preferences` via PATCH endpoint

### Implementation Files
```
agents/digest_agent.py                  — weekly summary compiler, extends BaseAgent
lib/email.ts                            — Resend API wrapper
sql/cron_digest.sql                     — pg_cron job definition
frontend/components/EmailPreferences.tsx — opt-in toggle in profile settings
api/preferences/route.ts               — PATCH endpoint for user_preferences table
```

---

## Notes for Claude Code

### Orchestrator Rules
- `MasterOrchestratorAgent` is the **only** agent allowed to write to `pipeline_runs.state_json` — specialist agents return their output to the orchestrator via A2A response; they do not write to the database directly
- Use ADK `ParallelAgent` for Stage 2 (ATSScorerAgent + GraphRAGAgent + MarketConnectorAgent run concurrently)
- Use ADK `SequentialAgent` for Stage 3 (CVCriticAgent → CVCreatorAgent → CoverLetterAgent run in strict order)
- Set `max_iterations=3` on all loop-based agents to prevent infinite loops
- Every specialist agent must expose a standalone A2A endpoint in addition to being callable from the orchestrator

### Database Rules
- Use **PostgreSQL** for all persistent storage — do not use any other database for application data
- All user-owned tables must have `user_id UUID REFERENCES users(id)` as a foreign key
- Enable Row Level Security (RLS) on every table
- Use `JSONB` columns for variable-structure data (scores, roadmap steps, pipeline state)
- Use `pg_cron` for the weekly digest scheduled job

### Frontend Rules
- All components use Tailwind CSS
- Charts: use Recharts — radar chart for interview scores, line chart for score trends, radial/circular for ATS score
- Poll `/api/pipeline/:id/status` every 2 seconds during active pipeline runs; stop polling on `completed` or `failed`
- Render dashboard widgets progressively as pipeline stages complete — do not block the full UI

### Privacy Rules
- Any feature processing raw CV text must route through the Transformers.js PII redaction pipeline **client-side** before sending to any backend agent
- No raw PII should ever be stored in `pipeline_runs.state_json` — store only redacted text
- All API routes must validate the user's session token and confirm `user_id` ownership before returning any data