import { ENEMY_TYPES } from "../types/enemyTypes.js";

export default class SpawnSystem {
  constructor(eventBus, config = {}) {
    this.state = "WAVE";
    this.waveIndex = 1;
    this.mapLevel = config.mapLevel || 1;
    this.mapName = config.mapName || "newMapIni";
    this.mobAreas = config.mobAreas || [];
    this.bossAreas = config.bossAreas || [];
    this.areas = {};
    this.mobs = new Map();
    this.typesEnemies = Object.keys(ENEMY_TYPES);
    this.eventBus = eventBus;

    this.difficulty = config.difficulty || 1;
    this.mapConfig = config.mapConfig || { waves: 10, bossLevels: [2, 5, 10] };
    this.spawned = false;
  }

  configure(config = {}) {
    this.mapLevel = config.mapLevel || this.mapLevel;
    this.mapName = config.mapId || this.mapName;
    this.mobAreas = config.mobAreas || this.mobAreas;
    this.bossAreas = config.bossAreas || this.bossAreas;
    this.difficulty = config.difficulty || this.difficulty;

    if (config.reset) {
      this.reset();
    }
  }

  reset() {
    this.areas = {};
    this.mobs.clear();
    this.spawned = false;
    this.waveIndex = 1;
    this.state = "WAVE";
  }

  execute() {
    if (this.spawned) this.reSpawnArea();
    if (this.state === "WAVE") this.wavePass();
  }

  tick(players = [], delta = 50) {
    if (!this.spawned) return;

    const targets = Array.from(players).filter((player) => player);
    if (targets.length === 0) return;

    for (const mob of this.mobs.values()) {
      if (mob.dead) continue;

      if (mob.attackTimer > 0) {
        mob.attackTimer -= delta;
      }

      if (mob.state === "return") {
        this.updateReturnState(mob, delta);
        continue;
      }

      const target = this.getNearestPlayer(mob, targets);
      if (!target) {
        this.stopMob(mob);
        continue;
      }

      this.updateAggroState(mob, target, delta);
      this.applyMovement(mob, delta);
    }
  }

  updateReturnState(mob, delta) {
    const dx = mob.origin.x - mob.position.x;
    const dy = mob.origin.y - mob.position.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < 4) {
      mob.state = "idle";
      this.stopMob(mob);
      return;
    }

    this.moveMob(dx, dy, Math.sqrt(distSq), delta, mob);
    this.applyMovement(mob, delta);
  }

  updateAggroState(mob, player, delta) {
    const dx = player.x - mob.position.x;
    const dy = player.y - mob.position.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq) || 1;

    const detectionSq = mob.detectionRange ** 2;
    const attackSq = mob.attackRange ** 2;
    const leashRange = mob.returnType?.leashRange;

    if (leashRange && mob.state !== "attack") {
      const dxSpawn = mob.position.x - mob.origin.x;
      const dySpawn = mob.position.y - mob.origin.y;
      const distSqSpawn = dxSpawn * dxSpawn + dySpawn * dySpawn;

      if (distSqSpawn > leashRange ** 2 && mob.returnType?.canReturnToOrigin) {
        mob.state = "return";
        return;
      }
    }

    if (distSq <= attackSq) {
      mob.state = "attack";
      this.stopMob(mob);
      return;
    }

    if (distSq <= detectionSq) {
      mob.state = "aggro";
      this.moveMob(dx, dy, dist, delta, mob);
      return;
    }

    if (mob.returnType?.canReturnToOrigin) {
      mob.state = "return";
      return;
    }

    mob.state = "idle";
    this.stopMob(mob);
  }

  moveMob(dx, dy, dist, delta, mob) {
    const dt = delta / 1000;
    const dirX = dx / dist;
    const dirY = dy / dist;
    const slowRadius = 1;
    const speedFactor = dist < slowRadius ? dist / slowRadius : 1;
    const speed = (mob.speed || 100) * speedFactor;
    const targetVX = dirX * speed;
    const targetVY = dirY * speed;
    const smooth = 5;

    mob.velocity.x += (targetVX - mob.velocity.x) * smooth * dt;
    mob.velocity.y += (targetVY - mob.velocity.y) * smooth * dt;
  }

  applyMovement(mob, delta) {
    const dt = delta / 1000;

    mob.position.x += mob.velocity.x * dt;
    mob.position.y += mob.velocity.y * dt;
  }

  stopMob(mob) {
    mob.velocity.x = 0;
    mob.velocity.y = 0;
  }

  getNearestPlayer(mob, players) {
    let nearest = null;
    let nearestDistSq = Infinity;

    for (const player of players) {
      const dx = player.x - mob.position.x;
      const dy = player.y - mob.position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < nearestDistSq) {
        nearest = player;
        nearestDistSq = distSq;
      }
    }

    return nearest;
  }

  wavePass() {
    if (this.spawned) return;

    this.spawnAllGroups();
    this.startBoss();
    this.spawned = true;
  }

  spawnInitial(config = {}) {
    this.configure({ ...config, reset: config.reset ?? true });
    this.wavePass();
    return this.getSnapshot();
  }

  spawnAllGroups() {
    const amount = this.getMobAmount();
    this.spawnFromAreas(this.mobAreas, amount);
  }

  spawn(nomeArea, area, isBoss = false, level = 1) {
    const position = this.getRandomPointFromObject(area);
    const enemyKey = this.getEnemyKeyFromArea(area);
    const baseConfig = ENEMY_TYPES[enemyKey] || this.randomType();
    const finalConfig = this.scaleEnemyConfig(baseConfig, level, isBoss);

    const mob = this.createEnemyData({
      position,
      enemyKey,
      mapId: this.mapName,
      config: finalConfig,
      isBoss,
      area: nomeArea,
      level,
    });

    this.mobs.set(mob.id, mob);
    return mob;
  }

  reSpawnArea() {
    const keys = Object.keys(this.areas).filter((key) => this.areas[key]);
    if (keys.length === 0) return null;

    if (this.getTotalMobAmount() >= this.getMobAmount() * keys.length) {
      return null;
    }

    const areaEscolhida = keys[Math.floor(Math.random() * keys.length)];
    const areaData = this.areas[areaEscolhida];
    const mob = this.spawn(
      areaEscolhida,
      areaData.local,
      areaData.isBoss,
      areaData.level,
    );

    areaData.qty++;
    return mob;
  }

  spawnFromAreas(areas = [], amount, isBoss = false) {
    const nameArea = isBoss ? "BossArea" : "area";

    areas.forEach((area) => {
      const level = Object.keys(this.areas).length + 1;
      const nomeArea = nameArea + Object.keys(this.areas).length;

      this.areas[nomeArea] = {
        qty: 0,
        local: area,
        isBoss,
        level,
      };

      for (let i = 0; i < amount; i++) {
        this.spawn(nomeArea, area, isBoss, level);
        this.areas[nomeArea].qty++;
      }
    });
  }

  startBoss() {
    this.spawnFromAreas(this.bossAreas, 1, true);
  }

  removeMob(id) {
    return this.mobs.delete(id);
  }

  applyDamage({ id, amount = 0, attackerId = null, mapId } = {}) {
    const mob = this.mobs.get(id);
    if (!mob || mob.dead) return null;

    const damage = Math.max(0, Number(amount) || 0);
    mob.health = Math.max(0, mob.health - damage);

    const result = {
      id: mob.id,
      attackerId,
      amount: damage,
      health: mob.health,
      maxHealth: mob.maxHealth,
      dead: mob.health <= 0,
      mob,
    };

    if (!result.dead) return result;

    mob.dead = true;
    this.eventBus.emit("mob_death", mob);
    result.reward = {
      gold: mob.gold || 0,
      exp: mob.exp || 0,
      crystal: mob.crystal || 0,
    };
    result.kill = {
      id: mob.id,
      type: mob.dropType,
      target: mob.dropType,
      enemyType: mob.enemyKey,
      renderName: mob.renderName,
      area: mob.area,
      isBoss: mob.isBoss,
      level: mob.level,
    };

    this.removeMob(mob.id);
    result.respawn = this.reSpawnArea();

    return result;
  }

  getSnapshot() {
    return {
      mapName: this.mapName,
      difficulty: this.difficulty,
      mobs: Array.from(this.mobs.values()),
    };
  }

  getStateSnapshot() {
    return Array.from(this.mobs.values()).map((mob) => ({
      id: mob.id,
      position: {
        x: mob.position.x,
        y: mob.position.y,
      },
      velocity: mob.velocity,
      state: mob.state,
      health: mob.health,
      maxHealth: mob.maxHealth,
      dead: mob.dead,
    }));
  }

  getRandomPointFromObject(obj) {
    if (!obj) return { x: 0, y: 0 };

    if (obj.ellipse) {
      const rx = obj.width / 2;
      const ry = obj.height / 2;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());

      return {
        x: obj.x + rx + Math.cos(angle) * rx * r,
        y: obj.y + ry + Math.sin(angle) * ry * r,
      };
    }

    return {
      x: obj.x + Math.random() * obj.width,
      y: obj.y + Math.random() * obj.height,
    };
  }

  getMobAmount() {
    return Math.floor(5 * Math.pow(1.5, this.difficulty - 1));
  }

  getTotalMobAmount() {
    return this.mobs.size;
  }

  getEnemyKeyFromArea(area) {
    const key = area?.properties?.[0]?.value;
    return ENEMY_TYPES[key] ? key : this.randomEnemyKey();
  }

  randomEnemyKey() {
    return this.typesEnemies[
      Math.floor(Math.random() * this.typesEnemies.length)
    ];
  }

  randomType() {
    return ENEMY_TYPES[this.randomEnemyKey()];
  }

  createEnemyData({ position, enemyKey, config, isBoss, area, level }) {
    return {
      id:
        "mob_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2),
      type: "enemy",
      enemyKey,
      renderName: config.renderName || enemyKey,
      position: { x: position.x, y: position.y },
      origin: { x: position.x, y: position.y },
      velocity: { x: 0, y: 0 },
      area,
      level,
      mapId: this.mapName,
      isBoss,
      dead: false,
      state: "idle",
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      exp: config.exp,
      gold: config.gold,
      crystal: config.crystal || 0,
      behavior: config.behavior,
      detectionRange: config.detectionRange,
      attackRange: config.attackRange,
      attackCooldown: config.attackCooldown,
      attackTimer: config.attackTimer || 0,
      dropType: config.dropType,
      returnType: config.returnType,
    };
  }

  scaleEnemyConfig(baseConfig, level = 1, isBoss = false) {
    const scale = 1 + (level - 1) * 0.15;

    const scaled = {
      ...baseConfig,
      health: Math.floor(baseConfig.health * scale),
      damage: Math.floor(baseConfig.damage * scale),
      exp: Math.floor(baseConfig.exp * scale),
      gold: Math.floor(baseConfig.gold + level),
      attackRange: baseConfig.attackRange,
      speed: baseConfig.speed,
    };

    if (isBoss && baseConfig.boss) {
      Object.assign(scaled, {
        ...baseConfig.boss,
        health: Math.floor(baseConfig.boss.health * scale),
        damage: Math.floor(baseConfig.boss.damage * scale),
      });
    }

    return scaled;
  }
}
