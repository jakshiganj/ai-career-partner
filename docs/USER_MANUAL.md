# User Manual: AI Partner for Career Development
## Personalized Job Seeking using Stateful Multi-Agent Systems

Welcome to the **AI Partner for Career Development**. This platform is designed to be your comprehensive companion in the modern job market, leveraging advanced Artificial Intelligence to provide personalized coaching, precise job matching, and immersive interview preparation.

---

## 1. Overview
The platform uses a unique **Privacy-First** architecture. Unlike traditional job boards, your personal data is sanitized locally on your device before being used by the AI, ensuring your identity remains protected throughout your career journey.

### Key Capabilities:
- **Intelligent CV Redaction**: Local PII removal using Transformers.js.
*   **Precision Job Matching**: Using GraphRAG technology to match your skills with deep industry knowledge.
- **Stateful Career Coaching**: A LangGraph-powered agent that remembers your goals and progress.
- **Immersive Interviews**: Multimodal mock sessions with real-time feedback.

---

## 2. Getting Started
### System Requirements
- **Browser**: Modern Chromium-based browser (Chrome, Edge, Brave) is recommended.
- **Hardware**: Access to a microphone and camera is required for the Interview module.
- **Connectivity**: Stable internet connection for AI processing.

### Accessing the Platform
1. Navigate to the application URL.
2. Log in using your credentials.
3. You will be greeted by the **Career Dashboard**, which serves as your central hub.

---

## 3. Core Features

### 3.1 CV Upload & Privacy (PII Redaction)
Your first step is to provide your professional background.
1. Click on the **"Upload CV"** section.
2. Select your CV file (PDF or DOCX).
3. **The Privacy Shield**: Before the file is uploaded, you will see a progress bar indicating "Redacting Personal Details."
   - *Note: This process runs locally on your computer. Your name, phone number, and address are replaced with placeholders like `[REDACTED_NAME]` before they ever reach our servers.*
4. Review the redacted preview and click **"Confirm & Process"**.

### 3.2 The Career Dashboard
The Dashboard organizes your job opportunities into three strategic tiers:
- **Priority Tier (Match > 80%)**: Immediate opportunities that perfectly align with your current skills.
- **Growth Tier (Match 60-80%)**: Jobs that require a minor skill upgrade but offer strong career progression.
- **Aspiration Tier (Match < 60%)**: Long-term goals. The AI will identify the specific "Skill Gaps" you need to bridge.

### 3.3 AI Career Partner (Chat)
Interact with your personal career agent at any time:
- Ask: *"What skills am I missing for a Senior DevOps role?"*
- Ask: *"Can you create a 3-month roadmap for me to learn Kubernetes?"*
- The agent is **Stateful**, meaning it remembers previous conversations and updates your career profile dynamically.

### 3.4 AI Mock Interviews
Practice in a low-stakes environment with the Interview Module:
1. Select a job from your dashboard.
2. Click **"Start Mock Interview"**.
3. Grant camera and microphone permissions when prompted.
4. **Interaction**: The AI will ask realistic questions based on the job description and your CV. You can respond via voice or text.
5. **Feedback**: After the session, you will receive a detailed performance report covering technical accuracy, communication style, and areas for improvement.

---

## 4. Advanced Insights
### Understanding the "Knowledge Graph"
In the Dashboard, you may see "Insight" buttons. These allow you to peek into the **GraphRAG** engine. You can see exactly *why* the AI believes you are a match for a role, showing the connections between your experience and industry-standard requirements.

---

## 5. Troubleshooting
- **Redaction is taking too long**: Large or complex CVs may take 10-15 seconds to process as the AI model is being downloaded to your browser for the first time.
- **Microphone not working**: Ensure you have granted permissions in your browser's site settings.
- **Dashboard is empty**: Make sure you have completed the CV Upload and "Sync" process.

---
*© 2026 AI Career Partner Project - Final Report Submission Appendix*
