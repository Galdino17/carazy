// spawn/SpawnSystem.js
import { createMob } from "./MobFactory.js";

export default class SpawnSystem {
  constructor(eventBus, maps) {
    this.eventBus = eventBus;
    this.maps = maps;

    this.mapStates = new Map();
    this.playersByMap = new Map();

    this.mapQueue = Object.keys(maps);
    this.currentIndex = 0;
  }

  // ---------------- TICK ----------------

  tick(players, delta) {
    this._updatePlayers(players);

    // processa poucos mapas por tick (incremental)
    for (let i = 0; i < 2; i++) {
      this._processNextMap(delta);
    }
  }

  _processNextMap(delta) {
    if (this.mapQueue.length === 0) return;

    const mapId = this.mapQueue[this.currentIndex];

    this.currentIndex = (this.currentIndex + 1) % this.mapQueue.length;

    const playerCount = this.playersByMap.get(mapId)?.size || 0;
    const multiplier = playerCount > 0 ? 2 : 0.3;

    this._updateMap(mapId, delta, multiplier);
  }

  // ---------------- PLAYERS ----------------

  _updatePlayers(players) {
    this.playersByMap.clear();

    for (const p of players) {
      if (!p.mapId) continue;

      if (!this.playersByMap.has(p.mapId)) {
        this.playersByMap.set(p.mapId, new Set());
      }

      this.playersByMap.get(p.mapId).add(p.id);
    }
  }

  // ---------------- MAP ----------------

  _updateMap(mapId, delta, multiplier) {
    if (!this.mapStates.has(mapId)) {
      this.mapStates.set(mapId, {
        mobs: new Map(),
        timers: new Map(),
      });
    }

    const state = this.mapStates.get(mapId);

    // limpa mobs mortos
    this._cleanupDeadMobs(mapId, state);

    const areas = this.maps[mapId]["mobs"] ?? [];

    for (const area of areas) {
      this._updateArea(mapId, area, state, delta, multiplier);
    }
  }

  // ---------------- AREA ----------------

  _updateArea(mapId, area, state, delta, multiplier) {
    const key = `${area.x}-${area.y}`;

    if (!state.timers.has(key)) {
      state.timers.set(key, 0);
    }

    let timer = state.timers.get(key);
    timer += delta * multiplier;

    if (timer < area.interval) {
      state.timers.set(key, timer);
      return;
    }

    const mobsInArea = [...state.mobs.values()].filter(
      (m) => m.areaKey === key && !m.dead,
    );

    if (mobsInArea.length < area.max) {
      const mob = createMob(mapId, area, key);

      state.mobs.set(mob.id, mob);

      // 🔥 usa seu eventBus (integra com drop, etc)
      this.eventBus.emit("mob_spawned", mob);
    }

    state.timers.set(key, 0);
  }

  // ---------------- REMOVE ----------------

  removeMob(mapId, mobId) {
    const state = this.mapStates.get(mapId);
    if (!state) return;

    state.mobs.delete(mobId);
  }

  removeMob(mapId, mobId) {
    const state = this.mapStates.get(mapId);
    if (!state) return;

    const mob = state.mobs.get(mobId);
    if (!mob) return;

    // evita duplicar
    if (mob.dead) return;

    mob.dead = true;

    // quando deve sumir
    mob.removeAt = Date.now() + 5000;

    this.eventBus.emit("mob_dead", {
      mapId,
      mobId,
    });
  }

  _cleanupDeadMobs(mapId, state) {
    const now = Date.now();

    for (const [mobId, mob] of state.mobs) {
      if (!mob.dead) continue;

      if (now >= mob.removeAt) {
        state.mobs.delete(mobId);
        mob.toRemove = true;
        this.eventBus.emit("mob_removed", {
          mapId,
          mobId,
        });
      }
    }
  }
  // ---------------- SNAPSHOT ----------------

  getDeadsMobsByMap(mapId) {
    const state = this.mapStates.get(mapId);
    if (!state) return [];

    return [...state.mobs.values().filter((mob) => mob.dead)];
  }

  getMobsByMap(mapId) {
    const state = this.mapStates.get(mapId);
    if (!state) return [];

    return [...state.mobs.values()];
  }

  getStateSnapshot() {
    const result = [];

    for (const [mapId, state] of this.mapStates) {
      for (const mob of state.mobs.values()) {
        result.push(mob);
      }
    }

    return result;
  }
}
