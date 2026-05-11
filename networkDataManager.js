export default class NetworkDataManager {
  constructor(io, { features = [] } = {}) {
    this.io = io;
    this.features = new Set(features);
    this.channels = new Map();
  }

  registerChannel(name, config = {}) {
    const channel = {
      feature: config.feature || name,
      events: config.events || [],
    };

    this.channels.set(name, channel);
    this.features.add(channel.feature);
    return channel;
  }

  getFeatures() {
    return Array.from(this.features);
  }

  announce(socket) {
    socket.emit("server_features", this.getFeatures());
  }

  emit(event, payload, target = this.io) {
    target.emit(event, payload);
  }

  broadcast(socket, event, payload) {
    socket.broadcast.emit(event, payload);
  }
}
