import Enemy from "./Enemy.js";

export default class Pet extends Enemy {
  constructor(position, config) {
    super(position, config);

    this.isPet = true;
    this.faction = "ally";

    this.owner = config.owner;
    this.uid = crypto.randomUUID();

    // sistema de vida
    this.lives = 3;
    this.type = "pet";
    this.state = "idle";
    this.active = true;
    this.dead = false;
    this.damage = this.owner.getDamage() * 0.25;

    // controle IA
    this.lastThink = 0;
    this.THINK_INTERVAL = 100;

    // movimento
    this.followOffset = { x: 50, y: 25 };
    this.maxDistance = (this.followOffset.x || 40) * 3;

    // combate
    this.currentTarget = null;
    // desativa loot
    this.dropEnabled = false;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.die();
    }

    if (!this.dead && !!this.PetManager) this.PetManager.savePets();
  }

  die() {
    this.lives--;

    this.active = false;
    this.state = "down";
    this.health = 0;
    this.currentTarget = null;

    if (this.lives <= 0) {
      this.PetManager?.removePet(this);
      return;
    }
  }

  recover(amount) {
    this.health += amount;
    if (this.health >= this.maxHealth) {
      this.health = this.maxHealth;
      this.state = "follow";
      this.active = true;
    }
  }

  destroy() {
    this.dead = true;
    this.owner.petManager.removePet(this);
  }

  setVelocity(x, y, apply = true) {
    this.velocity = { x, y };
    if (apply) this._applySeparation();
  }
}
