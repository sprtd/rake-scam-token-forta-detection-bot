import fetch from "node-fetch"
import { getApiUrl } from "./utils"
export class FetchTokenDeployer {
  rakeTokenAddress: string;
  deployer: any
  txHash: any

  constructor(rakeTokenAddress: string) {
    this.rakeTokenAddress = rakeTokenAddress;
  }

  async fetchDeployerAndTxHash(tokenAddress: string) {
    try {
      const url: string = getApiUrl(tokenAddress)
      const response = await fetch(url, {
        method: "GET"
      });

      console.log("http response__", response)
      const data = await response.json()
      console.log("http data__", data)
      if (data?.status === '1') {
        this.deployer = data.result[0].contractCreator;
        this.txHash = data.result[0].txHash;
        return {
          deployer: this.deployer,
          txHash: this.txHash
        }
      } else {
        console.log("Etherscan query error: ", data?.message);
      }

    } catch (error) {
      console.log("Failed to fetch token deployer", error);
    }
  }

}
