

interface QuickMetricCardProps {
    title: string;
    icon: React.ElementType;
    onClick: () => void;
    value: string;
    subText: string;
}

export default function QuickMetricCard({ title, icon: Icon, onClick, value, subText }: QuickMetricCardProps) {
    return (
        <button 
            onClick={onClick}
            className="group flex flex-col gap-6 rounded-xl border border-[#E0E0E0] bg-white p-8 text-left transition-all hover:border-[#5BC0EB] hover:bg-[#F9F9F9]"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0D0D0D] text-white transition-all group-hover:bg-[#5BC0EB]">
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-2">{title}</span>
                <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-[#0D0D0D] tracking-tight">{value}</span>
                    <span className="text-[11px] font-bold text-[#4A4A4A] opacity-60">{subText}</span>
                </div>
            </div>
        </button>
    );
}
