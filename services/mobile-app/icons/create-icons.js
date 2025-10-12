#!/usr/bin/env node

// Simple icon generator for IonXe Mobile PWA
const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname);
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons
const generateSVGIcon = (size, icon, filename) => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#007bff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0056b3;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#gradient)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.5}" 
        text-anchor="middle" dominant-baseline="middle" fill="white">${icon}</text>
</svg>`;
  
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Generated ${filename}`);
};

// Generate all required icons
const icons = [
  { size: 72, icon: '⚡', name: 'icon-72x72.png' },
  { size: 96, icon: '⚡', name: 'icon-96x96.png' },
  { size: 128, icon: '⚡', name: 'icon-128x128.png' },
  { size: 144, icon: '⚡', name: 'icon-144x144.png' },
  { size: 152, icon: '⚡', name: 'icon-152x152.png' },
  { size: 192, icon: '⚡', name: 'icon-192x192.png' },
  { size: 384, icon: '⚡', name: 'icon-384x384.png' },
  { size: 512, icon: '⚡', name: 'icon-512x512.png' },
  // Shortcut icons
  { size: 96, icon: '🎛️', name: 'shortcut-faders.png' },
  { size: 96, icon: '🎬', name: 'shortcut-scenes.png' },
  { size: 96, icon: '🤖', name: 'shortcut-ai.png' },
  // Badge icon
  { size: 72, icon: '⚡', name: 'badge-72x72.png' }
];

console.log('🎨 Generating IonXe Mobile Icons...\n');

icons.forEach(({ size, icon, name }) => {
  generateSVGIcon(size, icon, name);
});

console.log('\n✅ All icons generated successfully!');
console.log('\n📱 Icons created:');
icons.forEach(({ name }) => {
  console.log(`   - ${name}`);
});

console.log('\n💡 Note: These are SVG icons. For production, convert to PNG using:');
console.log('   - Online tools like convertio.co');
console.log('   - ImageMagick: convert icon.svg icon.png');
console.log('   - Or use the generate-icons.html tool in a browser');
