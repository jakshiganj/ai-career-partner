import { Mic } from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';

interface InterviewScores {
    relevance?: number;
    clarity?: number;
    depth?: number;
    star_compliance?: number;
    overall?: number;
    communication?: number;
    technical_depth?: number;
    problem_solving?: number;
}

interface InterviewTips {
    relevance?: string;
    clarity?: string;
    depth?: string;
    star_compliance?: string;
}

interface InterviewReadinessCardProps {
    /** If null, show "Start Voice Interview" CTA */
    scores: InterviewScores | null;
    tips?: InterviewTips | null;
    questionCount?: number;
    status?: CardStatus;
    onStartInterview?: () => void;
    onRetake?: () => void;
    onViewReport?: () => void;
}

const RADAR_DIMS: Array<{ label: string; getValue: (s: InterviewScores) => number }> = [
    { label: 'Relevance', getValue: (s) => s.relevance ?? s.overall ?? 0 },
    { label: 'Clarity', getValue: (s) => s.clarity ?? s.communication ?? 0 },
    { label: 'Depth', getValue: (s) => s.depth ?? s.technical_depth ?? 0 },
    { label: 'STAR', getValue: (s) => s.star_compliance ?? s.problem_solving ?? 0 },
];

function mapScoresToRadar(scores: InterviewScores): Array<{ subject: string; value: number; fullMark: number }> {
    return RADAR_DIMS.map(({ label, getValue }) => ({
        subject: label,
        value: getValue(scores),
        fullMark: 10,
    }));
}

export default function InterviewReadinessCard({
    scores,
    tips,
    questionCount = 0,
    status = 'Not Run',
    onStartInterview,
    onRetake,
    onViewReport,
}: InterviewReadinessCardProps) {
    const hasScores = scores != null && (scores.overall != null || scores.relevance != null || scores.communication != null);
    const radarData = hasScores ? mapScoresToRadar(scores) : [];
    const overall = scores?.overall ?? (radarData.length ? radarData.reduce((a, b) => a + b.value, 0) / radarData.length : 0);

    if (!hasScores) {
        return (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Mic className="h-5 w-5 text-[#94A3B8]" />
                        <h3 className="font-semibold text-[#0F172A]">Interview Readiness</h3>
                    </div>
                    <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-medium text-[#64748B]">
                        Not Run
                    </span>
                </div>
                <div className="mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-8">
                    <Mic className="mb-3 h-10 w-10 text-[#3B82F6] animate-pulse" />
                    <p className="mb-1 text-sm font-medium text-[#0F172A]">Start Voice Interview</p>
                    <p className="mb-4 text-xs text-[#64748B]">
                        {questionCount > 0
                            ? `Your question bank is ready — ${questionCount} questions prepared`
                            : 'Complete pipeline to prepare question bank'}
                    </p>
                    {onStartInterview && (
                        <button
                            type="button"
                            onClick={onStartInterview}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB]"
                        >
                            <Mic className="h-4 w-4" />
                            Start Interview
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const tipLines = [
        tips?.relevance,
        tips?.clarity,
        tips?.depth,
        tips?.star_compliance,
    ].filter(Boolean) as string[];

    return (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-[#3B82F6]" />
                    <h3 className="font-semibold text-[#0F172A]">Interview Readiness</h3>
                </div>
                <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-medium text-[#16A34A]">
                    {status}
                </span>
            </div>

            <div className="mt-4 flex flex-col items-center">
                <div className="relative h-44 w-44">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="#E2E8F0" />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fontSize: 10, fill: '#64748B' }}
                            />
                            <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9 }} />
                            <Radar
                                name="Score"
                                dataKey="value"
                                stroke="#3B82F6"
                                fill="#3B82F6"
                                fillOpacity={0.3}
                                strokeWidth={2}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                        <span className="text-2xl font-bold text-[#0F172A]">
                            {overall.toFixed(1)}
                        </span>
                    </div>
                </div>
                {tipLines.length > 0 && (
                    <ul className="mt-2 w-full space-y-1 text-xs text-[#64748B]">
                        {tipLines.slice(0, 4).map((t, i) => (
                            <li key={i} className="truncate" title={t}>
                                {t}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mt-4 flex gap-2">
                {onStartInterview && (
                    <button
                        type="button"
                        onClick={onStartInterview}
                        className="flex-1 rounded-lg border border-[#E2E8F0] bg-[#3B82F6] py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
                    >
                        Start Interview
                    </button>
                )}
                {onRetake && (
                    <button
                        type="button"
                        onClick={onRetake}
                        className="flex-1 rounded-lg border border-[#E2E8F0] bg-white py-2 text-sm font-medium text-[#475569] hover:bg-[#F1F5F9]"
                    >
                        Retake
                    </button>
                )}
                {onViewReport && (
                    <button
                        type="button"
                        onClick={onViewReport}
                        className="flex-1 rounded-lg border border-[#E2E8F0] bg-white py-2 text-sm font-medium text-[#3B82F6] hover:bg-[#EFF6FF]"
                    >
                        View Full Report
                    </button>
                )}
            </div>
        </div>
    );
}
