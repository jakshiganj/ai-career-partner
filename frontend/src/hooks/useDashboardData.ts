import { useState, useEffect, useCallback } from 'react';
import { 
    getPipelineRuns, 
    getPipelineResult, 
    getPipelineStatus, 
    type PipelineRunSummary, 
    type PipelineResultState 
} from '../api/pipeline';
import { getDashboardSummary, type DashboardSummary } from '../api/dashboard';

const POLL_INTERVAL_MS = 2000;

export function useDashboardData(initialSelectedRunId: string | null = null) {
    const [runs, setRuns] = useState<PipelineRunSummary[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(initialSelectedRunId);
    const [runResult, setRunResult] = useState<PipelineResultState | null>(null);
    const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [runningPipelineId, setRunningPipelineId] = useState<string | null>(null);
    const [runStatus, setRunStatus] = useState<{ current_stage: number; status: string } | null>(null);

    const fetchRuns = useCallback(async () => {
        try {
            const { runs: list } = await getPipelineRuns(20); // Fetch more for the table
            setRuns(list);
            if (list.length > 0 && !selectedRunId) {
                setSelectedRunId(list[0].id);
            }
        } catch (e) {
            console.error('Failed to fetch runs', e);
        }
    }, [selectedRunId]);

    const fetchDashboard = useCallback(async () => {
        try {
            const data = await getDashboardSummary();
            setDashboardSummary(data);
            if (data.pipeline_status?.is_running && data.pipeline_status?.pipeline_id) {
                setRunningPipelineId(data.pipeline_status.pipeline_id);
                if (!selectedRunId) {
                    setSelectedRunId(data.pipeline_status.pipeline_id);
                }
            }
        } catch (e) {
            console.error('Failed to fetch dashboard', e);
        }
    }, [selectedRunId]);

    const fetchResult = useCallback(async (id: string) => {
        try {
            const result = await getPipelineResult(id);
            setRunResult(result);
        } catch (e) {
            console.error('Failed to fetch run result', e);
            setRunResult(null);
        }
    }, []);

    const fetchStatus = useCallback(async (id: string) => {
        try {
            const status = await getPipelineStatus(id);
            setRunStatus({ current_stage: status.current_stage, status: status.status });
            if (status.status === 'completed' || status.status === 'failed') {
                setRunningPipelineId((prev) => (prev === id ? null : prev));
                await fetchResult(id);
                await fetchRuns();
            }
        } catch {
            setRunStatus(null);
        }
    }, [fetchResult, fetchRuns]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([fetchRuns(), fetchDashboard()]);
            setLoading(false);
        })();
    }, [fetchRuns, fetchDashboard]);

    useEffect(() => {
        if (!selectedRunId) return;
        (async () => {
            await Promise.all([fetchResult(selectedRunId), fetchStatus(selectedRunId)]);
        })();
    }, [selectedRunId, fetchResult, fetchStatus]);

    useEffect(() => {
        if (!runningPipelineId) return;
        const t = setInterval(() => fetchStatus(runningPipelineId), POLL_INTERVAL_MS);
        return () => clearInterval(t);
    }, [runningPipelineId, fetchStatus]);

    return {
        runs,
        selectedRunId,
        setSelectedRunId,
        runResult,
        dashboardSummary,
        loading,
        runStatus,
        runningPipelineId,
        refresh: () => Promise.all([fetchRuns(), fetchDashboard()])
    };
}
