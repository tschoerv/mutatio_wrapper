"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatUnits, type Abi, type Hash } from "viem";
import merchAbiJson from "../abi/merch-drop.json";
import { DEAD_ADDRESS, MERCH_ADDRESS, NATIVE_TOKEN_ADDRESS } from "../constants";
import { useContractRead, useTransaction, useWallet } from "../providers";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

const merchAbi = merchAbiJson as Abi;
const price = 4_200_000_000_000_000n;
const previewTransactionHash = `0x${"0".repeat(64)}` as Hash;
const integer = (value: string) => value.replace(/\D/g, "").slice(0, 2);
const mintPrice = (quantity: bigint) => `${formatUnits(price * quantity, 18)} ETH`;
type ClaimCondition = { maxClaimableSupply: bigint; supplyClaimed: bigint };

function SuccessDialog({ kind, amount, hash, onClose }: { kind: "mint" | "burn"; amount: string; hash?: Hash; onClose: () => void }) {
  return (
    <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="dialog-close" aria-label="Close" onClick={onClose}>×</button><Image src="/patch-transparent-bg.png" alt="MUTATIO patch" width={210} height={210} /><div><p className="eyebrow">Transaction confirmed</p><h2 id="dialog-title">{kind === "mint" ? `${amount} patch NFT${amount === "1" ? "" : "s"} minted.` : `${amount} patch NFT${amount === "1" ? "" : "s"} redeemed.`}</h2>{kind === "mint" ? <p>You can keep the NFT or redeem it now for the physical patch.</p> : <p>Email the burn transaction hash and your shipping details to <a href="mailto:mutatioflies@gmail.com">mutatioflies@gmail.com</a>.</p>}<div className="dialog-actions">{hash && <a className="button button-quiet" href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noreferrer">View transaction ↗</a>}{kind === "mint" && <a className="button button-quiet" href={`https://opensea.io/assets/base/${MERCH_ADDRESS}/0`} target="_blank" rel="noreferrer">OpenSea ↗</a>}{kind === "burn" && hash && <button className="button button-quiet" onClick={() => navigator.clipboard.writeText(hash)}>Copy hash</button>}</div></div></section></div>
  );
}

function TxError({ error }: { error?: string }) {
  return error ? <p className="tx-error">{error}</p> : null;
}

function SupplyProgress({ kind, value, maximum, loaded }: { kind: "mint" | "redeem"; value: number; maximum: number; loaded: boolean }) {
  const boundedMaximum = Math.max(maximum, 1);
  const percentage = loaded ? Math.min(100, (value / boundedMaximum) * 100) : 0;
  return (
    <div className={`supply-progress supply-progress-${kind}`}>
      <div className="supply-progress-label"><span>{kind === "mint" ? "Minted" : "Redeemed"}</span><strong>{loaded ? value.toLocaleString() : "…"} / {maximum.toLocaleString()} <small>Total</small></strong></div>
      <div className="supply-progress-track" role="progressbar" aria-label={kind === "mint" ? "Minted patches" : "Redeemed patches"} aria-valuemin={0} aria-valuemax={boundedMaximum} aria-valuenow={loaded ? value : undefined}><span style={{ width: `${percentage}%` }} /></div>
    </div>
  );
}

export function MerchInterface() {
  const { account, connected } = useWallet();
  const [mode, setMode] = useState<"mint" | "redeem">("mint");
  const [mintAmount, setMintAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [dialog, setDialog] = useState<null | "mint" | "burn">(null);
  const [previewBurn, setPreviewBurn] = useState(false);
  const claimCondition = useContractRead<ClaimCondition>({ address: MERCH_ADDRESS, abi: merchAbi, functionName: "getClaimConditionById", args: [0n, 0n] });
  const burnedSupply = useContractRead<bigint>({ address: MERCH_ADDRESS, abi: merchAbi, functionName: "balanceOf", args: [DEAD_ADDRESS, 0n] });
  const userBalance = useContractRead<bigint>({ address: MERCH_ADDRESS, abi: merchAbi, functionName: "balanceOf", args: account ? [account, 0n] : undefined, enabled: Boolean(account) });
  const claimed = useContractRead<bigint>({ address: MERCH_ADDRESS, abi: merchAbi, functionName: "getSupplyClaimedByWallet", args: account ? [0n, 0n, account] : undefined, enabled: Boolean(account) });
  const mintTx = useTransaction();
  const burnTx = useTransaction();

  const mintedCount = Number(claimCondition.data?.supplyClaimed ?? 0n);
  const burnedCount = Number(burnedSupply.data ?? 0n);
  const totalCount = Number(claimCondition.data?.maxClaimableSupply ?? 420n);
  const supplyLoaded = claimCondition.data !== undefined && burnedSupply.data !== undefined;
  const walletBalance = Number(userBalance.data ?? 0n);
  const walletClaimed = Number(claimed.data ?? 0n);
  const mintQuantity = mintAmount ? BigInt(mintAmount) : 0n;
  const burnQuantity = burnAmount ? BigInt(burnAmount) : 0n;
  const mintValid = connected && mintQuantity > 0n && walletClaimed + Number(mintQuantity) <= 25 && mintedCount + Number(mintQuantity) <= totalCount;
  const burnValid = connected && burnQuantity > 0n && Number(burnQuantity) <= walletBalance;

  useEffect(() => {
    const localPreview = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!localPreview || new URLSearchParams(window.location.search).get("preview") !== "redeem-success") return;
    setMode("redeem");
    setBurnAmount("1");
    setPreviewBurn(true);
    setDialog("burn");
  }, []);

  const mint = async () => {
    if (!account || !mintValid) return;
    const success = await mintTx.execute({ address: MERCH_ADDRESS, abi: merchAbi, functionName: "claim", value: price * mintQuantity, args: [account, 0n, mintQuantity, NATIVE_TOKEN_ADDRESS, price, [["0x0000000000000000000000000000000000000000000000000000000000000000"], 25n, price, NATIVE_TOKEN_ADDRESS], "0x"] });
    if (success) setDialog("mint");
  };
  const burn = async () => {
    if (!account || !burnValid) return;
    const success = await burnTx.execute({ address: MERCH_ADDRESS, abi: merchAbi, functionName: "safeTransferFrom", args: [account, DEAD_ADDRESS, 0n, burnQuantity, "0x"] });
    if (success) setDialog("burn");
  };

  return (
    <main className="site-shell">
      <SiteHeader current="merch" />
      <section className="merch-summary"><h1>MUTATIO $FLIES</h1><h2>DIY Merch Patch</h2></section>
      <section className="merch-panel"><div className="tabs" role="tablist" aria-label="Patch actions"><button role="tab" aria-selected={mode === "mint"} onClick={() => setMode("mint")}>Mint</button><button role="tab" aria-selected={mode === "redeem"} onClick={() => setMode("redeem")}>Redeem</button></div>
        {mode === "mint" ? <div className="merch-action"><SupplyProgress kind="mint" value={mintedCount} maximum={totalCount} loaded={supplyLoaded} /><Image className="patch-tab-image" src="/patch_anim_new2_optimized.gif" alt="MUTATIO patch" width={260} height={260} unoptimized /><div className="merch-control"><label className="field-label" htmlFor="mint-amount">Quantity <span>{mintPrice(mintQuantity)}</span></label><div className="amount-field"><input id="mint-amount" inputMode="numeric" placeholder="0" value={mintAmount} onChange={(event) => setMintAmount(integer(event.target.value))} /><span>PATCHES</span></div>{walletClaimed + Number(mintQuantity) > 25 && <p className="field-error">Minting is limited to 25 per wallet.</p>}<button className="button button-primary button-wide" disabled={!mintValid || mintTx.pending} onClick={mint}>{mintedCount >= totalCount ? "Mint closed" : !connected ? "Connect wallet" : mintTx.awaitingWallet ? "Confirm in wallet" : "Mint patch"}{mintTx.awaitingWallet && <span className="button-spinner" aria-hidden="true" />}</button><TxError error={mintTx.error} /></div></div>
        : <div className="merch-action"><SupplyProgress kind="redeem" value={burnedCount} maximum={totalCount} loaded={supplyLoaded} /><Image className="patch-tab-image" src="/patch_anim_new2_optimized.gif" alt="MUTATIO patch" width={260} height={260} unoptimized /><div className="merch-control"><label className="field-label" htmlFor="burn-amount">Quantity <button type="button" disabled={!walletBalance} onClick={() => setBurnAmount(String(walletBalance))}>Use balance</button></label><div className="amount-field"><input id="burn-amount" inputMode="numeric" placeholder="0" value={burnAmount} onChange={(event) => setBurnAmount(integer(event.target.value))} /><span>PATCHES</span></div><button className="button button-danger button-wide" disabled={!burnValid || burnTx.pending} onClick={burn}>{!connected ? "Connect wallet" : burnTx.awaitingWallet ? "Confirm in wallet" : "Burn to redeem"}{burnTx.awaitingWallet && <span className="button-spinner" aria-hidden="true" />}</button><TxError error={burnTx.error} /></div></div>}
      </section>
      <section className="merch-copy"><p>Each NFT is redeemable for a physical iron-on patch featuring an exclusive design inspired by <a href="https://x.com/hueviews" target="_blank" rel="noreferrer">hueviews</a>’ work “<a href="https://x.com/hueviews/status/1780802015901159792" target="_blank" rel="noreferrer">bar fly</a>”.</p><p>Redeemable until 01.01.2032 with Free Worldwide Shipping!</p></section>
      <section className="product-grid"><Image src="/Fly-CAP1.jpg" alt="MUTATIO patch on a cap" width={700} height={700} /><Image src="/Fly-Tshirt2.jpg" alt="MUTATIO patch on a shirt" width={700} height={700} /></section>
      <SiteFooter current="merch" />
      {dialog && <SuccessDialog kind={dialog} amount={dialog === "mint" ? mintAmount : burnAmount} hash={dialog === "mint" ? mintTx.hash : previewBurn ? previewTransactionHash : burnTx.hash} onClose={() => { setDialog(null); setPreviewBurn(false); }} />}
    </main>
  );
}
