const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const toReplace = `              )}
            </div></div></motion.div>)}</AnimatePresence>`;

const replacement = `              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>`;

if (content.includes(toReplace)) {
    content = content.replace(toReplace, replacement);
    fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
    console.log("Replaced successfully!");
} else {
    console.log("Could not find text to replace");
}
