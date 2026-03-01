// @ts-nocheck
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendDataPoint {
    date: string;
    score: number;
}

interface Props {
    data: TrendDataPoint[];
}

export default function InterviewTrend({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="card text-center p-8 bg-transparent border-dashed text-muted text-sm border-subtle">
                No historical interview data available yet.
            </div>
        );
    }

    // Determine trend arrow
    const hasTrend = data.length > 1;
    const latestScore = data[data.length - 1].score;
    const prevScore = hasTrend ? data[data.length - 2].score : null;
    const isImproving = prevScore !== null && latestScore >= prevScore;

    return (
        <div className="card shadow-sm border border-subtle h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg text-primary mb-1 text-left">Interview Readiness Trend</h3>
                    <p className="text-secondary text-sm text-left">Your progress over time</p>
                </div>
                {hasTrend && (
                    <div className={`flex flex-col items-center justify-center rounded-full w-12 h-12 ${isImproving ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        <span className="text-xl">{isImproving ? '↗' : '↘'}</span>
                    </div>
                )}
            </div>

            <div className="flex-grow w-full h-48 mt-2 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            domain={[0, 10]}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                            itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                            formatter={(value: number) => [`${value.toFixed(1)} / 10`, 'Score']}
                        />
                        <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#0ea5e9"
                            strokeWidth={3}
                            dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
