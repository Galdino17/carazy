export default class PlayerStats {
  constructor(player) {
    this.player = player;

    this._statVersion = 0;
    this._cache = {};
    this._cacheVersion = {};

    this._equipmentCache = {};
    this._equipmentVersion = 0;
    this._equipmentCacheVersion = -1;
  }

  // =============================
  // INVALIDAÇÃO
  // =============================
  invalidate() {
    this._statVersion++;
  }

  invalidateEquipment() {
    this._equipmentVersion++;
    this.invalidate();
  }

  getFinalStats() {
    return this._cache;
  }

  // =============================
  // GET PRINCIPAL
  // =============================
  get(stat) {
    if (this._cacheVersion[stat] === this._statVersion) {
      return this._cache[stat];
    }

    const value = this.compute(stat);

    this._cache[stat] = value;
    this._cacheVersion[stat] = this._statVersion;

    return value;
  }

  // =============================
  // CORE CALC
  // =============================
  compute(stat) {
    const base = this.getBase(stat);
    const upgrades = this.getUpgrades(stat);
    const equipment = this.getEquipment(stat);

    let add = 0;
    let mult = 1;

    for (const mod of this.player.modifiers || []) {
      if (mod.stat !== stat) continue;

      if (mod.type === "add") add += mod.value;
      if (mod.type === "mul") mult *= mod.value;
    }

    return (base + upgrades + equipment) * mult + add;
  }

  // =============================
  // BASE (LEVEL)
  // =============================
  getBase(stat) {
    const lvl = this.player.level || 1;

    const baseStats = {
      speed: (lvl) => 80,
      damage: (lvl) =>
        lvl * Math.pow(2, 2 - lvl * 0.05) + 5 * Math.pow(1 + 0.08, lvl),
      atkspd: (lvl) => 1 + lvl / 30,
      maxHealth: (lvl) => 80 + (80 / 10) * lvl,
      attackRange: (lvl) => 60 + (4 / 3) * lvl,
      maxSp: (lvl) => 48 + 2 * lvl,
      regenSp: (lvl) => 0.02 * lvl,
    };

    const fn = baseStats[stat];
    if (!fn) return 0;

    return Math.round(fn(lvl) * 100) / 100;
  }

  // =============================
  // UPGRADES
  // =============================
  getUpgrades(stat) {
    if (!this.player.upgrades) return 0;

    return this.player.upgrades[stat] || 0;
  }

  // =============================
  // EQUIPMENT CACHE
  // =============================
  getEquipment(stat) {
    if (this._equipmentCacheVersion !== this._equipmentVersion) {
      this.rebuildEquipmentCache();
    }

    return this._equipmentCache[stat] || 0;
  }

  rebuildEquipmentCache() {
    const total = {};

    const equipment = this.player.equipment || {};

    for (const slot in equipment) {
      const item = equipment[slot];
      if (!item?.equiped) continue;

      for (const stat in item.atributes || {}) {
        total[stat] = (total[stat] || 0) + item.atributes[stat];
      }

      for (const socket of item.sockets || []) {
        if (!socket?.bonus) continue;

        for (const stat in socket.bonus) {
          total[stat] = (total[stat] || 0) + socket.bonus[stat];
        }
      }
    }

    this._equipmentCache = total;
    this._equipmentCacheVersion = this._equipmentVersion;
  }

  // =============================
  // DAMAGE
  // =============================
  getDamage(target) {
    const damage = this.get("damage");

    const critChance = (this.get("critChance") || 0) / 100;
    const critDamage = (this.get("critDamage") || 0) / 100;
    const execute = (this.get("execute") || 0) / 100;
    const powerMulti = (this.get("powerMulti") || 0) / 100;

    const isCrit = Math.random() < critChance;

    const total =
      damage *
      (1 +
        (isCrit ? critDamage : 0) +
        execute * (!target ? 1 : 1 - target.health / target.maxHealth));

    return total * (1 + powerMulti);
  }
}
