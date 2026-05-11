import PlayerEntity from "../entities/Player.js";

export default function registerPlayerEvents({ io, socket, context }) {
  const {
    players,
    inventoryManager,
    saveManager,
    mobSpawn,
    playerEconomy,
    eventBus,
  } = context;

  // =========================
  // 🧠 HELPERS
  // =========================

  function getPlayer() {
    return players.get(socket.id);
  }

  function getSave(playerId) {
    return saveManager.load(playerId)?.save;
  }

  // =========================
  // 👤 PLAYER JOIN
  // =========================

  socket.on("change_equip", () => {
    const player = players.get(socket.id);
    player.equipment[slot] = item;
    player.stats.invalidateEquipment();
  });

  socket.on("player_join", () => {
    const { playerId } = socket.data;
    if (!playerId) return;

    const save = getSave(playerId);
    if (!save?.player) return;

    const player = new PlayerEntity({ socket, save, playerId, context });

    players.set(socket.id, player);

    socket.join(player.mapId);
    socket.data.mapId = player.mapId;
    // inventory
    const inventory = inventoryManager.get(playerId);
    socket.emit("inventory_sync", inventory.getInventory());

    // sync player
    socket.emit("player_init", player);

    io.to(player.mapId).emit("player_joined", player.toNetwork());
  });

  // =========================
  // 🚶 MOVIMENTO
  // =========================

  socket.on("player_move", ({ position }) => {
    const player = getPlayer();
    if (!player || !position) return;
    player.position = position;
    player.x = position.x;
    player.y = position.y;

    socket.to(player.mapId).emit("player_moved", player.toNetwork());
  });

  // =========================
  // 🗺️ MAPA
  // =========================

  socket.on("enter_map", ({ mapId }) => {
    const player = getPlayer();
    if (!player) return;

    if (player.mapId) {
      socket.leave(player.mapId);
    }

    player.mapId = mapId;
    socket.join(mapId);

    // mobs do mapa
    const mobs = mobSpawn.getMobsByMap(mapId);

    socket.emit("mobs_sync", mobs);
  });

  // =========================
  // 💾 SAVE (PERIÓDICO)
  // =========================

  eventBus.on("Save_player", persistPlayer);

  function persistPlayer() {
    const player = getPlayer();
    if (!player) return;
    const save = getSave(player.getPlayerId());

    if (!save?.player) return;

    const data = { player: player };
    saveManager.update(player.getPlayerId(), data);
  }

  const saveInterval = setInterval(persistPlayer, 5000);

  // =========================
  // ❌ DISCONNECT
  // =========================

  socket.on("disconnect", () => {
    console.log("Player saiu:", socket.id);

    const player = getPlayer();

    if (player) {
      persistPlayer();
      players.delete(socket.id);
      io.emit("player_left", socket.id);
    }

    if (socket.data.playerId) {
      saveManager.unload(socket.data.playerId);
    }

    clearInterval(saveInterval);
  });
}
