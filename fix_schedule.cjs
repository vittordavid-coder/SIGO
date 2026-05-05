const fs = require('fs');
let content = fs.readFileSync('src/components/TechnicalRoomExtensions.tsx', 'utf8');

// Header renames
content = content.replace(/Quantidade Prevista/g, 'Qtd. Prev.');
content = content.replace(/Quantidade Executada/g, 'Qtd. Exec.');
content = content.replace(/Percentual Previsto/g, 'Perc. Prev.');
content = content.replace(/Percentual Executado/g, 'Perc. Exec.');
content = content.replace(/Valor Previsto/g, 'Val. Prev.');
content = content.replace(/Valor Executado/g, 'Val. Exec.');

// Number formats
content = content.replace(/formatNumber\(\(accumulatedPlanned \/ bi\.quantity\) \* 100, 1\) \+ '\%'/g, 'formatPercent((accumulatedPlanned / bi.quantity) * 100)');
content = content.replace(/formatNumber\(\(\(bi\.quantity - accumulatedPlanned\) \/ bi\.quantity\) \* 100, 1\) \+ '\%'/g, 'formatPercent(((bi.quantity - accumulatedPlanned) / bi.quantity) * 100)');

content = content.replace(/formatNumber\(\(accumulatedActual \/ bi\.quantity\) \* 100, 1\) \+ '\%'/g, 'formatPercent((accumulatedActual / bi.quantity) * 100)');
content = content.replace(/formatNumber\(\(\(bi\.quantity - accumulatedActual\) \/ bi\.quantity\) \* 100, 1\) \+ '\%'/g, 'formatPercent(((bi.quantity - accumulatedActual) / bi.quantity) * 100)');

content = content.replace(/100\%/g, '{formatPercent(100)}');

fs.writeFileSync('src/components/TechnicalRoomExtensions.tsx', content);
console.log('done');
