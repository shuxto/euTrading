import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// ⚠️ Configuration
const RAILWAY_URL = "https://trading-copy-production.up.railway.app";

interface PriceUpdate {
  symbol: string;
  price: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  marketPrices: Record<string, number>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  marketPrices: {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Storage for ALL market prices
  // We use a Ref for the "latest" prices to avoid dependency loops, 
  // but we also need state to trigger updates for components that consume this.
  // OPTIMIZATION: We only update this state once per X ms to avoid thrashing? 
  // For now, let's keep it simple but safe.
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    // 1. Initialize Single Connection
    const newSocket = io(RAILWAY_URL, {
      transports: ['websocket'], // Force websocket for better performance
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    // 2. Setup Listeners
    newSocket.on('connect', () => {
      console.log("✅ [SocketContext] Connected to Radio Tower");
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log("❌ [SocketContext] Disconnected");
      setIsConnected(false);
    });

    newSocket.on('price_update', (update: PriceUpdate) => {
      if (update && update.symbol && update.price) {
        setMarketPrices(prev => ({
          ...prev,
          [update.symbol]: parseFloat(update.price.toString())
        }));
      }
    });

    // 3. Cleanup
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, marketPrices }}>
      {children}
    </SocketContext.Provider>
  );
};
