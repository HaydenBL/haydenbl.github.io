module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        calistoga: ['Calistoga', 'Georgia', 'serif'],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
