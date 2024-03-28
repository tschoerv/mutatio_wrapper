'use client'
import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Head from 'next/head';
import { Button, Input, Link } from "@nextui-org/react";
import { Card, CardHeader, CardBody} from "@nextui-org/react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { useWriteContract, useSwitchChain, useSimulateContract, useAccount, useReadContract, useBlockNumber } from "wagmi";
import { reconnect } from '@wagmi/core'
import { injected } from '@wagmi/connectors'
import { config } from './providers'
import { useQueryClient } from '@tanstack/react-query' 

import MUTATIO_wrapper_ABI from "./ABI/MUTATIO_wrapper_ABI.json";

export default function Home() {
  useEffect(() => {
    reconnect(config, { connectors: [injected()] });
  }, []);

  const [isClientSide, setIsClientSide] = useState(false);
  const [mintIsDisabled, setMintIsDisabled] = useState(false);
  const [allowanceFlies, setAllowanceFlies] = useState(0);
  const [fliesBalance, setFliesBalance] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);
  const [amountToUnwrap, setAmountToUnwrap] = useState(0);

  const MUTATIO_wrapper_address = process.env.NEXT_PUBLIC_MUTATIO_WRAPPER_ADDRESS;

  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const desiredNetworkId = 8453;

  const queryClient = useQueryClient()
  const { data: blockNumber } = useBlockNumber({ watch: true }) 

  useEffect(() => {
    document.title = 'XCOPY FLIES';
    setIsClientSide(true);
  }, []);

  useEffect(() => {
    if (chain?.id !== desiredNetworkId) {
      setMintIsDisabled(true);
    } else {
      setMintIsDisabled(false);
    }
  }, [chain]);

  const handleSwitchChain = () => {
    switchChain({ chainId: desiredNetworkId });
  };

  const { data: readTotalSupply, isSuccess: isSuccessReadTotalSupply, queryKey: totalSupplyQueryKey } = useReadContract({
    address: MUTATIO_wrapper_address,
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


  const { data: readBalanceOf, isSuccess: isSuccessBalanceOf, queryKey: balanceQueryKey } = useReadContract({
    address: MUTATIO_wrapper_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'balanceOf',
    args: [address]
  });

  useEffect(() => {
    if (isSuccessBalanceOf) {
      setFliesBalance(readBalanceOf);
    }
  }, [readBalanceOf, isSuccessBalanceOf]);

  const { data: readAllowanceFlies, isSuccess: isSuccessAllowanceFlies, queryKey: allowanceQueryKey } = useReadContract({
    address: MUTATIO_wrapper_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'allowance',
    args: [address, MUTATIO_wrapper_address],
  }, {
    enabled: false // Tanstack config to prevent the request from being triggered onload
  });

  useEffect(() => {
    if (isSuccessAllowanceFlies) {
      setAllowanceFlies(readAllowanceFlies);
    }
  }, [readAllowanceFlies, isSuccessAllowanceFlies]);

  useEffect(() => { 
    queryClient.invalidateQueries({ allowanceQueryKey }) 
    queryClient.invalidateQueries({ balanceQueryKey })
    queryClient.invalidateQueries({ totalSupplyQueryKey })
  }, [blockNumber]) 

  const { data: simulateApproveFlies } = useSimulateContract({
    address: MUTATIO_wrapper_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'approve',
    args: [MUTATIO_wrapper_address, 1000000000000000000000000n], //approve 1M Flies
    account: address
  });

  const { writeContract: approveFlies } = useWriteContract();


  const { data: simulateUnwrapFlies } = useSimulateContract({
    address: MUTATIO_wrapper_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'unwrap',
    args: [BigInt(amountToUnwrap)*(BigInt(10) ** BigInt(18))],
    account: address
  });
  const { writeContract: unwrapFlies } = useWriteContract();

  // Function to handle input changes, ensuring it's a number
  const handleInputChange = (e) => {
    const value = e.target.value;
    setAmountToUnwrap(value ? parseInt(value, 10) : 0); // Parse as 18 decimal BigInt, fallback to 0 if NaN
  };



  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-24 py-4 text-[#72e536]">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>XCOPY FLIES</title>
      </Head>
      <div className='bg-neutral-900 p-2 pb-3 rounded-xl flex flex-col items-center mb-7 text-center w-full md:w-auto '>
        <h1 className="text-8xl">XCOPY FLIES</h1>
        <h2 className="text-xl">MUTATIO (ERC1155) to $FLIES (ERC20) wrapper</h2>
        { isConnected && <h2>{totalSupply} / 1M wrapped</h2>}
      </div>
      <div className="flex flex-col md:flex-row gap-7 w-full md:justify-center">
        <Card className='text-[#72e536] bg-neutral-900 p-3 w-full md:w-auto '>
          <CardHeader className="items-center justify-center">
            <h3 className="underline text-xl">Wrap into $FLIES:</h3>
          </CardHeader>
          <CardBody className="items-center justify-center">
            <p>Send your MUTATIO NFTs (ERC1155) to</p>
            <Link href={`https://basescan.org/token/${MUTATIO_wrapper_address}`} className="mt-5 mb-5 bg-[#72e536] p-2 rounded-lg flex flex-col items-center" isExternal>
              <span>{MUTATIO_wrapper_address}</span>
            </Link>
            <p className='mb-6'>and receive $FLIES in exchange.</p>
          </CardBody>
        </Card>

        <Card className='text-[#72e536] bg-neutral-900 p-3 w-full md:w-auto'>
          <CardHeader className="items-center justify-center">
            <h3 className="underline text-xl">Unwrap into MUTATIO:</h3>
          </CardHeader>
          <CardBody className="items-center justify-center">
            {chain?.id !== desiredNetworkId && isConnected ? (
              <Button variant="solid" color="danger" onClick={handleSwitchChain}>Switch to Base</Button>
            ) : (
              <ConnectButton chainStatus="none" showBalance={false} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }} className='mt-5 w-48 pb-4'>
              <Input
                type="number"
                value={amountToUnwrap.toString()} // Convert to string for Next UI Input
                onChange={handleInputChange}
                label={`balance: ${BigInt(fliesBalance) / (BigInt(10) ** BigInt(18))}`}
                bordered
                clearable
                className='mb-1'
                isDisabled={!isConnected}

              />

              {allowanceFlies == 0 && (
                <Button
                  variant="solid"
                  isDisabled={!isConnected}
                  onClick={() => approveFlies(simulateApproveFlies?.request)}
                  className="text-black bg-[#72e536] mt-1 text-md"
                >
                  Approve $FLIES
                </Button>
              )}

              <Button
                variant="solid"
                isDisabled={allowanceFlies == 0 || fliesBalance == 0}
                onClick={() => unwrapFlies(simulateUnwrapFlies?.request)}
                className="text-black bg-[#72e536] mt-1 text-md"
              >
                Unwrap $FLIES
              </Button>
            </div>
          </CardBody>
        </Card>
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
      <Link href={`https://github.com/tschoerv/XCOPYFLIES`} isExternal>
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
        <Link href={`https://dexscreener.com/base/${MUTATIO_wrapper_address}`} isExternal>
          <Image
            src="/dexscreener.png"
            width={30}
            height={30}
            alt="dexscreener"
          /></Link>
        <Link href={`https://app.uniswap.org/swap?outputCurrency=${MUTATIO_wrapper_address}&chain=base`} isExternal>
          <Image
            src="/uniswap.png"
            width={30}
            height={30}
            alt="uniswap"
          /></Link>
      </div>
    </main>
  );
}

