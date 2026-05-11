// network/mob.socket.js
//
export default function registerMobEvents({ io, socket, context }) {
  const { players, mobSpawn, playerEconomy, eventBus } = context;

  function getPlayer() {
    return players.get(socket.id);
  }

  function getPet(player, uid) {
    const pet = player.myPets.get(uid);
    return pet;
  }

  // =========================
  // ⚔️ COMBATE (PLAYER → MOB)
  // =========================

  socket.on("mob_hit", ({ mobId, attacker }) => {
    const player = getPlayer();
    if (!player) return;
    const mobs = mobSpawn.mapStates.get(player.mapId)?.mobs;
    const mob = mobs?.get(mobId);
    if (!mob || mob?.dead) return;

    // 🔥 validação simples (anti cheat básico)
    const dx = mob.x - player.x;
    const dy = mob.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 200) return; // fora do range → ignora

    const source = attacker === "player" ? player : getPet(player, attacker);

    const damage =
      attacker === "player" ? source.getDamage(mob) : source?.damage || 0;

    if (attacker !== "player") {
      source?.takeDamage(source.maxHealth * 0.2); // Debug Tirar quando o mob estiver dando dano
      socket.emit("petSync", player.pets);
    }
    mob.health -= damage;
    // console.log(player.mapId, mobId, mob);
    io.to(player.mapId).emit("mob_damaged", {
      mobId,
      damage,
      health: mob.health,
      maxHealth: mob.maxHealth,
    });

    if (mob.health <= 0 && !mob.dead) {
      mobSpawn.removeMob(player.mapId, mobId);

      io.to(player.mapId).emit("mob_killed", { mobId, dead: true });
      player.recoverPet(mob.maxHealth * 0.1);
      socket.emit("petSync", player.pets);
      // 🎁 reward via economia
      const gold = mob.gold;
      const exp = mob.exp;

      playerEconomy.addGold(socket.id, gold);
      playerEconomy.addExp(socket.id, exp);

      eventBus.emit("mob_death", mob);
    }
  });
}
