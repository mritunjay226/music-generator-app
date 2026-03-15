const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/edit/page.tsx', 'utf8');

c = c.replace(/bg-\[var\(--bg\)\]/g, 'bg-background');
c = c.replace(/text-\[var\(--fg\)\]/g, 'text-foreground');
c = c.replace(/hover:text-\[var\(--fg\)\]/g, 'hover:text-foreground');
c = c.replace(/flex-shrink-0/g, 'shrink-0');
c = c.replace(/\b(bg|text|border|hover:bg|hover:text|hover:border|accent|placeholder:text)-\[var\((--[a-zA-Z0-9-]+)\)\]/g, '$1-($2)');

const btnOld = `<button
                onClick={() => setOpen(v => !v)}
                className={\`w-full flex items-center gap-3 px-4 py-3 rounded-[10px] border transition-all duration-200 text-left \${selected`;
const btnNew = `<div role="button" tabIndex={0}
                onClick={(() => setOpen(v => !v)) as any}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(v => !v); }}
                className={\`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-[10px] border transition-all duration-200 text-left \${selected`;

c = c.replace(btnOld, btnNew);
c = c.replace('</button>\n\n            {open && (', '</div>\n\n            {open && (');

fs.writeFileSync('src/app/dashboard/edit/page.tsx', c);
console.log('Fixes applied successfully.');
