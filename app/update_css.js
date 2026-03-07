const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

// remove glows
css = css.replace(/rgba\(.*?, 0\.15\)/g, 'transparent');
css = css.replace(/rgba\(.*?, 0\.1\)/g, 'transparent');
css = css.replace(/box-shadow:.*?-glow\)?;?/g, '');
css = css.replace(/box-shadow: 0 8px 32px var\(--cyan-glow\).*?;/g, 'box-shadow: none;');

// remove gradients from buttons
css = css.replace(/background: linear-gradient\(135deg, var\(--cyan\), var\(--cyan-dim\)\);/g, 'background: var(--cyan);');
css = css.replace(/background: linear-gradient\(135deg, var\(--magenta\), var\(--magenta-dim\)\);/g, 'background: var(--magenta);');
css = css.replace(/background: linear-gradient\(135deg, var\(--acid\), var\(--acid-dim\)\);/g, 'background: var(--acid);');
css = css.replace(/background: linear-gradient\(135deg, transparent, rgba\(255, 255, 255, 0\.2\), transparent\);/g, 'background: transparent;');

// progress bar gradient
css = css.replace(/background: linear-gradient\(90deg, var\(--cyan\), var\(--acid\)\);/g, 'background: var(--cyan);');
css = css.replace(/background: linear-gradient\(90deg, transparent, rgba\(255, 255, 255, 0\.3\), transparent\);/g, 'background: transparent;');

// remove keyframes that mention glows
css = css.replace(/box-shadow:.*?var\(--.*?glow\).*?;/g, 'box-shadow: none;');

fs.writeFileSync('app/globals.css', css);
