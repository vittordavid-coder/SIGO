const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(currentUser && \(isMobileDevice \|\| currentUser\.userGroup === 'mobile' \|\| currentUser\.role === 'apontador'\)\) \{/;
const replace = `if (currentUser && (window.location.pathname.includes("cam.html") || isMobileDevice || currentUser.userGroup === 'mobile' || currentUser.role === 'apontador')) {`;

if (content.match(regex)) {
    content = content.replace(regex, replace);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Patched App.tsx for cam.html");
} else {
    console.log("Could not find condition in App.tsx");
}
