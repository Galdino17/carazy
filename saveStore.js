import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export default class SaveStore {
  constructor(dbPath = "./data/crazyrogue.sqlite") {
    this.dbPath = resolve(dbPath);
    mkdirSync(dirname(this.dbPath), { recursive: true });

    this.db = new DatabaseSync(this.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_saves (
        player_id TEXT PRIMARY KEY,
        save_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  load(playerId) {
    const row = this.db
      .prepare(
        `
        SELECT save_json
        FROM player_saves
        WHERE player_id = ?
      `,
      )
      .get(playerId);

    return row ? JSON.parse(row.save_json) : null;
  }

  save(playerId, data) {
    this.db
      .prepare(
        `
        INSERT INTO player_saves (player_id, save_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(player_id) DO UPDATE SET
          save_json = excluded.save_json,
          updated_at = excluded.updated_at
      `,
      )
      .run(playerId, JSON.stringify(data), Date.now());

    return data;
  }
}
