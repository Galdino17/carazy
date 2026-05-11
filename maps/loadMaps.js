import fs from "fs";
import path from "path";
import parseSpawnAreas from "./spawns/parseSpawnAreas.js";
import parsePlayerSpawn from "./parsePlayerSpawn.js";

export function loadMaps() {
  const maps = {};

  const mapsDir = path.resolve("./maps");
  const files = fs.readdirSync(mapsDir);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const fullPath = path.join(mapsDir, file);
    const raw = fs.readFileSync(fullPath);
    const mapData = JSON.parse(raw);

    // 🔥 AQUI está a mudança importante
    const mapId = file.replace(".json", "");

    maps[mapId] = {};
    maps[mapId]["mobs"] = parseSpawnAreas(mapData);
    maps[mapId]["player"] = parsePlayerSpawn(mapData);
    console.log(maps);
  }

  return maps;
}
