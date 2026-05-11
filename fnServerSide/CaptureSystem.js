import { ENEMY_TYPES } from "../types/enemyTypes.js";
import PetManager from "./petManager.js";
import Pet from "../entities/Pet.js";

export default class CaptureSystem {
  constructor(player, context) {
    // this.scene = scene;
    this.player = player;
    this.context = context;
    this.petManager = new PetManager(player, context);

    this.CAPTURE_RADIUS = 40 * 40;

    this._bindEvents();
  }

  // ---------------- EVENTS ----------------

  _bindEvents() {
    // this.scene.eventBus.on("laco_usado", this._onUseLasso);
  }

  destroy() {
    this.scene.eventBus.offByOwner(this);
  }

  // ---------------- MAIN FLOW ----------------

  _onUseLasso = (mobs) => {
    const deadEnemy = this._getClosestDeadEnemy(mobs);

    if (!deadEnemy) {
      this._onFail("No enemy around");
      return false;
    }

    if (!this.petManager.hasFreeSlot()) {
      this._onFail("No slots Pets"); //Translate

      return false;
    }

    const success = this._rollCapture(deadEnemy);

    if (success) {
      this._capture(deadEnemy);
    } else {
      this._onFail("No Sucess");
    }

    return true;
  };

  // ---------------- FIND TARGET ----------------

  _getClosestDeadEnemy(mobs) {
    const player = this.player;

    let closest = null;
    let minDist = Infinity;

    const list = mobs || [];

    for (let i = 0; i < list.length; i++) {
      const enemy = list[i];
      if (!enemy || enemy.captured || !enemy.dead) continue;

      const dx = player.position.x - enemy.position.x;
      const dy = player.position.y - enemy.position.y;

      const distSq = dx * dx + dy * dy;

      if (distSq < this.CAPTURE_RADIUS && distSq < minDist) {
        minDist = distSq;
        closest = enemy;
      }
    }

    return closest;
  }

  // ---------------- CHANCE ----------------

  _rollCapture(enemy) {
    const playerLevel = this.player.level || 1;
    const enemyLevel = enemy.level || 1;

    let chance = 0.3 + (playerLevel - enemyLevel) * 0.05;

    chance = Math.max(0.1, Math.min(chance, 0.9));
    chance = enemy.isBoss ? chance * 0.3 : chance;

    return Math.random() < chance;
  }

  // ---------------- SUCCESS ----------------

  _capture(deadEnemy) {
    const player = this.player;

    // trava pra evitar double capture
    deadEnemy.captured = true;
    deadEnemy.dead = true;
    deadEnemy.name = deadEnemy.renderName;
    this.petManager.loadPet(deadEnemy, true);
    // const name = deadEnemy.renderName;
    // const enemyType = ENEMY_TYPES[name];
    // const config = {
    //   owner: this.player,
    //   isBoss: deadEnemy.isBoss,
    // };

    // Object.assign(config, enemyType);

    // const pet = new Pet(
    //   {
    //     x: player.position.x + 75 * Math.random(),
    //     y: player.position.y + 75 * Math.random(),
    //   },
    //   config,
    // );

    // this.petManager.addPet(pet);

    // -------- remover corpo --------
    this.player.generatePets();
    this._removeDeadEnemy(deadEnemy);
  }

  // ---------------- FAIL ----------------

  _onFail(message) {
    this.context.io.to(this.player.id).emit("pushText", { message });
    // opcional: efeito visual / log
    // console.log("Falha na captura");
  }

  // ---------------- CLEANUP ----------------

  _removeDeadEnemy(enemy) {
    enemy.removeAt = Date.now();
  }
}
