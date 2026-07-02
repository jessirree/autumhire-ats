import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        accent: 'var(--accent)',
        sidebar: 'var(--sidebar)',
        'sidebar-foreground': 'var(--sidebar-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        // Map user's specific palette to utility classes if needed
        'autumn-red': 'var(--fiery-red)',
        'autumn-yellow': 'var(--golden-yellow)',
        'autumn-orange': 'var(--pumpkin-orange)',
        'autumn-green': 'var(--forest-green)',
        'autumn-olive': 'var(--olive-green)',
        'autumn-blue': 'var(--sky-blue)',
        'autumn-charcoal': 'var(--charcoal-gray)',
      },
    },
  },
  plugins: [],
}

export default config
