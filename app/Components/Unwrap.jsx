'use client'
import React, { useState, useEffect } from 'react';
import { Button, Input } from "@nextui-org/react";
import { Card, CardHeader, CardBody } from "@nextui-org/react";
import '@rainbow-me/rainbowkit/styles.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, useWaitForTransactionReceipt, useSimulateContract, useAccount, useReadContract, useSwitchChain } from "wagmi";
import { useQueryClient } from '@tanstack/react-query'
import { useQueryTrigger } from '../QueryTriggerContext';

import MUTATIO_wrapper_ABI from "../ABI/MUTATIO_wrapper_ABI.json";

export default function Unwrap() {

  const [allowanceFlies, setAllowanceFlies] = useState(0);
  const [fliesBalance, setFliesBalance] = useState(0);
  const [amountToUnwrap, setAmountToUnwrap] = useState(0);
  const { queryTrigger, toggleQueryTrigger } = useQueryTrigger();

  const MUTATIOFLIES_address = process.env.NEXT_PUBLIC_MUTATIOFLIES_WRAPPER_ADDRESS;


  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const desiredNetworkId = 8453;

  const queryClient = useQueryClient()

  const handleSwitchChain = () => {
    switchChain({ chainId: desiredNetworkId });
  };

  const { data: readBalanceOf, isSuccess: isSuccessBalanceOf, queryKey: balanceQueryKey } = useReadContract({
    address: MUTATIOFLIES_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  useEffect(() => {
    if (isSuccessBalanceOf) {
      setFliesBalance(readBalanceOf);
    }
  }, [readBalanceOf, isSuccessBalanceOf]);

  const { data: readAllowanceFlies, isSuccess: isSuccessAllowanceFlies, queryKey: allowanceQueryKey } = useReadContract({
    address: MUTATIOFLIES_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'allowance',
    args: [address, MUTATIOFLIES_address],
  },);

  useEffect(() => {
    if (isSuccessAllowanceFlies) {
      setAllowanceFlies(readAllowanceFlies);
    }
  }, [readAllowanceFlies, isSuccessAllowanceFlies]);


  const { data: simulateApproveFlies } = useSimulateContract({
    address: MUTATIOFLIES_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'approve',
    args: [MUTATIOFLIES_address, 1000000000000000000000000n], //approve 1M Flies
    account: address
  });
  const { writeContract: approveFlies, data: approveFliesHash } = useWriteContract();

  const { isSuccess: approveFliesConfirmed } =
    useWaitForTransactionReceipt({
      hash: approveFliesHash,
    })


  const { data: simulateUnwrapFlies } = useSimulateContract({
    address: MUTATIOFLIES_address,
    abi: MUTATIO_wrapper_ABI,
    functionName: 'unwrap',
    args: [BigInt(amountToUnwrap) * (BigInt(10) ** BigInt(18))],
    account: address
  });
  const { writeContract: unwrapFlies, data: unwrapFliesHash } = useWriteContract();

  const { isSuccess: unwrapFliesConfirmed } =
    useWaitForTransactionReceipt({
      hash: unwrapFliesHash,
    })

  useEffect(() => {
    if (approveFliesConfirmed || unwrapFliesConfirmed) {
      toggleQueryTrigger();
    }
  }, [approveFliesConfirmed, unwrapFliesConfirmed]);


  useEffect(() => {
    queryClient.invalidateQueries({ allowanceQueryKey })
    queryClient.invalidateQueries({ balanceQueryKey })
  }, [queryTrigger])



  // Function to handle input changes, ensuring it's a number
  const handleInputChange = (e) => {
    const value = e.target.value;
    setAmountToUnwrap(value ? parseInt(value, 10) : 0); // Parse as 18 decimal BigInt, fallback to 0 if NaN
  };


  return (
    <main>
      <Card className='text-[#72e536] bg-neutral-900 p-3 w-full md:w-auto'>
        <CardHeader className="items-center justify-center">
          <h3 className="underline text-xl">Unwrap into MUTATIO:</h3>
        </CardHeader>
        <CardBody className="items-center justify-center">
          <div className='flex flex-col w-56 pb-4 items-center justify-center'>
            <div className='mb-5'>
            {chain?.id !== desiredNetworkId && isConnected ? (
              <Button variant="solid" color="danger" onClick={handleSwitchChain}>Switch to Base</Button>
            ) : (
              <ConnectButton chainStatus="none" showBalance={false} />
            )}</div>

            <Input
              type="number"
              value={amountToUnwrap.toString()} // Convert to string for Next UI Input
              onChange={handleInputChange}
              label={`balance: ${BigInt(fliesBalance) / (BigInt(10) ** BigInt(18))} $FLIES`}
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
                className="text-black bg-[#72e536] mt-1 text-md w-full"
              >
                Approve $FLIES
              </Button>
            )}

            <Button
              variant="solid"
              isDisabled={allowanceFlies == 0 || fliesBalance == 0}
              onClick={() => unwrapFlies(simulateUnwrapFlies?.request)}
              className="text-black bg-[#72e536] mt-1 text-md w-full"
            >
              Unwrap $FLIES
            </Button>
          </div>
        </CardBody>
      </Card>

    </main>
  );
}

