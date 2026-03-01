/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                background: "var(--bg-base)",
                foreground: "var(--text-primary)",
                card: "var(--bg-card)",
                "card-foreground": "var(--text-primary)",
                popover: "var(--bg-card)",
                "popover-foreground": "var(--text-primary)",
                primary: {
                    DEFAULT: "var(--accent-blue)",
                    foreground: "#ffffff",
                },
                secondary: {
                    DEFAULT: "var(--bg-elevated)",
                    foreground: "var(--text-secondary)",
                },
                muted: {
                    DEFAULT: "var(--bg-elevated)",
                    foreground: "var(--text-muted)",
                },
                accent: {
                    DEFAULT: "var(--accent-blue)",
                    foreground: "var(--text-primary)",
                },
                destructive: {
                    DEFAULT: "var(--accent-red)",
                    foreground: "#ffffff",
                },
                border: "var(--border-subtle)",
                input: "var(--border-subtle)",
                ring: "var(--border-glow)",
            },
            borderRadius: {
                lg: "var(--radius-lg)",
                md: "var(--radius-md)",
                sm: "var(--radius-sm)",
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "float": "float 3s ease-in-out infinite",
                "fade-in-up": "fade-in-up 0.4s ease-out forwards",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "float": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-5px)" },
                },
                "fade-in-up": {
                    from: { opacity: "0", transform: "translateY(10px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                }
            },
            boxShadow: {
                'glow': '0 0 20px rgba(37, 99, 235, 0.15)',
                'glow-lg': '0 0 40px rgba(37, 99, 235, 0.25)',
            },
        },
    },
    plugins: [],
}
