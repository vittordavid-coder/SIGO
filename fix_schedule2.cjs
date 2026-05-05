const fs = require('fs');
let content = fs.readFileSync('src/components/TechnicalRoomExtensions.tsx', 'utf8');

// Number formats
content = content.replace(/\{formatNumber\(\(accumulatedPlanned \/ bi\.quantity\) \* 100, 1\)\}\%/g, '{formatPercent((accumulatedPlanned / bi.quantity) * 100)}');
content = content.replace(/\{formatNumber\(\(\(bi\.quantity - accumulatedPlanned\) \/ bi\.quantity\) \* 100, 1\)\}\%/g, '{formatPercent(((bi.quantity - accumulatedPlanned) / bi.quantity) * 100)}');

content = content.replace(/\{formatNumber\(\(accumulatedActual \/ bi\.quantity\) \* 100, 1\)\}\%/g, '{formatPercent((accumulatedActual / bi.quantity) * 100)}');
content = content.replace(/\{formatNumber\(\(\(bi\.quantity - accumulatedActual\) \/ bi\.quantity\) \* 100, 1\)\}\%/g, '{formatPercent(((bi.quantity - accumulatedActual) / bi.quantity) * 100)}');

// Reverting 100% replacement just in case it caused issues
// `Percentual Executado` had 100% string which we want to turn it to `{formatPercent(100)}`
content = content.replace(/\{formatPercent\(100\)\}\<\/TableCell\>/g, '{formatPercent(100)}</TableCell>');

fs.writeFileSync('src/components/TechnicalRoomExtensions.tsx', content);
console.log('done');
