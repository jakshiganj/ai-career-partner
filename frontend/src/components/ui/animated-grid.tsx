import { motion } from "framer-motion"

export function AnimatedGrid() {
    return (
        // position: fixed + pointer-events: none so it never affects layout or scroll
        <div
            style={{ position: 'fixed', inset: 0, zIndex: -10, overflow: 'hidden', pointerEvents: 'none' }}
        >
            {/* Subtle grid pattern */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(to right,rgba(128,128,128,0.07) 1px,transparent 1px),linear-gradient(to bottom,rgba(128,128,128,0.07) 1px,transparent 1px)',
                backgroundSize: '28px 28px',
                WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%,#000 70%,transparent 100%)',
                maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%,#000 70%,transparent 100%)',
            }} />

            {/* Radial glow at top */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle 600px at 50% 0%,rgba(99,102,241,0.12),transparent)',
            }} />

            {/* Orb 1 — NEVER moves on X axis, only subtle Y */}
            <motion.div
                animate={{ y: [0, -30, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    top: '20%',
                    left: '20%',
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: 'rgba(99,102,241,0.18)',
                    filter: 'blur(80px)',
                    transform: 'translateZ(0)', // GPU layer
                }}
            />

            {/* Orb 2 */}
            <motion.div
                animate={{ y: [0, 40, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                style={{
                    position: 'absolute',
                    top: '10%',
                    right: '15%',
                    width: 350,
                    height: 350,
                    borderRadius: '50%',
                    background: 'rgba(59,130,246,0.15)',
                    filter: 'blur(90px)',
                    transform: 'translateZ(0)',
                }}
            />

            {/* Orb 3 — bottom accent */}
            <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
                style={{
                    position: 'absolute',
                    bottom: '10%',
                    left: '40%',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'rgba(139,92,246,0.10)',
                    filter: 'blur(100px)',
                    transform: 'translateZ(0)',
                }}
            />
        </div>
    )
}
