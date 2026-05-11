import express from "express";
import http from "http";
import { Server } from "socket.io";
import NetworkDataManager from "./networkDataManager.js";
import SpawnSystem from "./maps/spawns/SpawnSystem.js";
import SaveManager from "./saveManager.js";
import InventoryManager from "./fnServerSide/inventoryManager.js";
import DropSystem from "./fnServerSide/DropSystem.js";
import EventBus from "./fnServerSide/EventBus.js";
import { registerGlobalEvents } from "./sockets/listenGlobal.js";
import registerSockets from "./sockets/index.js";
import { loadMaps } from "./maps/loadMaps.js";
import { createPlayerEconomy } from "./fnServerSide/playerEconomy.js";
import setupConsoleLogger from "./newConsole.js";
import ItemUseSystem from "./fnServerSide/ItemUseManager.js";

setupConsoleLogger();
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const maps = loadMaps();

const players = new Map();
const eventBus = new EventBus();
const saveManager = new SaveManager(maps);
const networkData = new NetworkDataManager(io);
const mobSpawn = new SpawnSystem(eventBus, maps);
const dropSystem = new DropSystem(eventBus);
const inventoryManager = new InventoryManager({ saveManager, io });
const useItemSystem = new ItemUseSystem({
  saveManager,
  io,
  inventoryManager,
  players,
  eventBus,
});
const dropsByMap = new Map();

const playerEconomy = createPlayerEconomy({
  io,
  players,
  saveManager,
});

registerGlobalEvents(
  io,
  eventBus,
  dropsByMap,
  inventoryManager,
  players,
  mobSpawn,
);
saveManager.start();

networkData.registerChannel("eventBus", {
  feature: "eventBus",
  events: ["eventBusWithPayload"],
});

networkData.registerChannel("players", {
  feature: "players",
  events: [
    "player_join",
    "player_move",
    "player_update",
    "enter_map",
    "useItem",
    "pushText",
    "petSync",
  ],
});

networkData.registerChannel("drops", {
  feature: "drops",
  events: ["drop_pickup", "drop_player"],
});

networkData.registerChannel("mobs", {
  feature: "mobs",
  events: [
    "mobs_request",
    "mob_damage",
    "mob_killed",
    "mob_damaged",
    "mob_removed",
  ],
});
networkData.registerChannel("inventory", {
  feature: "inventory",
  events: ["inventory_request", "inventory_update"],
});
networkData.registerChannel("save", {
  feature: "save",
  events: ["save_request"],
});

io.on("connection", (socket) => {
  const context = {
    players,
    eventBus,
    saveManager,
    mobSpawn,
    dropSystem,
    useItemSystem,
    inventoryManager,
    dropsByMap,
    playerEconomy,
    io,
  };

  console.log("Player conectado:", socket.id);
  networkData.announce(socket);

  const getPlayerId = (data = {}) =>
    data.playerId || socket.data.playerId || null;

  socket.emit("init", {
    id: socket.id,
    players: Array.from(players.values()),
  });

  socket.on("save_request", (data = {}) => {
    const playerId = getPlayerId(data);
    if (!playerId)
      return socket.emit("save_error", { message: "playerId obrigatorio" });

    socket.data.playerId = playerId;

    const loadInicial = saveManager.load(playerId);
    socket.data.mapId = loadInicial.save.player.map;

    registerSockets({ io, socket, context });
    socket.emit("save_sync", loadInicial);
  });

  socket.on("save_update", (data = {}) => {
    const playerId = getPlayerId(data);
    if (!playerId)
      return socket.emit("save_error", { message: "playerId obrigatorio" });

    socket.data.playerId = playerId;

    const snapshot = saveManager.update(playerId, data.save || data);
    if (snapshot) socket.emit("save_sync", snapshot);
  });
});

const TICK_RATE = 50; // 20 TPS
setInterval(() => {
  const playersArray = Array.from(players.values());
  // roda IA dos mobs
  mobSpawn.tick(playersArray, TICK_RATE);
  //Emit Players position
  io.emit("player_sync", playersArray);
  // envia estado dos mobs
  // io.emit("mobs_update", mobSpawn.getStateSnapshot());
}, TICK_RATE);

setInterval(() => {
  io.emit("init", {
    players: Array.from(players.values()),
  });
}, 5000);

// server.listen(3000, () => {
//   console.log("Server rodando na porta 3000");
// });

socket.on("ping_client", (callback) => callback());
server.listen(3000, "0.0.0.0", () => {
  console.log("Server rodando na porta 3000 Atualizado");
});
