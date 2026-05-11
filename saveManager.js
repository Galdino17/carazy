import parsePlayerSpawn from "./maps/parsePlayerSpawn.js";
import SaveStore from "./saveStore.js";

export default class SaveManager {
  constructor(
    maps,
    { store = new SaveStore(), autosaveMs = 5000, queueTickMs = 200 } = {},
  ) {
    this.store = store;
    this.autosaveMs = autosaveMs;
    this.queueTickMs = queueTickMs;
    this.saves = new Map();
    this.dirtyPlayers = new Set();
    this.saveQueue = [];
    this.queuedPlayers = new Set();
    this.autosaveTimer = null;
    this.queueTimer = null;
    this.maps = maps;
  }

  start() {
    if (!this.autosaveTimer) {
      this.autosaveTimer = setInterval(
        () => this.enqueueDirtyPlayers(),
        this.autosaveMs,
      );
    }

    if (!this.queueTimer) {
      this.queueTimer = setInterval(
        () => this.processQueueItem(),
        this.queueTickMs,
      );
    }
  }

  stop() {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
    if (this.queueTimer) clearInterval(this.queueTimer);
    this.autosaveTimer = null;
    this.queueTimer = null;
  }

  // load(playerId, defaultSave = null) {
  //   if (!playerId) return null;

  //   if (!this.saves.has(playerId)) {
  //     this.saves.set(playerId, this.store.load(playerId) || defaultSave);
  //   }

  //   return this.getSnapshot(playerId);
  // }

  load(playerId) {
    // loadOrCreate
    if (!playerId) return null;

    if (!this.saves.has(playerId)) {
      const stored = this.store.load(playerId);

      if (stored) {
        const mergedStored = this.mergeDeep(this.createDefaultSave(), stored);
        this.saves.set(playerId, mergedStored);
      } else {
        const defaultSave = this.createDefaultSave();
        this.saves.set(playerId, defaultSave);
        this.store.save(playerId, defaultSave); // importante
      }
    }

    return this.getSnapshot(playerId);
  }

  getInventory(save) {
    if (!save.inventory || !save.inventory.slots) {
      save.inventory = {
        slots: Array(36).fill(null),
        size: 36,
      };
    }
    return save.inventory;
  }

  getPosition(playerId) {
    const save = this.saves.get(playerId);
    if (!save?.player?.position) {
      return { x: 0, y: 0 };
    }

    return save.player.position;
  }

  // update(playerId, data) {
  //   if (!playerId || !data) return null;

  //   this.saves.set(playerId, data);
  //   this.dirtyPlayers.add(playerId);

  //   return this.getSnapshot(playerId);
  // }

  update(playerId, data) {
    if (!playerId || !data) return null;

    const current = this.saves.get(playerId) || {};

    // const merged = {
    //   ...current,
    //   ...data,
    // };
    const merged = this.mergeDeep(current, data);

    this.saves.set(playerId, merged);
    this.dirtyPlayers.add(playerId);

    return this.getSnapshot(playerId);
  }

  mergeDeep(target, source) {
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        target[key] = this.mergeDeep(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  enqueueDirtyPlayers() {
    for (const playerId of this.dirtyPlayers) {
      this.enqueueSave(playerId);
    }
  }

  enqueueSave(playerId) {
    if (!playerId || this.queuedPlayers.has(playerId)) return;

    this.saveQueue.push(playerId);
    this.queuedPlayers.add(playerId);
  }

  processQueueItem() {
    const playerId = this.saveQueue.shift();
    if (!playerId) return null;

    this.queuedPlayers.delete(playerId);
    return this.save(playerId);
  }

  save(playerId) {
    const data = this.saves.get(playerId);
    if (!data) {
      this.dirtyPlayers.delete(playerId);
      return null;
    }

    this.store.save(playerId, data);
    this.dirtyPlayers.delete(playerId);

    return this.getSnapshot(playerId);
  }

  saveNow(playerId) {
    this.queuedPlayers.delete(playerId);
    this.saveQueue = this.saveQueue.filter((id) => id !== playerId);
    return this.save(playerId);
  }

  unload(playerId, { save = true } = {}) {
    if (!playerId) return;

    if (save && this.dirtyPlayers.has(playerId)) {
      this.saveNow(playerId);
    }

    this.saves.delete(playerId);
    this.dirtyPlayers.delete(playerId);
    this.queuedPlayers.delete(playerId);
    this.saveQueue = this.saveQueue.filter((id) => id !== playerId);
  }

  createDefaultSave() {
    return {
      player: {
        level: 1,
        exp: 0,
        crystal: 0,
        gold: 0,
        health: 80,
        statsPoints: 0,
        expTotal: 0,
        sp: 50,
        mapId: "NewMapIni",
        position: this.maps.player ?? { x: 2857, y: 944 },
        velocity: { x: 0, y: 0 },
      },

      inventory: { slots: Array(36).fill(null), size: 36 },
      uisOpeneds: { char: false, inventory: false, stats: false },
      settings: {
        volume: 1,
        graphics: "high",
      },
      baseStats: {
        speed: 80,
        damage: 5,
        atkspd: 1,
        regen: 0,
        maxHealth: 80,
        attackRange: 70,
      },

      meta: {
        createdAt: Date.now(),
        version: 2.3,
      },
    };
  }

  getSnapshot(playerId) {
    return {
      playerId,
      save: this.saves.get(playerId) || null,
    };
  }
}
