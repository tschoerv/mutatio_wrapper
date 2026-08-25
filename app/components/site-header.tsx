"use client";

import { useState } from "react";
import { BASE_CHAIN_ID } from "../constants";
import { useWallet } from "../providers";
import { triggerFlySwarm } from "./fly-swarm";

const compactAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function SiteHeader({ current = "wrapper" }: { current?: "wrapper" | "merch" | "art" }) {
  const { account, chainId, connected, error, clearError, connect, disconnect, switchToBase } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrongNetwork = connected && chainId !== BASE_CHAIN_ID;

  return (
    <>
      <header className="site-header">
        <button type="button" className="wordmark" aria-label="Toggle the MUTATIO fly swarm" onClick={triggerFlySwarm}><span className="status-dot" aria-hidden="true" /><span className="wordmark-text">MUTATIO $FLIES</span></button>
        <nav className="site-nav" aria-label="Primary navigation">
          <a data-active={current === "wrapper"} href="/">Wrapper</a>
          <a data-active={current === "merch"} href="/merch">Merch</a>
          <a data-active={current === "art"} href="/art">Art</a>
        </nav>
        {current !== "art" && <div className="wallet-slot">
          {wrongNetwork ? (
            <button className="button button-danger button-small" onClick={switchToBase}>Switch to Base</button>
          ) : connected && account ? (
            <div className="wallet-menu-wrap">
              <button className="button button-small" onClick={() => setMenuOpen((open) => !open)}><span className="status-dot" /> {compactAddress(account)}</button>
              {menuOpen && <div className="wallet-menu"><a href={`https://basescan.org/address/${account}`} target="_blank" rel="noreferrer">View on Basescan ↗</a><button onClick={() => { disconnect(); setMenuOpen(false); }}>Disconnect this tab</button></div>}
            </div>
          ) : (
            <button className="button button-primary button-small" onClick={connect}>Connect wallet</button>
          )}
        </div>}
      </header>
      {current !== "art" && error && <div className="wallet-error" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss wallet notice" onClick={clearError}><span aria-hidden="true">✕</span></button></div>}
    </>
  );
}
