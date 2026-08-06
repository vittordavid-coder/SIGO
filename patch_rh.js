const fs = require('fs');
let content = fs.readFileSync('src/components/RHView.tsx', 'utf8');

if (!content.includes('InlineAutocomplete')) {
  content = content.replace('export default function RHView', `
import { InlineAutocomplete } from './InlineAutocomplete';

export default function RHView`);
  
  fs.writeFileSync('src/components/RHView.tsx', content);
}
