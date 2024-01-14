"use client";
import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
function BeginTransaction({onComplete}){

const name = localStorage.getItem('searchInput');
const tier = localStorage.getItem('tier');
const validateCurrentStep = async () =>{
let isWalletConnected = await ergoConnector.nautilus.isConnected();
return isWalletConnected;
}
const goToNextStep = async () =>{
onComplete();
// let validate = await validateCurrentStep();
// console.log("validate :",validate)
// if(validate===true){
// onComplete();
// }
// else{
// toast.warn("Please connect with Wallet to proceed");
// }
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
    <div className="card w-96 bg-white shadow-xl">
        <figure className="w-48 h-48 px-5 pt-5 mx-auto">
            <img src="ergo-image.png" alt="Shoes" className="rounded-xl" />
        </figure>
        <h2 className="text-center">ErgoNames</h2>

        <div className="card-body align-center justify-center text-center">

            <div className="card card-compact w-80 bg-white shadow-l border my-2">
                <div className="card-body">
                    <div className="flex items-center justify-between bg-white text-black">
                        <div className="flex-none">
                            <p>Name</p>
                        </div>
                        <div className="flex-none">
                            <p>{name}.eth</p>
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
                            <p>Info</p>
                        </div>
                        <div className="flex-none">
                            <p>10 ERG</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* <div className="card card-compact w-108 bg-white shadow-l border">
                <div className="card-body">
                    <div className="grid grid-cols-10 items-center justify-center bg-white text-black">
                        <div className="col-span-2">
                            <p>Tier</p>
                        </div>
                        <div className=" col-start-9 col-span-1">
                            <p>{metalMap[tier]}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card card-compact w-108 bg-white shadow-l border">
                <div className="card-body">
                    <div className="grid grid-cols-10 items-center justify-center bg-white text-black">
                        <div className="col-span-2">
                            <p>Info</p>
                        </div>
                        <div className="col-start-9 col-span-1">
                            <p className="whitespace-nowrap">10 ERG </p>
                        </div>
                    </div>
                </div>
            </div> */}

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
}

export default BeginTransaction;