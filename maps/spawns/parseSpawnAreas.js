export default function parseSpawnAreas(mapData) {
  const spawnAreas = [];

  const layer = mapData.layers.find((l) => l.name === "Mobs");

  if (!layer) return spawnAreas;

  for (const obj of layer.objects) {
    const getProp = (name, def) =>
      obj.properties?.find((p) => p.name === name)?.value ?? def;

    spawnAreas.push({
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      mobType: getProp("mob", "lizard"),
      max: getProp("max", 15),
      interval: getProp("interval", 2500),
    });
  }

  return spawnAreas;
}
