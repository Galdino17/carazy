export default function registerUseItemEvents({ io, socket, context }) {
  const { players, saveManager, mobSpawn, useItemSystem, eventBus } = context;
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

  socket.on("useItem", ({ item, toEquip, craftUiVisible }) => {
    const player = players.get(socket.id);
    if (!player) return;
    useItemSystem.useItem({ socket, player, item }, toEquip, craftUiVisible);

    // Vou ter que criar o Use System tirar depois o poder usar direto do client DEBUG
  });
}
