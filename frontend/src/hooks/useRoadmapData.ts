import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { getCurrentRoadmap, updateRoadmap, pivotRoadmap, chatRoadmap, getRoadmapByPipelineId } from '../api/roadmap';
import type { ActionItem, SkillRoadmapResponse } from '../api/roadmap';
import { useToast } from '../components/ui/Toast';

interface DetailedSkill {
    name: string;
    [key: string]: unknown;
}

function migrateRoadmap(data: SkillRoadmapResponse): SkillRoadmapResponse {
    const migratedRoadmap = data.roadmap.map(phase => ({
        ...phase,
        // Flatten skills if they are objects { name, why_it_matters, ... }
        skills_covered: phase.skills_covered?.map(s => {
            if (typeof s === 'object' && s !== null && 'name' in s) {
                return (s as unknown as DetailedSkill).name;
            }
            return s as string;
        }),
        action_items: phase.action_items?.map(item => {
            if (typeof item === 'string') return { task: item, completed: false };
            if (typeof item === 'object' && item !== null) {
                const anyItem = item as any;
                return {
                    ...anyItem,
                    task: anyItem.task || anyItem.skill || anyItem.name || 'Action Item',
                    completed: !!anyItem.completed
                };
            }
            return item;
        }) || phase.milestones?.map(item => ({ task: item, completed: false })) || []
    }));
    return { ...data, roadmap: migratedRoadmap };
}

export function useRoadmapData(pipelineId?: string) {
    const [dbRoadmap, setDbRoadmap] = useState<SkillRoadmapResponse | null>(null);
    const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [pivoting, setPivoting] = useState(false);
    const [constraint, setConstraint] = useState('');
    const [chatMessage, setChatMessage] = useState('');
    const [chatReply, setChatReply] = useState<{ text: string, time: Date } | null>(null);
    const [chatting, setChatting] = useState(false);
    const [expandedPhase, setExpandedPhase] = useState<number>(0);
    const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

    useEffect(() => {
        let intervalId: number;

        const fetchRoadmap = async () => {
            try {
                let data: SkillRoadmapResponse | null = null;
                
                if (pipelineId) {
                    const { getPipelineStatus } = await import('../api/pipeline');
                    const statusData = await getPipelineStatus(pipelineId);
                    setPipelineStatus(statusData.status);
                    
                    try {
                        data = await getRoadmapByPipelineId(pipelineId);
                    } catch {
                        // Not ready
                    }

                    // Poll if still generating
                    if (statusData.status === 'running' || statusData.status === 'initialized') {
                        if (!intervalId) {
                            intervalId = setInterval(fetchRoadmap, 5000);
                        }
                    } else if (intervalId) {
                        clearInterval(intervalId);
                    }
                } else {
                    data = await getCurrentRoadmap();
                }

                if (data) {
                    setDbRoadmap(migrateRoadmap(data));
                }
            } catch (err) {
                console.error("Failed to load roadmap", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoadmap();
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [pipelineId]);


    const toggleActionItem = async (phaseIndex: number, taskIndex: number) => {
        if (!dbRoadmap) return;

        const newRoadmap = [...dbRoadmap.roadmap];
        const phase = newRoadmap[phaseIndex];
        const items = phase.action_items ? [...(phase.action_items as ActionItem[])] : [];
        
        const isCompleting = !items[taskIndex].completed;
        const currentCompletedCount = items.filter(i => i.completed).length;
        
        items[taskIndex] = { ...items[taskIndex], completed: isCompleting };
        newRoadmap[phaseIndex] = { ...phase, action_items: items };

        setDbRoadmap({ ...dbRoadmap, roadmap: newRoadmap });
        
        if (isCompleting && currentCompletedCount + 1 === items.length && items.length > 0) {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#5BC0EB', '#0D0D0D', '#F4D35E', '#EE6C4D']
            });
            toastSuccess('Congratulations! You have mastered this phase!');
        } else if (isCompleting) {
            toastInfo(`Marked as completed`);
        }
        
        try {
            await updateRoadmap(dbRoadmap.id, newRoadmap);
        } catch (e) {
            console.error("Failed to sync roadmap update", e);
        }
    };

    const handlePivot = async () => {
        if (!dbRoadmap || !constraint.trim()) return;
        setPivoting(true);
        try {
            const updated = await pivotRoadmap(dbRoadmap.id, constraint);
            setDbRoadmap(migrateRoadmap(updated));
            setConstraint('');
            setExpandedPhase(0);
            toastSuccess('Roadmap pivoted successfully!');
        } catch (e) {
            console.error("Failed to pivot roadmap", e);
            toastError("Pivot failed. Make sure you haven't checked off all tasks.");
        } finally {
            setPivoting(false);
        }
    };

    const handleChat = async () => {
        if (!dbRoadmap || !chatMessage.trim()) return;
        setChatting(true);
        try {
            const { reply, roadmap } = await chatRoadmap(dbRoadmap.id, chatMessage);
            setDbRoadmap(migrateRoadmap(roadmap));
            setChatReply({ text: reply, time: new Date() });
            setChatMessage('');
            toastSuccess('Coach responded!');
        } catch (e) {
            console.error("Failed to chat with roadmap", e);
            toastError("Chat failed. Our agent might be taking a break.");
        } finally {
            setChatting(false);
        }
    };

    return {
        dbRoadmap, loading, pipelineStatus,
        expandedPhase, setExpandedPhase,
        constraint, setConstraint, pivoting, handlePivot,
        chatMessage, setChatMessage, chatReply, chatting, handleChat,
        toggleActionItem,
    };
}
