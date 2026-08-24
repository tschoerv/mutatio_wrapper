export const BASE_CHAIN_ID = 8453;
export const WRAPPER_ADDRESS = "0x8b67f2E56139cA052a7EC49cBCd1aA9c83F2752a" as const;
export const OLD_WRAPPER_ADDRESS = "0x9D6b8B6FB293c757E05073b84a583ECFAeF8D8A7" as const;
export const MUTATIO_ADDRESS = "0xfdb192fb0213d48ecdf580c1821008d8c46bdbd7" as const;
export const MUTATIO_NFT_SUPPLY_SNAPSHOT = 1_023_613;
export const MERCH_ADDRESS = "0x48600E8321438058731aC210E45B959b12A04f4e" as const;
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;
export const NATIVE_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;
const SOCIAL_LINKS = [
  ["X", "https://twitter.com/Mutatio_Flies"],
  ["Telegram", "https://t.me/fliesonbase"],
] as const;

export const FOOTER_LINKS = {
  wrapper: [
    ["Contract", `https://basescan.org/address/${WRAPPER_ADDRESS}`],
    ["OpenSea", `https://opensea.io/assets/base/${MUTATIO_ADDRESS}/1`],
    ["Dexscreener", `https://dexscreener.com/base/${WRAPPER_ADDRESS}`],
    ["CoinGecko", "https://www.coingecko.com/de/munze/mutatio-flies"],
    ...SOCIAL_LINKS,
  ],
  merch: [
    ["Contract", `https://basescan.org/address/${MERCH_ADDRESS}`],
    ["OpenSea", `https://opensea.io/assets/base/${MERCH_ADDRESS}/0`],
    ...SOCIAL_LINKS,
  ],
  art: [
    ["OpenSea", `https://opensea.io/assets/base/${MUTATIO_ADDRESS}/1`],
    ...SOCIAL_LINKS,
  ],
} as const;
