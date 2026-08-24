"use client";

import { useEffect, useRef, useState } from "react";
import { formatUnits, parseUnits, type Abi } from "viem";
import erc1155AbiJson from "../abi/erc1155.json";
import wrapperAbiJson from "../abi/wrapper.json";
import { MUTATIO_ADDRESS, OLD_WRAPPER_ADDRESS, WRAPPER_ADDRESS } from "../constants";
import { useContractRead, useTransaction, useWallet } from "../providers";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { triggerFlySwarm } from "./fly-swarm";
import { WrapHistoryChart } from "./wrap-history-chart";

const erc1155Abi = erc1155AbiJson as Abi;
const wrapperAbi = wrapperAbiJson as Abi;
const approveAmount = 1_000_000n * 10n ** 18n;
const oneLegacyFly = 10n ** 18n;
const whole = (value?: bigint) => Number(formatUnits(value ?? 0n, 18));
const cleanInteger = (value: string, maxDigits = 6) => value.replace(/\D/g, "").slice(0, maxDigits);

type SwarmFly = {
  controlAX: number;
  controlAY: number;
  controlBX: number;
  controlBY: number;
  endX: number;
  endY: number;
  finished: boolean;
  phase: number;
  segmentDuration: number;
  segmentStartedAt: number;
  size: number;
  startX: number;
  startY: number;
  wave: number;
};

export function FlySwarm({ run, leaving, onExitComplete }: { run: number; leaving: boolean; onExitComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const leavingRef = useRef(leaving);
  const onExitCompleteRef = useRef(onExitComplete);

  useEffect(() => {
    leavingRef.current = leaving;
    onExitCompleteRef.current = onExitComplete;
    if (leaving && window.matchMedia("(prefers-reduced-motion: reduce)").matches) onExitComplete();
  }, [leaving, onExitComplete]);

  useEffect(() => {
    const sprite = new Image();
    sprite.decoding = "async";
    sprite.src = "/mutatio-fly-swarm.png";
    spriteRef.current = sprite;
    return () => { spriteRef.current = null; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sprite = spriteRef.current;
    if (!run || !canvas || !sprite || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let active = true;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const start = () => {
      if (!active) return;
      resize();
      window.addEventListener("resize", resize);
      const pointOutside = (edge: number, size: number): [number, number] => {
        if (edge === 0) return [Math.random() * width, -size];
        if (edge === 1) return [width + size, Math.random() * height];
        if (edge === 2) return [Math.random() * width, height + size];
        return [-size, Math.random() * height];
      };
      const minimumFlySize = width <= 620 ? 22 : 18;
      const startedAt = performance.now();
      const flies: SwarmFly[] = Array.from({ length: Math.min(180, Math.max(96, Math.round(width / 8))) }, (_, index) => {
        const size = Math.min(45, Math.max(minimumFlySize, width * (0.02 + Math.random() * 0.015)));
        const [startX, startY] = pointOutside(index % 4, size);
        const endX = width * (0.05 + Math.random() * 0.9);
        const endY = height * (0.05 + Math.random() * 0.9);
        const endGuideX = width * (0.05 + Math.random() * 0.9);
        const endGuideY = height * (0.05 + Math.random() * 0.9);
        return {
          controlAX: width * (0.05 + Math.random() * 0.9),
          controlAY: height * (0.05 + Math.random() * 0.9),
          controlBX: endX + (endGuideX - endX) * 0.35,
          controlBY: endY + (endGuideY - endY) * 0.35,
          endX,
          endY,
          finished: false,
          phase: Math.random() * Math.PI * 2,
          segmentDuration: 2_000 + Math.random() * 1_600,
          segmentStartedAt: startedAt + Math.random() * 320,
          size,
          startX,
          startY,
          wave: 12 + Math.random() * 34,
        };
      });
      let lastRenderedAt = 0;

      const retarget = (fly: SwarmFly, now: number) => {
        const tangentX = fly.endX - fly.controlBX;
        const tangentY = fly.endY - fly.controlBY;
        fly.startX = fly.endX;
        fly.startY = fly.endY;
        fly.controlAX = fly.startX + tangentX;
        fly.controlAY = fly.startY + tangentY;
        fly.endX = width * (0.05 + Math.random() * 0.9);
        fly.endY = height * (0.05 + Math.random() * 0.9);
        const endGuideX = width * (0.05 + Math.random() * 0.9);
        const endGuideY = height * (0.05 + Math.random() * 0.9);
        fly.controlBX = fly.endX + (endGuideX - fly.endX) * 0.35;
        fly.controlBY = fly.endY + (endGuideY - fly.endY) * 0.35;
        fly.segmentDuration = 1_800 + Math.random() * 2_200;
        fly.segmentStartedAt = now;
      };

      const sampleFly = (fly: SwarmFly, now: number) => {
        const progress = Math.min(1, Math.max(0, (now - fly.segmentStartedAt) / fly.segmentDuration));
        const inverse = 1 - progress;
        return {
          dx: 3 * inverse ** 2 * (fly.controlAX - fly.startX) + 6 * inverse * progress * (fly.controlBX - fly.controlAX) + 3 * progress ** 2 * (fly.endX - fly.controlBX),
          dy: 3 * inverse ** 2 * (fly.controlAY - fly.startY) + 6 * inverse * progress * (fly.controlBY - fly.controlAY) + 3 * progress ** 2 * (fly.endY - fly.controlBY),
          progress,
          x: inverse ** 3 * fly.startX + 3 * inverse ** 2 * progress * fly.controlAX + 3 * inverse * progress ** 2 * fly.controlBX + progress ** 3 * fly.endX,
          y: inverse ** 3 * fly.startY + 3 * inverse ** 2 * progress * fly.controlAY + 3 * inverse * progress ** 2 * fly.controlBY + progress ** 3 * fly.endY,
        };
      };

      const beginExit = (fly: SwarmFly, now: number) => {
        const current = sampleFly(fly, now);
        const velocity = Math.hypot(current.dx, current.dy) || 1;
        const directionX = current.dx / velocity;
        const directionY = current.dy / velocity;
        fly.startX = current.x;
        fly.startY = current.y;
        const lead = Math.min(120, Math.max(36, Math.min(width, height) * 0.1));
        fly.controlAX = current.x + directionX * lead;
        fly.controlAY = current.y + directionY * lead;
        if (Math.abs(directionX) >= Math.abs(directionY)) {
          fly.endX = directionX >= 0 ? width + fly.size : -fly.size;
          fly.endY = Math.min(height + fly.size, Math.max(-fly.size, current.y + directionY * Math.abs(fly.endX - current.x) / Math.max(0.2, Math.abs(directionX))));
        } else {
          fly.endY = directionY >= 0 ? height + fly.size : -fly.size;
          fly.endX = Math.min(width + fly.size, Math.max(-fly.size, current.x + directionX * Math.abs(fly.endY - current.y) / Math.max(0.2, Math.abs(directionY))));
        }
        const exitDistance = Math.hypot(fly.endX - current.x, fly.endY - current.y);
        fly.controlBX = fly.endX - directionX * Math.min(150, exitDistance * 0.28);
        fly.controlBY = fly.endY - directionY * Math.min(150, exitDistance * 0.28);
        fly.segmentDuration = Math.min(2_800, Math.max(900, exitDistance / 0.32));
        fly.segmentStartedAt = now;
        fly.finished = false;
      };

      let exitStarted = false;
      let exitCompleted = false;

      const render = (now: number) => {
        if (now - lastRenderedAt < 1_000 / 30) {
          animationFrame = window.requestAnimationFrame(render);
          return;
        }
        lastRenderedAt = now;
        context.clearRect(0, 0, width, height);

        if (leavingRef.current && !exitStarted) {
          exitStarted = true;
          for (const fly of flies) beginExit(fly, now);
        }

        for (const fly of flies) {
          if (fly.finished) continue;
          if (now < fly.segmentStartedAt) continue;
          if (now - fly.segmentStartedAt >= fly.segmentDuration) {
            if (exitStarted) {
              fly.finished = true;
              continue;
            }
            retarget(fly, now);
          }
          const { x, y, dx, dy } = sampleFly(fly, now);
          const velocity = Math.hypot(dx, dy) || 1;
          const wiggle = Math.sin(now * 0.008 + fly.phase) * fly.wave;
          context.save();
          context.translate(x - (dy / velocity) * wiggle, y + (dx / velocity) * wiggle);
          context.rotate(Math.atan2(dy, dx) - Math.PI);
          const spriteHeight = fly.size * (sprite.naturalHeight / sprite.naturalWidth);
          context.drawImage(sprite, -fly.size / 2, -spriteHeight / 2, fly.size, spriteHeight);
          context.restore();
        }

        if (exitStarted && flies.every((fly) => fly.finished)) {
          context.clearRect(0, 0, width, height);
          if (!exitCompleted) {
            exitCompleted = true;
            onExitCompleteRef.current();
          }
          return;
        }

        animationFrame = window.requestAnimationFrame(render);
      };

      animationFrame = window.requestAnimationFrame(render);
    };

    if (sprite.complete && sprite.naturalWidth) start();
    else sprite.addEventListener("load", start, { once: true });

    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      sprite.removeEventListener("load", start);
      context.clearRect(0, 0, width, height);
    };
  }, [run]);

  return <canvas ref={canvasRef} className="fly-swarm" aria-hidden="true" />;
}

function TransactionError({ error }: { error?: string }) {
  return error ? <p className="tx-error">{error}</p> : null;
}

function WrapCard() {
  const { account, connected } = useWallet();
  const [amount, setAmount] = useState("");
  const balance = useContractRead<bigint>({ address: MUTATIO_ADDRESS, abi: erc1155Abi, functionName: "balanceOf", args: account ? [account, 1n] : undefined, enabled: Boolean(account) });
  const parsedAmount = amount ? BigInt(amount) : 0n;
  const available = Number(balance.data ?? 0n);
  const valid = connected && parsedAmount > 0n && parsedAmount <= BigInt(available);
  const tx = useTransaction();

  const submit = async () => {
    if (!account || !valid) return;
    const success = await tx.execute({ address: MUTATIO_ADDRESS, abi: erc1155Abi, functionName: "safeTransferFrom", args: [account, WRAPPER_ADDRESS, 1n, parsedAmount, "0x"] });
    if (success) setAmount("");
  };

  return (
    <section className="action-card">
      <h2>Wrap MUTATIO</h2>
      <label className="field-label" htmlFor="wrap-amount">Amount<button type="button" onClick={() => setAmount(String(available))} disabled={!available}>Balance {available.toLocaleString()} MUTATIO</button></label>
      <div className="amount-field"><input id="wrap-amount" inputMode="numeric" placeholder="0" value={amount} onChange={(event) => setAmount(cleanInteger(event.target.value))} /><span className={amount ? "amount-result" : "amount-token"}>{amount ? `= ${amount} $FLIES` : "MUTATIO"}</span></div>
      <button className="button button-primary button-wide" disabled={!valid || tx.pending} onClick={submit}>{!connected ? "Connect wallet" : tx.awaitingWallet ? "Confirm in wallet" : "Wrap into $FLIES"}{tx.awaitingWallet && <span className="button-spinner" aria-hidden="true" />}</button>
      <TransactionError error={tx.error} />
    </section>
  );
}

function UnwrapCard() {
  const { account, connected } = useWallet();
  const [amount, setAmount] = useState("");
  const balance = useContractRead<bigint>({ address: WRAPPER_ADDRESS, abi: wrapperAbi, functionName: "balanceOf", args: account ? [account] : undefined, enabled: Boolean(account) });
  const allowance = useContractRead<bigint>({ address: WRAPPER_ADDRESS, abi: wrapperAbi, functionName: "allowance", args: account ? [account, WRAPPER_ADDRESS] : undefined, enabled: Boolean(account) });
  const rawBalance = balance.data ?? 0n;
  const available = whole(rawBalance);
  const rawAmount = amount ? parseUnits(amount, 18) : 0n;
  const approved = (allowance.data ?? 0n) > 0n;
  const valid = connected && rawAmount > 0n && rawAmount <= rawBalance;
  const tx = useTransaction();

  const submit = async () => {
    if (!account) return;
    const request = approved
      ? { address: WRAPPER_ADDRESS, abi: wrapperAbi, functionName: "unwrap", args: [rawAmount] }
      : { address: WRAPPER_ADDRESS, abi: wrapperAbi, functionName: "approve", args: [WRAPPER_ADDRESS, approveAmount] };
    const success = await tx.execute(request);
    if (success) setAmount("");
  };

  return (
    <section className="action-card">
      <h2>Unwrap $FLIES</h2>
      <label className="field-label" htmlFor="unwrap-amount">Amount<button type="button" onClick={() => setAmount(String(Math.trunc(available)))} disabled={!available}>Balance {available.toLocaleString()} $FLIES</button></label>
      <div className="amount-field"><input id="unwrap-amount" inputMode="numeric" placeholder="0" value={amount} onChange={(event) => setAmount(cleanInteger(event.target.value))} disabled={!approved && connected} /><span className={amount ? "amount-result" : "amount-token"}>{amount ? `= ${amount} MUTATIO` : "$FLIES"}</span></div>
      <button className="button button-primary button-wide" disabled={!connected || tx.pending || (approved && !valid)} onClick={submit}>{!connected ? "Connect wallet" : tx.awaitingWallet ? "Confirm in wallet" : approved ? "Unwrap into MUTATIO" : "Approve $FLIES"}{tx.awaitingWallet && <span className="button-spinner" aria-hidden="true" />}</button>
      <TransactionError error={tx.error} />
    </section>
  );
}

function MigrationCard({ balance, onComplete }: { balance: bigint; onComplete: () => void }) {
  const { account } = useWallet();
  const allowance = useContractRead<bigint>({ address: OLD_WRAPPER_ADDRESS, abi: wrapperAbi, functionName: "allowance", args: account ? [account, OLD_WRAPPER_ADDRESS] : undefined, enabled: Boolean(account) });
  const approved = (allowance.data ?? 0n) > 0n;
  const tx = useTransaction();
  const submit = async () => {
    if (!account) return;
    const request = approved
      ? { address: OLD_WRAPPER_ADDRESS, abi: wrapperAbi, functionName: "unwrap", args: [balance] }
      : { address: OLD_WRAPPER_ADDRESS, abi: wrapperAbi, functionName: "approve", args: [OLD_WRAPPER_ADDRESS, approveAmount] };
    const success = await tx.execute(request);
    if (success && approved) onComplete();
  };
  return (
    <div className="migration-card" id="legacy-migration-body">
      <p className="migration-balance"><span>Old balance</span><strong>{whole(balance).toLocaleString()} $FLIES</strong></p>
      <button className="button button-primary migration-action" disabled={tx.pending} onClick={submit}>{tx.awaitingWallet ? "Confirm in wallet" : approved ? "Unwrap old $FLIES" : "Approve old $FLIES"}{tx.awaitingWallet && <span className="button-spinner" aria-hidden="true" />}</button>
      <TransactionError error={tx.error} />
    </div>
  );
}

export function WrapperInterface() {
  const { account, connected } = useWallet();
  const [showMigration, setShowMigration] = useState(false);
  const supply = useContractRead<bigint>({ address: WRAPPER_ADDRESS, abi: wrapperAbi, functionName: "totalSupply" });
  const legacy = useContractRead<bigint>({ address: OLD_WRAPPER_ADDRESS, abi: wrapperAbi, functionName: "balanceOf", args: account ? [account] : undefined, enabled: Boolean(account) });
  const totalSupply = whole(supply.data);
  const legacyBalance = legacy.data ?? 0n;
  const showLegacyPreview = connected && legacyBalance >= oneLegacyFly;

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="wrapper-summary">
        <h1>MUTATIO $FLIES</h1>
        <p>MUTATIO NFT to $FLIES wrapper</p>
        <WrapHistoryChart currentSupply={supply.data === undefined ? undefined : totalSupply} />
      </section>
      <section className="action-grid"><WrapCard /><UnwrapCard /></section>
      {showLegacyPreview && <section className="migration-panel">
        <button className="legacy-notice" aria-expanded={showMigration} aria-controls="legacy-migration-body" onClick={() => setShowMigration((visible) => !visible)}><span><span className="status-dot status-pending" /> Old $FLIES balance found</span><span className="legacy-open">Migrate <span className="legacy-arrow" aria-hidden="true">{showMigration ? "↑" : "↓"}</span></span></button>
        {showMigration && <MigrationCard balance={legacyBalance} onComplete={() => setShowMigration(false)} />}
      </section>}
      <section className="wrapper-note">
        <p><a href="https://x.com/VORTEX5D" target="_blank" rel="noreferrer">VORTEX5D</a> (<a href="https://x.com/neonglitch86" target="_blank" rel="noreferrer">NeonGlitch86</a> × <a href="https://x.com/XCOPYART" target="_blank" rel="noreferrer">XCOPY</a>) is not affiliated with $FLIES.</p>
        <p>This is a community-run project that XCOPY has publicly <a href="https://x.com/XCOPYART/status/1775624480317931772" target="_blank" rel="noreferrer">acknowledged</a>.</p>
        <button type="button" className="mutatio-art" aria-label="Toggle the MUTATIO fly swarm" onClick={triggerFlySwarm}>
          <video autoPlay loop muted playsInline preload="metadata" aria-hidden="true">
            <source src="/mutatio-fly.mp4" type="video/mp4" />
          </video>
        </button>
      </section>
      <SiteFooter current="wrapper" />
    </main>
  );
}
