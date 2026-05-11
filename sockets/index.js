import registerPlayerEvents from "./player.socket.js";
import registerMobEvents from "./mob.socket.js";
import registerDropEvents from "./drop.socket.js";
import registerInventoryEvents from "./invetory.socket.js";
import registerUseItemEvents from "./useItems.socket.js";

export default function registerSockets({ io, socket, context }) {
  registerPlayerEvents({ io, socket, context });
  registerMobEvents({ io, socket, context });
  registerDropEvents({ io, socket, context });
  registerInventoryEvents({ io, socket, context });
  registerUseItemEvents({ io, socket, context });
}
