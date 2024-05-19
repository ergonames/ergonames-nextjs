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

const MintingHodlERG = () => {
  const [isMainnet, setIsMainnet] = useState<boolean>(true);
  // const [mintAmount, setMintAmount] = useState<number>(0);
  const [nameToMint, setNameToMint] = useState<string>('');
  const [bankBox, setBankBox] = useState<OutputInfo | null>(null);
  const [ergPrice, setErgPrice] = useState<number>(0);
  const [commitmentContract, setCommitmentContract] = useState<string>("");

  const minBoxValue = BigInt(1000000);

  const [isModalErgoPayOpen, setIsModalErgoPayOpen] = useState<boolean>(false);
  const [ergoPayLink, setErgoPayLink] = useState<string>("");
  const [ergoPayTxId, setErgoPayTxId] = useState<string>("");

  useEffect(() => {
    // const isMainnet = localStorage.getItem("IsMainnet")
    //   ? (JSON.parse(localStorage.getItem("IsMainnet")!) as boolean)
    //   : true;
    const isMainnet = false;

    setIsMainnet(isMainnet);
    setCommitmentContract(COMMITMENT_CONTRACT(isMainnet));

    explorerClient(isMainnet)
      .getApiV1BoxesUnspentBytokenidP1(BANK_SINGLETON_TOKEN_ID(isMainnet))
      .then((res) => {
        setBankBox(res.data.items![0] as OutputInfo);
      })
      .catch((err) => {
        toast.dismiss();
        toast.warn("error getting bank box", noti_option_close("try-again"));
        setBankBox(null);
      });
  }, []);

  // useEffect(() => {
  //   if (
  //     !isNaN(mintAmount) &&
  //     mintAmount >= 0.001 &&
  //     !hasDecimals(mintAmount * 1e9) &&
  //     bankBox
  //   ) {
  //     const mintAmountBigInt = BigInt(mintAmount * 1e9);
  //     const hodlBankContract = new HodlBankContract(bankBox);
  //     const ep = hodlBankContract.mintAmount(mintAmountBigInt);
  //     setErgPrice(Number((ep * precisionBigInt) / UIMultiplier) / precision);
  //   } else {
  //     toast.dismiss();
  //     toast.warn("error calculating price", noti_option_close("try-again"));
  //     setErgPrice(0);
  //   }
  // }, [mintAmount]);

  const handleClick = async () => {
    let txOperatorFee = BigInt(MIN_TX_OPERATOR_FEE);
    let minerFee = BigInt(MIN_MINER_FEE);

    const walletConfig = getWalletConfig();

    if (localStorageKeyExists("txOperatorFee")) {
      // BigInt(localStorage.getItem("txOperatorFee")!);
    }

    if (localStorageKeyExists("minerFee")) {
      // BigInt(localStorage.getItem("minerFee")!);
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

    const nameToRegisterBytes = utf8.decode(nameToMint);

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
        window.document.documentElement.classList.add("overflow-hidden");
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

  return (
    <>
      <div className="max-w-md mx-auto mb-10 lg:mb-0 font-inter">
        <h4 className="text-black text-xl font-medium">Minting hodlERG</h4>
        <p className="text-black my-3 min-h-[100px]">
          Mint hodlERG with no fees. You have the freedom to mint as much as you
          desire at the current price. It's important to note that the minting
          process does not directly affect the token's pricing dynamics.
        </p>

        <div className="flex bg-gray-200 shadow-lg justify-between rounded-md items-start h-full">
          <div className="flex flex-col w-full h-full">
            <input
              className="w-full border-b-2 border-l-0 border-r-0 border-t-0 border-gray-300 bg-transparent text-gray-500 font-medium text-md h-14 focus:outline-none focus:ring-0 focus:border-primary focus-within:outline-none focus-within:shadow-none focus:shadow-none pl-4"
              placeholder="Name"
              type="text"
              onChange={(event) =>
                  setNameToMint(event.target.value)
              }
            />
            <span className="text-black font-medium text-md pl-4 mt-2">
              {`${ergPrice} ERG`}
            </span>
          </div>

          <button
            className="h-24 whitespace-nowrap focus:outline-none text-white primary-gradient hover:opacity-80 focus:ring-4 focus:ring-purple-300  focus:shadow-none font-medium rounded text-md px-5 py-2.5"
            onClick={handleClick}
          >
            COMMIT
          </button>
          {isModalErgoPayOpen && (
            <ErgoPayWalletModal
              isModalOpen={isModalErgoPayOpen}
              setIsModalOpen={setIsModalErgoPayOpen}
              ergoPayLink={ergoPayLink}
              txid={ergoPayTxId}
              isMainnet={isMainnet}
            ></ErgoPayWalletModal>
          )}
        </div>
      </div>
    </>
  );
};

export default MintingHodlERG;
