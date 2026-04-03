/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        'chat-bg': '#343541',
        'chat-sidebar': '#202123',
        'chat-input': '#40414f',
        'chat-border': '#4d4d4f',
        'chat-hover': '#2A2B32',
        'chat-user': '#343541',
        'chat-assistant': '#444654',
      },
    },
  },
  plugins: [],
};