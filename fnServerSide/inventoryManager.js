import { ITEMS_DB } from "../types/ITEMS_DB.js";

export default class InventoryManager {
  constructor({ saveManager, io }) {
    this.saveManager = saveManager;
    this.io = io;
    this.inventories = new Map(); // playerId -> inventorySystem
  }

  get(playerId, socket) {
    if (!this.inventories.has(playerId)) {
      const inv = new InventorySystem({
        saveManager: this.saveManager,
        io: this.io,
        playerId,
        socket,
      });
      inv._init(playerId);
      this.inventories.set(playerId, inv);
    }

    return this.inventories.get(playerId);
  }

  remove(playerId) {
    this.inventories.delete(playerId);
  }
}

class InventorySystem {
  constructor({ saveManager, io, playerId, socket }) {
    this.saveManager = saveManager;
    this.itemsDB = ITEMS_DB;
    this.io = io;
    this.playerId = playerId;
    this.socket = socket;
  }

  _init(playerId) {
    this.playerId = playerId;

    const { save } = this.saveManager.load(playerId, {});

    this.save = save;

    this.inventory = this._getInventory();
  }
  // ─────────────────────────────
  // INTERNAL
  // ─────────────────────────────

  _getInventory() {
    if (!this.save.inventory || !this.save.inventory.slots) {
      this.save.inventory = {
        slots: Array(36).fill(null),
        size: 36,
      };
    }

    return this.save.inventory;
  }

  _commit() {
    this.saveManager.update(this.playerId, this.save);
    this.socket.emit("inventory_sync", this.inventory);
    // this.joinInventory();
    return this.inventory;
  }

  // ─────────────────────────────
  // AÇÕES (SERVER AUTHORITATIVE)
  // ─────────────────────────────

  joinInventory() {
    const map = new Map();
    const result = [];

    this.inventory.slots.forEach((item) => {
      if (!item) return;

      const canStack = item.amountable !== false;

      if (!canStack) {
        result.push(item);
        return;
      }

      const key = item.id ?? item.name;

      if (!map.has(key)) {
        map.set(key, { ...item });
      } else {
        const existing = map.get(key);
        existing.qty = (existing.qty ?? 1) + (item.qty ?? 1);
      }
    });

    map.forEach((item) => result.push(item));

    while (result.length < this.inventory.size) {
      result.push(null);
    }

    this.inventory.slots = result;

    // return this._commit();
  }

  canAddItem(itemId, quantity = 1) {
    const itemDB = this.itemsDB[itemId];
    if (!itemDB) return false;

    const amountable = itemDB.amountable;

    if (amountable) {
      const hasStack = this.inventory.slots.some(
        (slot) => slot && slot.id === itemId,
      );
      this.inventory.slots.forEach((slot) => console.log(slot));
      console.log(itemId);
      if (hasStack) return true;

      return this.inventory.slots.some((slot) => !slot);
    }

    let emptySlots = this.inventory.slots.filter((i) => !i).length;
    return emptySlots >= quantity;
  }

  addItem(item, qty = 1) {
    const existing = this.inventory.slots.find(
      (i) => i && i.amountable && i.name === item.name && item.amountable,
    );

    if (existing) {
      existing.qty += qty;
    } else {
      const emptyIndex = this.inventory.slots.findIndex((i) => !i);

      if (emptyIndex !== -1) {
        this.inventory.slots[emptyIndex] = {
          ...item,
          uid: this.generateUID(),
          qty,
        };
      }
    }

    return this._commit();
  }

  removeItem(uid, qty = 1) {
    const item = this.getItemByUID(uid);
    if (!item) return this.inventory;

    item.qty -= qty;

    if (item.qty <= 0) {
      const index = this.inventory.slots.indexOf(item);
      this.inventory.slots[index] = null;
    }

    return this._commit();
  }

  swap(from, to) {
    const temp = this.inventory.slots[from];
    this.inventory.slots[from] = this.inventory.slots[to];
    this.inventory.slots[to] = temp;
    return this._commit();
  }

  // ─────────────────────────────
  // EXTRAÇÕES (SERVER SIDE)
  // ─────────────────────────────

  extractOne(index) {
    const item = this.inventory.slots[index];

    if (!item) return null;

    if (item.qty && item.qty > 1) {
      item.qty -= 1;

      this._commit();

      return {
        ...structuredClone(item),
        uid: this.generateUID(),
        qty: 1,
      };
    }

    this.inventory.slots[index] = null;
    this._commit();

    return item;
  }

  extractAll(index) {
    const item = this.inventory.slots[index];
    if (!item) return null;

    this.inventory.slots[index] = null;
    this._commit();

    return item;
  }

  // ─────────────────────────────
  // Função simples
  // ─────────────────────────────
  handle(fn, params) {
    switch (fn) {
      case "addItem":
        return this.addItem(params.item, params.qty);
      case "getItem":
        return this.getItem(params.index);

      case "removeItem":
        return this.removeItem(params.uid, params.qty);

      case "extractOne":
        return this.extractOne(params.index);
      case "extractAll":
        return this.extractAll(params.index);
      case "getItemsByType":
        return this.getItemsByType(params.type);

      case "getItemByUID":
        return this.getItemByUID(params.uid);

      case "swap":
        return this.swap(params.from, params.to);

      case "canAddItem":
        return this.canAddItem(params.itemId, params.quantity);

      default:
        throw new Error(`Invalid inventory fn: ${fn}`);
    }
  }

  // ─────────────────────────────
  // GETTERS
  // ─────────────────────────────

  getInventory() {
    return this.inventory;
  }

  getItem(index) {
    return this.inventory.slots[index];
  }

  getItemsByType(type) {
    return this.inventory.slots.filter((item) => {
      if (!item) return false;

      const data = this.itemsDB[item.id];
      return data && data.type === type;
    });
  }

  getItemByUID(uid) {
    const index = this.inventory.slots.findIndex((i) => i && i.uid === uid);

    if (index === -1) return null;

    const item = this.inventory.slots[index];
    item.inventoryIndex = index;

    return item;
  }

  // ─────────────────────────────
  // UTILS
  // ─────────────────────────────

  generateUID() {
    return "item_" + Math.random().toString(36).substr(2, 9);
  }
}
