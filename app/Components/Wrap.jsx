'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from "@nextui-org/react";
import { Card, CardHeader, CardBody } from "@nextui-org/react";
import '@rainbow-me/rainbowkit/styles.css';
import { useWriteContract, useWaitForTransactionReceipt, useSimulateContract, useAccount, useReadContract } from "wagmi";
import { useQueryClient } from '@tanstack/react-query'
import { useQueryTrigger } from '../QueryTriggerContext';


import ERC1155_ABI from "../ABI/erc1155_ABI.json";

export default function Unwrap() {

    const [mutatioBalance, setMutatioBalance] = useState(0);
    const [amountToWrap, setAmountToWrap] = useState("");
    const { queryTrigger, toggleQueryTrigger } = useQueryTrigger();
    const inputRef = useRef(null);

    const MUTATIOFLIES_address = process.env.NEXT_PUBLIC_MUTATIOFLIES_WRAPPER_ADDRESS;
    const MUTATIO_NFT_address = process.env.NEXT_PUBLIC_MUTATIO_NFT_ADDRESS;

    const { address, isConnected } = useAccount();

    const queryClient = useQueryClient()

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

    const { data: simulateSendMutatio } = useSimulateContract({
        address: MUTATIO_NFT_address,
        abi: ERC1155_ABI,
        functionName: 'safeTransferFrom',
        args: [address, MUTATIOFLIES_address, 1, amountToWrap, "0x"],
        account: address
    });
    const { writeContract: sendMutatio, data: sendMutatioHash } = useWriteContract();

    const { isSuccess: sendMutatioConfirmed } =
        useWaitForTransactionReceipt({
            hash: sendMutatioHash,
        })


    useEffect(() => {
        if (sendMutatioConfirmed) {
            toggleQueryTrigger();
        }
    }, [sendMutatioConfirmed]);


    useEffect(() => {
        queryClient.invalidateQueries({ mutatioBalanceQueryKey })
    }, [queryTrigger])

    useEffect(() => {
        if (inputRef.current && amountToWrap != "") {
            inputRef.current.focus();
        }
    }, [amountToWrap]);


    const handleInputChange = (e) => {
        let value = e.target.value;

        // Remove any non-digit characters
        value = value.replace(/\D/g, '');

        // Limit to 7 digits
        if (value.length > 6) {
            value = value.slice(0, 6);
        }

        setAmountToWrap(value);
    };

    return (
        <main>
            <Card className='text-[#72e536] bg-neutral-900 p-3 w-full md:w-auto '>
                <CardHeader className="items-center justify-center text-center border-b-3 border-stone-600">
                    <h3 className="text-xl md:text-2xl">Wrap into $FLIES</h3>
                </CardHeader>
                <CardBody className="items-center justify-center">
                    <div className='flex flex-col w-64 pb-3 items-center justify-center mt-2'>
                        <Input
                            ref={inputRef}
                            type="number"
                            placeholder='Enter Wrap Amount'
                            value={amountToWrap}
                            onChange={handleInputChange}
                            label={
                                <>
                                    Balance:&nbsp;
                                    <button className="hover:underline" disabled={!isConnected || !Number(mutatioBalance) > 0} onClick={() => setAmountToWrap(Number(mutatioBalance))}>
                                        {Number(mutatioBalance)} MUTATIO
                                    </button>
                                </>
                            }
                            endContent={
                                amountToWrap > 0 && (
                                    <>
                                        <span className='text-xs text-gray-200'>=&nbsp;{new Intl.NumberFormat('en-US', {
                                            style: 'decimal',
                                            maximumFractionDigits: 0,
                                        }).format(amountToWrap)}&nbsp;$FLIES</span>
                                    </>
                                )
                            }
                            className='mb-1 text-white'
                        />
                        <Button
                            variant="solid"
                            isDisabled={mutatioBalance == 0 || !(amountToWrap > 0) || amountToWrap > mutatioBalance}
                            onClick={() => sendMutatio(simulateSendMutatio?.request)}
                            className="text-black bg-[#72e536] mt-1 text-md w-full"
                        >
                            Wrap into $FLIES
                        </Button>
                    </div>
                </CardBody>
            </Card>

        </main>
    );
}

