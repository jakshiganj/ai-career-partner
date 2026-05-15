import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import CVUpload from '../cv/CVUpload';
import { runPipeline } from '../../api/pipeline';

interface NewRunModalProps {
    onClose: () => void;
    onSuccess: (pipelineId: string) => void;
    onUpgradeRequired: () => void;
}

export default function NewRunModal({ onClose, onSuccess, onUpgradeRequired }: NewRunModalProps) {
    const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
    const [newRunCv, setNewRunCv] = useState('');
    const [newRunJob, setNewRunJob] = useState('');
    const [startError, setStartError] = useState<string | null>(null);
    const [isCvLoading, setIsCvLoading] = useState(false);

    const handleCvLoading = useCallback((loadingVal: boolean) => {
        setIsCvLoading(loadingVal);
    }, []);

    const handleCvResult = useCallback((_id: string, _fb: unknown, redactedText: string) => {
        setNewRunCv(redactedText);
        setUploadMode('text'); // Auto-switch to verify text
        setIsCvLoading(false); // Ensure loading is cleared
    }, []);

    async function handleSubmit() {
        if (!newRunCv.trim()) {
            setStartError('Please provide your CV (upload PDF or paste text).');
            return;
        }
        if (!newRunJob.trim()) {
            setStartError('Please enter the target role or job description.');
            return;
        }
        setStartError(null);
        try {
            const { pipeline_id } = await runPipeline({
                goal: newRunJob,
                cv_text: newRunCv,
                skills: [],
            });
            onSuccess(pipeline_id);
        } catch (e: unknown) {
            const error = e as { response?: { data?: { detail?: string | { code?: string } } } };
            const detail = error.response?.data?.detail;
            if (detail && typeof detail !== 'string' && detail.code === "UPGRADE_REQUIRED") {
                onClose();
                onUpgradeRequired();
            } else {
                setStartError(typeof detail === 'string' ? detail : 'Failed to start pipeline');
            }
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D0D0D]/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl rounded-lg border border-[#E0E0E0] bg-white p-10 shadow-2xl"
            >
                <div className="mb-10">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-2">[ NEW PIPELINE ]</span>
                    <h3 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">Launch Analysis</h3>
                    <p className="text-sm text-[#4A4A4A] mt-2">Initialize our multi-agent pipeline to optimize your career path.</p>
                </div>

                <div className="space-y-8">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">RESUME INPUT</label>
                            <div className="flex gap-2 p-1 bg-[#F9F9F9] border border-[#E0E0E0] rounded-lg">
                                <button 
                                    onClick={() => setUploadMode('file')}
                                    className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${uploadMode === 'file' ? 'bg-white text-[#0D0D0D] shadow-sm' : 'text-[#4A4A4A] hover:text-[#0D0D0D]'}`}
                                >
                                    PDF
                                </button>
                                <button 
                                    onClick={() => setUploadMode('text')}
                                    className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${uploadMode === 'text' ? 'bg-white text-[#0D0D0D] shadow-sm' : 'text-[#4A4A4A] hover:text-[#0D0D0D]'}`}
                                >
                                    TEXT
                                </button>
                            </div>
                        </div>
                        
                        {uploadMode === 'file' ? (
                            <div className="rounded-lg border-2 border-dashed border-[#E0E0E0] bg-[#F9F9F9] p-8 hover:border-[#5BC0EB] transition-all">
                                <CVUpload 
                                    onResult={handleCvResult} 
                                    onLoading={handleCvLoading}
                                />
                            </div>
                        ) : (
                            <textarea
                                value={newRunCv}
                                onChange={(e) => setNewRunCv(e.target.value)}
                                placeholder="Paste content here..."
                                className="w-full rounded-lg border border-[#E0E0E0] bg-white p-5 text-sm text-[#0D0D0D] focus:border-[#5BC0EB] transition-all outline-none min-h-[160px] font-medium"
                                rows={4}
                            />
                        )}
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0D0D0D] block mb-4">TARGET POSITION</label>
                        <textarea
                            value={newRunJob}
                            onChange={(e) => setNewRunJob(e.target.value)}
                            placeholder="e.g. Senior Software Engineer at Apple"
                            className="w-full rounded-lg border border-[#E0E0E0] bg-white p-5 text-sm text-[#0D0D0D] focus:border-[#5BC0EB] transition-all outline-none font-medium"
                            rows={3}
                        />
                    </div>
                </div>
                
                {startError && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                        <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">{startError}</p>
                    </div>
                )}
                
                <div className="mt-12 flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-[#E0E0E0] py-4 text-xs font-bold text-[#4A4A4A] uppercase tracking-widest hover:bg-[#F9F9F9] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isCvLoading}
                        onClick={handleSubmit}
                        className={`flex-[2] rounded-lg py-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition-all ${isCvLoading ? 'bg-[#A0A0A0] cursor-not-allowed' : 'bg-[#0D0D0D] hover:bg-[#5BC0EB]'}`}
                    >
                        {isCvLoading ? 'PROCESSING...' : 'INITIALIZE AGENT'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
