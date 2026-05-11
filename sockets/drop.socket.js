export default function ({ io, socket, context }) {
  const { dropsByMap, inventoryManager } = context;

  // registra UMA vez (cuidado com duplicação)
  socket.on("drop_pickup", ({ uidDrop }) => {
    const mapId = socket.data.mapId;
    const mapDrops = dropsByMap.get(mapId);

    if (!mapDrops) return;

    const drop = mapDrops.get(uidDrop);

    if (!drop) {
      console.log("Drop já foi pego ou não existe");
      return;
    }

    // adiciona no inventário
    const inventorySystem = inventoryManager.get(socket.data.playerId, socket);
    const qty = drop.item.qty ?? 1;
    const updatedInventory = inventorySystem.addItem(drop.item, qty);

    // 🔥 GARANTE sincronização imediata
    socket.emit("inventory_sync", updatedInventory);

    // remove do servidor
    mapDrops.delete(uidDrop);
    // 🔥 AVISA TODO MUNDO DO MAPA

    io.to(mapId).emit("drop_pickup", { uidDrop });
  });

  socket.on("drop_player", (data) => {
    const mapId = socket.data.mapId;
    if (!dropsByMap.has(mapId)) {
      dropsByMap.set(mapId, new Map());
    }

    const mapDrops = dropsByMap.get(mapId);

    const player = context.players.get(socket.id);

    const uid = crypto.randomUUID();
    data.item.uidDrop = uid;
    const drop = {
      uid,
      item: data.item,
      x: player.position.x,
      y: player.position.y,
    };

    mapDrops.set(uid, drop);

    io.to(mapId).emit("drop_spawned", drop);
  });
}
