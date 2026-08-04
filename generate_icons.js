const fs = require('fs');

const svgData = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="128" fill="#2563eb"/>
<path d="M120 300 L256 160 L392 300" stroke="white" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" fill="none" />
<path d="M180 390 L256 250 L332 390" stroke="white" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" fill="none" />
</svg>`;

// The Synera icon used in the main app (two chevrons or an 'S'?)
// The original one in index.html was an 'S': `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232563eb'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-weight='bold' font-size='20' fill='white'>S</text></svg>`

const sIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#2563eb"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="320" fill="white">S</text>
</svg>`;

fs.writeFileSync('public/icon.svg', sIconSvg);
