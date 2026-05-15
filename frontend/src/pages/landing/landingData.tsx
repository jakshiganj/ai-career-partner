import { Brain, MessageSquare, Zap, FileText, TrendingUp } from 'lucide-react';

export const stats = [
    { num: '10k+', label: 'Profiles analyzed' },
    { num: '97%', label: 'Match accuracy' },
    { num: '<2min', label: 'Pipeline runtime' },
    { num: '500+', label: 'Jobs found daily' },
];

export const services = [
    { num: '01', title: 'Resume Analysis', short: 'AI-driven CV parsing and gap identification.', long: 'Your resume is parsed against industry benchmarks using our multi-agent pipeline. We identify skill gaps, optimize keyword density for ATS systems, and map your experience to market demands — all in under 60 seconds.' },
    { num: '02', title: 'Skill Graph Mapping', short: 'ESCO-powered knowledge graph for career intelligence.', long: 'We build a personalized skill graph using the European Skills ontology. This maps your existing skills to adjacent competencies, revealing hidden transferable strengths and clear upskilling paths.' },
    { num: '03', title: 'Job Matching', short: 'Precision-matched opportunities from live market data.', long: 'Our agents continuously scan job markets to find roles that match your skill profile. Each listing is scored for compatibility, salary alignment, and growth potential — delivering a curated shortlist.' },
    { num: '04', title: 'Interview Preparation', short: 'Real-time mock interviews with AI feedback.', long: 'Prepare for behavioral and technical interviews with our AI interviewer. Each session generates a detailed report covering communication clarity, technical depth, and response structure.' },
];

export const tabContent = [
    {
        id: 'pipeline',
        label: 'AI Pipeline',
        icon: <Zap className="w-4 h-4" />,
        title: 'Multi-agent career pipeline.',
        subtitle: 'Upload once — get CV analysis, skill mapping, job matches, and a career roadmap in a single automated run.',
        points: ['5 specialized AI agents working in parallel', 'Full pipeline runs in under 2 minutes', 'Real-time progress tracking'],
        code: `// Start a career analysis pipeline
const result = await careerai.pipeline.run({
  cv: uploadedFile,
  target_role: "Senior Software Engineer",
  location: "London, UK"
});

// result.skills → matched & missing skills
// result.jobs  → 47 precision-matched roles
// result.roadmap → personalized learning path`,
    },
    {
        id: 'skills',
        label: 'Skill Mapping',
        icon: <Brain className="w-4 h-4" />,
        title: 'ESCO-powered knowledge graph.',
        subtitle: 'Your skills mapped against the European Skills, Competences, and Occupations ontology — revealing hidden strengths and gaps.',
        points: ['13,000+ skills in the ontology', 'Transferable skill discovery', 'Market demand alignment'],
        code: `// Skill graph analysis
const graph = await careerai.skills.analyze({
  cv_skills: extractedSkills,
  target: "Product Manager"
});

// graph.matched   → 24 direct matches
// graph.adjacent  → 8 transferable skills
// graph.gaps      → 5 skills to develop`,
    },
    {
        id: 'interview',
        label: 'Interview AI',
        icon: <MessageSquare className="w-4 h-4" />,
        title: 'AI-powered mock interviews.',
        subtitle: 'Practice behavioral and technical questions with real-time feedback, scoring, and actionable improvement suggestions.',
        points: ['Role-specific question generation', 'Real-time scoring & feedback', 'Detailed performance reports'],
        code: `// Start an interview session
const session = await careerai.interview.start({
  role: "Senior Software Engineer",
  type: "behavioral",
  difficulty: "hard"
});

// session.score    → 8.5 / 10
// session.feedback → detailed per-answer analysis
// session.report   → downloadable PDF`,
    },
];

export const testimonials = [
    { quote: 'Their analysis approach brought clarity and confidence to my job search process.', name: 'Sarah K.', role: 'Software Engineer', company: 'Google' },
    { quote: 'The skill gap insights were something no other platform had surfaced for me before.', name: 'James L.', role: 'Product Manager', company: 'Stripe' },
    { quote: 'Independent, data-driven advice that helped me negotiate a 40% salary increase.', name: 'Priya M.', role: 'Data Scientist', company: 'Meta' },
];

export const faqs = [
    { q: 'How does the AI analysis work?', a: 'We use a multi-agent pipeline where specialized AI agents handle CV parsing, skill extraction, job matching, and interview prep independently — then synthesize results into a unified career dashboard.' },
    { q: 'Is my data secure?', a: 'Yes. Your CV and personal data are encrypted at rest and in transit. We never share your information with third parties or use it for training purposes.' },
    { q: 'How long does the analysis take?', a: 'The full pipeline — from CV upload to complete results — typically runs in under 2 minutes. You can track each agent\'s progress in real-time.' },
    { q: 'Is there a free plan?', a: 'Yes. The free tier includes full CV analysis, skill mapping, and up to 10 matched job listings. Our Pro and Premium plans offer unlimited pipeline runs, AI interview coaching, cover letter generation, and priority processing.' },
];

export const processSteps = [
    { num: '01', title: 'Upload', desc: 'Drop your CV. Our engine parses every detail — skills, experience, education.', icon: <FileText className="w-6 h-6" />, accent: '#5BC0EB' },
    { num: '02', title: 'Analyze', desc: 'Multi-agent AI pipeline runs skill mapping, gap analysis, and market indexing.', icon: <Brain className="w-6 h-6" />, accent: '#3AAED8' },
    { num: '03', title: 'Accelerate', desc: 'Receive matched jobs, a personalized roadmap, and interview prep — all in one place.', icon: <TrendingUp className="w-6 h-6" />, accent: '#2196C5' },
];
