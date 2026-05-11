export default function parsePlayerSpawn(mapData) {
  const layer = mapData.layers.find((l) => l.name === "Player");

  if (!layer) {
    console.warn("Layer 'Player' não encontrada no mapa");
    return null;
  }

  if (!layer.objects || layer.objects.length === 0) {
    console.warn("Layer 'Player' não possui objetos");
    return null;
  }

  if (layer.objects.length > 1) {
    console.warn("Layer 'Player' possui mais de um spawn, usando o primeiro");
  }

  const obj = layer.objects[0];

  return {
    x: obj.x,
    y: obj.y,
  };
}
