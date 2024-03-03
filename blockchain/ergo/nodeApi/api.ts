import axios from 'axios';
import { ErgoTransaction } from '@/types/nodeApi';



export class NodeApi{
  private readonly nodeBaseURI: string;
  constructor(nodeBaseURI: string) {
    this.nodeBaseURI = nodeBaseURI.replace(/[\\/]+$/, '');
  }

  public async transactionsUnconfirmedByTransactionId(txId: string): Promise<ErgoTransaction>{
    const url = `${this.nodeBaseURI}/transactions/unconfirmed/byTransactionId/${txId}`;
    const response = await axios.get(url);
    return response.data;
  }

  public async submitTransaction(
      transaction: any
  ): Promise<string | undefined> {
    const url = `${this.nodeBaseURI}/transactions`;
    try {
      return (await axios.post(url, transaction)).data;
    } catch (error) {
      // console.log(error.response.data);
      // throw error;
      return undefined;
    }
  }


}