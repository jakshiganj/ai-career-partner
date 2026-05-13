# System Design Diagrams
## AI Partner for Career Development

This document contains all UML and architectural diagrams for the final report submission.

---

## 1. System Architecture Diagram

```mermaid
graph TB
    subgraph CLIENT["Client Layer (Browser)"]
        direction TB
        UI["React + Vite SPA"]
        PII["PII Worker<br/>(Transformers.js)"]
        AW["Audio Worklet<br/>(Interview)"]
        UI --> PII
        UI --> AW
    end

    subgraph API["API Gateway (FastAPI)"]
        direction TB
        AUTH["Auth Router<br/>(JWT + OAuth2)"]
        CVR["CV Router"]
        DASH["Dashboard Router"]
        PIPE["Pipeline Router"]
        INTV["Interview Router<br/>(WebSocket)"]
        ROAD["Roadmap Router"]
        PAY["Payment Router<br/>(Stripe)"]
    end

    subgraph ORCHESTRATOR["LangGraph Orchestrator"]
        direction LR
        SG["StateGraph<br/>(AgentState)"]
        CP["PostgresSaver<br/>(Checkpointer)"]
        SG --> CP
    end

    subgraph AGENTS["Multi-Agent Layer"]
        direction TB
        CVP["CV Parser Agent"]
        ATS["ATS Scorer Agent"]
        GRA["GraphRAG Agent"]
        MTA["Market Trends Agent"]
        JCA["Job Classifier Agent"]
        CVC["CV Critique Agent"]
        CLA["Cover Letter Agent"]
        RMA["Roadmap Agent"]
        IPA["Interview Prep Agent"]
        ISA["Interview Scorer Agent"]
        DGA["Digest Agent"]
    end

    subgraph SERVICES["Service Layer"]
        direction TB
        DS["Dashboard Service"]
        PS["Pipeline Service"]
        PP["Pipeline Persistence"]
        IS["Interview Service"]
        ES["Email Service"]
    end

    subgraph DATA["Data Layer"]
        direction TB
        PG["PostgreSQL<br/>(SQLModel + Alembic)"]
        PGV["pgvector<br/>(ESCO Embeddings)"]
        NEO["Neo4j<br/>(Knowledge Graph)"]
        PG --- PGV
    end

    subgraph EXTERNAL["External Services"]
        direction TB
        GEM["Gemini 2.5 Flash<br/>(LLM)"]
        EMB["text-embedding-004<br/>(Embeddings)"]
        LIVE["Gemini Live API<br/>(Multimodal Interview)"]
        STR["Stripe API"]
        SUP["Supabase Auth"]
    end

    CLIENT -- "HTTPS / REST" --> API
    CLIENT -- "WSS" --> INTV
    API --> SERVICES
    API --> ORCHESTRATOR
    ORCHESTRATOR --> AGENTS
    AGENTS --> DATA
    AGENTS --> EXTERNAL
    SERVICES --> DATA
    SERVICES --> EXTERNAL

    style CLIENT fill:#1a1a2e,stroke:#e94560,color:#fff
    style API fill:#16213e,stroke:#0f3460,color:#fff
    style ORCHESTRATOR fill:#0f3460,stroke:#533483,color:#fff
    style AGENTS fill:#533483,stroke:#e94560,color:#fff
    style SERVICES fill:#1a1a2e,stroke:#0f3460,color:#fff
    style DATA fill:#16213e,stroke:#533483,color:#fff
    style EXTERNAL fill:#0f3460,stroke:#e94560,color:#fff
```

---

## 2. Use Case Diagrams (Modular)

### 2.1 Identity & CV Management
*Focus: Privacy-first ingestion and data protection.*

```mermaid
graph LR
    U(("👤 Job Seeker"))
    
    subgraph UC_CV["CV & Privacy Module"]
        UC4["Upload CV"]
        UC5["Redact PII Locally"]
        UC6["Parse CV Content"]
        UC7["View CV Versions"]
        UC8["Download Optimised CV"]
    end

    U --> UC4
    U --> UC7
    U --> UC8
    UC4 -.->|"includes"| UC5
    UC5 -.->|"includes"| UC6
    
    style UC_CV fill:#16213e,stroke:#0f3460,color:#fff
```

### 2.2 The Intelligent Career Pipeline
*Focus: LangGraph-driven analysis and multi-agent orchestration.*

```mermaid
graph LR
    U(("👤 Job Seeker"))
    SYS(("🤖 AI System"))

    subgraph UC_PIPELINE["AI Pipeline Module"]
        UC9["Start Analysis Pipeline"]
        UC10["Score ATS Compatibility"]
        UC11["Analyse Market Trends"]
        UC12["Classify Job Tier"]
        UC13["Critique CV"]
        UC14["Generate Cover Letter"]
    end

    U --> UC9
    UC9 -.->|"includes"| UC10
    UC9 -.->|"includes"| UC11
    UC9 -.->|"includes"| UC12
    UC9 -.->|"includes"| UC13
    UC9 -.->|"includes"| UC14

    SYS --> UC10
    SYS --> UC11
    SYS --> UC12
    SYS --> UC13
    SYS --> UC14
    
    style UC_PIPELINE fill:#0f3460,stroke:#533483,color:#fff
```

### 2.3 Skill Development & Interviewing
*Focus: Career progression and multimodal practicing.*

```mermaid
graph LR
    U(("👤 Job Seeker"))
    SYS(("🤖 AI System"))

    subgraph UC_DEV["Development Module"]
        UC15["Generate Skill Roadmap"]
        UC24["Chat with AI Agent"]
        UC25["Request Career Roadmap"]
        UC26["Get GraphRAG Insights"]
        UC20["Start Mock Interview"]
        UC21["Real-time Voice Interaction"]
        UC22["View Interview Report"]
    end

    U --> UC15
    U --> UC20
    U --> UC22
    U --> UC24
    
    UC20 -.->|"includes"| UC21
    UC24 -.->|"extends"| UC26
    UC24 -.->|"includes"| UC25

    SYS --> UC15
    SYS --> UC21
    SYS --> UC26
    
    style UC_DEV fill:#533483,stroke:#e94560,color:#fff
```

### 2.4 Dashboard & Platform Services
*Focus: Analytics, market insights, and subscription.*

```mermaid
graph LR
    U(("👤 Job Seeker"))

    subgraph UC_PLATFORM["Platform Services"]
        UC16["View Job Matches"]
        UC17["View Salary Benchmarks"]
        UC18["Track Skill Progress"]
        UC27["Subscribe to Premium"]
        UC28["Manage Billing"]
    end

    U --> UC16
    U --> UC17
    U --> UC18
    U --> UC27
    U --> UC28
    
    style UC_PLATFORM fill:#1a1a2e,stroke:#0f3460,color:#fff
```

---

## 3. Class Diagram

```mermaid
classDiagram
    direction TB

    class User {
        +UUID id
        +String email
        +String full_name
        +Boolean is_active
        +String tier
        +String auth_provider
        +String stripe_customer_id
        +String stripe_subscription_id
        +String password_hash
        +DateTime created_at
        +String reset_token
        +DateTime reset_token_expires
    }

    class CandidateProfile {
        +UUID id
        +UUID user_id
        +String headline
        +String summary
        +List~String~ skills
        +List~Dict~ experience
        +List~Dict~ education
        +List~Dict~ certifications
        +Int experience_years
        +String career_goals
        +String linkedin_url
    }

    class PipelineRun {
        +UUID id
        +UUID user_id
        +String status
        +Int current_stage
        +Dict state_json
        +List~String~ error_log
        +DateTime created_at
        +DateTime completed_at
    }

    class JobMatch {
        +UUID id
        +UUID user_id
        +UUID pipeline_id
        +String job_title
        +String company
        +Float match_score
        +String tier
        +List~String~ missing_skills
        +Int salary_min
        +Int salary_max
        +String job_url
        +DateTime created_at
    }

    class CVVersion {
        +UUID id
        +UUID user_id
        +Int version_number
        +String cv_text
        +Int ats_score
        +Float match_score
        +String job_target
        +UUID pipeline_id
        +DateTime created_at
    }

    class InterviewSession {
        +UUID id
        +UUID user_id
        +UUID pipeline_id
        +List~String~ question_bank
        +Dict answers
        +Dict scores
        +Float overall_score
        +DateTime completed_at
    }

    class SkillRoadmap {
        +UUID id
        +UUID user_id
        +UUID pipeline_id
        +List~Dict~ roadmap
        +String target_role
        +DateTime created_at
    }

    class SalaryBenchmark {
        +UUID id
        +String role_title
        +String experience_level
        +String location
        +Int salary_min
        +Int salary_median
        +Int salary_max
        +String currency
        +String source_url
        +DateTime scraped_at
    }

    class UserPreference {
        +UUID user_id
        +Boolean email_digest_enabled
        +String preferred_tone
        +String target_role
        +Int expected_salary
        +DateTime updated_at
    }

    class TaskState {
        +UUID id
        +UUID user_id
        +TaskStatus status
        +String current_agent
        +String context_json
        +String missing_fields
        +DateTime created_at
        +DateTime updated_at
    }

    class DecisionAudit {
        +UUID id
        +UUID task_state_id
        +String agent_name
        +String decision
        +String reasoning
        +DateTime timestamp
    }

    class EscoSkill {
        +UUID id
        +String name
        +String description
        +String skill_type
        +Vector embedding
    }

    class EscoRelation {
        +UUID id
        +UUID source_skill_id
        +UUID target_skill_id
        +String relation_type
    }

    User "1" --> "1" CandidateProfile : has
    User "1" --> "0..*" PipelineRun : runs
    User "1" --> "0..*" JobMatch : receives
    User "1" --> "0..*" CVVersion : uploads
    User "1" --> "0..*" InterviewSession : attempts
    User "1" --> "0..*" SkillRoadmap : generates
    User "1" --> "1" UserPreference : configures
    User "1" --> "0..*" TaskState : owns

    PipelineRun "1" --> "0..*" JobMatch : produces
    PipelineRun "1" --> "0..*" CVVersion : versions
    PipelineRun "1" --> "0..*" InterviewSession : prepares
    PipelineRun "1" --> "0..*" SkillRoadmap : creates

    TaskState "1" --> "0..*" DecisionAudit : audits

    EscoSkill "1" --> "0..*" EscoRelation : source
    EscoSkill "1" --> "0..*" EscoRelation : target
```

---

## 4. ER Diagram (Entity Relationship)

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR email UK
        VARCHAR full_name
        BOOLEAN is_active
        VARCHAR tier
        VARCHAR auth_provider
        VARCHAR stripe_customer_id
        VARCHAR stripe_subscription_id
        VARCHAR password_hash
        TIMESTAMP created_at
        VARCHAR reset_token
        TIMESTAMP reset_token_expires
    }

    candidate_profiles {
        UUID id PK
        UUID user_id FK
        VARCHAR headline
        TEXT summary
        JSONB skills
        JSONB experience
        JSONB education
        JSONB certifications
        INT experience_years
        VARCHAR career_goals
        VARCHAR linkedin_url
    }

    pipeline_runs {
        UUID id PK
        UUID user_id FK
        VARCHAR status
        INT current_stage
        JSONB state_json
        JSONB error_log
        TIMESTAMP created_at
        TIMESTAMP completed_at
    }

    job_matches {
        UUID id PK
        UUID user_id FK
        UUID pipeline_id FK
        VARCHAR job_title
        VARCHAR company
        FLOAT match_score
        VARCHAR tier
        JSONB missing_skills
        INT salary_min
        INT salary_max
        VARCHAR job_url
        TIMESTAMP created_at
    }

    cv_versions {
        UUID id PK
        UUID user_id FK
        INT version_number
        TEXT cv_text
        INT ats_score
        FLOAT match_score
        VARCHAR job_target
        UUID pipeline_id FK
        TIMESTAMP created_at
    }

    interview_sessions {
        UUID id PK
        UUID user_id FK
        UUID pipeline_id FK
        JSONB question_bank
        JSONB answers
        JSONB scores
        FLOAT overall_score
        TIMESTAMP completed_at
    }

    skill_roadmaps {
        UUID id PK
        UUID user_id FK
        UUID pipeline_id FK
        JSONB roadmap
        VARCHAR target_role
        TIMESTAMP created_at
    }

    salary_benchmarks {
        UUID id PK
        VARCHAR role_title
        VARCHAR experience_level
        VARCHAR location
        INT salary_min
        INT salary_median
        INT salary_max
        VARCHAR currency
        VARCHAR source_url
        TIMESTAMP scraped_at
    }

    user_preferences {
        UUID user_id PK,FK
        BOOLEAN email_digest_enabled
        VARCHAR preferred_tone
        VARCHAR target_role
        INT expected_salary
        TIMESTAMP updated_at
    }

    task_states {
        UUID id PK
        UUID user_id FK
        VARCHAR status
        VARCHAR current_agent
        TEXT context_json
        TEXT missing_fields
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    decision_audits {
        UUID id PK
        UUID task_state_id FK
        VARCHAR agent_name
        VARCHAR decision
        TEXT reasoning
        TIMESTAMP timestamp
    }

    esco_skills {
        UUID id PK
        VARCHAR name
        TEXT description
        VARCHAR skill_type
        VECTOR_768 embedding
    }

    esco_relations {
        UUID id PK
        UUID source_skill_id FK
        UUID target_skill_id FK
        VARCHAR relation_type
    }

    users ||--|| candidate_profiles : "has profile"
    users ||--o{ pipeline_runs : "initiates"
    users ||--o{ job_matches : "receives"
    users ||--o{ cv_versions : "uploads"
    users ||--o{ interview_sessions : "participates in"
    users ||--o{ skill_roadmaps : "follows"
    users ||--|| user_preferences : "configures"
    users ||--o{ task_states : "owns"

    pipeline_runs ||--o{ job_matches : "produces"
    pipeline_runs ||--o{ cv_versions : "generates"
    pipeline_runs ||--o{ interview_sessions : "prepares"
    pipeline_runs ||--o{ skill_roadmaps : "creates"

    task_states ||--o{ decision_audits : "records"

    esco_skills ||--o{ esco_relations : "is source of"
    esco_skills ||--o{ esco_relations : "is target of"
```

---

## 5. LangGraph Pipeline Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as React Frontend
    participant PII as PII Worker
    participant API as FastAPI
    participant LG as LangGraph Orchestrator
    participant CVP as CV Parser Agent
    participant ATS as ATS Scorer Agent
    participant GRA as GraphRAG Agent
    participant MTA as Market Trends Agent
    participant JCA as Job Classifier Agent
    participant CVC as CV Critique Agent
    participant CLA as Cover Letter Agent
    participant RMA as Roadmap Agent
    participant IPA as Interview Prep Agent
    participant DB as PostgreSQL
    participant GEM as Gemini 2.5 Flash

    User->>FE: Upload CV + Job Description
    FE->>PII: Send raw CV text
    PII->>PII: NER Redaction (BERT-NER)
    PII->>PII: Regex Redaction (Email/Phone)
    PII-->>FE: Redacted CV

    FE->>API: POST /pipeline/start
    API->>LG: invoke(AgentState)

    Note over LG: Stage 1 - Ingest
    LG->>LG: Validate inputs

    Note over LG: Stage 2 - Analyse (Parallel)
    LG->>CVP: Parse CV
    CVP->>GEM: Extract structured data
    GEM-->>CVP: Profile JSON
    LG->>ATS: Score ATS
    ATS->>GEM: Evaluate ATS compatibility
    GEM-->>ATS: ATS Score + Breakdown
    LG->>GRA: Fetch skill context
    GRA->>DB: Hybrid Search (Vector + FTS)
    DB-->>GRA: ESCO Skills + Relations
    LG->>MTA: Analyse market
    MTA->>GEM: Market analysis prompt
    GEM-->>MTA: Trends + Hot Skills

    Note over LG: Stage 3 - Optimise
    LG->>CVC: Critique CV
    CVC->>GEM: Generate critique
    GEM-->>CVC: Feedback
    LG->>CLA: Generate cover letter
    CLA->>GEM: Cover letter prompt
    GEM-->>CLA: Cover letter

    Note over LG: Stage 4 - Classify
    LG->>JCA: Classify job tier
    JCA-->>LG: Realistic / Stretch / Reach

    Note over LG: Stage 5 - Roadmap
    LG->>RMA: Generate skill roadmap
    RMA->>GEM: Roadmap prompt
    GEM-->>RMA: Phased roadmap

    Note over LG: Stage 6 - Interview Prep
    LG->>IPA: Generate question bank
    IPA->>GEM: Interview questions prompt
    GEM-->>IPA: Question bank

    Note over LG: Stage 7 - Persist
    LG->>DB: Save PipelineRun + JobMatches + Roadmap

    LG-->>API: Completed AgentState
    API-->>FE: Pipeline results
    FE-->>User: Career Dashboard
```

---

## 6. Component Diagram (Frontend)

```mermaid
graph TB
    subgraph PAGES["Pages"]
        LP["Landing Page"]
        AP["Auth Page"]
        DP["Dashboard Page"]
        IP["Interview Page"]
    end

    subgraph COMPONENTS["UI Components"]
        direction TB
        subgraph AUTH_C["Auth Components"]
            LF["LoginForm"]
            RF["RegisterForm"]
            GA["GoogleAuthButton"]
        end
        subgraph CV_C["CV Components"]
            CU["CVUploader"]
            CV["CVViewer"]
        end
        subgraph DASH_C["Dashboard Components"]
            JC["JobCard"]
            SM["SkillMatrix"]
            SB["SalaryBenchmark"]
            PR["ProgressRing"]
            IR["InterviewReport"]
        end
        subgraph INT_C["Interview Components"]
            IS["InterviewSession"]
            AC["AudioControls"]
            TL["TranscriptLog"]
        end
        subgraph CAREER_C["Career Components"]
            RC["RoadmapChat"]
            RM["RoadmapTimeline"]
        end
    end

    subgraph HOOKS["Custom Hooks"]
        UAP["useAgentPipeline"]
        UDD["useDashboardData"]
        UIA["useInterviewAudio"]
        URD["useRoadmapData"]
    end

    subgraph WORKERS["Web Workers"]
        PIW["PII Worker<br/>(Transformers.js + Regex)"]
    end

    subgraph API_LAYER["API Layer"]
        AC2["auth.ts"]
        CC["cv.ts"]
        DC["dashboard.ts"]
        PC["pipeline.ts"]
        RCC["roadmap.ts"]
        CL["client.ts<br/>(Axios Instance)"]
    end

    LP --> AP
    AP --> AUTH_C
    DP --> CV_C
    DP --> DASH_C
    DP --> CAREER_C
    IP --> INT_C

    CV_C --> PIW
    DASH_C --> UDD
    INT_C --> UIA
    CAREER_C --> URD
    CV_C --> UAP

    HOOKS --> API_LAYER
    API_LAYER --> CL

    style PAGES fill:#1a1a2e,stroke:#e94560,color:#fff
    style COMPONENTS fill:#16213e,stroke:#0f3460,color:#fff
    style HOOKS fill:#0f3460,stroke:#533483,color:#fff
    style WORKERS fill:#533483,stroke:#e94560,color:#fff
    style API_LAYER fill:#1a1a2e,stroke:#0f3460,color:#fff
```

---

## 7. GraphRAG Hybrid Retrieval Flow

```mermaid
graph LR
    Q["Skill Query<br/>(e.g. 'Kubernetes')"] --> EMB["Gemini<br/>text-embedding-004"]
    Q --> FTS["Full-Text Search<br/>(PostgreSQL tsvector)"]

    EMB --> VS["Vector Search<br/>(pgvector cosine)"]

    VS --> RRF["Reciprocal Rank Fusion<br/>(k=60)"]
    FTS --> RRF

    RRF --> BASE["Top-K Base Skills<br/>(ESCO Taxonomy)"]
    BASE --> CTE["Recursive CTE<br/>(Depth = 2)"]
    CTE --> GRAPH["Knowledge Graph<br/>Context"]

    GRAPH --> AGENT["GraphRAG Agent<br/>(Gemini 2.5 Flash)"]
    AGENT --> RESPONSE["Contextual Career<br/>Insights"]

    style Q fill:#e94560,stroke:#fff,color:#fff
    style RRF fill:#533483,stroke:#fff,color:#fff
    style GRAPH fill:#0f3460,stroke:#fff,color:#fff
    style RESPONSE fill:#16213e,stroke:#e94560,color:#fff
```

---

## 8. Deployment Diagram

```mermaid
graph TB
    subgraph BROWSER["User Browser"]
        SPA["React SPA<br/>(Vite Build)"]
        WW["Web Worker<br/>(BERT-NER ONNX)"]
    end

    subgraph DOCKER["Docker Compose"]
        subgraph BACKEND["Backend Container"]
            FA["FastAPI<br/>(Uvicorn)"]
        end
        subgraph DB_CONTAINER["Database Container"]
            PG["PostgreSQL 16<br/>+ pgvector"]
        end
    end

    subgraph CLOUD["Cloud Services"]
        GCP["Google Cloud<br/>(Vertex AI)"]
        STR["Stripe<br/>(Payments)"]
        SUP["Supabase<br/>(Auth)"]
    end

    SPA -- "HTTPS" --> FA
    SPA --> WW
    FA -- "SQLAlchemy" --> PG
    FA -- "gRPC / REST" --> GCP
    FA -- "REST" --> STR
    SPA -- "REST" --> SUP

    style BROWSER fill:#1a1a2e,stroke:#e94560,color:#fff
    style DOCKER fill:#16213e,stroke:#0f3460,color:#fff
    style CLOUD fill:#0f3460,stroke:#533483,color:#fff
```

---

*© 2026 AI Career Partner — Final Report Diagrams*
