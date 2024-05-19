import { toast } from 'react-toastify';
import { toaster_copy_text } from '@/components/Notifications/Toast';
import { walletLocalStorage } from '@/components/wallet/ConnectWallet';
import axios from "axios";
import {NEXT_PUBLIC_NEST_API_URL} from "@/blockchain/ergo/constants";
import {Asset} from "@/types/nodeApi";
import {Amount, Box} from "@fleet-sdk/core";


export function reduceAddress(address: string): string {
  return address!.slice(0, 5) + '...' + address!.slice(-4);
}

export const numberWithCommas = (number: number, decimal: number): string => {
  const amountWithDecimals = number * 10 ** -decimal;
  return amountWithDecimals.toLocaleString('en');
};

export const handleCopyText = (e: string) => {
  toast.success(e, toaster_copy_text);
};

export const getWalletConfig = () => {
  return undefined;
  // return localStorage.getItem('walletConfig')
  //     ? (JSON.parse(
  //         localStorage.getItem('walletConfig')!,
  //     ) as walletLocalStorage)
  //     : undefined;
}

export async function rateLimitedCoinGeckoERGUSD(): Promise<
    () => Promise<number>
> {
  let timestamp = 0;
  let price = 0;

  async function getPrice(): Promise<number> {
    const ts = Date.now();

    if (ts >= timestamp) {
      timestamp = ts + 30000;
      try {
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=ergo&vs_currencies=USD',
        );
        price = response.data.ergo.usd;
        return response.data.ergo.usd;
      } catch (error) {
        // Handle error appropriately
        console.error('Error fetching ERG to USD conversion:', error);
        price = 0.0;
        return 0.0;
      }
    } else {
      return price;
    }
  }
  return getPrice;
}

export async function getShortLink(base64Txn: string, message: string, changeAddress: string, isMainnet: boolean): Promise<any> {
  try{
    const res = await axios.get(`${NEXT_PUBLIC_NEST_API_URL(isMainnet)}/ergopay/generateShortLink/${base64Txn}`);
    const shortCode = res.data.shortCode;
    if(shortCode === 'null'){
      return undefined;
    }
    const strippedUrl = NEXT_PUBLIC_NEST_API_URL(isMainnet).replace(/^https?:\/\//, "");
    return `ergopay://${strippedUrl}/ergopay/reducedTxLink/${shortCode}/${encodeURIComponent(message)}/${changeAddress}`;
  } catch (error){
    console.log(error);
    return undefined;
  }
}

export async function getInputBoxes(
    explorerApi: any,
    inputAddress: string,
    targetNanoErgs: bigint,
    tokens?: Asset[]
) {
  const limit = 100;
  const inputs: Box<Amount>[] = [];
  const addedBoxIds: Set<string> = new Set();

  if (tokens) {
    const tokenInputs: { [tokenId: string]: bigint } = {};
    const finalTokenInputs = [];
    tokens.forEach((token) => (tokenInputs[token.tokenId] = BigInt(0)));

    let offset = 0;

    while (true) {
      const boxes = (await explorerApi.getApiV1BoxesUnspentByaddressP1(
          inputAddress,
          offset,
          limit
      )).data;

      if (!boxes) {
        throw new Error("issue getting boxes");
      }

      console.log(boxes)

      for (const input of boxes!.items) {
        for (const asset of input.assets) {
          if (
              asset.tokenId in tokenInputs &&
              tokenInputs[asset.tokenId] <
              tokens.find((token) => token.tokenId === asset.tokenId)!.amount
          ) {
            tokenInputs[asset.tokenId] += BigInt(asset!.amount);
            if (!addedBoxIds.has(input.boxId)) {
              finalTokenInputs.push(input);
              addedBoxIds.add(input.boxId);
            }
          }
        }
      }

      offset += limit;

      // Check if all token amounts meet requirement
      if (
          Object.values(tokenInputs).every(
              (amount, index) => amount >= tokens![index].amount
          )
      ) {
        inputs.push(...finalTokenInputs);
        break;
      }

      if (boxes.items.length < limit) {
        throw new Error("insufficient inputs");
      }
    }
  }

  let cumInputValue: bigint = inputs.reduce(
      (acc, curr) => acc + BigInt(curr.value),
      BigInt(0)
  );

  if (cumInputValue === targetNanoErgs) {
    return inputs;
  }

  let offset = 0;
  while (true) {
    const boxes = (await explorerApi.getApiV1BoxesUnspentByaddressP1(
        inputAddress,
        offset,
        limit
    )).data;
    if (!boxes) {
      throw new Error("issue getting boxes");
    }
    for (const box of boxes.items) {
      if (!addedBoxIds.has(box.boxId)) {
        inputs.push(box);
        addedBoxIds.add(box.boxId);
        cumInputValue = cumInputValue + BigInt(box.value);

        if (cumInputValue >= targetNanoErgs) {
          return inputs;
        }
      }
    }
    offset += limit;
    if (boxes.items.length < limit) {
      break;
    }
  }

  throw new Error("insufficient inputs");
}
