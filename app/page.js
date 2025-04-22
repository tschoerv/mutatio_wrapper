'use client'
import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Head from 'next/head';
import { Button, Link } from "@nextui-org/react";
import '@rainbow-me/rainbowkit/styles.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSwitchChain, useAccount, useReadContract } from "wagmi";
import { reconnect } from '@wagmi/core'
import { injected } from '@wagmi/connectors'
import { config } from './providers'
import { useQueryClient } from '@tanstack/react-query'
import { useQueryTrigger } from './QueryTriggerContext';
import Web3 from 'web3';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/modal";

import Wrap from "./Components/Wrap";
import Unwrap from "./Components/Unwrap";
import Migrate from "./Components/Migrate";

import MUTATIO_wrapper_ABI from "./ABI/MUTATIO_wrapper_ABI.json";

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;

// Initialize web3
const web3 = new Web3(alchemyUrl);

export default function Home() {
  useEffect(() => {
    reconnect(config, { connectors: [injected()] });
  }, []);

  const [isClientSide, setIsClientSide] = useState(false);
  const [totalSupply, setTotalSupply] = useState(0);
  const [showMigrate, setShowMigrate] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fliesOldBalance, setFliesOldBalance] = useState(0);


  const { queryTrigger, toggleQueryTrigger } = useQueryTrigger();

  const MUTATIOFLIES_address = process.env.NEXT_PUBLIC_MUTATIOFLIES_WRAPPER_ADDRESS;
  const XCOPYFLIES_address = process.env.NEXT_PUBLIC_XCOPYFLIES_WRAPPER_ADDRESS;

  const wrapperContract = new web3.eth.Contract(MUTATIO_wrapper_ABI, MUTATIOFLIES_address);

  const { isConnected, chain, address } = useAccount();

  const queryClient = useQueryClient()

  const { switchChain } = useSwitchChain();
  const desiredNetworkId = 8453;

  const handleSwitchChain = () => {
    switchChain({ chainId: desiredNetworkId });
  };

  const handleAdClose = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    document.title = 'MUTATIO $FLIES';
    setIsClientSide(true);
  }, []);


  const toggleMigrateVisibility = () => {
    setShowMigrate(!showMigrate); // Toggle the state value
  };

  const fetchTotalSupply = async () => {
    try {
      if (!isConnected) {
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

  const { data: readBalanceOfFliesOld, isSuccess: isSuccessBalanceOfFliesOld, queryKey: fliesOldBalanceQueryKey } = useReadContract({
    address: XCOPYFLIES_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'balanceOf',
    args: [address]
});

useEffect(() => {
    if (isSuccessBalanceOfFliesOld) {
        setFliesOldBalance(readBalanceOfFliesOld);
    }
}, [readBalanceOfFliesOld, isSuccessBalanceOfFliesOld]);

  useEffect(() => {
    queryClient.invalidateQueries({ totalSupplyQueryKey })
    queryClient.invalidateQueries({ fliesOldBalanceQueryKey })
  }, [queryTrigger]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsModalOpen(true);
    }, 2000);

    return () => clearTimeout(timer); // This will clear the timer when the component unmounts
  }, []);


  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-24 py-4 text-[#72e536] tracking-tight">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>MUTATIO $FLIES</title>
      </Head>
      <div className='bg-neutral-900 p-2 rounded-xl flex flex-col items-center text-center w-full md:w-auto '>
        <div className='border-b-3 border-stone-600 pb-1'>
          <h1 className="md:text-7xl text-6xl mb-1">MUTATIO $FLIES</h1>
          <h2 className="text-lg md:text-xl">MUTATIO NFT to $FLIES wrapper</h2>
        </div>
        {totalSupply != "0" && <h2 className='mt-1'>{totalSupply} / 1M wrapped</h2>}
      </div>

      <div className='my-3'>
        {chain?.id !== desiredNetworkId && isConnected ? (
          <Button variant="solid" color="danger" onClick={handleSwitchChain}>Switch to Base</Button>
        ) : (
          <ConnectButton chainStatus="none" showBalance={false} />
        )}</div>

      <div className="flex flex-col md:flex-row gap-4 w-full md:justify-center">
        <Wrap />
        <Unwrap />
      </div>

      {isConnected && !showMigrate && Number(BigInt(fliesOldBalance) / (BigInt(10) ** BigInt(18))) > 0 && <button className="text-black bg-[#72e536] p-0.5 px-1.5 rounded-md mt-3 text-xs" onClick={toggleMigrateVisibility}>Migration Interface</button>}

      {showMigrate && <div className='mt-4'><Migrate _fliesOldBalance={fliesOldBalance}/></div>}

      <div className='flex flex-col text-center text-sm mt-2'>
        <p><Link href={`https://x.com/VORTEX5D`} className="text-[#72e536] text-sm underline">VORTEX5D</Link> <Link href={`https://x.com/neonglitch86`} className="text-[#72e536] text-sm">(NeonGlitch86</Link>&nbsp;x&nbsp;<Link href={`https://x.com/XCOPYART`} className="text-[#72e536] text-sm">XCOPY)</Link> is <u>not</u> affiliated with $FLIES.</p>
        <p>This is a community-run project.</p>
      </div>
      <div>
        <Image
          src="/MUTATIO.png"
          width={225}
          height={225}
          className='m-3 mb-3'
          alt="MUTATIO"
          priority
        />
      </div>

      <div className='flex flex-row gap-5 bg-neutral-900 p-3 pl-5 pr-5 md:pl-7 md:pr-7 rounded-xl'>
        <Link href={`https://basescan.org/address/${MUTATIOFLIES_address}`} isExternal>
          <Image
            src="/basescan.svg"
            width={30}
            height={30}
            alt="basescan"
          /></Link>
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
        <div className='flex flex-row gap-2'>
      <Link href="/merch" isExternal><button className="text-black bg-[#72e536] p-0.5 px-1.5 rounded-md mt-1 text-sm">Merch Drop</button></Link>
      <Link href="https://art.mutatioflies.eth.limo/" isExternal><button className="text-black bg-[#72e536] p-0.5 px-1.5 rounded-md mt-1 text-sm">FLIES Art Gallery</button></Link>
      </div>

      <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen} placement='top-center' backdrop='opaque' className='dark text-[#72e536]'>
      <ModalContent>
        <ModalHeader>$FLIES DIY Merch Drop!</ModalHeader>
        <ModalBody>
          <div className='flex flex-row'>
            <div className='mr-6 ml-2'>
            <Image
            src="/patch-transparent-bg.png"
            width={250}
            height={250}
            alt="mutatio patch"
          />
            </div>
            <div>
            <p className='md:mt-3.5 mt-4 md:text-medium text-sm'>Mint and redeem for a physical patch!</p>
            <p className='mt-3 md:text-medium text-sm'>420 available for 0.0042&nbsp;ETH each!</p>
            </div>
          </div>
          </ModalBody>
        <ModalFooter className='flex flex-row'>
          <div className='mr-4 mt-2 text-center'>
          <p>free shipping!</p>
          </div>
          <Link href="/merch" isExternal>
          <Button className="text-black bg-[#72e536] text-md" onClick={handleAdClose} >Mint Now!</Button>
            </Link>
          </ModalFooter>
      </ModalContent>
    </Modal>
    </main>
  );
}

