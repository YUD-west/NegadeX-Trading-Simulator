import { io } from 'socket.io-client';

let socket = null;

function buildSocket() {
  const url = import.meta.env.VITE_API_URL || window.location.origin;
  return io(url, {
    transports: ['websocket', 'polling'],
    auth: { token: localStorage.getItem('negadex:token') || localStorage.getItem('pulse:token') || '' },
    reconnectionAttempts: 8,
    reconnectionDelay: 1500,
    autoConnect: true,
  });
}

export function getSocket() {
  if (!socket) socket = buildSocket();
  return socket;
}

/** Force a fresh connection (used after login / logout to attach a new JWT). */
export function refreshSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  socket = buildSocket();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
