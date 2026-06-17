/** Tailwind config — replicates the inline config from design/upload-ui/final.html so the compiled static CSS
 *  produces the exact "Bold Editorial" utility classes the design uses (no runtime CDN). */
module.exports = {
  // Scan the design source + our resource HTML/JS so every class the design uses (incl. JS-built rows) is kept.
  content: ['./static/**/*.html', './ui-src/**/*.js', '../design/upload-ui/final.html'],
  theme: {
    extend: {
      colors: {
        brand: { blue: '#0C66E4', hover: '#0055CC', deep: '#09326C', tintBg: '#E9F2FE', tintLn: '#8FB8F6' },
        ink: { 900: '#091E42', 800: '#172B4D', 600: '#44546F', 500: '#626F86' },
        surf: { page: '#F7F8F9', sunk: '#F1F2F4', line: '#DFE1E6', line2: '#EBECF0', card: '#FFFFFF' },
        ok: { base: '#22A06B', deep: '#216E4E', soft: '#DCFFF1', line: '#7EE2B8', mid: '#5FD3A3' },
        warn: { base: '#E2B203' },
        stop: { base: '#CA3521', deep: '#AE2A19', soft: '#FFF1F0', line: '#F5A99F' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        kick: ['11px', { lineHeight: '1', letterSpacing: '0.14em' }],
        micro: ['11px', { lineHeight: '1.25', letterSpacing: '0.045em' }],
        meta: ['12px', { lineHeight: '1.4' }],
        mono: ['12.5px', { lineHeight: '1.45' }],
        body: ['14px', { lineHeight: '1.55' }],
        lead: ['15px', { lineHeight: '1.5' }],
        h2: ['16px', { lineHeight: '1.3', letterSpacing: '-0.005em' }],
        h1: ['18px', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'disp-sm': ['28px', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        disp: ['52px', { lineHeight: '0.92', letterSpacing: '-0.028em' }],
        'disp-lg': ['92px', { lineHeight: '0.86', letterSpacing: '-0.035em' }],
      },
      spacing: { '4.5': '1.125rem', 13: '3.25rem' },
      borderRadius: { xs: '4px', sm: '6px', DEFAULT: '8px', lg: '10px', xl: '14px' },
      boxShadow: {
        panel: '0 1px 1px rgba(9,30,66,0.10), 0 0 1px rgba(9,30,66,0.18)',
        raise: '0 4px 8px -2px rgba(9,30,66,0.14), 0 0 1px rgba(9,30,66,0.20)',
        reveal: '0 18px 40px -18px rgba(12,102,228,0.40), 0 2px 6px rgba(9,30,66,0.10)',
        btn: '0 1px 2px rgba(9,30,66,0.16)',
      },
    },
  },
};
