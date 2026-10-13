import fs from 'fs'; const src = fs.readFileSync(new URL('./core.mjs', import.meta.url), 'utf8');
const names = ['', 'beginner', 'easy', 'normal', 'hard', 'expert', 'master'];
for (let t = 1; t <= 6; t++) for (const d of ['bots/ai', 'www/bots/ai']) fs.writeFileSync(`${d}/${names[t]}.mjs`, `// AI · 等级 ${t}（自动生成自 bots/ai/src/core.mjs）\n` + src.replace('__TIER__', t));
