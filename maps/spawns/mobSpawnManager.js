import { createMob } from "./MobFactory.js";

export default class MobSpawnManager {
  constructor(io, maps) {
    this.io = io;
    this.maps = maps;

    this.mapStates = new Map(); // estado dos mobs
    this.playersByMap = new Map(); // controle de players

    this.mapQueue = Object.keys(maps);
    this.currentIndex = 0;

    this._startLoop();
  }

  // ---------------- LOOP ----------------

  _startLoop() {
    setInterval(() => {
      this._processNextMap();
    }, 200);
  }

  _processNextMap() {
    if (this.mapQueue.length === 0) return;

    const mapId = this.mapQueue[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.mapQueue.length;

    const playerCount = this.playersByMap.get(mapId)?.size || 0;

    const multiplier = playerCount > 0 ? 2 : 0.3;

    this._updateMap(mapId, multiplier);
  }

  // ---------------- MAP ----------------

  _updateMap(mapId, multiplier) {
    if (!this.mapStates.has(mapId)) {
      this.mapStates.set(mapId, {
        mobs: new Map(),
        timers: new Map(),
      });
    }

    const state = this.mapStates.get(mapId);
    const areas = this.maps[mapId];

    for (const area of areas) {
      this._updateArea(mapId, area, state, multiplier);
    }
  }

  // ---------------- AREA ----------------

  _updateArea(mapId, area, state, multiplier) {
    const key = `${area.x}-${area.y}`;

    if (!state.timers.has(key)) {
      state.timers.set(key, 0);
    }

    const now = Date.now();
    const last = state.timers.get(key);

    if (now - last < area.interval / multiplier) return;

    const mobsInArea = [...state.mobs.values()].filter(
      (m) => m.areaKey === key,
    );

    if (mobsInArea.length >= area.max) return;

    const mob = createMob(mapId, area, key);

    state.mobs.set(mob.id, mob);
    state.timers.set(key, now);

    this.io.to(mapId).emit("mob_spawned", mob);
  }

  // ---------------- PLAYERS ----------------

  onPlayerEnterMap(playerId, mapId) {
    if (!this.playersByMap.has(mapId)) {
      this.playersByMap.set(mapId, new Set());
    }

    this.playersByMap.get(mapId).add(playerId);
  }

  onPlayerLeaveMap(playerId, mapId) {
    this.playersByMap.get(mapId)?.delete(playerId);
  }

  // ---------------- REMOVE ----------------

  removeMob(mapId, mobId) {
    const state = this.mapStates.get(mapId);
    if (!state) return;

    state.mobs.delete(mobId);
  }

  // ---------------- DEBUG / SYNC ----------------

  getMobsByMap(mapId) {
    return Array.from(this.mapStates.get(mapId)?.mobs.values() || []);
  }
}
