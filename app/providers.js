"use client";
import '@rainbow-me/rainbowkit/styles.css';
import { HeroUIProvider } from "@heroui/react"
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
  chains: [ base],
  storage: createStorage({
    storage: cookieStorage
  }),
  transports: {
    [base.id]: http()
  },
});

const client = new QueryClient();

/** @type {import('@rainbow-me/rainbowkit').AvatarComponent} */
const StaticAvatar = ({ size }) => {
  return (
    <img
      src="/apple-touch-icon.png"      // put this file in /public
      width={size}
      height={size}
      alt="fly"
      style={{ borderRadius: 9999, objectFit: 'cover' }}
    />
  );
};


export function Providers({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider avatar={StaticAvatar}>
        <HeroUIProvider>
        <QueryTriggerProvider>
        <main className="dark text-foreground bg-background">
        {mounted && children}
        </main>
        </QueryTriggerProvider>
        </HeroUIProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

