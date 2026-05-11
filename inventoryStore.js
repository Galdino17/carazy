import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_INVENTORY_SIZE = 36;

export default class InventoryStore {
  constructor(dbPath = "./data/crazyrogue.sqlite") {
    this.dbPath = resolve(dbPath);
    mkdirSync(dirname(this.dbPath), { recursive: true });

    this.db = new DatabaseSync(this.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_inventories (
        player_id TEXT PRIMARY KEY,
        slots_json TEXT NOT NULL,
        size INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  getInventory(playerId) {
    const row = this.db
      .prepare(
        `
        SELECT slots_json, size
        FROM player_inventories
        WHERE player_id = ?
      `,
      )
      .get(playerId);

    if (!row) {
      return this.createDefaultInventory();
    }

    return {
      slots: this.normalizeSlots(JSON.parse(row.slots_json), row.size),
      size: row.size,
    };
  }

  saveInventory(playerId, inventory) {
    const size = inventory?.size || DEFAULT_INVENTORY_SIZE;
    const slots = this.normalizeSlots(inventory?.slots || [], size);

    this.db
      .prepare(
        `
        INSERT INTO player_inventories (player_id, slots_json, size, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(player_id) DO UPDATE SET
          slots_json = excluded.slots_json,
          size = excluded.size,
          updated_at = excluded.updated_at
      `,
      )
      .run(playerId, JSON.stringify(slots), size, Date.now());

    return { slots, size };
  }

  createDefaultInventory(size = DEFAULT_INVENTORY_SIZE) {
    return {
      slots: Array(size).fill(null),
      size,
    };
  }

  normalizeSlots(slots, size = DEFAULT_INVENTORY_SIZE) {
    const normalized = Array(size).fill(null);
    const source = Array.isArray(slots) ? slots : [];

    for (let i = 0; i < Math.min(source.length, size); i++) {
      normalized[i] = source[i] || null;
    }

    return normalized;
  }
}
