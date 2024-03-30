"use client";
import '@rainbow-me/rainbowkit/styles.css';
import {NextUIProvider} from '@nextui-org/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { cookieStorage, createStorage, http} from 'wagmi'
import { useState, useEffect } from 'react'


export const config = getDefaultConfig({
  appName: 'MUTATIO FLIES',
  projectId: 'b0936bdd613d686ed30f56f336c6166d',
  chains: [baseSepolia, base],
  storage: createStorage({
    storage: cookieStorage
  }),
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});

const client = new QueryClient();


export function Providers({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider>
        <NextUIProvider>
        <main className="dark text-foreground bg-background">
        {mounted && children}
        </main>
        </NextUIProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

