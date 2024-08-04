"use client";
import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

export default function BeginTransaction({onComplete}){
    const [name, setName] = useState('');
    const [tier, setTier] = useState('');
    const [mintCost, setMintCost] = useState('');
    const [transactionFee, setTransactionFee] = useState('');

    useEffect(() => {
        if (typeof window !== "undefined" && window.localStorage) {
            setName(localStorage.getItem('searchInput'));
            setTier(localStorage.getItem('tier'));
            setMintCost(localStorage.getItem('mintCost'));
            setTransactionFee(localStorage.getItem('transactionFee'));
        }
    }, [])

    const validateCurrentStep = async () => { return await ergoConnector.nautilus.isConnected(); }

    const goToNextStep = async () =>{
        await validateCurrentStep()===true ? onComplete() : toast.warn("Please connect with Wallet to proceed")
    }

    const metalMap = {
        1: 'Diamond',
        2: 'Gold',
        3: 'Silver',
        4: 'Bronze',
        5: 'Iron'
    };

    return (
        <div>
            <div className="card w-96 bg-white shadow-xl text-center">
                <div className="card card-compact w-40 h-40 m-auto bg-black border mt-10 mb-5">
                    <div className="card-body">
                        <div className="flex items-center m-auto bg-black text-white">
                            <p><span className='font-black text-customOrange'>~</span> {name}</p>
                        </div>
                    </div>
                </div>
                <h2 className="text-center">Preview</h2>
                <div className="card-body align-center justify-center text-center">
                    <div className="card card-compact w-80 bg-white shadow-l border my-2">
                        <div className="card-body">
                            <div className="flex items-center justify-between bg-white text-black">
                                <div className="flex-none">
                                    <p>Name</p>
                                </div>
                                <div className="flex-none">
                                    <p>{name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card card-compact w-80 bg-white shadow-l border my-2">
                        <div className="card-body">
                            <div className="flex items-center justify-between bg-white text-black">
                                <div className="flex-none">
                                    <p>Tier</p>
                                </div>
                                <div className="flex-none">
                                    <p>{metalMap[tier]}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card card-compact w-80 bg-white shadow-l border my-2">
                        <div className="card-body">
                            <div className="flex items-center justify-between bg-white text-black">
                                <div className="flex-none">
                                    <p>Mint Cost</p>
                                </div>
                                <div className="flex-none">
                                    <p>{mintCost} ERG</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card card-compact w-80 bg-white shadow-l border my-2">
                        <div className="card-body">
                            <div className="flex items-center justify-between bg-white text-black">
                                <div className="flex-none">
                                    <p>Transaction Fee</p>
                                </div>
                                <div className="flex-none">
                                    <p>{transactionFee * 7} ERG</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-actions justify-center">
                        <button
                            className="btn bg-customOrange hover:bg-customOrangeDark w-24 text-white border-transparent hover:border-transparent"
                            onClick={goToNextStep}>Next</button>
                    </div>
                </div>
            </div>
            <ToastContainer position="bottom-left" autoClose={5000} hideProgressBar newestOnTop={false} closeOnClick rtl={false}
                pauseOnFocusLoss draggable pauseOnHover theme="light" />
        </div>
    );
};
