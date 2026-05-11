export default class Enemy {
  constructor(position, config = {}, isBoss = false, area = "") {
    this.id =
      config.id ||
      Date.now().toString(36) + Math.random().toString(36).slice(2);

    this.config = config;
    // identificação
    this.type = "enemy";

    this.dead = false;
    this.state = "idle"; // aggro || idle
    this.isBoss = isBoss;
    this.scene = config.scene || null;
    this.dropEnabled = true;

    // transform
    this.position = position;
    this.origin = { x: position.x, y: position.y };
    this.velocity = { x: 0, y: 0 };

    Object.assign(this, config);
    if (isBoss) Object.assign(this, config.boss);
    this.maxHealth = this.health;
    // estado
    this.area = area || "";

    // // componentes opcionais (plugáveis nos passes)
    // this.light = config.light || null;

    // dados livres (pra IA, comportamento, etc)
    this.meta = config.meta || {};

    this.detectionRange = config.detectionRange || 200;
    this.attackRange = config.attackRange || 60;
    this.attackCooldown = config.attackCooldown || 2000;
    this.attackTimer = config.attackTimer || 0;

    this.knockback = { x: 0, y: 0 };
  }

  getDirectionFromVelocity() {
    const player =
      this.type === "enemy" || !this.currentTarget
        ? this.player
        : this.currentTarget;

    let dx, dy;

    if (this.state === "attack") {
      // direção até o player (CORRETO)
      dx = player.position.x - this.position.x;
      dy = player.position.y - this.position.y;
    } else {
      // direção do ataque (ok usar velocity aqui)
      dx = this.velocity.x;
      dy = this.velocity.y;
      if (dx === 0 && dy === 0) return "idle";
    }

    const angle = Math.atan2(dy, dx);
    const deg = angle * (180 / Math.PI);

    if (deg >= -22.5 && deg < 22.5) return "e";
    if (deg >= 22.5 && deg < 67.5) return "se";
    if (deg >= 67.5 && deg < 112.5) return "s";
    if (deg >= 112.5 && deg < 157.5) return "sw";
    if (deg >= 157.5 || deg < -157.5) return "w";
    if (deg >= -157.5 && deg < -112.5) return "nw";
    if (deg >= -112.5 && deg < -67.5) return "n";
    if (deg >= -67.5 && deg < -22.5) return "ne";
  }

  applyFlip(dir) {
    // if (!dir) return "e";
    if (dir.includes("w")) {
      this.sprite.setFlipX(true);
      return dir.replace("w", "e");
    } else {
      this.sprite.setFlipX(false);
    }
    return dir;
  }

  startAttack(target, delta) {
    this.state = "attack";

    setTimeout(() => {
      target.takeDamage(this.damage, this, delta);
      if (target.type === "pet" && target.state === "down")
        this.currentTarget = null;
    }, 500);
  }

  isAlive() {
    return !this.dead;
  }

  destroy() {
    // 👇 guarda timestamp da morte
    // this._destroy = true;
  }

  get x() {
    return this.position.x;
  }

  get y() {
    return this.position.y;
  }
}
