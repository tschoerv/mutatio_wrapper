'use client'
import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Head from 'next/head';
import { Button, Input, Link } from "@nextui-org/react";
import { Card, CardHeader, CardBody } from "@nextui-org/react";
import '@rainbow-me/rainbowkit/styles.css';
import { useWriteContract, useSwitchChain, useSimulateContract, useAccount, useReadContract, useBlockNumber } from "wagmi";
import { reconnect } from '@wagmi/core'
import { injected } from '@wagmi/connectors'
import { config } from './providers'
import { useQueryClient } from '@tanstack/react-query'
import { useQueryTrigger } from './QueryTriggerContext';
import Web3 from 'web3';

import Unwrap from "./Components/Unwrap";
import Migrate from "./Components/Migrate";

import MUTATIO_wrapper_ABI from "./ABI/MUTATIO_wrapper_ABI.json";

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;

// Initialize web3
const web3 = new Web3(alchemyUrl);

function formatAddress(address) {
  return address.length > 10 ? `${address.slice(0, 10)}...${address.slice(-9)}` : address;
}

export default function Home() {
  useEffect(() => {
    reconnect(config, { connectors: [injected()] });
  }, []);
  const isMobile = window.innerWidth <= 768;

  const [isClientSide, setIsClientSide] = useState(false);
  const [totalSupply, setTotalSupply] = useState(0);
  const [showMigrate, setShowMigrate] = useState(false);

  const { queryTrigger, toggleQueryTrigger } = useQueryTrigger();

  const MUTATIOFLIES_address = process.env.NEXT_PUBLIC_MUTATIOFLIES_WRAPPER_ADDRESS;

  const wrapperContract = new web3.eth.Contract(MUTATIO_wrapper_ABI, MUTATIOFLIES_address);

  const { isConnected } = useAccount();

  const queryClient = useQueryClient()

  useEffect(() => {
    document.title = 'MUTATIO $FLIES';
    setIsClientSide(true);
  }, []);


  const toggleMigrateVisibility = () => {
    setShowMigrate(!showMigrate); // Toggle the state value
  };

  const fetchTotalSupply = async () => {
    try {
      if(!isConnected){
      const totalSupply = await wrapperContract.methods.totalSupply().call();
      setTotalSupply(new Intl.NumberFormat('en-US', {
        style: 'decimal',
        maximumFractionDigits: 0,
      }).format(Number(BigInt(totalSupply) / (BigInt(10) ** BigInt(18)))));
    }
    } catch (error) {
      console.error('Error fetching total supply:', error);
    }
  };

  fetchTotalSupply();

  const { data: readTotalSupply, isSuccess: isSuccessReadTotalSupply, queryKey: totalSupplyQueryKey } = useReadContract({
    address: MUTATIOFLIES_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'totalSupply'
  });

  useEffect(() => {
    if (isSuccessReadTotalSupply) {
      setTotalSupply(new Intl.NumberFormat('en-US', {
        style: 'decimal', // or 'currency' if dealing with money, then add currency: 'USD'
        maximumFractionDigits: 0,
      }).format(Number(BigInt(readTotalSupply) / (BigInt(10) ** BigInt(18)))));
    }
  }, [readTotalSupply, isSuccessReadTotalSupply]);

  useEffect(() => {
    queryClient.invalidateQueries({ totalSupplyQueryKey })
  }, [queryTrigger])

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-24 py-4 text-[#72e536]">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>MUTATIO $FLIES</title>
      </Head>
      <div className='bg-neutral-900 p-2 pb-3 rounded-xl flex flex-col items-center mb-7 text-center w-full md:w-auto '>
        <div className='border-b-3 border-stone-600 pb-1'>
        <h1 className="md:text-8xl text-6xl">MUTATIO $FLIES</h1>
        <h2 className="text-lg md:text-xl">MUTATIO NFT (ERC1155) to $FLIES (ERC20) wrapper</h2>
        </div>
        {totalSupply != "0" && <h2 className='mt-1'>{totalSupply} / 1M wrapped</h2>}
      </div>
      <div className="flex flex-col md:flex-row gap-7 w-full md:justify-center">
        <Card className='text-[#72e536] bg-neutral-900 p-3 w-full md:w-auto '>
          <CardHeader className="items-center justify-center text-center border-b-3 border-stone-600">
            <h3 className="text-xl md:text-2xl">Wrap into $FLIES:</h3>
          </CardHeader>
          <CardBody className="items-center justify-center text-center">
            <p className='mt-2'>Send your MUTATIO NFTs (ERC1155) to</p>
            <div>
            <Link href={`https://basescan.org/token/${MUTATIOFLIES_address}`} className="mt-5 mb-5 bg-[#72e536] p-2 rounded-lg text-lg truncate-address" isExternal>
              <span>{isMobile ? formatAddress(MUTATIOFLIES_address) : MUTATIOFLIES_address}</span>
            </Link></div>
            <div className='items-center justify-center text-center'>
            <p className='mb-8'>and receive $FLIES in a 1:1 ratio.</p>
            <p className="text-lg text-red-900">Do <u>not</u> send assets other than MUTATIO NFTs.</p>
            <p className="text-lg text-red-900">They will be burned.</p>
            </div>
          </CardBody>
        </Card>

        <Unwrap />
        </div>

        {showMigrate && <div className='mt-7 mb-5'><Migrate /></div>}

       {!showMigrate && <Button variant="solid" className="text-black bg-[#72e536] mt-5 mb-3 text-md" onClick={toggleMigrateVisibility}>Migration Interface</Button>}

      <div className='text-center mt-2 mb-2'>
        <p><Link href={`https://x.com/VORTEX5D`} className="text-[#72e536] underline">VORTEX5D</Link> <Link href={`https://x.com/neonglitch86`} className="text-[#72e536]">(NeonGlitch86</Link>&nbsp;x&nbsp;<Link href={`https://x.com/XCOPYART`} className="text-[#72e536]">XCOPY)</Link> is <u>not</u> affiliated with $FLIES. This is a community-run project.</p>
        </div>
      <div>
        <Image
          src="/MUTATIO.png"
          width={225}
          height={225}
          className='m-3'
          alt="MUTATIO"
          priority
        />
      </div>
      <div className='flex flex-row gap-5 bg-neutral-900 p-3 pl-7 pr-7 rounded-xl'>
        <Link href={`https://github.com/tschoerv/mutatio_wrapper`} isExternal>
          <Image
            src="/github.png"
            width={30}
            height={30}
            alt="github"
          /></Link>
        <Link href={`https://opensea.io/assets/base/0xfdb192fb0213d48ecdf580c1821008d8c46bdbd7/1`} isExternal>
          <Image
            src="/opensea.png"
            width={30}
            height={30}
            alt="opensea"
          /></Link>
        <Link href={`https://dexscreener.com/base/${MUTATIOFLIES_address}`} isExternal>
          <Image
            src="/dexscreener.png"
            width={30}
            height={30}
            alt="dexscreener"
          /></Link>
          <Link href={`https://www.coingecko.com/de/munze/mutatio-flies`} isExternal>
          <Image
            src="/coingecko.png"
            width={30}
            height={30}
            alt="coingecko"
          /></Link>
        <Link href={`https://app.uniswap.org/add/ETH/${MUTATIOFLIES_address}/10000`} isExternal>
          <Image
            src="/uniswap.png"
            width={30}
            height={30}
            alt="uniswap"
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
      <div className="flex flex-row text-xs mt-1">
        <p>made by&nbsp;</p>
        <Link href={`https://twitter.com/tschoerv`} className="text-[#72e536] text-xs underline">tschoerv.eth</Link>
      </div>
    </main>
  );
}

