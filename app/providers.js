"use client";
import '@rainbow-me/rainbowkit/styles.css';
import {NextUIProvider} from '@nextui-org/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { cookieStorage, createStorage, http} from 'wagmi'
import { useState, useEffect } from 'react'
import { QueryTriggerProvider } from './QueryTriggerContext';


export const config = getDefaultConfig({
  appName: 'MUTATIO $FLIES',
  projectId: 'fbc536a18c0f3b0d828632be8b67ec8c',
  chains: [ base ],
  storage: createStorage({
    storage: cookieStorage
  }),
  transports: {
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
        <QueryTriggerProvider>
        <main className="dark text-foreground bg-background">
        {mounted && children}
        </main>
        </QueryTriggerProvider>
        </NextUIProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

