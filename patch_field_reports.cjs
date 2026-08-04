const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add fieldReports to dataToSync
const toReplaceSync = "      { id: `${compId}_sconet_measurements`, content: measurements },";
const replaceSync = "      { id: `${compId}_sconet_measurements`, content: measurements },\n      { id: `${compId}_sigo_field_reports`, content: fieldReports },";

if (content.includes(toReplaceSync) && !content.includes("sigo_field_reports`")) {
    content = content.replace(toReplaceSync, replaceSync);
    console.log("Added fieldReports to handleSyncAllToSupabase");
}

// 2. Add fieldReports to syncFromSupabase extraction
const toReplaceExtract = "            case `${compId}_sigo_service_productions`: setServiceProductions(parsed); break;";
const replaceExtract = "            case `${compId}_sigo_service_productions`: setServiceProductions(parsed); break;\n            case `${compId}_sigo_field_reports`: setFieldReports(parsed); break;";

if (content.includes(toReplaceExtract) && !content.includes("setFieldReports(parsed)")) {
    content = content.replace(toReplaceExtract, replaceExtract);
    console.log("Added fieldReports to syncFromSupabase");
}

fs.writeFileSync('src/App.tsx', content);
