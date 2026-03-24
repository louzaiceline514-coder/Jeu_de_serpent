// Service de gestion de la connexion WebSocket avec reconnexion automatique.

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30000;

class WSService {
  constructor() {
    this.ws = null;
    this.url = null;
    this._shouldReconnect = true;
    this._reconnectTimeout = null;
    this._retryCount = 0;
  }

  connect(url, onOpen, onMessage, onClose) {
    this.url = url;
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
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
      this._retryCount = 0;
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
      const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * Math.pow(2, this._retryCount));
      this._retryCount += 1;
      this._reconnectTimeout = setTimeout(() => {
        if (this.url && this._shouldReconnect) {
          this.connect(this.url, onOpen, onMessage, onClose);
        }
      }, delay);
    };
  }

  disconnect() {
    this._shouldReconnect = false;
    this._retryCount = 0;
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    }
  }
}

export const wsService = new WSService();
