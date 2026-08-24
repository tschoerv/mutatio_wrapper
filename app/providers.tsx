"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  http,
  type Abi,
  type Account,
  type Address,
  type Hash,
} from "viem";
import { base } from "viem/chains";
import { BASE_CHAIN_ID } from "./constants";

type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window { ethereum?: InjectedProvider; }
}

type WalletContextValue = {
  account?: Address;
  chainId?: number;
  connected: boolean;
  dataRevision: number;
  readBlockNumber?: bigint;
  lastTransactionBlock?: bigint;
  error?: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshChainData: (blockNumber?: bigint) => void;
  switchToBase: () => Promise<void>;
};

const configuredRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim();

export const publicClient = createPublicClient({
  batch: { multicall: true },
  chain: base,
  transport: fallback([
    ...(configuredRpcUrl ? [http(configuredRpcUrl, { retryCount: 1, timeout: 8_000 })] : []),
    http("https://base-rpc.publicnode.com", { retryCount: 0, timeout: 6_000 }),
    http("https://base.drpc.org", { retryCount: 0, timeout: 6_000 }),
    http("https://mainnet.base.org", { retryCount: 0, timeout: 6_000 }),
  ], { rank: false }),
});
export const historyClient = createPublicClient({
  chain: base,
  transport: http(configuredRpcUrl || "https://mainnet.base.org", { retryCount: 0, timeout: 10_000 }),
});
const WalletContext = createContext<WalletContextValue | null>(null);

const parseChainId = (value: unknown) => typeof value === "string" ? Number.parseInt(value, 16) : undefined;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [dataRevision, setDataRevision] = useState(0);
  const [readBlockNumber, setReadBlockNumber] = useState<bigint>();
  const [lastTransactionBlock, setLastTransactionBlock] = useState<bigint>();
  const [error, setError] = useState<string>();
  const refreshChainData = useCallback((blockNumber?: bigint) => {
    setReadBlockNumber(blockNumber);
    if (blockNumber !== undefined) setLastTransactionBlock(blockNumber);
    setDataRevision((value) => value + 1);
  }, []);

  const syncWallet = useCallback(async (requestAccounts = false) => {
    const provider = window.ethereum;
    if (!provider) {
      if (requestAccounts) setError("No browser wallet found. Open this page in MetaMask, Rabby, Coinbase Wallet, or another injected wallet.");
      return;
    }
    setError(undefined);
    const method = requestAccounts ? "eth_requestAccounts" : "eth_accounts";
    const accounts = await provider.request({ method }) as Address[];
    const chain = await provider.request({ method: "eth_chainId" });
    setAccount(accounts[0]);
    setChainId(parseChainId(chain));
  }, []);

  useEffect(() => {
    queueMicrotask(() => syncWallet(false).catch(() => undefined));
    const provider = window.ethereum;
    if (!provider?.on) return;
    const onAccounts = (...args: unknown[]) => setAccount((args[0] as Address[] | undefined)?.[0]);
    const onChain = (...args: unknown[]) => setChainId(parseChainId(args[0]));
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [syncWallet]);

  const connect = useCallback(async () => {
    try { await syncWallet(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Wallet connection was cancelled."); }
  }, [syncWallet]);

  const switchToBase = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) return connect();
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2105" }] });
      setChainId(BASE_CHAIN_ID);
      setError(undefined);
    } catch (cause) {
      const code = (cause as { code?: number }).code;
      if (code === 4902) {
        await provider.request({ method: "wallet_addEthereumChain", params: [{
          chainId: "0x2105",
          chainName: "Base",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"],
        }] });
        setChainId(BASE_CHAIN_ID);
      } else {
        setError(cause instanceof Error ? cause.message : "Could not switch to Base.");
      }
    }
  }, [connect]);

  const value = useMemo(() => ({ account, chainId, connected: Boolean(account), dataRevision, readBlockNumber, lastTransactionBlock, error, connect, disconnect: () => setAccount(undefined), refreshChainData, switchToBase }), [account, chainId, dataRevision, readBlockNumber, lastTransactionBlock, error, connect, refreshChainData, switchToBase]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}

export function useContractRead<T = unknown>(config: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; enabled?: boolean }) {
  const wallet = useContext(WalletContext);
  const dataRevision = wallet?.dataRevision ?? 0;
  const readBlockNumber = wallet?.readBlockNumber;
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(config, (_, value) => typeof value === "bigint" ? `${value}n` : value);
  useEffect(() => {
    if (config.enabled === false) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      publicClient.readContract({ ...config, blockNumber: readBlockNumber } as never)
        .then((value) => { if (active) { setData(value as T); setError(undefined); } })
        .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Contract read failed."); })
        .finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
    // The serialized key captures every contract parameter, including bigint arguments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRevision, key, nonce, readBlockNumber]);
  return { data, error, loading, refetch: () => setNonce((value) => value + 1) };
}

export function useTransaction() {
  const { account, chainId, refreshChainData, switchToBase } = useWallet();
  const [awaitingWallet, setAwaitingWallet] = useState(false);
  const [hash, setHash] = useState<Hash>();
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();

  const execute = useCallback(async (request: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; value?: bigint }) => {
    if (!account || !window.ethereum) { setError("Connect a wallet first."); return false; }
    setPending(true); setAwaitingWallet(false); setConfirmed(false); setError(undefined); setHash(undefined);
    try {
      if (chainId !== BASE_CHAIN_ID) await switchToBase();
      const simulation = await publicClient.simulateContract({ ...request, account } as never);
      const walletClient = createWalletClient({ account: account as Account | Address, chain: base, transport: custom(window.ethereum as never) });
      setAwaitingWallet(true);
      const transactionHash = await walletClient.writeContract(simulation.request);
      setAwaitingWallet(false);
      setHash(transactionHash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
      setConfirmed(true);
      refreshChainData(receipt.blockNumber);
      window.setTimeout(() => refreshChainData(), 1_500);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? ((cause as Error & { shortMessage?: string }).shortMessage || cause.message) : "Transaction failed.");
      return false;
    } finally { setAwaitingWallet(false); setPending(false); }
  }, [account, chainId, refreshChainData, switchToBase]);

  return { execute, hash, pending, awaitingWallet, confirmed, error };
}
