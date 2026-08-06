const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

code = code.replace(/setCapturedPhotoUrl\(null\);\n\s*setPhotoDescription\(''\);\n\s*setIsCameraOpen\(false\);/g, "setCapturedPhotoUrl(null);\n    setPhotoDescription('');\n    // setIsCameraOpen(false); // Mantém a câmera aberta como solicitado");

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
