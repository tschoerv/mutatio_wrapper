import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "app/data/wrap-history.json");
const wrapperAddress = "0x8b67f2E56139cA052a7EC49cBCd1aA9c83F2752a";
const rpcUrl = process.env.BASE_RPC_URL?.trim() || "https://mainnet.base.org";
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const zeroTopic = "0x0000000000000000000000000000000000000000000000000000000000000000";
const tokenUnit = 1_000_000_000_000_000_000n;

async function rpc(body) {
  const response = await fetch(rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}.`);
  return response.json();
}

const previousHistory = JSON.parse(await readFile(outputPath, "utf8"));
const fromBlock = BigInt(previousHistory.checkpointBlock) + 1n;
const response = await rpc([
  { jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", false] },
  { jsonrpc: "2.0", id: 2, method: "eth_getLogs", params: [{ address: wrapperAddress, fromBlock: `0x${fromBlock.toString(16)}`, toBlock: "latest", topics: [transferTopic] }] },
]);
if (!Array.isArray(response)) throw new Error(`Unexpected RPC response: ${JSON.stringify(response)}`);
const latestResponse = response.find((item) => item.id === 1);
const logsResponse = response.find((item) => item.id === 2);
if (latestResponse?.error || !latestResponse?.result) throw new Error(latestResponse?.error?.message || "Latest block lookup failed.");
if (logsResponse?.error || !logsResponse?.result) throw new Error(logsResponse?.error?.message || "Transfer log scan failed.");

const latestBlockNumber = BigInt(latestResponse.result.number);
const latestTimestamp = Number(BigInt(latestResponse.result.timestamp));
const supplyEvents = logsResponse.result
  .flatMap((log) => {
    const from = log.topics[1]?.toLowerCase();
    const to = log.topics[2]?.toLowerCase();
    if (from === zeroTopic) return [{ blockNumber: BigInt(log.blockNumber), logIndex: Number(BigInt(log.logIndex)), delta: BigInt(log.data) }];
    if (to === zeroTopic) return [{ blockNumber: BigInt(log.blockNumber), logIndex: Number(BigInt(log.logIndex)), delta: -BigInt(log.data) }];
    return [];
  })
  .sort((left, right) => left.blockNumber === right.blockNumber ? left.logIndex - right.logIndex : left.blockNumber < right.blockNumber ? -1 : 1);

const blockForTimestamp = (timestamp) => BigInt(previousHistory.deploymentBlock) + BigInt(Math.ceil((timestamp - previousHistory.deploymentTimestamp) / 2));
const completedMonths = previousHistory.months.slice(0, -1);
let monthDate = new Date(`${previousHistory.openMonth.month}-01T00:00:00.000Z`);
let periodStartBlock = BigInt(previousHistory.openMonth.startBlock);
let cursorBlock = BigInt(previousHistory.openMonth.cursorBlock);
let supply = BigInt(previousHistory.openMonth.supplyWei);
let weightedSupply = BigInt(previousHistory.openMonth.weightedSupplyWeiBlocks);
let eventIndex = 0;
const checkpointEndBlock = latestBlockNumber + 1n;
const refreshedMonths = [];
let openMonth;

while (periodStartBlock < checkpointEndBlock) {
  const nextMonthDate = new Date(monthDate);
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const monthBoundaryBlock = blockForTimestamp(Math.floor(nextMonthDate.getTime() / 1_000));
  const periodEndBlock = monthBoundaryBlock < checkpointEndBlock ? monthBoundaryBlock : checkpointEndBlock;
  while (eventIndex < supplyEvents.length && supplyEvents[eventIndex].blockNumber < periodEndBlock) {
    const event = supplyEvents[eventIndex];
    weightedSupply += supply * (event.blockNumber - cursorBlock);
    supply += event.delta;
    cursorBlock = event.blockNumber;
    eventIndex += 1;
  }
  weightedSupply += supply * (periodEndBlock - cursorBlock);
  cursorBlock = periodEndBlock;
  const elapsedBlocks = periodEndBlock - periodStartBlock;
  const averageWei = elapsedBlocks > 0n ? weightedSupply / elapsedBlocks : supply;
  const month = monthDate.toISOString().slice(0, 7);
  refreshedMonths.push({ month, average: Number((averageWei + tokenUnit / 2n) / tokenUnit) });
  if (periodEndBlock === checkpointEndBlock) {
    openMonth = {
      month,
      startBlock: Number(periodStartBlock),
      cursorBlock: Number(cursorBlock),
      supplyWei: supply.toString(),
      weightedSupplyWeiBlocks: weightedSupply.toString(),
    };
    break;
  }
  monthDate = nextMonthDate;
  periodStartBlock = periodEndBlock;
  weightedSupply = 0n;
}

const history = {
  ...previousHistory,
  generatedAt: new Date(latestTimestamp * 1_000).toISOString(),
  checkpointBlock: Number(latestBlockNumber),
  checkpointSupplyWei: supply.toString(),
  months: [...completedMonths, ...refreshedMonths],
  openMonth,
};
await writeFile(outputPath, `${JSON.stringify(history, null, 2)}\n`);
console.log(`Scanned blocks ${fromBlock}-${latestBlockNumber} in one log request; updated ${refreshedMonths.length} monthly average${refreshedMonths.length === 1 ? "" : "s"}.`);
