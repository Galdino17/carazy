import { ITEMS_DB } from "../types/ITEMS_DB.js";

export default class ItemUseSystem {
  constructor({ saveManager, io, inventoryManager, players, eventBus }) {
    this.saveManager = saveManager;
    this.io = io;
    this.inventoryManager = inventoryManager;
    this.eventBus = eventBus;
  }

  useItem({ socket, player, item }, toEquip = true, craftUiVisible = false) {
    const inventorySystem = this.inventoryManager.get(
      socket.data.playerId,
      socket,
    );
    switch (item.type) {
      case "consumable":
        this.useConsumable(item, socket, player);
        break;

      case "insignia":
        if (craftUiVisible) {
          const index = inventorySystem.getItemByUID(item.uid).inventoryIndex;
          if (index === null) return;

          this.ui.crafting.addItemFromInventory(index, item.type);
        }
        break;

      case "equipment":
        if (craftUiVisible) {
          const index = this.inventorySystem.getItemByUID(
            item.uid,
          ).inventoryIndex;
          if (index === null) return;

          this.ui.crafting.addItemFromInventory(index, item.type);
        } else this.equipItem(item, toEquip, player, socket);
        break;

      case "material":
        if (craftUiVisible) {
          const index = this.inventorySystem.getItemByUID(
            item.uid,
          ).inventoryIndex;
          if (index === null) return;

          this.ui.crafting.addItemFromInventory(index, item.type);
        }
        break;
    }
  }

  useConsumable(item, socket, player) {
    if (!item.use) return;

    const { type, value, payload } = item.use;

    switch (type) {
      case "heal":
        player.addHealth(value);
        break;

      case "event":
        const payloadEmit = payload ?? {};
        payloadEmit["socket"] = socket;
        payloadEmit["item"] = item;
        this.eventBus.emit(value, payloadEmit);
        return;
        break;

      case "buff":
        this.applyBuff(item.use);
        break;
    }

    this.consumeItem(item, socket);
  }

  equipItem(item, toEquip, player, socket) {
    console.log(toEquip, item);
    if (!toEquip) player.unequip(item);
    else {
      player.equip(item);
      this.consumeItem(item, socket);
    }
  }

  applyBuff(buffData) {
    const { stat, value, duration } = buffData;

    this.player.addBuff({
      stat,
      value,
      duration,
    });
  }

  consumeItem(item, socket) {
    const inventorySystem = this.inventoryManager.get(
      socket.data.playerId,
      socket,
    );
    inventorySystem.removeItem(item.uid, 1);
  }
}
