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
    const NANOERG_TO_ERG = 1000000000;
      const [isMainnet, setIsMainnet] = useState<boolean>(false);
    // const [mintAmount, setMintAmount] = useState<number>(0);
    const [nameToMint, setNameToMint] = useState<string>('');
    const [bankBox, setBankBox] = useState<OutputInfo | null>(null);
    const [ergPrice, setErgPrice] = useState<number>(0);
    const [commitmentContract, setCommitmentContract] = useState<string>("");

    const minBoxValue = BigInt(1000000);

    const [isModalErgoPayOpen, setIsModalErgoPayOpen] = useState<boolean>(false);
    const [ergoPayLink, setErgoPayLink] = useState<string>("");
    const [ergoPayTxId, setErgoPayTxId] = useState<string>("");

    const handleClick = async () => {
        let txOperatorFee = BigInt(MIN_TX_OPERATOR_FEE);
        let minerFee = BigInt(MIN_MINER_FEE);

        const walletConfig = getWalletConfig();

        if (localStorageKeyExists("transactionFee")) {
            debugger;
        txOperatorFee = BigInt(parseInt(localStorage.getItem("transactionFee"))*NANOERG_TO_ERG);
        }

        if (localStorageKeyExists("transactionFee")) {
          minerFee = BigInt(parseInt(localStorage.getItem("transactionFee"))*NANOERG_TO_ERG);
        }

        if (!(await checkWalletConnection(walletConfig))) {
          toast.dismiss();
          toast.warn("please connect wallet", noti_option_close("try-again"));
          return;
        }

        if(!walletConfig){
          toast.dismiss();
          toast.warn("issue with wallet", noti_option_close("try-again"));
          return;
        }

        const isErgoPay = walletConfig.walletName === "ergopay";

        const txBuilding_noti = toast.loading("Please wait...", noti_option);

        const changeAddress = walletConfig.walletAddress[0];
        const creationHeight = (await explorerClient(isMainnet).getApiV1Blocks())
          .data.items![0].height;

        const bankBoxRes = await explorerClient(
            isMainnet
        ).getApiV1BoxesUnspentBytokenidP1(BANK_SINGLETON_TOKEN_ID(isMainnet));
        const bankBox = bankBoxRes.data.items![0];
        const hodlBankContract = new HodlBankContract(bankBox);

        const target = minBoxValue + minBoxValue;


        const mintTarget = target + minBoxValue + minerFee;

        const targetWithfee = mintTarget + minerFee;

        const inputs = isErgoPay
            ? await getInputBoxes(explorerClient(isMainnet), changeAddress, targetWithfee)
            : await ergo!.get_utxos();


        const receiverErgoTree = ErgoAddress.fromBase58(
            String(changeAddress)
        ).ergoTree;

        const receiverErgoTreeBytes = hexToBytes(receiverErgoTree);

        console.log(receiverErgoTreeBytes)

        const receiverSigmaProp = receiverErgoTree.substring(2);

        const secretString = "secret";
        const secretStringHash = blake2b256(utf8.decode(secretString));

        const nameToRegisterBytes = utf8.decode(localStorage.getItem('searchInput'));
        debugger;

        const commitmentSecret = new Uint8Array([...secretStringHash, ...receiverErgoTreeBytes, ...nameToRegisterBytes]);
        const commitmentSecretHash = blake2b256(commitmentSecret);
        const commitmentSecretHashHex = bytesToHex(commitmentSecretHash);

        const singletonMintOutput = new OutputBuilder(mintTarget, changeAddress)
            .mintToken({
              amount: BigInt(1),
              name: "SubNames Singleton",
              decimals: 0,
              description: "test"
            })

        debugger;

        const mintUnsignedTransaction = new TransactionBuilder(creationHeight)
            .from(inputs) // add inputs
            .to(singletonMintOutput)
            .sendChangeTo(changeAddress) // set change address
            .payFee(minerFee) // set fee
            .build()
            .toEIP12Object();

        const mintSignedTx = await ergo!.sign_tx(mintUnsignedTransaction);
        const nodeApi = new NodeApi(NODE_API_URL(isMainnet));

        const hash = await nodeApi.submitTransaction(mintSignedTx);

        console.log(hash);



        const outBox = new OutputBuilder(
            target,
          commitmentContract
        ).setAdditionalRegisters({
          R4: SColl(SByte, commitmentSecretHashHex).toHex(),
          R5: SSigmaProp(SGroupElement(ErgoAddress.fromBase58(changeAddress).getPublicKeys()[0])).toHex()
        }).addTokens({
          tokenId: mintSignedTx.inputs[0].boxId,
          amount: BigInt(1)
        })

        try {
          const unsignedTransaction = new TransactionBuilder(creationHeight)
            .from(mintSignedTx.outputs[0]) // add inputs
            .to(outBox)
            .sendChangeTo(changeAddress) // set change address
            .payFee(minerFee) // set fee
            .build()
            .toEIP12Object();

          if (isErgoPay) {
            const [txId, ergoPayTx] = await getTxReducedB64Safe(
              unsignedTransaction,
              explorerClient(isMainnet)
            );
            if (ergoPayTx === null) {
              toast.dismiss();
              toast.warn(
                "issue getting ergopay transaction",
                noti_option_close("try-again")
              );
              return;
            }
            const url = await getShortLink(ergoPayTx, `Mint hodlERG3`, changeAddress, isMainnet);
            if (!url) {
              toast.dismiss();
              toast.warn(
                "issue getting ergopay transaction",
                noti_option_close("try-again")
              );
              return;
            }
            console.log(url);
            setErgoPayTxId(txId!);
            setErgoPayLink(url);
            if (typeof window !== "undefined") {
                window.document.documentElement.classList.add("overflow-hidden");
            };
            setIsModalErgoPayOpen(true);
            toast.dismiss();
            return;
          }

          signAndSubmitTx(unsignedTransaction, ergo, txBuilding_noti, isMainnet);
        } catch (error) {
          console.log(error);
          toast.dismiss();
          toast.warn("issue building transaction", noti_option_close("try-again"));
          return;
        }
    };

    const name = localStorage.getItem('searchInput');
    const transactionFee = parseInt(localStorage.getItem('transactionFee'));

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
                        onClick={handleClick}
                        >Open Wallet</button>
            </div>
    )
}
export default CommitFee;