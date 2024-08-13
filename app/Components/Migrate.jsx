'use client'
import React, { useState, useEffect } from 'react';
import { Button, Link } from "@nextui-org/react";
import { Card, CardHeader, CardBody } from "@nextui-org/react";
import '@rainbow-me/rainbowkit/styles.css';
import { useWriteContract, useWaitForTransactionReceipt, useSimulateContract, useAccount, useReadContract } from "wagmi";
import { useQueryClient } from '@tanstack/react-query'
import { useQueryTrigger } from '../QueryTriggerContext';

import MUTATIO_wrapper_ABI from "../ABI/MUTATIO_wrapper_ABI.json";

const Migrate = ({ _fliesOldBalance }) => {

    const [allowanceFliesOld, setAllowanceFliesOld] = useState(0);
    const [fliesOldBalance, setFliesOldBalance] = useState(0);
    const { queryTrigger, toggleQueryTrigger } = useQueryTrigger();

    const XCOPYFLIES_address = process.env.NEXT_PUBLIC_XCOPYFLIES_WRAPPER_ADDRESS;

    const { address, isConnected } = useAccount();

    useEffect(() => {
        setFliesOldBalance(_fliesOldBalance);
      }, [_fliesOldBalance]);

    const { data: readAllowanceFlies, isSuccess: isSuccessAllowanceFlies } = useReadContract({
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
    const { writeContract: approveFliesOld, data: approveFliesOldHash } = useWriteContract();

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


    useEffect(() => {
        if (unwrapFliesOldConfirmed || approveFliesOldConfirmed) {
            toggleQueryTrigger();
        }
    }, [unwrapFliesOldConfirmed, approveFliesOldConfirmed]);

    return (
        <main>
            <Card className='text-[#72e536] bg-neutral-900 p-3 w-full md:w-auto'>
                <CardHeader className="items-center justify-center text-center flex flex-col border-b-3 border-stone-600">
                    <h3 className="text-xl md:text-2xl">Unwrap $FLIES</h3>
                    <h3 className="text-xl md:text-2xl">from old <Link className="text-xl md:text-2xl text-[#72e536]" href={`https://basescan.org/token/0x9D6b8B6FB293c757E05073b84a583ECFAeF8D8A7`} isExternal>contract</Link></h3>
                </CardHeader>
                <CardBody className="items-center justify-center">
                    <div style={{ display: 'flex', flexDirection: 'column' }} className='w-64 pb-3 mt-2'>

                        <p className='text-xs ml-2 text-neutral-300'>Balance: {Number(BigInt(fliesOldBalance) / (BigInt(10) ** BigInt(18)))} $FLIES (old)</p>

                        {!(allowanceFliesOld > 0) ? (
                            <Button
                                variant="solid"
                                isDisabled={!isConnected}
                                onClick={() => approveFliesOld(simulateApproveFliesOld?.request)}
                                className="text-black bg-[#72e536] mt-1 text-md"
                            >
                                Approve $FLIES (Old)
                            </Button>
                        ) :
                            <Button
                                variant="solid"
                                isDisabled={allowanceFliesOld == 0 || Number(BigInt(fliesOldBalance) / (BigInt(10) ** BigInt(18))) == 0}
                                onClick={() => unwrapFliesOld(simulateUnwrapFliesOld?.request)}
                                className="text-black bg-[#72e536] mt-1 text-md"
                            >
                                Unwrap $FLIES (old)
                            </Button>}
                    </div>
                </CardBody>
            </Card>

        </main>
    );
}

export default Migrate;
