"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseAbiItem, zeroAddress } from "viem";
import { MUTATIO_NFT_SUPPLY_SNAPSHOT, WRAPPER_ADDRESS } from "../constants";
import wrapHistory from "../data/wrap-history.json";
import { historyClient, useWallet } from "../providers";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const percentage = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
const longMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const tokenUnit = 1_000_000_000_000_000_000n;
type SupplyChange = { blockNumber: bigint; logIndex: number; delta: bigint };
type MonthAverage = { month: string; average: number };

const monthDate = (month: string) => new Date(`${month}-01T00:00:00.000Z`);

export function WrapHistoryChart({ currentSupply }: { currentSupply?: number }) {
  const { dataRevision, lastTransactionBlock } = useWallet();
  const [supplyChanges, setSupplyChanges] = useState<SupplyChange[]>([]);
  const [scannedThroughBlock, setScannedThroughBlock] = useState(BigInt(wrapHistory.checkpointBlock));
  const [selectedMonth, setSelectedMonth] = useState(wrapHistory.months.at(-1)?.month ?? "");
  const lastScannedBlock = useRef(BigInt(wrapHistory.checkpointBlock));

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      const fromBlock = lastScannedBlock.current + 1n;
      if (lastTransactionBlock !== undefined && lastTransactionBlock < fromBlock) return;
      const toBlock = lastTransactionBlock ?? "latest";
      try {
        const logs = await historyClient.getLogs({ address: WRAPPER_ADDRESS, event: transferEvent, fromBlock, toBlock });
        if (!active) return;
        const changes = logs.flatMap((log) => {
          const blockNumber = log.blockNumber;
          const value = log.args.value;
          if (blockNumber === null || value === undefined) return [];
          if (log.args.from?.toLowerCase() === zeroAddress) return [{ blockNumber, logIndex: log.logIndex ?? 0, delta: value }];
          if (log.args.to?.toLowerCase() === zeroAddress) return [{ blockNumber, logIndex: log.logIndex ?? 0, delta: -value }];
          return [];
        }).sort((left, right) => left.blockNumber === right.blockNumber ? left.logIndex - right.logIndex : left.blockNumber < right.blockNumber ? -1 : 1);
        if (changes.length) setSupplyChanges((current) => [...current, ...changes]);
        const returnedBlock = logs.reduce((latest, log) => log.blockNumber && log.blockNumber > latest ? log.blockNumber : latest, lastScannedBlock.current);
        const elapsedBlocks = BigInt(Math.max(0, Math.floor((Date.now() - new Date(wrapHistory.generatedAt).getTime()) / 2_000)));
        const estimatedBlock = BigInt(wrapHistory.checkpointBlock) + elapsedBlocks;
        const scanEnd = typeof toBlock === "bigint" ? toBlock : returnedBlock > estimatedBlock ? returnedBlock : estimatedBlock;
        setScannedThroughBlock((current) => scanEnd > current ? scanEnd : current);
        if (typeof toBlock === "bigint") lastScannedBlock.current = toBlock;
        else if (logs.length) lastScannedBlock.current = returnedBlock;
      } catch {
        // The bundled monthly averages remain available if log scanning fails.
      }
    }, dataRevision === 0 ? 0 : 1_750);
    return () => { active = false; window.clearTimeout(timer); };
  }, [dataRevision, lastTransactionBlock]);

  const months = useMemo<MonthAverage[]>(() => {
    const blockForTimestamp = (timestamp: number) => BigInt(wrapHistory.deploymentBlock) + BigInt(Math.ceil((timestamp - wrapHistory.deploymentTimestamp) / 2));
    const completedMonths = wrapHistory.months.slice(0, -1);
    let activeMonthDate = monthDate(wrapHistory.openMonth.month);
    let periodStartBlock = BigInt(wrapHistory.openMonth.startBlock);
    let cursorBlock = BigInt(wrapHistory.openMonth.cursorBlock);
    let supply = BigInt(wrapHistory.openMonth.supplyWei);
    let weightedSupply = BigInt(wrapHistory.openMonth.weightedSupplyWeiBlocks);
    let eventIndex = 0;
    const endBlock = scannedThroughBlock + 1n;
    const refreshedMonths: MonthAverage[] = [];

    while (periodStartBlock < endBlock) {
      const nextMonthDate = new Date(activeMonthDate);
      nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
      const boundaryBlock = blockForTimestamp(Math.floor(nextMonthDate.getTime() / 1_000));
      const periodEndBlock = boundaryBlock < endBlock ? boundaryBlock : endBlock;
      while (eventIndex < supplyChanges.length && supplyChanges[eventIndex].blockNumber < periodEndBlock) {
        const event = supplyChanges[eventIndex];
        weightedSupply += supply * (event.blockNumber - cursorBlock);
        supply += event.delta;
        cursorBlock = event.blockNumber;
        eventIndex += 1;
      }
      weightedSupply += supply * (periodEndBlock - cursorBlock);
      cursorBlock = periodEndBlock;
      const elapsedBlocks = periodEndBlock - periodStartBlock;
      const averageWei = elapsedBlocks > 0n ? weightedSupply / elapsedBlocks : supply;
      refreshedMonths.push({ month: activeMonthDate.toISOString().slice(0, 7), average: Number((averageWei + tokenUnit / 2n) / tokenUnit) });
      if (periodEndBlock === endBlock) break;
      activeMonthDate = nextMonthDate;
      periodStartBlock = periodEndBlock;
      weightedSupply = 0n;
    }
    return [...completedMonths, ...refreshedMonths];
  }, [scannedThroughBlock, supplyChanges]);

  const currentValue = currentSupply ?? Number((BigInt(wrapHistory.checkpointSupplyWei) + tokenUnit / 2n) / tokenUnit);
  const maximum = Math.max(1, ...months.map((point) => point.average));
  const selected = months.find((point) => point.month === selectedMonth) ?? months.at(-1);
  const selectedPercentage = selected ? (selected.average / MUTATIO_NFT_SUPPLY_SNAPSHOT) * 100 : undefined;
  const dateLabels = Array.from({ length: 9 }, (_, slot) => {
    const sourceIndex = Math.round(((months.length - 1) * slot) / 8);
    const month = months[sourceIndex]?.month;
    return { slot, label: month ? shortMonth.format(monthDate(month)) : "" };
  });

  return (
    <details className="wrap-history">
      <summary>
        <span className="wrap-history-total">{whole.format(currentValue)} / 1M wrapped<span className="wrap-history-arrow wrap-history-arrow-closed" aria-hidden="true">▾</span><span className="wrap-history-arrow wrap-history-arrow-open" aria-hidden="true">▴</span></span>
      </summary>
      <div className="wrap-history-chart">
        <div className="wrap-history-selection" aria-live="polite">
          <span>{selected ? longMonth.format(monthDate(selected.month)) : ""}</span>
          <strong aria-label={selected && selectedPercentage !== undefined ? `${whole.format(selected.average)} FLIES time-weighted monthly average, ${percentage.format(selectedPercentage)} percent of MUTATIO supply` : undefined}>{selected && selectedPercentage !== undefined ? `TWMA: ${whole.format(selected.average)} $FLIES (${percentage.format(selectedPercentage)}%)` : ""}</strong>
        </div>
        <div className="wrap-history-scale" aria-hidden="true"><span>{compact.format(maximum)}</span><span>0</span></div>
        <div className="wrap-history-plot">
          <div className="wrap-history-bars" role="img" aria-label="Average wrapped FLIES by month">
            {months.map((point) => {
              const label = longMonth.format(monthDate(point.month));
              return <button type="button" key={point.month} className="wrap-history-bar" aria-label={`${label}: ${whole.format(point.average)} FLIES wrapped on average`} aria-pressed={selected?.month === point.month} onClick={() => setSelectedMonth(point.month)} style={{ height: `${Math.max(point.average ? 1.5 : 0, (point.average / maximum) * 100)}%` }} />;
            })}
          </div>
          <div className="wrap-history-dates" aria-hidden="true">
            {dateLabels.map(({ slot, label }) => <span className="wrap-history-date" key={slot} style={{ gridColumn: slot + 1 }}>{label}</span>)}
          </div>
        </div>
      </div>
    </details>
  );
}
