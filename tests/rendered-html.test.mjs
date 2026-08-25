import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const file = (path) => new URL(path, root);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the wrapper, merch, and art routes", async () => {
  const [homeResponse, merchResponse, artResponse] = await Promise.all([render("/"), render("/merch"), render("/art")]);
  assert.equal(homeResponse.status, 200);
  assert.equal(merchResponse.status, 200);
  assert.equal(artResponse.status, 200);
  const [home, merch, art] = await Promise.all([homeResponse.text(), merchResponse.text(), artResponse.text()]);
  assert.match(home, /MUTATIO \$FLIES/);
  assert.match(home, /Wrap MUTATIO/);
  assert.match(home, /Unwrap \$FLIES/);
  assert.match(home, /\/ 1M wrapped/);
  assert.match(home, /Connect wallet/);
  assert.match(merch, /DIY Merch Patch/);
  assert.match(merch, /Mint/);
  assert.match(merch, /Burn to redeem|Connect wallet/);
  assert.match(art, /FLIES Art Gallery/);
  assert.match(art, /Loading gallery/);
  assert.doesNotMatch(art, /Connect wallet/);
  assert.match(home, /rel="canonical" href="https:\/\/mutatioflies\.com"/);
  assert.match(merch, /rel="canonical" href="https:\/\/mutatioflies\.com\/merch"/);
  assert.match(art, /rel="canonical" href="https:\/\/mutatioflies\.com\/art"/);
});

test("merges the gallery without duplicating the shared site shell", async () => {
  const [page, gallery, header, footer, constants, styles] = await Promise.all([
    readFile(file("app/art/page.tsx"), "utf8"),
    readFile(file("app/components/gallery-client.tsx"), "utf8"),
    readFile(file("app/components/site-header.tsx"), "utf8"),
    readFile(file("app/components/site-footer.tsx"), "utf8"),
    readFile(file("app/constants.ts"), "utf8"),
    readFile(file("app/globals.css"), "utf8"),
  ]);
  assert.match(page, /https:\/\/api\.mutatioflies\.com/);
  assert.match(page, /\/api\/gallery/);
  assert.match(gallery, /<SiteHeader current="art" \/>/);
  assert.match(gallery, /<SiteFooter current="art" \/>/);
  assert.match(header, /data-active=\{current === "art"\} href="\/art"/);
  assert.match(header, /current !== "art" && <div className="wallet-slot">/);
  assert.match(footer, /FOOTER_LINKS\[current\]/);
  assert.match(constants, /FOOTER_LINKS = \{/);
  assert.doesNotMatch(constants, /NEXT_PUBLIC_GALLERY_URL|ART_GALLERY_URL|COMMUNITY_LINKS/);
  assert.doesNotMatch(gallery, /public-header|public-wordmark|public-footer|triggerFlySwarm/);
  assert.match(gallery, /useDeferredValue/);
  assert.match(gallery, /setShuffleSeed\(createShuffleSeed\(\)\)/);
  assert.match(gallery, /Loading gallery/);
  assert.match(gallery, /autoPlay muted loop playsInline/);
  assert.match(gallery, /selectedVideoHasAudio/);
  assert.match(styles, /\.public-art-grid \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.public-stats strong \{[^}]*transform: translateX\(-\.08em\)/);
  assert.match(styles, /\.public-stats \{ width: 360px;/);
  assert.match(styles, /@media \(max-width: 1000px\)[\s\S]*\.public-stats \{ width: min\(100%, 360px\); \}/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.public-stats \{ width: min\(100%, 280px\);/);
  assert.match(styles, /@media \(max-width: 1000px\)[\s\S]*\.public-art-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.public-art-grid \{ grid-template-columns: 1fr/);
  await access(file("static-site/art.html"));
});

test("preserves contract actions without the legacy UI stack", async () => {
  const [constants, provider, wrapper, flySwarm, layout, wrapChart, wrapHistoryText, historyScript, rebuildHistoryScript, merch, header, styles, packageText, nextConfig, banner, patchAnimation, flyAnimation, swarmSprite] = await Promise.all([
    readFile(file("app/constants.ts"), "utf8"),
    readFile(file("app/providers.tsx"), "utf8"),
    readFile(file("app/components/wrapper-interface.tsx"), "utf8"),
    readFile(file("app/components/fly-swarm.tsx"), "utf8"),
    readFile(file("app/layout.tsx"), "utf8"),
    readFile(file("app/components/wrap-history-chart.tsx"), "utf8"),
    readFile(file("app/data/wrap-history.json"), "utf8"),
    readFile(file("scripts/generate-wrap-history.mjs"), "utf8"),
    readFile(file("scripts/rebuild-wrap-history.mjs"), "utf8"),
    readFile(file("app/components/merch-interface.tsx"), "utf8"),
    readFile(file("app/components/site-header.tsx"), "utf8"),
    readFile(file("app/globals.css"), "utf8"),
    readFile(file("package.json"), "utf8"),
    readFile(file("next.config.ts"), "utf8"),
    stat(file("public/FLIES_banner.jpg")),
    stat(file("public/patch_anim_new2_optimized.gif")),
    stat(file("public/mutatio-fly.mp4")),
    stat(file("public/mutatio-fly-swarm.png")),
  ]);
  assert.match(constants, /0x8b67f2E56139cA052a7EC49cBCd1aA9c83F2752a/);
  assert.match(constants, /0x9D6b8B6FB293c757E05073b84a583ECFAeF8D8A7/);
  assert.match(constants, /MUTATIO_NFT_SUPPLY_SNAPSHOT = 1_023_613/);
  assert.match(provider, /wallet_switchEthereumChain/);
  assert.match(provider, /clearError: \(\) => void/);
  assert.match(provider, /refreshChainData\(\)/);
  assert.match(provider, /fallback\(\[/);
  assert.match(provider, /base-rpc\.publicnode\.com/);
  assert.match(provider, /base\.drpc\.org/);
  assert.match(provider, /NEXT_PUBLIC_BASE_RPC_URL/);
  assert.match(provider, /batch: \{ multicall: true \}/);
  assert.match(provider, /export const historyClient/);
  assert.match(provider, /lastTransactionBlock/);
  assert.match(provider, /setAwaitingWallet\(true\)/);
  assert.match(provider, /refreshChainData\(receipt\.blockNumber\)/);
  assert.match(provider, /window\.setTimeout\(\(\) => refreshChainData\(\), 1_500\)/);
  assert.match(provider, /blockNumber: readBlockNumber/);
  assert.match(provider, /\[dataRevision, key, nonce, readBlockNumber\]/);
  assert.match(wrapper, /safeTransferFrom/);
  assert.match(wrapper, /functionName: "unwrap"/);
  assert.match(wrapper, /Approve old \$FLIES/);
  assert.match(wrapper, /legacyBalance >= oneLegacyFly/);
  assert.doesNotMatch(wrapper, /legacyBalance < oneLegacyFly/);
  assert.match(wrapper, /Confirm in wallet/);
  assert.match(wrapper, /<WrapHistoryChart currentSupply=\{supply\.data === undefined \? undefined : totalSupply\}/);
  assert.match(wrapper, /<p>MUTATIO NFT to \$FLIES wrapper<\/p>[\s\S]*<WrapHistoryChart[\s\S]*<\/section>[\s\S]*<section className="action-grid">/);
  assert.match(wrapChart, /<details className="wrap-history">/);
  assert.match(wrapChart, /wrapHistory\.months/);
  assert.match(wrapChart, /historyClient\.getLogs/);
  assert.match(wrapChart, /Array\.from\(\{ length: 9 \}/);
  assert.match(wrapChart, /\/ 1M wrapped/);
  assert.match(wrapChart, /wrap-history-arrow-closed" aria-hidden="true">▾<\/span><span className="wrap-history-arrow wrap-history-arrow-open" aria-hidden="true">▴<\/span>/);
  assert.match(wrapChart, /aria-pressed=\{selected\?\.month === point\.month\}/);
  assert.match(wrapChart, /onClick=\{\(\) => setSelectedMonth\(point\.month\)\}/);
  assert.match(wrapChart, /selected\.average \/ MUTATIO_NFT_SUPPLY_SNAPSHOT/);
  assert.match(wrapChart, /minimumFractionDigits: 1, maximumFractionDigits: 1/);
  assert.match(wrapChart, /TWMA: \$\{whole\.format\(selected\.average\)\} \$FLIES \(\$\{percentage\.format\(selectedPercentage\)\}%\)/);
  assert.match(wrapChart, /FLIES time-weighted monthly average/);
  assert.doesNotMatch(wrapChart, /title=\{/);
  assert.doesNotMatch(wrapChart, /gridStyle|minWidth|overflow-x|wrap-history-scroll/);
  assert.match(wrapChart, /lastScannedBlock = useRef\(BigInt\(wrapHistory\.checkpointBlock\)\)/);
  assert.match(wrapChart, /fromBlock = lastScannedBlock\.current \+ 1n/);
  assert.doesNotMatch(wrapChart, /getBlockNumber|getBlock\(/);
  const wrapHistory = JSON.parse(wrapHistoryText);
  assert.ok(wrapHistory.months.length >= 24);
  assert.ok(wrapHistory.months.every((point) => point.average > 0));
  assert.ok(BigInt(wrapHistory.checkpointSupplyWei) > 0n);
  assert.ok(BigInt(wrapHistory.openMonth.weightedSupplyWeiBlocks) > 0n);
  assert.match(historyScript, /method: "eth_getLogs"/);
  assert.match(historyScript, /BigInt\(previousHistory\.checkpointBlock\) \+ 1n/);
  assert.equal((historyScript.match(/await rpc\(/g) || []).length, 1);
  assert.doesNotMatch(historyScript, /eth_call|readContract|getLogs\(/);
  assert.match(historyScript, /setUTCMonth/);
  assert.match(historyScript, /previousHistory\.months\.slice\(0, -1\)/);
  assert.match(historyScript, /weightedSupply \+= supply \* \(event\.blockNumber - cursorBlock\)/);
  assert.match(rebuildHistoryScript, /topics: topicIndex === 1 \? \[transferTopic, zeroTopic\] : \[transferTopic, null, zeroTopic\]/);
  assert.match(rebuildHistoryScript, /time-weighted monthly averages/);
  assert.match(wrapper, /amount \? `= \$\{amount\} MUTATIO` : "\$FLIES"/);
  assert.match(wrapper, /<video autoPlay loop muted playsInline preload="metadata"/);
  assert.match(wrapper, /<source src="\/mutatio-fly\.mp4" type="video\/mp4" \/>/);
  assert.doesNotMatch(wrapper, /<video[^>]*controls/);
  assert.match(flySwarm, /export function FlySwarmLayer/);
  assert.match(flySwarm, /requestAnimationFrame\(render\)/);
  assert.match(flySwarm, /sprite\.src = "\/mutatio-fly-swarm\.png"/);
  assert.match(flySwarm, /context\.drawImage\(sprite/);
  assert.match(flySwarm, /minimumFlySize = width <= 620 \? 22 : 18/);
  assert.match(flySwarm, /Math\.min\(180, Math\.max\(96, Math\.round\(width \/ 8\)\)\)/);
  assert.match(flySwarm, /Math\.min\(45, Math\.max\(minimumFlySize, width \* \(0\.02 \+ Math\.random\(\) \* 0\.015\)\)\)/);
  assert.match(flySwarm, /sprite\.naturalHeight \/ sprite\.naturalWidth/);
  assert.match(flySwarm, /pointOutside\(index % 4, size\)/);
  assert.match(flySwarm, /const retarget = \(fly: SwarmFly, now: number\)/);
  assert.match(flySwarm, /fly\.controlAX = fly\.startX \+ tangentX/);
  assert.match(flySwarm, /retarget\(fly, now\)/);
  assert.match(flySwarm, /now - lastRenderedAt < 1_000 \/ 30/);
  assert.match(flySwarm, /Math\.sin\(now \* 0\.008 \+ fly\.phase\)/);
  assert.match(flySwarm, /context\.rotate\(Math\.atan2\(dy, dx\) - Math\.PI\)/);
  assert.doesNotMatch(flySwarm, /globalAlpha|globalCompositeOperation/);
  assert.match(flySwarm, /const beginExit = \(fly: SwarmFly, now: number, edge: number\)/);
  assert.match(flySwarm, /beginExit\(fly, now, index % 4\)/);
  assert.match(flySwarm, /fly\.segmentDuration = Math\.min\(2_800, Math\.max\(900, exitDistance \/ 0\.32\)\)/);
  assert.match(flySwarm, /if \(leavingRef\.current && !exitStarted\)/);
  assert.match(flySwarm, /flies\.every\(\(fly\) => fly\.finished\)/);
  assert.match(flySwarm, /onExitCompleteRef\.current\(\)/);
  assert.match(flySwarm, /const flySwarmEvent = "mutatio:toggle-fly-swarm"/);
  assert.match(flySwarm, /if \(state\.mode === "flying"\) return \{ \.\.\.state, mode: "leaving" \}/);
  assert.match(layout, /<WalletProvider>\{children\}<FlySwarmLayer \/><\/WalletProvider>/);
  assert.match(header, /className="wordmark" aria-label="Toggle the MUTATIO fly swarm" onClick=\{triggerFlySwarm\}/);
  assert.match(wrapper, /className="mutatio-art" aria-label="Toggle the MUTATIO fly swarm" onClick=\{triggerFlySwarm\}/);
  assert.doesNotMatch(`${wrapper}\n${flySwarm}`, /flySwarmDuration|setTimeout\(\(\) => setSwarm/);
  assert.doesNotMatch(`${wrapper}\n${merch}`, /Connect wallet first/);
  assert.doesNotMatch(wrapper, /Working…|Confirm in your wallet|basescan\.org\/tx/);
  assert.match(merch, /functionName: "claim"/);
  assert.match(merch, /functionName: "getClaimConditionById"/);
  assert.match(merch, /claimCondition\.data\?\.supplyClaimed/);
  assert.match(merch, /burnedSupply\.data/);
  assert.match(merch, /args: \[DEAD_ADDRESS, 0n\]/);
  assert.doesNotMatch(merch, /functionName: "totalSupply"/);
  assert.match(merch, /<SupplyProgress kind="mint" value=\{mintedCount\} maximum=\{totalCount\}/);
  assert.match(merch, /<SupplyProgress kind="redeem" value=\{burnedCount\} maximum=\{totalCount\}/);
  assert.match(merch, /role="progressbar"/);
  assert.match(merch, /"Minted" : "Redeemed"/);
  assert.match(merch, /"Minted patches" : "Redeemed patches"/);
  assert.doesNotMatch(merch, /className="merch-stats"/);
  assert.match(styles, /\.supply-progress-label strong \{[^}]*font-weight: 400/);
  assert.match(styles, /\.supply-progress-track span \{[^}]*background: var\(--green\)/);
  assert.match(styles, /\.supply-progress-redeem \.supply-progress-track span \{ background: #6f2926; \}/);
  assert.match(merch, /safeTransferFrom/);
  assert.match(merch, /formatUnits\(price \* quantity, 18\)/);
  assert.match(merch, /patch_anim_new2_optimized\.gif/);
  assert.doesNotMatch(merch, /Working…|Confirm in your wallet|Transaction pending/);
  assert.match(merch, /Confirm in wallet/);
  assert.match(merch, /window\.location\.hostname === "localhost"/);
  assert.match(merch, /get\("preview"\) !== "redeem-success"/);
  assert.match(merch, /previewTransactionHash/);
  assert.doesNotMatch(merch, />Done<\/button>/);
  assert.doesNotMatch(merch, /Available supply|\/ 420 minted|Redeemed supply/);
  assert.match(header, /<a data-active=\{current === "merch"\} href="\/merch">/);
  assert.match(header, /className="wordmark-text">MUTATIO \$FLIES<\/span>/);
  assert.match(header, /aria-label="Dismiss wallet notice" onClick=\{clearError\}><span aria-hidden="true">✕<\/span><\/button>/);
  assert.match(styles, /\.wordmark \{[^}]*display: flex; align-items: center; gap: 9px;/);
  assert.match(styles, /^\.wordmark > \.status-dot \{ transform: translateY\(1px\); \}/m);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.wordmark > \.status-dot \{ transform: translateY\(-1px\); \}/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.wrapper-summary, \.merch-summary \{ padding-top: 36px; \}/);
  assert.match(styles, /@media \(max-width: 420px\)[\s\S]*\.wrapper-summary, \.merch-summary \{ padding-top: 27px; \}/);
  assert.match(styles, /\.action-card h2 \{ text-align: center; \}/);
  assert.match(styles, /\.wrapper-note \{[^}]*margin: 22px auto 48px/);
  assert.match(styles, /\.amount-field input \{[^}]*font: 400 28px\/1 "Silkscreen"/);
  assert.match(styles, /\.mutatio-art \{[^}]*margin: 30px auto -8px/);
  assert.match(styles, /\.mutatio-art \{[^}]*-webkit-tap-highlight-color: transparent/);
  assert.doesNotMatch(styles, /\.mutatio-art:disabled/);
  assert.match(styles, /\.wrapper-note \.mutatio-art video \{[^}]*transform: translateY\(7%\) scale\(1\.22\)/);
  assert.match(styles, /\.fly-swarm \{[^}]*position: fixed;[^}]*pointer-events: none;/);
  assert.doesNotMatch(styles, /\.fly-swarm \{[^}]*mix-blend-mode/);
  assert.match(styles, /\.wrap-history-arrow \{[^}]*margin-left: 5px;/);
  assert.match(styles, /\.wrap-history-arrow-closed \{[^}]*font-size: 14px;/);
  assert.match(styles, /\.wrap-history-arrow-open \{[^}]*display: none;[^}]*font-size: 14px;/);
  assert.match(styles, /\.product-grid \{[^}]*margin: 18px 0 40px/);
  assert.match(styles, /\.action-grid \{ width: min\(100%, 400px\); \}/);
  assert.match(styles, /\.migration-panel \{[^}]*width: min\(600px, calc\(100% - 24px\)\)/);
  assert.match(styles, /\.legacy-notice \{[^}]*width: 100%;[^}]*border: 0;[^}]*font-size: 10px/);
  assert.match(styles, /\.migration-card \{[^}]*width: 100%;[^}]*border-top: 1px solid #4b452f/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.migration-panel \{ width: min\(calc\(100% - 24px\), 376px\); \}/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.migration-card \{ grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(wrapper, /aria-expanded=\{showMigration\}/);
  assert.match(wrapper, /setShowMigration\(\(visible\) => !visible\)/);
  assert.match(wrapper, /className="legacy-arrow"[^>]*>\{showMigration \? "↑" : "↓"\}/);
  assert.doesNotMatch(wrapper, />Hide<\/button>|Unwrap \$FLIES from old contract/);
  assert.match(styles, /@media \(max-width: 420px\)[\s\S]*\.site-header \{ padding: 13px 6px;/);
  assert.match(styles, /\.button-spinner/);
  assert.match(styles, /\.wrap-history-chart/);
  assert.match(styles, /\.wrap-history summary \{[^}]*width: fit-content;[^}]*margin: 0 auto;/);
  assert.match(styles, /\.wrap-history\[open\] \.wrap-history-arrow-closed \{ display: none; \}/);
  assert.match(styles, /\.wrap-history\[open\] \.wrap-history-arrow-open \{ display: inline-block; \}/);
  assert.doesNotMatch(styles, /\.wrap-history summary:hover/);
  assert.match(styles, /\.wrap-history-bars \{[^}]*display: flex;[^}]*overflow: hidden;/);
  assert.match(styles, /\.wrap-history-bar \{[^}]*min-width: 0;[^}]*flex: 1 1 0;/);
  assert.match(styles, /\.wrap-history-bar\[aria-pressed="true"\]/);
  assert.match(styles, /\.wrap-history-selection strong \{[^}]*font-weight: 400/);
  assert.doesNotMatch(styles, /\.wrap-history[^}]*overflow-(?:x|y): (?:auto|scroll)/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.wrap-history-date:nth-child\(even\) \{ display: none; \}/);
  assert.match(styles, /@media \(max-width: 420px\)[\s\S]*\.wrap-history-date:nth-child\(1\), \.wrap-history-date:nth-child\(5\), \.wrap-history-date:nth-child\(9\) \{ display: block; \}/);
  assert.doesNotMatch(styles, /\.site-nav[^}]*box-shadow/);
  assert.doesNotMatch(packageText, /rainbow|wagmi|heroui|web3|framer-motion/i);
  assert.match(packageText, /"update:wrap-history": "node scripts\/generate-wrap-history\.mjs"/);
  assert.match(packageText, /"rebuild:wrap-history": "node scripts\/rebuild-wrap-history\.mjs"/);
  assert.match(nextConfig, /output: "export"/);
  assert.doesNotMatch(constants, /NEXT_PUBLIC_GALLERY_URL/);
  assert.doesNotMatch(constants, /Liquidity|app\.uniswap\.org\/add/);
  assert.ok(banner.size > 70_000);
  assert.ok(patchAnimation.size > 0);
  assert.ok(flyAnimation.size > 0 && flyAnimation.size < 1_000_000);
  assert.ok(swarmSprite.size > 0 && swarmSprite.size < 250_000);
  await access(file("dist/server/index.js"));
  await access(file("static-site/index.html"));
  await access(file("static-site/merch/index.html"));
  await access(file("static-site/art/index.html"));
  await access(file("static-site/sitemap.xml"));
  await access(file("static-site/robots.txt"));
});
