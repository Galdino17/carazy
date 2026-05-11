export default function ({ eventBus, socket, context }) {
  const { inventoryManager } = context;
  const inventorySystem = inventoryManager.get(socket.data.playerId, socket);

  context.eventBus.on("devolve", ({ socketId, item, qty = 1 }) => {
    const inv = inventorySystem.addItem(item, qty);
    socket.emit("inventory_sync", inv);
    console.log(socketId, socket.id);
    // io.to(player).emit("mob_removed", mob);
  });

  socket.on("inventory_get", () => {
    socket.emit("inventory_sync", inventorySystem.getInventory());
  });

  socket.on("inventory_extract_one", ({ index }, callback) => {
    const item = inventorySystem.extractOne(index);
    // 🔥 retorno direto (ACK)
    if (callback) {
      // console.log(callback, item);
      callback({ item });
    }

    // 🔥 sync estado
    socket.emit("inventory_sync", inventorySystem.getInventory());
  });

  socket.on("inventory_add", ({ item, qty }) => {
    const inv = inventorySystem.addItem(item, qty);
    socket.emit("inventory_sync", inv);
  });

  socket.on("inventory_remove", ({ inventoryUid, qty }) => {
    const inventory = inventorySystem.removeItem(inventoryUid, qty);
    socket.emit("inventory_sync", inventory);
  });

  socket.on("inventory_fn", async ({ fn, params }, callback) => {
    try {
      const result = await inventorySystem.handle(fn, params);

      if (callback) {
        callback({ ok: true, result });
      }

      // sempre sincroniza estado
      socket.emit("inventory_sync", inventorySystem.getInventory());
    } catch (err) {
      if (callback) {
        callback({ ok: false, error: err.message });
      }
    }
  });
}
