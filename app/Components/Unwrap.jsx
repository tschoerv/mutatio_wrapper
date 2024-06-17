'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from "@nextui-org/react";
import { Card, CardHeader, CardBody } from "@nextui-org/react";
import '@rainbow-me/rainbowkit/styles.css';
import { useWriteContract, useWaitForTransactionReceipt, useSimulateContract, useAccount, useReadContract } from "wagmi";
import { useQueryClient } from '@tanstack/react-query'
import { useQueryTrigger } from '../QueryTriggerContext';

import MUTATIO_wrapper_ABI from "../ABI/MUTATIO_wrapper_ABI.json";

export default function Unwrap() {

  const [allowanceFlies, setAllowanceFlies] = useState(0);
  const [fliesBalance, setFliesBalance] = useState(0);
  const [amountToUnwrap, setAmountToUnwrap] = useState("");
  const { queryTrigger, toggleQueryTrigger } = useQueryTrigger();
  const inputRef = useRef(null);

  const MUTATIOFLIES_address = process.env.NEXT_PUBLIC_MUTATIOFLIES_WRAPPER_ADDRESS;

  const { address, isConnected } = useAccount();

  const queryClient = useQueryClient()

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

  useEffect(() => {
    if (inputRef.current) {
        inputRef.current.focus();
    }
}, [amountToUnwrap]);



  // Function to handle input changes, ensuring it's a number
  const handleInputChange = (e) => {
    const value = e.target.value;
    setAmountToUnwrap(value ? parseInt(value, 10) : 0);
  };


  return (
    <main>
      <Card className='text-[#72e536] bg-neutral-900 p-3 w-full md:w-auto'>
        <CardHeader className="items-center justify-center text-center border-b-3 border-stone-600">
          <h3 className="text-xl md:text-2xl">Unwrap into MUTATIO</h3>
        </CardHeader>
        <CardBody className="items-center justify-center">
          <div className='flex flex-col w-64 pb-3 items-center justify-center mt-2'>
            <Input
              ref={inputRef}
              type="number"
              placeholder="Enter Unwrap Amount"
              value={amountToUnwrap.toString()} // Convert to string for Next UI Input
              onChange={handleInputChange}
              label={
                <>
                  Balance:&nbsp;
                  <button className="hover:underline" disabled={!isConnected || !(Number(BigInt(fliesBalance) / (BigInt(10) ** BigInt(18))) > 0)} onClick={() => setAmountToUnwrap(Number(BigInt(fliesBalance) / (BigInt(10) ** BigInt(18))))}>
                    {Number(BigInt(fliesBalance) / (BigInt(10) ** BigInt(18)))} $FLIES
                  </button>
                </>
              }
              endContent={
                amountToUnwrap > 0 && (
                  <>
                    <span className='text-xs text-gray-200'>={amountToUnwrap}&nbsp;MUTATIO</span>
                  </>
                )
              }
              bordered
              clearable
              className='mb-1 text-white'
              isDisabled={!isConnected || !(Number(BigInt(fliesBalance) / (BigInt(10) ** BigInt(18))) > 0)}

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
              isDisabled={allowanceFlies == 0 || fliesBalance == 0 || amountToUnwrap > Number(BigInt(fliesBalance) / (BigInt(10) ** BigInt(18))) || !(amountToUnwrap > 0)}
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

