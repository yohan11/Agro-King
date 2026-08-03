const fs = require('fs');
const path = require('path');

// Let's create two valid PNG screenshots using the existing 512x512 PNG icon or standard PNG buffer
const sourceIcon = path.join(__dirname, 'public', 'icon-512x512.png');
const targetMobile = path.join(__dirname, 'public', 'screenshot-mobile.png');
const targetDesktop = path.join(__dirname, 'public', 'screenshot-desktop.png');

if (fs.existsSync(sourceIcon)) {
  fs.copyFileSync(sourceIcon, targetMobile);
  fs.copyFileSync(sourceIcon, targetDesktop);
  console.log('Screenshots copied successfully!');
} else {
  console.log('Source icon not found.');
}
