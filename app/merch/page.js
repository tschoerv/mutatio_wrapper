'use client'
import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Head from 'next/head';
import { Button, Link } from "@nextui-org/react";
import '@rainbow-me/rainbowkit/styles.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSwitchChain, useAccount } from "wagmi";
import { reconnect } from '@wagmi/core'
import { injected } from '@wagmi/connectors'
import { config } from '../providers'

import Mint from "../Components/Mint";

export default function Home() {
  useEffect(() => {
    reconnect(config, { connectors: [injected()] });
  }, []);

  const [isClientSide, setIsClientSide] = useState(false);

  const MerchDrop_address = process.env.NEXT_PUBLIC_MERCHDROP_ADDRESS;

  const { isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const desiredNetworkId = 8453;

  const handleSwitchChain = () => {
    switchChain({ chainId: desiredNetworkId });
  };

  useEffect(() => {
    document.title = 'MUTATIO $FLIES DIY MERCH';
    setIsClientSide(true);
  }, []);


  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-24 py-4 text-[#72e536]">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>MUTATIO $FLIES</title>
      </Head>
      <div className='bg-neutral-900 p-2 rounded-xl flex flex-col items-center text-center w-full md:w-auto '>
        <div className='border-b-3 border-stone-600 pb-1'>
        <Link href="/" className='hover:opacity-100'><h1 className="md:text-7xl text-6xl text-[#72e536] mb-1">MUTATIO $FLIES</h1></Link>
        </div>
        <h2 className="text-3xl mt-1">DIY Merch Patch</h2>
      </div>

      <div className='my-3'>
        {chain?.id !== desiredNetworkId && isConnected ? (
          <Button variant="solid" color="danger" onClick={handleSwitchChain}>Switch to Base</Button>
        ) : (
          <ConnectButton chainStatus="none" showBalance={true} />
        )}</div>

        <Mint/>

      <div className='flex flex-col text-center mt-2'>
        <p>Each NFT is redeemable for a physical iron-on patch featuring an&nbsp;</p>
        <p className='mb-0'>exclusive design inspired by <Link className='underline text-[#72e536]' href={`https://x.com/hueviews`} isExternal>hueviews</Link>&apos; work &quot;<Link className='underline text-[#72e536]' href={`https://x.com/hueviews/status/1780802015901159792`} isExternal>bar fly</Link>&quot;.</p>
        <p>Redeemable until 01.01.2032 with Free Worldwide Shipping!</p>
      </div>

      <div className='flex flex-col md:flex-row mt-2 gap-2 mb-2'>
      <Image
            src="/Fly-CAP1.jpg"
            width={350}
            height={350}
            alt="cap"
            className='rounded-lg'
          />
      <Image
            src="/Fly-Tshirt2.jpg"
            width={350}
            height={350}
            alt="tshirt"
            className='rounded-lg'
          />
      </div>

      <div className='flex flex-row gap-5 bg-neutral-900 p-3 pl-5 pr-5 md:pl-7 md:pr-7 rounded-xl mt-2'>
        <Link href={`https://basescan.org/address/${MerchDrop_address}`} isExternal>
          <Image
            src="/basescan.svg"
            width={30}
            height={30}
            alt="basescan"
          /></Link>
          <Link href={`https://opensea.io/assets/base/${MerchDrop_address}/0`} isExternal>
          <Image
            src="/opensea.png"
            width={30}
            height={30}
            alt="opensea"
          /></Link>
        <Link href={`https://github.com/tschoerv/mutatio_wrapper`} isExternal>
          <Image
            src="/github.png"
            width={30}
            height={30}
            alt="github"
          /></Link>
        <Link href={`https://twitter.com/Mutatio_Flies`} isExternal>
          <Image
            src="/twitter.png"
            width={30}
            height={30}
            alt="x"
          /></Link>
        <Link href={`https://t.me/fliesonbase`} isExternal>
          <Image
            src="/telegram.svg"
            width={30}
            height={30}
            alt="telegram"
          /></Link>
      </div>
    </main>
  );
}

