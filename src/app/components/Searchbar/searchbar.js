"use client";
import React, { useState } from 'react';
import { Button, IconButton } from "@material-tailwind/react";
import { useRouter } from 'next/navigation'
import Modal from '../Modal/model';

export default function Searchbar() {
    const router = useRouter()
    const [enableTier, setEnableTier] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [toSearchInput, setToSearchInput] = useState('');
    const [tier, setTier] = useState('');
    const [isAvailable, setIsAvailable] = useState(false);

    const callAPI = async () => {
        try {
            const res = await fetch(`/ers-api/resolve/${searchInput}`);
            const data = await res.json();
            setIsAvailable(data.isValid && data.isAvailable);
            if(isAvailable && typeof window !== "undefined" && window.localStorage) {
                localStorage.setItem('mintCost', data.mintCost);
                localStorage.setItem('transactionFee', data.transactionFee);
            }
        } catch (err) { console.log(err); }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        callAPI();
        router.push('/ergo');
    };

    const handleInputChange = (event) => {
        setEnableTier(true);
        const result = event.target.value.replace(/[^a-z0-9-_]/g, '');
        setSearchInput(result);
        setTier(getTierFromLength(result));
    };

    const handleSearchClick = (event) => {
        setToSearchInput(searchInput);
        callAPI();
        if (typeof window !== "undefined" && window.localStorage) {
            localStorage.setItem('searchInput', searchInput);
            localStorage.setItem('tier', getTierFromLength(searchInput));
        }
        setTier(getTierFromLength(searchInput));
    };

    const getTierFromLength = (searchInput) => {
        const len = searchInput.length;
        if (len <= 2) return 0;
        if (len <= 4) return 1;
        if (len < 6) return 2;
        if (len < 8) return 3;
        if (len < 10) return 4;
        return 5;
    }
    const getTierBackgroundColor = (tier, lengthTier) => { return lengthTier == tier ? "bg-green" : "bg-grey" };

    const getSearchBtnClass = (tier) => { return tier == 0 ? "bg-slate-500" : "bg-customOrange" };

    const getSearchSubcomponent = (isAvailable) => {
        return isAvailable ? (
            <div>
                <div className="col-start-8 col-span-2 bg-green rounded-lg p-2">Available</div>
                <div className="col-span-1 p-2 flex justify-center items-center">
                    <Button onClick={handleSubmit}>
                        <img className="w-6 h-6 object-cover" src="Right.png" alt="Logo" />
                    </Button>
                </div>
            </div>
        ) : ( <div className="col-start-7 col-span-3 bg-red-500 rounded-lg p-2">Not Available</div> )
    }

    const showTiers = () => {
        return ( <div className="card card-compact w-108  border shadow-l mb-4">
            <div className="card-body">
                <div className='text-center text-xl'><b>Tier</b></div>
                <div className="flex">
                    <div className={`w-16 h-16 mx-2 flex flex-col items-center justify-center border border-gray-300
                rounded p-2 ${getTierBackgroundColor(1, tier)}`}>
                        <img src="tier-1.png" // Replace with the actual path to your image 
                            alt="Image 1"
                            className="w-8 h-8 object-cover mb-2" />
                        <p className="text-black text-xs">Diamond</p>
                    </div>
                    <div className={`w-16 h-16 mx-2 flex flex-col items-center justify-center border border-gray-300
                rounded p-2 ${getTierBackgroundColor(2, tier)}`}>
                        <img src="tier-2.png" // Replace with the actual path to your image alt="Image 1"
                            className="w-8 h-8 object-cover mb-2" />
                        <p className="text-black text-xs">Gold</p>
                    </div>
                    <div className={`w-16 h-16 mx-2 flex flex-col items-center justify-center border border-gray-300
                rounded p-2 ${getTierBackgroundColor(3, tier)}`}>
                        <img src="tier-3.png" // Replace with the actual path to your image alt="Image 1"
                            className="w-8 h-8 object-cover mb-2" />
                        <p className="text-black text-xs">Silver</p>
                    </div>
                    <div className={`w-16 h-16 mx-2 flex flex-col items-center justify-center border border-gray-300
                rounded p-2 ${getTierBackgroundColor(4, tier)}`}>
                        <img src="tier-4.png" // Replace with the actual path to your image alt="Image 1"
                            className="w-8 h-8 object-cover mb-2" />
                        <p className="text-black text-xs">Bronze</p>
                    </div>
                    <div className={`w-16 h-16 mx-2 flex flex-col items-center justify-center border border-gray-300
                rounded p-2 ${getTierBackgroundColor(5, tier)}`}>
                        <img src="tier-5.png" // Replace with the actual path to your image alt="Image 1"
                            className="w-8 h-8 object-cover mb-2" />
                        <p className="text-black text-xs">Iron</p>
                    </div>
                </div>
            </div>
        </div>
        )}

    return (
        <div className="flex flex-wrap flex-col items-center justify-center bg-grey text-black h-[80vh]">
            {/* Search Bar - - - to search for ergoname */}
            <div className='flex flex-col items-center mb-4'>
                <div className="w-full flex flex-col p-5">
                    <h1 className="text-4xl text-center text-slate-900">Your <b>web3</b> username</h1>
                    <h3 className="text-sm text-center text-slate-500 p-10">
                        <div> Your identity across web3, </div>
                        <div> one name for all your crypto addresses, </div>
                        <div> and your decentralised website. </div>
                    </h3>
                </div>
                <div className="flex items-center">
                    <input type="text" placeholder="Find for ErgoName" value={searchInput} onChange={handleInputChange}
                        className="p-2 border-gray-300 rounded-l bg-gray-200 focus:outline-none text-slate-500" />
                    <button className={`flex items-center ${getSearchBtnClass(tier)} text-white p-2 rounded-r`}
                        onClick={handleSearchClick} disabled={searchInput.length <= 2 }>
                        <img className="w-6 h-6 object-cover" src="Search.png" alt="Logo" />
                    </button>
                </div>
            </div>

            {/* Show tier for ergo names */}
            {enableTier && showTiers()}

            {/* Search Result */}
            {toSearchInput &&
                <div className="card card-compact w-108 border shadow-l">
                    <div className="card-body w-108">
                        <div className="grid grid-cols-10 items-center justify-center text-black">
                            <div className="col-start-2 col-span-3 text-black"> {toSearchInput} </div>
                            {getSearchSubcomponent(isAvailable)}
                        </div>
                    </div>
                </div>
            }
        </div>
    );
}
