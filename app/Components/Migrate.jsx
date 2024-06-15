'use client'
import React, { useState, useEffect } from 'react';
import { Button, Input } from "@nextui-org/react";
import { Card, CardHeader, CardBody } from "@nextui-org/react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { useWriteContract, useWaitForTransactionReceipt, useSimulateContract, useAccount, useReadContract, useBlockNumber } from "wagmi";
import { useQueryClient } from '@tanstack/react-query'
import { useQueryTrigger } from '../QueryTriggerContext';

import MUTATIO_wrapper_ABI from "../ABI/MUTATIO_wrapper_ABI.json";
import ERC1155_ABI from "../ABI/erc1155_ABI.json";

export default function Unwrap() {

    const [allowanceFliesOld, setAllowanceFliesOld] = useState(0);
    const [fliesOldBalance, setFliesOldBalance] = useState(0);
    const [mutatioBalance, setMutatioBalance] = useState(0);
    const [amountToMigrate, setAmountToMigrate] = useState("");
    const { queryTrigger, toggleQueryTrigger } = useQueryTrigger();

    const MUTATIOFLIES_address = process.env.NEXT_PUBLIC_MUTATIOFLIES_WRAPPER_ADDRESS;
    const XCOPYFLIES_address = process.env.NEXT_PUBLIC_XCOPYFLIES_WRAPPER_ADDRESS;
    const MUTATIO_NFT_address = process.env.NEXT_PUBLIC_MUTATIO_NFT_ADDRESS;

    const { address, isConnected } = useAccount();

    const queryClient = useQueryClient()

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

    const { data: readBalanceOfMutatio, isSuccess: isSuccessBalanceOfMutatio, queryKey: mutatioBalanceQueryKey } = useReadContract({
        address: MUTATIO_NFT_address,
        abi: ERC1155_ABI,
        functionName: 'balanceOf',
        args: [address, 1]
    });

    useEffect(() => {
        if (isSuccessBalanceOfMutatio) {
            setMutatioBalance(readBalanceOfMutatio);
        }
    }, [readBalanceOfMutatio, isSuccessBalanceOfMutatio]);

    const { data: readAllowanceFlies, isSuccess: isSuccessAllowanceFlies, queryKey: allowanceQueryKey } = useReadContract({
        address: XCOPYFLIES_address,
        abi: MUTATIO_wrapper_ABI,
        functionName: 'allowance',
        args: [address, XCOPYFLIES_address]
    });

    useEffect(() => {
        if (isSuccessAllowanceFlies) {
            setAllowanceFliesOld(readAllowanceFlies);
        }
    }, [readAllowanceFlies, isSuccessAllowanceFlies]);


    const { data: simulateApproveFliesOld } = useSimulateContract({
        address: XCOPYFLIES_address,
        abi: MUTATIO_wrapper_ABI,
        functionName: 'approve',
        args: [XCOPYFLIES_address, 1000000000000000000000000n], //approve 1M Flies
        account: address
    });
    const { writeContract: approveFliesOld, data: approveFliesOldHash} = useWriteContract();

    const { isSuccess: approveFliesOldConfirmed } = 
    useWaitForTransactionReceipt({ 
        hash: approveFliesOldHash, 
    }) 


    const { data: simulateUnwrapFliesOld } = useSimulateContract({
        address: XCOPYFLIES_address,
        abi: MUTATIO_wrapper_ABI,
        functionName: 'unwrap',
        args: [fliesOldBalance],
        account: address
    });
    const { writeContract: unwrapFliesOld, data: unwrapFliesOldHash } = useWriteContract();

    const { isSuccess: unwrapFliesOldConfirmed } = 
    useWaitForTransactionReceipt({ 
        hash: unwrapFliesOldHash, 
    }) 


    const { data: simulateSendMutatio } = useSimulateContract({
        address: MUTATIO_NFT_address,
        abi: ERC1155_ABI,
        functionName: 'safeTransferFrom',
        args: [address, MUTATIOFLIES_address, 1, amountToMigrate, "0x"],
        account: address
    });
    const { writeContract: sendMutatio, data: sendMutatioHash } = useWriteContract();

    const { isSuccess: sendMutatioConfirmed } = 
    useWaitForTransactionReceipt({ 
        hash: sendMutatioHash, 
    }) 


    useEffect(() => {
        if(unwrapFliesOldConfirmed || approveFliesOldConfirmed || sendMutatioConfirmed){
            toggleQueryTrigger();
        }
    }, [unwrapFliesOldConfirmed, approveFliesOldConfirmed, sendMutatioConfirmed]);


    useEffect(() => {
        queryClient.invalidateQueries({ allowanceQueryKey })
        queryClient.invalidateQueries({ fliesOldBalanceQueryKey })
        queryClient.invalidateQueries({ mutatioBalanceQueryKey })

    }, [queryTrigger])

    

    // Function to handle input changes, ensuring it's a number
    const handleInputChange = (e) => {
        const value = e.target.value;
        setAmountToMigrate(value ? parseInt(value, 10) : 0); // Parse as 18 decimal BigInt, fallback to 0 if NaN
    };



    return (
        <main>
            <Card className='text-[#72e536] bg-neutral-900 p-3 w-full md:w-auto'>
                <CardHeader className="items-center justify-center text-center flex flex-col border-b-3 border-stone-600">
                    <h3 className="text-xl md:text-2xl">Migrate $FLIES</h3>
                    <h3 className="text-xl md:text-2xl">from old contract:</h3>
                </CardHeader>
                <CardBody className="items-center justify-center">
                    <div style={{ display: 'flex', flexDirection: 'column' }} className='w-64 pb-4 mt-2'>

                        <p className='text-xs ml-2 text-neutral-300'>Balance: {Number(BigInt(fliesOldBalance) / (BigInt(10) ** BigInt(18)))} $FLIES (old)</p>

                        {allowanceFliesOld == 0 && (
                            <Button
                                variant="solid"
                                isDisabled={!isConnected}
                                onClick={() => approveFliesOld(simulateApproveFliesOld?.request)}
                                className="text-black bg-[#72e536] mt-1 text-md"
                            >
                                Approve $FLIES (Old)
                            </Button>
                        )}

                        <Button
                            variant="solid"
                            isDisabled={allowanceFliesOld == 0 || Number(BigInt(fliesOldBalance) / (BigInt(10) ** BigInt(18))) == 0}
                            onClick={() => unwrapFliesOld(simulateUnwrapFliesOld?.request)}
                            className="text-black bg-[#72e536] mt-1 mb-7 text-md"
                        >
                            Unwrap $FLIES (old)
                        </Button>

                        <Input
                            type="number"
                            placeholder='Enter Wrap Amount'
                            value={amountToMigrate.toString()} // Convert to string for Next UI Input
                            onChange={handleInputChange}
                            label={
                                <>
                                  Balance:&nbsp;
                                  <button className="hover:underline" disabled={!isConnected || !Number(mutatioBalance) > 0} onClick={() => setAmountToMigrate(Number(mutatioBalance))}>
                                    {Number(mutatioBalance)} MUTATIO
                                  </button> 
                                </>
                              }
                            bordered
                            clearable
                            className='mb-1 text-white'
                            isDisabled={!isConnected || !Number(mutatioBalance) > 0}

                        />
                        <Button
                            variant="solid"
                            isDisabled={mutatioBalance == 0}
                            onClick={() => sendMutatio(simulateSendMutatio?.request)}
                            className="text-black bg-[#72e536] mt-1 text-md"
                        >
                            Wrap $FLIES (new)
                        </Button>
                    </div>
                </CardBody>
            </Card>

        </main>
    );
}

