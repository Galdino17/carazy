import { ITEMS_DB } from "../types/ITEMS_DB.js";

const LOOT_TABLE = Object.values(ITEMS_DB).map((element) => {
  return element.loot;
});

const RARITY = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export default class DropSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.cache = new Map();

    this.eventBus.on("mob_death", (mob) => {
      this.rollMultiple(mob.level, mob.isBoss, mob); // DEBUG (ADD Player Luck)
    });
  }

  // Tabela Pré calculada
  getTable(level, luck, isBoss, type = "all") {
    const key = `${level}_${luck}_${isBoss}_${type}`;

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const table = [];
    let totalWeight = 0;

    for (const item of LOOT_TABLE) {
      if (level < item.lvl) continue;

      // 🔹 filtro por tipo (aqui está o ganho)
      if (type === "potion" && !item.id.includes("potion")) continue;
      if (type === "rare" && item.id.includes("potion")) continue;

      let weight = this.getWeight(item, level);
      weight *= RARITY[item.rarity];
      weight *= 1 + luck * 0.01;
      weight *= 1 + (isBoss ? 0.2 : 0);

      totalWeight += weight;

      table.push({
        id: item.id,
        weight,
      });
    }

    const result = { table, totalWeight };

    this.cache.set(key, result);

    return result;
  }

  rollFromTable(level, luck, isBoss, type = "all") {
    const { table, totalWeight } = this.getTable(level, luck, isBoss, type);

    let roll = Math.random() * totalWeight;

    for (const item of table) {
      if (roll < item.weight) return item.id;
      roll -= item.weight;
    }

    return null;
  }

  rollLoot(level, luck = 0, isBoss) {
    if (!isBoss) {
      const chance = Math.random();

      if (chance < 0.7) {
        //DEBUG é 0.7
        return null;
      } else if (chance < 0.95) {
        return this.rollPotion(level);
      } else {
        return this.rollRare(level, luck);
      }
    }

    return this.rollBossLoot(level, luck);
  }

  rollPotion(level) {
    return this.rollFromTable(level, 0, false, "potion");
  }

  rollRare(level, luck) {
    return this.rollFromTable(level, luck, false, "rare");
  }

  rollBossLoot(level, luck) {
    return this.rollFromTable(level, luck + 50, true, "all");
  }

  // 🎁 Função para gerar múltiplos drops de uma vez
  rollMultiple(level, isBoss, mob, luck = 0, count = 1) {
    const newCount = isBoss ? count * 5 : count;

    // 📦 Lista final de itens dropados
    const drops = [];

    // 🔁 Repete o processo várias vezes
    for (let i = 0; i < newCount; i++) {
      // 🎲 Cada vez roda um novo sorteio independente
      const item = this.rollLoot(level, luck, isBoss);
      if (item) drops.push(item);
    }

    if (drops.length > 0) this.addDropsToInventory(drops, mob);
  }

  addDropsToInventory(drops, mob) {
    const normalized = this.normalizeDrops(drops);

    for (const name in normalized) {
      const qty = normalized[name];
      const item = ITEMS_DB[name];
      item.id = name;
      item.crafted = false;
      item.amountable = true;
      item.qty = qty;
      item.position = mob.position;
      item.uidDrop = crypto.randomUUID();
      const data = { item, mob };
      this.eventBus.emit("drop", data);
    }
  }

  getWeight(item, level) {
    const rarityFactor = RARITY[item.rarity];

    // quanto maior o level, mais favorece raros
    const levelBonus = level * 0.05;

    return item.weight * (1 + levelBonus * rarityFactor);
  }

  normalizeDrops(drops) {
    const result = {};

    for (const id of drops) {
      if (!result[id]) {
        result[id] = 0;
      }
      result[id]++;
    }

    return result;
  }

  generateUID() {
    return crypto.randomUUID();
  }
}
