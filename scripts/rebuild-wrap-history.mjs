import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "app/data/wrap-history.json");
const wrapperAddress = "0x8b67f2E56139cA052a7EC49cBCd1aA9c83F2752a";
const deploymentBlock = 12_645_649n;
const deploymentTimestamp = 1_712_080_645;
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const zeroTopic = "0x0000000000000000000000000000000000000000000000000000000000000000";
const archiveRpcUrl = process.env.BASE_ARCHIVE_RPC_URL?.trim() || "https://base.gateway.tenderly.co";
const tokenUnit = 1_000_000_000_000_000_000n;

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
async function getLogs(checkpointBlock, topicIndex, attempt = 0) {
  const body = {
    jsonrpc: "2.0",
    id: topicIndex,
    method: "eth_getLogs",
    params: [{
      address: wrapperAddress,
      fromBlock: `0x${deploymentBlock.toString(16)}`,
      toBlock: `0x${BigInt(checkpointBlock).toString(16)}`,
      topics: topicIndex === 1 ? [transferTopic, zeroTopic] : [transferTopic, null, zeroTopic],
    }],
  };
  const response = await fetch(archiveRpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if ((response.status === 429 || response.status >= 500) && attempt < 8) {
    const retryAfter = Number(response.headers.get("retry-after") || 0) * 1_000;
    await wait(Math.max(retryAfter, 1_500 * (2 ** attempt)));
    return getLogs(checkpointBlock, topicIndex, attempt + 1);
  }
  if (!response.ok) throw new Error(`Archive RPC returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload.error || !Array.isArray(payload.result)) throw new Error(payload.error?.message || "Archive log scan failed.");
  return payload.result;
}

const previousHistory = JSON.parse(await readFile(outputPath, "utf8"));
const checkpointBlock = Number(previousHistory.checkpointBlock);
const mints = await getLogs(checkpointBlock, 1);
console.log(`Downloaded ${mints.length} wrap logs.`);
const burns = await getLogs(checkpointBlock, 2);
console.log(`Downloaded ${burns.length} unwrap logs.`);
const events = [
  ...mints.map((log) => ({ blockNumber: BigInt(log.blockNumber), logIndex: Number(BigInt(log.logIndex)), delta: BigInt(log.data) })),
  ...burns.map((log) => ({ blockNumber: BigInt(log.blockNumber), logIndex: Number(BigInt(log.logIndex)), delta: -BigInt(log.data) })),
];
events.sort((left, right) => left.blockNumber === right.blockNumber ? left.logIndex - right.logIndex : left.blockNumber < right.blockNumber ? -1 : 1);

const blockForTimestamp = (timestamp) => deploymentBlock + BigInt(Math.ceil((timestamp - deploymentTimestamp) / 2));
const checkpointEndBlock = BigInt(checkpointBlock) + 1n;
const checkpointDate = new Date(previousHistory.generatedAt);
let monthDate = new Date(Date.UTC(2024, 3, 1));
let periodStartBlock = deploymentBlock;
let cursorBlock = deploymentBlock;
let supply = 0n;
let weightedSupply = 0n;
let eventIndex = 0;
const months = [];
let openMonth;

while (periodStartBlock < checkpointEndBlock) {
  const nextMonthDate = new Date(monthDate);
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const monthBoundaryBlock = blockForTimestamp(Math.floor(nextMonthDate.getTime() / 1_000));
  const periodEndBlock = monthBoundaryBlock < checkpointEndBlock ? monthBoundaryBlock : checkpointEndBlock;
  while (eventIndex < events.length && events[eventIndex].blockNumber < periodEndBlock) {
    const event = events[eventIndex];
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
  months.push({ month, average: Number((averageWei + tokenUnit / 2n) / tokenUnit) });
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

if (supply.toString() !== previousHistory.checkpointSupplyWei) throw new Error(`Log history ended at ${supply}, expected ${previousHistory.checkpointSupplyWei}.`);
const history = {
  generatedAt: checkpointDate.toISOString(),
  deploymentBlock: Number(deploymentBlock),
  deploymentTimestamp,
  checkpointBlock,
  checkpointSupplyWei: supply.toString(),
  months,
  openMonth,
};
await writeFile(outputPath, `${JSON.stringify(history, null, 2)}\n`);
console.log(`Saved ${months.length} time-weighted monthly averages from ${events.length} wrap and unwrap events.`);
