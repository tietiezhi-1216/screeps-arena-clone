// 示例 bot（Capture the Flag）：塔打最近的敌人；远程/近战抱团推进，治疗跟随；附近有 BodyPart 就顺路捡
import { getObjectsByPrototype, getTicks } from 'game/utils';
import { Creep, StructureTower, Flag } from 'game/prototypes';
import { ATTACK, RANGED_ATTACK, HEAL, ERR_NOT_IN_RANGE } from 'game/constants';
import { BodyPart } from 'arena/season_2/capture_the_flag/basic';

export function loop() {
  const mine = getObjectsByPrototype(Creep).filter(c => c.my), enemies = getObjectsByPrototype(Creep).filter(c => !c.my);
  const enemyFlag = getObjectsByPrototype(Flag).find(f => f.my === false), myFlag = getObjectsByPrototype(Flag).find(f => f.my);
  const parts = getObjectsByPrototype(BodyPart);
  for (const t of getObjectsByPrototype(StructureTower).filter(t => t.my)) {
    const e = t.findClosestByRange(enemies); if (e && t.getRangeTo(e) <= 20) t.attack(e);
  }
  const push = getTicks() > 150 || mine.length > enemies.length + 3;
  for (const c of mine) {
    const has = t => c.body.some(p => p.type === t && p.hits > 0);
    const e = c.findClosestByRange(enemies);
    if (has(HEAL)) {
      const hurt = c.findClosestByRange(mine.filter(m => m.hits < m.hitsMax && m !== c));
      if (hurt) { if (c.heal(hurt) === ERR_NOT_IN_RANGE) { c.rangedHeal(hurt); c.moveTo(hurt); } }
      else { const buddy = c.findClosestByRange(mine.filter(m => !m.body.some(p => p.type === HEAL))); if (buddy) c.moveTo(buddy); }
      continue;
    }
    if (has(RANGED_ATTACK) && e && c.getRangeTo(e) <= 3) c.rangedAttack(e);
    if (has(ATTACK) && e && c.getRangeTo(e) <= 1) c.attack(e);
    const part = c.findClosestByRange(parts);
    if (e && c.getRangeTo(e) <= 8) c.moveTo(e);
    else if (part && c.getRangeTo(part) <= 5) c.moveTo(part);
    else if (push && enemyFlag) c.moveTo(enemyFlag);
    else if (myFlag) c.moveTo({ x: myFlag.x + (myFlag.x < 50 ? 8 : -8), y: myFlag.y + (myFlag.y < 50 ? 8 : -8) });
  }
}
