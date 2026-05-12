import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '';

  const [connected, setConnected] = useState(false);

  const socket = useMemo(() => {
    try {
      // create socket but do not connect until mounted
      const s = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket'],
        autoConnect: false,
      });
      return s;
    } catch (e) {
      // fallback: return null if socket.io-client not available or fails
      // eslint-disable-next-line no-console
      console.warn('[SocketProvider] socket creation failed', e);
      return null;
    }
  }, [SOCKET_URL]);

  useEffect(() => {
    if (!socket) return undefined;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // connect once
    socket.connect();

    return () => {
      try {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.disconnect();
      } catch (e) {
        // ignore
      }
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
