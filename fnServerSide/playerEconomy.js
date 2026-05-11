export function createPlayerEconomy({ io, players, saveManager, eventBus }) {
  function getPlayer(socketId) {
    return players.get(socketId);
  }

  function getSave(playerId) {
    const snapshot = saveManager.load(playerId);
    return snapshot?.save;
  }

  function syncPlayer(socketId, data) {
    io.to(socketId).emit("player_update", data);
  }

  function levelUp(player, socketId) {
    player.level++;
    player.statsPoints += 2;
    player.exp -= player.maxExp;
    player.maxExp = player.getMaxExp();
    player.invalidateStats();
    if (player.exp >= player.maxExp) levelUp(player, socketId);
    else {
      syncPlayer(socketId, {
        lvlUp: true,
        level: player.level,
        maxExp: player.maxExp,
        newExp: player.exp,
        statsPoints: player.statsPoints,
      });
    }
  }

  // =========================
  // 💰 GOLD
  // =========================
  function addGold(socketId, amount) {
    const player = getPlayer(socketId);
    if (!player) return;

    player.gold = (player.gold || 0) + amount;

    const save = getSave(player.playerId);
    if (save?.player) {
      save.player.gold = player.gold;
      saveManager.update(player.playerId, save);
    }

    syncPlayer(socketId, {
      gold: player.gold,
      deltaGold: amount,
    });
  }

  // =========================
  // ✨ EXP
  // =========================

  function addExp(socketId, amount) {
    const player = getPlayer(socketId);
    let lvlUp = false;
    if (!player) return;

    player.exp = (player.exp || 0) + amount;
    const save = getSave(player.playerId);
    if (player.exp >= player.maxExp) {
      levelUp(player, socketId);
      lvlUp = true;
    }

    if (save?.player) {
      save.player.exp = player.exp;
      save.player.level = player.level;
      save.player.maxExp = player.maxExp;
      save.player.statsPoints = player.statsPoints;
      saveManager.update(player.playerId, save);
    }

    if (!lvlUp)
      syncPlayer(socketId, {
        exp: player.exp,
        deltaExp: amount,
      });
  }

  // =========================
  // 💎 CRYSTAL
  // =========================
  function addCrystal(socketId, amount) {
    const player = getPlayer(socketId);
    if (!player) return;

    player.crystal = (player.crystal || 0) + amount;

    const save = getSave(player.playerId);
    if (save?.player) {
      save.player.crystal = player.crystal;
      saveManager.update(player.playerId, save);
    }

    syncPlayer(socketId, {
      crystal: player.crystal,
      deltaCrystal: amount,
    });
  }

  return {
    addGold,
    addExp,
    addCrystal,
  };
}
