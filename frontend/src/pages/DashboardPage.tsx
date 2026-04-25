import { useLocation } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import PipelineRunsPage from './PipelineRunsPage';
import CVAnalysisPage from './CVAnalysisPage';
import JobSearchPage from './JobSearchPage';
import SkillsPage from './SkillsPage';

export default function DashboardPage() {
    const location = useLocation();
    const { pathname } = location;

    if (pathname === '/dashboard/pipeline-runs') {
        return <PipelineRunsPage />;
    }
    if (pathname === '/dashboard/cv-analysis') {
        return <CVAnalysisPage />;
    }
    if (pathname === '/dashboard/job-search') {
        return <JobSearchPage />;
    }
    if (pathname === '/dashboard/skills') {
        return <SkillsPage />;
    }

    return <Dashboard />;
}
