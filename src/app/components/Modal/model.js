import React, { useEffect , useState} from 'react';
import './model.css';

const Modal = ({ isOpen, closeModal,nautilusDisconnector, ergoBalance, defaultAddress, children }) => {
    
    const handleButtonClick = () => {
        
        nautilusDisconnector();
        closeModal();
    };
    
    if (!isOpen) return null;
        
    return (
        
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="grid grid-cols-3 grid-rows-7 p-4">
                    <div className='text-black text-xl py-2 font-bold'>Nautilus Wallet</div>
                    <div className="col-start-3 ml-auto">
                        <button className="close-button btn btn-square btn-outline" onClick={closeModal}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="row-start-2 text-black py-2 font-bold">Total Balance</div>
                    <div className="col-span-3 row-start-3 text-black flex items-center justify-center py-2">{ergoBalance} ERG</div>
                    <div className="row-start-4 text-black py-2 font-bold">Active Address</div>
                    <div className="col-span-3 row-start-5 text-black flex items-center justify-center py-2">{defaultAddress}</div>
                    <div className="col-start-2 row-start-7 text-black flex items-center justify-center py-2">
                        <button className="action-button bg-customOrange hover:customOrangeDark text-white py-2 px-4 rounded w-36"onClick={handleButtonClick}>
                            Disconnect Wallet
                        </button>
                    </div>
                 </div>
              </div>
            </div>
    );
};

export default Modal;