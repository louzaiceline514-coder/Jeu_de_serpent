// Service de gestion de la connexion WebSocket avec reconnexion automatique.

class WSService {
  constructor() {
    this.ws = null;
    this.url = null;
    this.dispatch = null;
    this.reconnectDelay = 1000;
    this._shouldReconnect = true;
  }

  connect(url, onOpen, onMessage, onClose) {
    this.url = url;
    // Si une connexion existe déjà, on la ferme proprement avant d'en ouvrir une nouvelle.
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      try {
        this._shouldReconnect = false;
        this.ws.close();
      } catch (e) {
        // Ignorer
      } finally {
        this._shouldReconnect = true;
      }
    }

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      if (onOpen) onOpen();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (e) {
        // Message non JSON, on ignore pour ce projet.
      }
    };

    this.ws.onclose = () => {
      if (onClose) onClose();
      setTimeout(() => {
        if (this.url && this._shouldReconnect) {
          this.connect(this.url, onOpen, onMessage, onClose);
        }
      }, this.reconnectDelay);
    };
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    }
  }
}

export const wsService = new WSService();

