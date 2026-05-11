import PlayerStats from "../fnServerSide/PlayerStats.js";
import CaptureSystem from "../fnServerSide/CaptureSystem.js";

export default class PlayerEntity {
  #socket;
  #CaptureSystem;
  #statsSystem;
  #modifiers;
  #playerId;
  #inventorySystem;

  constructor({ socket, save, playerId, context }) {
    this.#socket = socket;
    // dados públicos (podem ir pro client)
    this.id = socket.id;
    this.#playerId = playerId;
    this.exp = save.player.exp || 0;
    this.crystal = save.player.crystal || 0;
    this.gold = save.player.gold || 0;
    this.health = 50; //save.player.health || 50;
    this.sp = save.player.sp || 0;
    this.statsPoints = save.player.statsPoints || 0;
    this.pets = save.player.pets || [];

    this.velocity = { x: 0, y: 0 };
    this.mapId = save.player.mapId;
    this.position = save.player.position;
    this.level = save.player.level;
    this.equipment = save.player.equipment || {};
    this.upgrades = save.player.upgrades || {};
    this.maxExp = this.getMaxExp();
    // dados privados
    this.#modifiers = [];
    this.#statsSystem = new PlayerStats(this);
    this.#CaptureSystem = new CaptureSystem(this, context);

    this.generatePets();
    this.#inventorySystem = context.inventoryManager.get(
      socket.data.playerId,
      socket,
    );
  }

  // =========================
  // 🔒 MÉTODOS INTERNOS
  // =========================

  getPlayerId() {
    return this.#playerId;
  }

  recoverPet(amount) {
    this.#CaptureSystem.petManager.recoverPet(amount);
  }

  generatePets() {
    this.myPets = new Map();

    for (const pet of this.#CaptureSystem.petManager.pets) {
      this.myPets.set(pet.uid, pet);
    }
  }

  applyDamage(amount) {
    const finalDamage = this.#statsSystem.calculateDamage(amount);
    // lógica interna
  }

  useLasso(mobs) {
    return this.#CaptureSystem._onUseLasso(mobs);
  }

  addModifier(mod) {
    this.#modifiers.push(mod);
  }

  getStats() {
    return this.#statsSystem.getFinalStats();
  }

  getMaxExp(level) {
    return parseInt(6 * (1 + this.level * 0.2) ** 4);
  }

  invalidateStats() {
    this.#statsSystem.invalidate();
  }

  getDamage(mob) {
    return this.#statsSystem.getDamage(mob);
  }

  addHealth(amount) {
    if (this.health === this.#statsSystem.get("maxHealth") && amount > 0)
      return;
    this.health += amount;

    if (this.health > this.#statsSystem.get("maxHealth"))
      this.health = this.#statsSystem.get("maxHealth");
    this.#socket.emit("eventBusWithPayload", {
      event: "player:addHealth",
      payload: this.health,
    });
  }

  equiparItem(item, slotType) {
    //ADD verificação se tem espaço para não perder item DEBUG
    item.equiped = true;
    item.qty = 1;
    if (this.equipment[slotType])
      this.#inventorySystem.addItem(this.equipment[slotType]);

    this.equipment[slotType] = item;

    this.#socket.emit("eventBusWithPayload", {
      event: "player:changeEquip",
      payload: this.equipment,
    });
  }

  unequip(item) {
    if (this.equipment[item.slotType]?.uid === item.uid) {
      this.equipment[item.slotType] = null;
      console.log(this.equipment);
      this.#inventorySystem.addItem(item);
    }

    if (
      item.slotType === "ring" &&
      this.equipment[item.slotId]?.uid === item.uid
    ) {
      this.equipment[item.slotId] = null;
      this.#inventorySystem.addItem(item);
    }

    this.#socket.emit("eventBusWithPayload", {
      event: "player:changeEquip",
      payload: this.equipment,
    });
  }

  equip(item) {
    if (item.slotType != "ring") {
      this.equiparItem(item, item.slotType);
    }
    if (item.slotType === "ring") {
      let ring = item.slotType + "1";
      if (!this.equipment?.[item.slotType + "1"]) ring = item.slotType + "1";
      else if (!this.equipment?.[item.slotType + "2"])
        ring = item.slotType + "2";
      else if (!this.equipment?.[item.slotType + "3"])
        ring = item.slotType + "3";
      else ring = item.slotType + "1";
      this.equiparItem(item, ring);
    }

    this.#socket.emit("eventBusWithouPayload", {
      event: "inventory.changed",
    });

    // this.invalidateStats();
    // this.savePlayerData();
  }

  // =========================
  // 🌐 SERIALIZAÇÃO (IMPORTANTE)
  // =========================

  toNetwork() {
    return {
      id: this.id,
      mapId: this.mapId,
      level: this.level,
      // exp: this.exp,
      // statsPoints: this.statsPoints,
      health: this.health,
      sp: this.sp,
      // equipment: this.equipment,
      // upgrades: this.upgrades,
      // stats: this.getStats(),
      velocity: this.velocity,
      position: this.position,
      pets: this.pets,
    };
  }
}
