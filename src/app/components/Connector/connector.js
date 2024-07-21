"use client";
import React, { useState , useEffect} from 'react';
import { TransactionBuilder, OutputBuilder } from "@fleet-sdk/core";
import { toast, ToastContainer } from 'react-toastify';
import { useRouter } from 'next/navigation'
import Modal from '../Modal/model';
import "react-toastify/dist/ReactToastify.css";

const NANOERG_TO_ERG = 1000000000;

function Connector() {
    const [isConnected, setIsConnected] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [ergoBalance,setErgoBalance] = useState(0);
    const [defaultAddress, setDefaultAddress] = useState('');

    const handleClick = () => isConnected ? setModalOpen(true) : nautilusConnector()

    const getErgoBalance = async () => {
      const ergs = await ergo.get_balance();
      const address = await ergo.get_change_address();
      setErgoBalance(ergs/NANOERG_TO_ERG);
      setDefaultAddress(address);
    }
    const openModal = () => setModalOpen(true);
    const closeModal = () => setModalOpen(false);
    const nautilusConnector = async ()=>{
      const connected = await ergoConnector.nautilus.connect(); 
      if (connected) {
        console.log("Connected!");
        // localStorage.setItem("walletConnected", true);
        setIsConnected(true);
        getErgoBalance();
        toast.success("Connected");
      } else {
        toast.error("Not Connected");
      }
    }
    const nautilusDisconnector = async ()=>{
        setIsConnected(false);
        const disconnected = await ergoConnector.nautilus.disconnect();
        // localStorage.setItem("walletConnected", false);
        toast.success("disconnected");
    }
    return (
      <div className="container mx-auto flex justify-between items-center">
        <div>
        <button className="bg-black hover:bg-gray-400 text-white font-bold py-2 px-4 border border-white rounded focus:outline-none"
        onClick={handleClick}>
            {isConnected ? "Balance: "+ergoBalance + " ERG" : 'Connect Wallet'}
          </button>

          <Modal isOpen={isModalOpen} 
                closeModal={closeModal}
                ergoBalance={ergoBalance} 
                defaultAddress={defaultAddress} 
                nautilusDisconnector={nautilusDisconnector}>
          </Modal>

          <ToastContainer
              position="bottom-left"
              autoClose={5000}
              hideProgressBar
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
          />
        </div>
      </div>
    );
}


export default Connector;
