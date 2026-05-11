export default class EventBus {
  constructor() {
    // Map<eventName, Array<{ callback, owner }>>
    this.listeners = new Map();
  }

  /**
   * Registra um listener
   * @param {string} event - nome do evento
   * @param {function} callback - função que será chamada
   * @param {any} owner - opcional, usado para limpar depois (ex: this)
   * @returns {function} unsubscribe
   */
  on(event, callback, owner = null) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener = { callback, owner };
    this.listeners.get(event).push(listener);

    // Retorna função para remover esse listener específico
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Emite um evento
   * @param {string} event
   * @param {any} payload
   */
  emit(event, payload) {
    const list = this.listeners.get(event);

    if (!list) return;

    // Copia para evitar bugs se alguém remover durante execução
    const listenersCopy = [...list];

    for (const { callback } of listenersCopy) {
      try {
        callback(payload);
      } catch (err) {
        console.error(`Erro no evento "${event}":`, err);
      }
    }
  }

  /**
   * Remove um listener específico
   */
  off(event, callback) {
    const list = this.listeners.get(event);
    if (!list) return;

    const filtered = list.filter((l) => l.callback !== callback);

    if (filtered.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filtered);
    }
  }

  /**
   * Remove todos os listeners de um "owner"
   * Ideal para limpar quando destruir um system ou scene
   */
  offByOwner(owner) {
    for (const [event, list] of this.listeners.entries()) {
      const filtered = list.filter((l) => l.owner !== owner);

      if (filtered.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, filtered);
      }
    }
  }

  /**
   * Limpa tudo (debug ou reset total)
   */
  clear() {
    this.listeners.clear();
  }
}
