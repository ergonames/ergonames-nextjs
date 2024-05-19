import React, { useEffect, useState } from "react";
import {
  OutputInfo,
} from "@/blockchain/ergo/explorerApi";
import {
  BANK_SINGLETON_TOKEN_ID,
  explorerClient,
  HODL_ERG_TOKEN_ID,
  MIN_MINER_FEE,
  MIN_TX_OPERATOR_FEE,
  precision,
  precisionBigInt,
  PROXY_ADDRESS,
  UIMultiplier,
} from "@/blockchain/ergo/constants";
import { HodlBankContract } from "@/blockchain/ergo/phoenixContracts/BankContracts/HodlBankContract";
import {
  checkWalletConnection,
  outputInfoToErgoTransactionOutput,
  signAndSubmitTx,
} from "@/blockchain/ergo/walletUtils/utils";
import { toast } from "react-toastify";
import {
  noti_option,
  noti_option_close,
  txSubmmited,
} from "@/components/Notifications/Toast";
import {
  Amount,
  Box,
  ErgoAddress,
  OutputBuilder, SByte, SColl,
  SConstant, SGroupElement,
  SLong, SSigmaProp,
  TransactionBuilder,
} from "@fleet-sdk/core";
import { hasDecimals, localStorageKeyExists } from "@/common/utils";
import {getInputBoxes, getShortLink, getWalletConfig} from "@/blockchain/ergo/wallet/utils";
import assert from "assert";
import { getTxReducedB64Safe } from "@/blockchain/ergo/ergopay/reducedTxn";
import ErgoPayWalletModal from "@/components/wallet/ErgoPayWalletModal";
import {blake2b256, utf8} from "@fleet-sdk/crypto";
import {bytesToHex, hexToBytes} from "@noble/hashes/utils";

const BurningHoldERG = () => {
  const [isMainnet, setIsMainnet] = useState<boolean>(true);
  // const [burnAmount, setBurnAmount] = useState<number>(0);
  const [nameToMint, setNameToMint] = useState<string>('');
  const [bankBox, setBankBox] = useState<OutputInfo | null>(null);
  const [ergPrice, setErgPrice] = useState<number>(0);
  const [proxyAddress, setProxyAddress] = useState<string>("");

  const [isModalErgoPayOpen, setIsModalErgoPayOpen] = useState<boolean>(false);
  const [ergoPayLink, setErgoPayLink] = useState<string>("");
  const [ergoPayTxId, setErgoPayTxId] = useState<string>("");

  useEffect(() => {
    // const isMainnet = localStorage.getItem("IsMainnet")
    //   ? (JSON.parse(localStorage.getItem("IsMainnet")!) as boolean)
    //   : true;
    const isMainnet = false;

    setIsMainnet(isMainnet);
    setProxyAddress(PROXY_ADDRESS(isMainnet));

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

  const minBoxValue = BigInt(1000000);

  // useEffect(() => {
  //   if (
  //     !isNaN(burnAmount) &&
  //     burnAmount >= 0.001 &&
  //     !hasDecimals(burnAmount * 1e9) &&
  //     bankBox
  //   ) {
  //     const burnAmountBigInt = BigInt(burnAmount * 1e9);
  //     const hodlBankContract = new HodlBankContract(bankBox);
  //     const ep =
  //       hodlBankContract.burnAmount(burnAmountBigInt).expectedAmountWithdrawn;
  //     setErgPrice(Number((ep * precisionBigInt) / UIMultiplier) / precision);
  //   } else {
  //     toast.dismiss();
  //     toast.warn("error calculating price", noti_option_close("try-again"));
  //     setErgPrice(0);
  //   }
  // }, [burnAmount]);

  const handleClick = async () => {
    let txOperatorFee = BigInt(MIN_TX_OPERATOR_FEE);
    let minerFee = BigInt(MIN_MINER_FEE);

    const walletConfig = getWalletConfig();

    if (localStorageKeyExists("txOperatorFee")) {
      // txOperatorFee = BigInt(localStorage.getItem("txOperatorFee")!);
    }

    if (localStorageKeyExists("minerFee")) {
      // minerFee = BigInt(localStorage.getItem("minerFee")!);
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

    const target = minBoxValue;
    const targetWithfee = target + minerFee;

    const inputs = isErgoPay
        ? await getInputBoxes(explorerClient(isMainnet), changeAddress, targetWithfee)
        : await ergo!.get_utxos();

    const receiverErgoTree = ErgoAddress.fromBase58(
        String(changeAddress)
    ).ergoTree;

    const receiverSigmaProp = receiverErgoTree.substring(2);

    const nameToRegisterBytes = utf8.decode(nameToMint);
    const nameToRegisterBytesHex = bytesToHex(nameToRegisterBytes);

    console.log(nameToMint)

    const secretString = "secret";
    const secretStringHash = blake2b256(utf8.decode(secretString));
    const secretStringHashHex = bytesToHex(secretStringHash);

    const commitmentBoxId = "db6ec8521e8346f7a0bb1c3790094f2a9aa5c0b242a9cb60e53c1f88e7ea1eb2";

    const outBox = new OutputBuilder(target, proxyAddress)
      .setAdditionalRegisters({
        R4: SColl(SByte, nameToRegisterBytesHex).toHex(),
        R5: SSigmaProp(SGroupElement(ErgoAddress.fromBase58(changeAddress).getPublicKeys()[0])).toHex(),
        R6: SColl(SByte, secretStringHashHex).toHex(),
        R7: SColl(SByte, commitmentBoxId).toHex(),
      });

    try {
      const unsignedTransaction = new TransactionBuilder(creationHeight)
        .from(inputs) // add inputs
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
        const url = await getShortLink(ergoPayTx, `Burn hodlERG3`, changeAddress, isMainnet);
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
      <div className="max-w-md mx-auto font-inter">
        <h4 className="text-black text-xl font-medium">Burning hodlERG</h4>
        <p className="text-black my-3 min-h-[100px]">
          When burning your hodlERG, there is a 3% protocol fee and a 0.3% dev
          fee associated with the process. The protocol fee contributes to the
          overall dynamics of the ecosystem.
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
            PROXY
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

export default BurningHoldERG;
