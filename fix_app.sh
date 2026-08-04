sed -i 's/import { Smartphone, Smartphone, Smartphone, /import { /g' src/App.tsx
sed -i -e '/import { useState/!b;n;c\import { Smartphone, BarChart3, ...' # it is easier to just look at line 1
