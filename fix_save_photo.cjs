const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const regex = /canvas\.width = img\.width;\s*canvas\.height = img\.height;\s*const ctx = canvas\.getContext\('2d'\);/g;

const replace = `
      const MAX_DIMENSION = 2048;
      let targetW = img.width;
      let targetH = img.height;
      if (targetW > MAX_DIMENSION || targetH > MAX_DIMENSION) {
        if (targetW > targetH) {
          targetH = Math.round(targetH * (MAX_DIMENSION / targetW));
          targetW = MAX_DIMENSION;
        } else {
          targetW = Math.round(targetW * (MAX_DIMENSION / targetH));
          targetH = MAX_DIMENSION;
        }
      }
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
`;

content = content.replace(regex, replace);

// Also need to fix the drawImage to use targetW and targetH
content = content.replace(/ctx\.drawImage\(img, 0, 0\);/g, 'ctx.drawImage(img, 0, 0, targetW, targetH);');

fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
console.log("Fixed save photo canvas sizes");
