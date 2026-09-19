// G4-R: ¿el deep link building= termina resolviendo selectedBuilding/contexto?
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
const server = await createStaticServer(resolve(process.cwd(), 'build'), 4193);
const b = await chromium.launch({ args: ['--disable-gpu'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4193/?year=1975&place=abadino&building=1-1017-2001-1-1');
for (let i = 0; i < 15; i++) {
  await p.waitForTimeout(2000);
  const s = await p.evaluate(() => {
    const a = window.__mjtApp;
    return {
      sel: a.selectedBuilding?.id ?? null,
      pend: a.pendingBuildingId,
      ctx: a.contextLocal?.kind ?? a.contextLocal,
      plan: a.planningLocal?.kind ?? a.planningLocal,
      ctxEl: !!document.querySelector('.ctx'),
      planEl: !!document.querySelector('.plan, section.plan')
    };
  });
  console.log(i * 2 + 's', JSON.stringify(s));
  if (s.ctxEl) break;
}
await b.close();
server.close();
