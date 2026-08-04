const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

content = content.replace(
    /canvas\.width = video\.videoWidth \|\| 1280;\s*canvas\.height = video\.videoHeight \|\| 720;/,
    "if (!video.videoWidth || !video.videoHeight) return;\n      canvas.width = video.videoWidth;\n      canvas.height = video.videoHeight;"
);

fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
console.log("Fixed camera canvas dimensions");
