export function registerGlobalEvents(
  io,
  eventBus,
  dropsByMap,
  inventoryManager,
  players,
  mobSpawn,
) {
  console.log("Registrando eventos");

  eventBus.on("drop", (data) => {
    const { mapId } = data.mob;

    if (!dropsByMap.has(mapId)) {
      dropsByMap.set(mapId, new Map());
    }

    const mapDrops = dropsByMap.get(mapId);

    const uid = crypto.randomUUID();
    data.item.uidDrop = uid;
    const drop = {
      uid,
      item: data.item,
      x: data.mob.position.x,
      y: data.mob.position.y,
    };

    mapDrops.set(uid, drop);

    io.to(mapId).emit("drop_spawned", drop);
  });

  eventBus.on("mob_spawned", (mob) => {
    io.to(mob.mapId).emit("mob_spawned", mob);
  });

  eventBus.on("mob_removed", (mob) => {
    io.to(mob.mapId).emit("mob_removed", mob);
  });

  eventBus.on("laco_usado", (payload) => {
    const socket = payload?.socket ?? null;
    if (!socket) return;
    const inventorySystem = inventoryManager.get(socket.data.playerId, socket);
    const player = players.get(socket.id);
    if (!player || !inventorySystem) return;

    const mobs = mobSpawn.getDeadsMobsByMap(player.mapId);

    if (player.useLasso(mobs)) inventorySystem.removeItem(payload.item.uid, 1);
    socket.emit("petSync", player.pets);
  });

  console.log("EvenBus - Drop - Registrado");
}
