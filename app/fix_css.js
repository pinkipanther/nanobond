const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

// The initial replacement scripts left some dangling commas because they replaced
// `box-shadow: 0 0 30px var(--cyan-glow)` with nothing but left `, 0 0 60px ...`
// Let's completely strip out any box-shadows starting with a comma in hover states.

css = css.replace(/,\s*0\s*0\s*\d+px\s*var\(--[a-z]+-glow\);/g, 'box-shadow: none;');

// In case the replacement creates double box-shadow properties
css = css.replace(/box-shadow:\s*none;\s*box-shadow:\s*none;/g, 'box-shadow: none;');

fs.writeFileSync('app/globals.css', css);
