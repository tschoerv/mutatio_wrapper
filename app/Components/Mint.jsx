'use client'
import "../globals.css";
import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from "@nextui-org/react";
import { Card, CardBody, Tabs, Tab, Snippet, Link } from "@nextui-org/react";
import '@rainbow-me/rainbowkit/styles.css';
import { useWriteContract, useWaitForTransactionReceipt, useSimulateContract, useAccount, useReadContract } from "wagmi";
import { useQueryClient } from '@tanstack/react-query'
import { useQueryTrigger } from '../QueryTriggerContext';
import Image from "next/image";
import Web3 from 'web3';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/modal";

import MerchDrop_ABI from "../ABI/merch_drop_ABI.json";

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const alchemyUrl = `https://base-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;
const MerchDrop_address = process.env.NEXT_PUBLIC_MERCHDROP_ADDRESS;

// Initialize web3
const web3 = new Web3(alchemyUrl);

function formatHash(hash) {
    if (hash) {
        return hash.length > 12 ? `${hash.slice(0, 12)}...${hash.slice(-12)}` : hash;
    }
}

export default function Mint() {

    const [totalSupply, setTotalSupply] = useState(0);
    const [mintAmount, setMintAmount] = useState("");
    const [isMintAmountValid, setIsMintAmountValid] = useState(true);
    const [burnAmount, setBurnAmount] = useState("");
    const [patchBalanceUser, setPatchBalanceUser] = useState(0);
    const [patchBalanceBurnAddress, setPatchBalanceBurnAddress] = useState(0);
    const [isMintModalOpen, setIsMintModalOpen] = useState(false);
    const [isBurnModalOpen, setIsBurnModalOpen] = useState(false);
    const inputRefMint = useRef(null);
    const inputRefBurn = useRef(null);
    const { queryTrigger, toggleQueryTrigger } = useQueryTrigger();
    const { address, isConnected } = useAccount();
    const queryClient = useQueryClient()
    const [isMobile, setIsMobile] = useState(false);
    const [supplyClaimedByWallet, setSupplyClaimedByWallet] = useState(0);

    const merchDropContract = new web3.eth.Contract(MerchDrop_ABI, MerchDrop_address);


    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.matchMedia("(max-width: 767px)").matches);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleMintInputChange = (e) => {
        let value = e.target.value;

        // Remove any non-digit characters
        value = value.replace(/\D/g, '');

        // Limit to 2 digits
        if (value.length > 2) {
            value = value.slice(0, 2);
        }
        setMintAmount(value);
    };

    const handleRedeemInputChange = (e) => {
        let value = e.target.value;

        // Remove any non-digit characters
        value = value.replace(/\D/g, '');

        // Limit to 2 digits
        if (value.length > 2) {
            value = value.slice(0, 2);
        }
        setBurnAmount(value);
    };

    const fetchTotalSupply = async () => {
        try {
            if (!isConnected) {
                const totalSupply = await merchDropContract.methods.totalSupply(0).call();
                setTotalSupply(Number(totalSupply));
            }
        } catch (error) {
            console.error('Error fetching total supply:', error);
        }
    };

    fetchTotalSupply();

    const fetchBurnedSupply = async () => {
        try {
            if (!isConnected) {
                const burnedSupply = await merchDropContract.methods.balanceOf("0x000000000000000000000000000000000000dEaD", 0).call();
                setPatchBalanceBurnAddress(Number(burnedSupply));
            }
        } catch (error) {
            console.error('Error fetching burned supply:', error);
        }
    };

    fetchBurnedSupply();

    const { data: readTotalSupply, isSuccess: isSuccessReadTotalSupply, queryKey: totalSupplyQueryKey } = useReadContract({
        address: MerchDrop_address,
        abi: MerchDrop_ABI,
        functionName: 'totalSupply',
        args: ["0"]
    });

    useEffect(() => {
        if (isSuccessReadTotalSupply) {
            setTotalSupply(Number(readTotalSupply));
        }
    }, [readTotalSupply, isSuccessReadTotalSupply]);

    useEffect(() => {
        if (inputRefMint.current && mintAmount != "") {
            inputRefMint.current.focus();
        }

        if((supplyClaimedByWallet + Number(mintAmount)) > 25 || supplyClaimedByWallet >= 25)
        {
            setIsMintAmountValid(false)
        }
        else
        {
            setIsMintAmountValid(true)
        }

    }, [mintAmount]);

    useEffect(() => {
        if (inputRefBurn.current && burnAmount != "") {
            inputRefBurn.current.focus();
        }
    }, [burnAmount]);

    const { data: readUserPatchBalanceOf, isSuccess: isSuccessUserPatchBalanceOf, queryKey: userPatchBalanceQueryKey } = useReadContract({
        address: MerchDrop_address,
        abi: MerchDrop_ABI,
        functionName: 'balanceOf',
        args: [address, 0],
    });

    useEffect(() => {
        if (isSuccessUserPatchBalanceOf) {
            setPatchBalanceUser(readUserPatchBalanceOf);
        }
    }, [readUserPatchBalanceOf, isSuccessUserPatchBalanceOf]);


    const { data: readBurnAddressPatchBalanceOf, isSuccess: isSuccessBurnAddressPatchBalanceOf, queryKey: burnAddressPatchBalanceQueryKey } = useReadContract({
        address: MerchDrop_address,
        abi: MerchDrop_ABI,
        functionName: 'balanceOf',
        args: ["0x000000000000000000000000000000000000dEaD", 0],
    });

    useEffect(() => {
        if (isSuccessBurnAddressPatchBalanceOf) {
            setPatchBalanceBurnAddress(Number(readBurnAddressPatchBalanceOf));
        }
    }, [readBurnAddressPatchBalanceOf, isSuccessBurnAddressPatchBalanceOf]);

    const { data: readSupplyClaimedByWallet, isSuccess: isSuccessSupplyClaimedByWallet, queryKey: supplyClaimedByWalletQueryKey } = useReadContract({
        address: MerchDrop_address,
        abi: MerchDrop_ABI,
        functionName: 'getSupplyClaimedByWallet',
        args: [0, 0, address],
    });

    useEffect(() => {
        if (isSuccessSupplyClaimedByWallet) {
            setSupplyClaimedByWallet(Number(readSupplyClaimedByWallet));
        }
    }, [readSupplyClaimedByWallet, isSuccessSupplyClaimedByWallet]);

    const { data: simulateMint } = useSimulateContract({
        address: MerchDrop_address,
        abi: MerchDrop_ABI,
        functionName: 'claim',
        value: 4200000000000000n * BigInt(mintAmount),
        args: [address, 0, mintAmount, "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 4200000000000000n, [
            [
                "0x0000000000000000000000000000000000000000000000000000000000000000"
            ],
            "25",
            "4200000000000000",
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        ], "0x"],
        account: address
    });
    const { writeContract: mint, data: mintHash } = useWriteContract();

    const { isSuccess: mintConfirmed } =
        useWaitForTransactionReceipt({
            hash: mintHash,
        })

    useEffect(() => {
        if (mintConfirmed) {
            setIsMintModalOpen(true);
            toggleQueryTrigger();
        }
    }, [mintConfirmed]);

    const { data: simulateBurn } = useSimulateContract({
        address: MerchDrop_address,
        abi: MerchDrop_ABI,
        functionName: 'safeTransferFrom',
        args: [address, "0x000000000000000000000000000000000000dEaD", 0, burnAmount, "0x"],
        account: address
    });
    const { writeContract: burn, data: burnHash } = useWriteContract();

    const { isSuccess: burnConfirmed } =
        useWaitForTransactionReceipt({
            hash: burnHash,
        })

    useEffect(() => {
        if (burnConfirmed) {
            setIsBurnModalOpen(true);
            toggleQueryTrigger();
        }
    }, [burnConfirmed]);

    useEffect(() => {
        queryClient.invalidateQueries({ totalSupplyQueryKey })
        queryClient.invalidateQueries({ userPatchBalanceQueryKey })
        queryClient.invalidateQueries({ burnAddressPatchBalanceQueryKey })
        queryClient.invalidateQueries({ supplyClaimedByWalletQueryKey })
    }, [queryTrigger]);

    const handleCloseMintModal = () => {
        setIsMintModalOpen(false);
    };
    const handleCloseBurnModal = () => {
        setIsBurnModalOpen(false);
    };

    return (
        <main>

            <Card className='text-[#72e536] bg-neutral-900 px-3 pt-3 w-full md:w-auto '>
                <CardBody className="items-center justify-center">
                    <Tabs aria-label="Options">
                        <Tab key="mint" title="Mint">
                            <div className='flex flex-col w-64 pb-3 items-center justify-center'>
                                <Image
                                    src="/patch_anim_new2_optimized.gif"
                                    width={250}
                                    height={250}
                                    alt="mutatio patch"
                                    className="rounded-lg"
                                />
                                <p className='mt-1 mb-1'>{totalSupply}/420 minted</p>
                                <Input
                                    ref={inputRefMint}
                                    type="number"
                                    placeholder='Enter Mint Amount'
                                    value={mintAmount}
                                    endContent={
                                        mintAmount > 0 && (
                                            <>
                                                <span className='text-xs text-gray-200'>=&nbsp;{new Intl.NumberFormat('en-US', {
                                                    style: 'decimal',
                                                    maximumFractionDigits: 4,
                                                }).format(mintAmount * 0.0042)}&nbsp;ETH</span>
                                            </>
                                        )
                                    }
                                    onChange={handleMintInputChange}
                                    className='mb-1 text-white'
                                    isDisabled={supplyClaimedByWallet >= 25 || totalSupply >= 420 }
                                />

                                {!isMintAmountValid && <p className='text-red-600 text-xs'>Mint is limited to 25 per wallet</p>}

                                    <Button
                                        variant="solid"
                                        className="text-black bg-[#72e536] mt-1 text-md w-full"
                                        isDisabled={totalSupply >= 420 || mintAmount > 25 || !(mintAmount > 0)}
                                        onClick={() => mint(simulateMint?.request)}
                                    >
                                        {totalSupply < 420 ? <span>Mint Patch</span> : <span>Mint Closed</span>}
                                    </Button>
                                    
                            </div>
                        </Tab>
                        <Tab key="redeem" title="Redeem">
                            <div className='flex flex-col w-64 pb-3 items-center justify-center'>
                                <Image
                                    src="/patch_anim_new2_optimized.gif"
                                    width={250}
                                    height={250}
                                    alt="mutatio patch"
                                    className="rounded-lg"
                                />
                                <p className='my-1'>{patchBalanceBurnAddress}/420 redeemed &#128293;</p>
                                <Input
                                    ref={inputRefBurn}
                                    type="number"
                                    placeholder='Enter Burn Amount'
                                    value={burnAmount}
                                    label={
                                        isConnected && (
                                            <>
                                                Balance:&nbsp;
                                                {Number(patchBalanceUser)}&nbsp;{Number(patchBalanceUser) == 1 ? <span>PATCH</span> : <span>PATCHES</span>}
                                            </>
                                        )
                                    }
                                    onChange={handleRedeemInputChange}
                                    className='mb-1 text-white'
                                />

                                <Button
                                    variant="solid"
                                    isDisabled={!isConnected || !(burnAmount > 0)}
                                    onClick={() => burn(simulateBurn?.request)}
                                    className="text-white bg-red-800 mt-1 text-md w-full"
                                >
                                    Burn to Redeem
                                </Button>
                            </div>
                        </Tab>
                    </Tabs>
                </CardBody>
            </Card>


            <Modal isOpen={isMintModalOpen} onOpenChange={setIsMintModalOpen} placement='center' backdrop='opaque' className='dark text-[#72e536]' isDismissable={false} isKeyboardDismissDisabled={false}>
                <ModalContent>
                    <ModalHeader>Mint Confirmed!</ModalHeader>
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
                                <p className='md:mt-6 mt-2'>You&apos;ve successfully minted {mintAmount ? mintAmount : 0} {mintAmount == 1 ? <span>Patch</span> : <span>Patches</span>}!</p>
                                <p className="md:mt-2 mt-2">Redeem now!</p>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter className='flex flex-row'>
                        <Link href={`https://opensea.io/assets/base/${MerchDrop_address}/0`} className="mt-0.5 mr-3 text-sm" isExternal>View on OpenSea</Link>
                        <Button size='sm' className="text-black bg-[#72e536] text-md" onClick={handleCloseMintModal}>Close</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={isBurnModalOpen} onOpenChange={setIsBurnModalOpen} hideCloseButton={true} placement='center' backdrop='opaque' className='dark text-[#72e536]' isDismissable={false} isKeyboardDismissDisabled={false}>
                <ModalContent>
                    <ModalHeader>Burn Confirmed!</ModalHeader>
                    <ModalBody>
                        <div className='flex flex-col items-center text-center'>
                            <div className='mb-4'>
                                <Image
                                    src="/patch-transparent-bg.png"
                                    width={200}
                                    height={200}
                                    alt="mutatio patch"
                                />
                            </div>
                            <div>
                                <Snippet codeString={burnHash} hideSymbol={true} tooltipProps={{
                                    content: "Copy"
                                }}><Link href={`https://basescan.org/tx/${burnHash}`} isExternal><p className='silkscreen-font'>{formatHash(burnHash)}</p></Link></Snippet>
                                <p className='mt-2 mb-2'>Copy the burn tx hash and send it with your shipping details to:</p>
                                <Snippet codeString="mutatioflies@gmail.com" hideSymbol={true} tooltipProps={{
                                    content: "Copy"
                                }}><Link><a href="mailto:mutatioflies@gmail.com" className="silkscreen-font">
                                    mutatioflies@gmail.com
                                </a></Link></Snippet>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter className='flex flex-row'>
                        <div className="md:mt-1.5 mt-0 mr-5 text-sm flex md:flex-row flex-col text-center">
                        <p>Questions?</p>{!isMobile && <p>&nbsp;</p>}<p>Join our <Link href={`https://t.me/fliesonbase`} isExternal className="text-[#72e536] underline text-sm">Telegram</Link>!</p>
                        </div>
                        <Button size='sm' className="text-black bg-[#72e536] text-md md:mt-0 mt-1" onClick={handleCloseBurnModal}>Close</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

        </main>
    );
}

