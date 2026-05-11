import crypto from "crypto";
import { ENEMY_TYPES } from "../../types/enemyTypes.js";

export function createMob(mapId, area, areaKey) {
  const enemyKey = area.mobType;

  // fallback seguro
  const baseConfig =
    ENEMY_TYPES[enemyKey] || ENEMY_TYPES[Object.keys(ENEMY_TYPES)[0]];

  const x = area.x + Math.random() * area.width;
  const y = area.y + Math.random() * area.height;

  return {
    id: crypto.randomUUID(),

    // identidade
    type: "enemy",
    enemyKey,
    renderName: baseConfig.renderName || enemyKey,

    // mapa
    mapId,
    areaKey,

    // posição
    position: { x, y },
    origin: { x, y },
    velocity: { x: 0, y: 0 },

    // estado
    state: "idle",
    dead: false,

    // combate
    health: baseConfig.health,
    maxHealth: baseConfig.health,
    damage: baseConfig.damage,

    // stats
    speed: baseConfig.speed,
    level: baseConfig.level || 1,

    // comportamento
    behavior: baseConfig.behavior,
    detectionRange: baseConfig.detectionRange,
    attackRange: baseConfig.attackRange,
    attackCooldown: baseConfig.attackCooldown,
    attackTimer: baseConfig.attackTimer || 0,

    // retorno
    returnType: baseConfig.returnType,

    // drop / reward
    dropType: baseConfig.dropType,
    gold: baseConfig.gold,
    exp: baseConfig.exp,
    crystal: baseConfig.crystal || 0,

    // render (client usa isso)
    renderTexture: baseConfig.renderTexture,
  };
}
