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

import Unwrap from "./Components/Unwrap";
import Migrate from "./Components/Migrate";

import MUTATIO_wrapper_ABI from "./ABI/MUTATIO_wrapper_ABI.json";

export default function Home() {
  useEffect(() => {
    reconnect(config, { connectors: [injected()] });
  }, []);

  const [isClientSide, setIsClientSide] = useState(false);
  const [totalSupply, setTotalSupply] = useState(0);
  const [showMigrate, setShowMigrate] = useState(false);

  const { queryTrigger, toggleQueryTrigger } = useQueryTrigger();

  const MUTATIOFLIES_address = process.env.NEXT_PUBLIC_MUTATIOFLIES_WRAPPER_ADDRESS;


  const { isConnected } = useAccount();

  const queryClient = useQueryClient()

  useEffect(() => {
    document.title = 'MUTATIO $FLIES';
    setIsClientSide(true);
  }, []);


  const toggleMigrateVisibility = () => {
    setShowMigrate(!showMigrate); // Toggle the state value
  };

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
        <h1 className="md:text-8xl text-7xl">MUTATIO $FLIES</h1>
        <h2 className="text-xl">MUTATIO NFT (ERC1155) to $FLIES (ERC20) wrapper</h2>
        {isConnected && totalSupply > 0 && <h2>{totalSupply} / 1M wrapped</h2>}
      </div>
      <div className="flex flex-col md:flex-row gap-7 w-full md:justify-center">
        <Card className='text-[#72e536] bg-neutral-900 p-3 w-full md:w-auto '>
          <CardHeader className="items-center justify-center">
            <h3 className="underline text-xl">Wrap into $FLIES:</h3>
          </CardHeader>
          <CardBody className="items-start md:items-center justify-start md:justify-center text-center">
            <p>Send your MUTATIO NFTs (ERC1155) to</p>
            <div className='items-start justify-start text-start'>
            <Link href={`https://basescan.org/token/${MUTATIOFLIES_address}`} className="mt-5 mb-5 bg-[#72e536] p-2 rounded-lg text-lg" isExternal>
              <span>{MUTATIOFLIES_address}</span>
            </Link></div>
            <div className='items-center justify-center text-center'>
            <p className='mb-8'>and receive $FLIES in a 1:1 ratio.</p>
            <p className="text-lg text-red-900">Do not send assets other than MUTATIO NFTs to this address.</p>
            <p className="text-lg text-red-900">They will be burned.</p>
            </div>
          </CardBody>
        </Card>

        <Unwrap />
        </div>

        {showMigrate && <div className='mt-7 mb-5'><Migrate /></div>}

       {!showMigrate && <Button variant="solid" className="text-black bg-[#72e536] mt-5 mb-3 text-md" onClick={toggleMigrateVisibility}>Migration Interface</Button>}

      <div className='text-center mt-2 mb-2'>
        <p>VORTEX5D (NeonGlitch86 x XCOPY) is <span className='underline'>not</span> affiliated with $FLIES. This is a community-run project.</p>
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
        <Link href={`https://app.uniswap.org/add/ETH/${MUTATIOFLIES_address}/10000`} isExternal>
          <Image
            src="/uniswap.png"
            width={30}
            height={30}
            alt="uniswap"
          /></Link>
        <Link href={`https://twitter.com/FliesOnBase`} isExternal>
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

