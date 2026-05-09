import { motion } from 'framer-motion';

const ease = [0.16, 1, 0.3, 1] as const;

export function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.8, delay, ease }}
        >
            {children}
        </motion.div>
    );
}
