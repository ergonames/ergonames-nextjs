import React, { useEffect, useState } from "react";
import {
  BANK_SINGLETON_TOKEN_ID, COMMITMENT_CONTRACT,
  explorerClient,
  HODL_ERG_TOKEN_ID,
  MIN_MINER_FEE,
  MIN_TX_OPERATOR_FEE, NODE_API_URL,
  precision,
  precisionBigInt,
  PROXY_ADDRESS,
  UIMultiplier,
} from "@/blockchain/ergo/constants";
import { OutputInfo } from "@/blockchain/ergo/explorerApi";
import { HodlBankContract } from "@/blockchain/ergo/phoenixContracts/BankContracts/HodlBankContract";
import {
  checkWalletConnection,
  getWalletConn,
  getWalletConnection,
  isErgoDappWalletConnected,
  signAndSubmitTx,
} from "@/blockchain/ergo/walletUtils/utils";
import { toast } from "react-toastify";
import {
  noti_option,
  noti_option_close,
} from "@/components/Notifications/Toast";
import {
  ErgoAddress,
  OutputBuilder, SByte, SColl, SGroupElement,
  SLong, SSigmaProp,
  TransactionBuilder,
} from "@fleet-sdk/core";
import { hasDecimals, localStorageKeyExists } from "@/common/utils";
import {getInputBoxes, getShortLink, getWalletConfig} from "@/blockchain/ergo/wallet/utils";
import assert from "assert";
import { getTxReducedB64Safe } from "@/blockchain/ergo/ergopay/reducedTxn";
import ErgoPayWalletModal from "@/components/wallet/ErgoPayWalletModal";
import { outputInfoToErgoTransactionOutput } from "@/blockchain/ergo/walletUtils/utils";
import {blake2b256, utf8} from "@fleet-sdk/crypto";
import {bytesToHex, hexToBytes} from "@noble/hashes/utils";
import {SConstant} from "@fleet-sdk/serializer";
import {NodeApi} from "@/blockchain/ergo/nodeApi/api";

function CommitFee(){
const name = localStorage.getItem('searchInput');
const transactionFee = localStorage.getItem('transactionFee');
return (
        <div className="flex flex-col items-center justify-center">
           <img src="Wallet.png" // Replace with the actual path to your image alt="Image 1"
                            className="w-8 h-8 object-cover mb-2" />
            <p className="text-black text-sm">Double check these detail before confirming in the wallet</p>
            <div className="card card-compact w-1/2 bg-white shadow-l border my-1">
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
            <div className="card card-compact w-1/2 bg-white shadow-l border my-1">
                <div className="card-body">
                    <div className="flex items-center justify-between bg-white text-black">
                        <div className="flex-none">
                            <p>Action</p>
                        </div>
                        <div className="flex-none">
                            <p>Enter the Minting Queue</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card card-compact w-1/2 bg-white shadow-l border my-1">
                <div className="card-body">
                    <div className="flex items-center justify-between bg-white text-black">
                        <div className="flex-none">
                            <p>Info</p>
                        </div>
                        <div className="flex-none">
                            <p>Send commit transaction to start minting</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card card-compact w-1/2 bg-grey shadow-l my-1">
                <div className="card-body">
                    <div className="flex items-center justify-between text-black">
                        <div className="flex-none">
                            <p>Estimated Network Fee</p>
                        </div>
                        <div className="flex-none">
                            <p>{transactionFee * 2} ERG</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-black">
                        <div className="flex-none">
                            <p>Commit Fee</p>
                        </div>
                        <div className="flex-none">
                            <p>{transactionFee * 2} ERG</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-black">
                        <div className="flex-none">
                            <p className="font-bold">Estimated Total</p>
                        </div>
                        <div className="flex-none">
                            <p>{transactionFee * 4} ERG</p>
                        </div>
                    </div>
                </div>
            </div>
            <button
                    className="btn bg-customOrange hover:bg-customOrangeDark w-36 text-white border-transparent hover:border-transparent"
                    >Open Wallet</button>
        </div>
)
}
export default CommitFee;