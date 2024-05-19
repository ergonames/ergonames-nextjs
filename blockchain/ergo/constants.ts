import {Configuration, DefaultApiFactory} from "./explorerApi";
import {ErgoAddress, Network} from "@fleet-sdk/core";


export const NODE_API_URL = (isMainnet: boolean): string => (
    ""
)!?.replace(/[\\/]+$/, '');
export const EXPLORER_API_URL = (isMainnet: boolean): string => (
    ""
)!?.replace(/[\\/]+$/, '');
export const EXPLORER_URL = (isMainnet: boolean): string => (
    ""
)!?.replace(/[\\/]+$/, '');

export const PROXY_ADDRESS = (isMainnet: boolean): string => {
    // const ergoTree = process.env.NEXT_PUBLIC_PROXY_ERGO_TREE!;
    const ergoTree = "";
    return isMainnet ? ErgoAddress.fromErgoTree(ergoTree, Network.Mainnet).toString() : ErgoAddress.fromErgoTree(ergoTree, Network.Testnet).toString();
}
export const COMMITMENT_CONTRACT = (isMainnet: boolean): string => {
    // const ergoTree = process.env.NEXT_PUBLIC_COMMITMENT_CONTRACT!;
    const ergoTree = "";
    return isMainnet ? ErgoAddress.fromErgoTree(ergoTree, Network.Mainnet).toString() : ErgoAddress.fromErgoTree(ergoTree, Network.Testnet).toString();
}
export const HODL_ERG_TOKEN_ID = (isMainnet: boolean): string => "";
export const BANK_SINGLETON_TOKEN_ID = (isMainnet: boolean): string => "";
export const MIN_TX_OPERATOR_FEE = 1;
export const MIN_MINER_FEE = BigInt(1);

export const UIMultiplier: bigint = BigInt(1e9);
export const precisionBigInt: bigint = BigInt(1000000);
export const precision: number = 1000000;

export const apiPrecisionBigInt: bigint = BigInt(1e9);
export const apiPrecision: number = 1e9;

export const explorerClient = (isMainnet: boolean) => {
    const explorerConf = new Configuration({
        basePath: EXPLORER_API_URL(isMainnet),
    });
    return DefaultApiFactory(explorerConf);
}
export const NEXT_PUBLIC_NEST_API_URL = (isMainnet: boolean) =>  (
    ""
)!?.replace(/[\\/]+$/, '');
