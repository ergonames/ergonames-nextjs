import {OutputInfo, RegisterType, TransactionInfo} from "./explorerApi";
import {ErgoTransaction, ErgoTransactionOutput, Registers} from "@/types/nodeApi";
import {explorerClient, NODE_API_URL} from "./constants";
import {NodeApi} from "./nodeApi/api";


export async function getUnConfirmedOrConfirmedTx(
    txId: string,
    isMainnet: boolean,
): Promise<TransactionInfo | ErgoTransaction> {
    const nodeApi = new NodeApi(NODE_API_URL(isMainnet));
    try {
        return await nodeApi.transactionsUnconfirmedByTransactionId(txId);
    } catch (error) {
        try {
            return (await explorerClient(isMainnet).getApiV1TransactionsP1(txId)).data;
        } catch (e) {
            return {} as TransactionInfo;
        }
    }
}