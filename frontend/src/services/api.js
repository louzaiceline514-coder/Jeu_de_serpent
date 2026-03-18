// Fonctions utilitaires pour appeler le backend FastAPI.

const BASE_URL = import.meta.env.DEV
  ? ""
  : `${window.location.protocol}//${window.location.hostname}:8000`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });
  if (!res.ok) {
    throw new Error(`Erreur API ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    })
};
