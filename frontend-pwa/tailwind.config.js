module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        'soft-glow': '0 20px 50px rgba(14, 165, 233, 0.25)'
      },
      colors: {
        glass: 'rgba(255,255,255,0.22)'
      }
    }
  },
  plugins: []
}
