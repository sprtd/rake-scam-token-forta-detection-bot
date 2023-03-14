import fetch from "node-fetch";
import { getApiUrl } from "./utils";
export class FetchTokenDeployer {
  rakeTokenAddress: string;
  deployer: any;
  txHash: any;

  constructor(rakeTokenAddress: string) {
    this.rakeTokenAddress = rakeTokenAddress;
  }

  async fetchDeployerAndTxHash() {
    try {
      const tokenAddress = this.rakeTokenAddress;
      const url: string = getApiUrl(tokenAddress);
      const response = await fetch(url, {
        method: "GET",
      });
      const data = await response.json();
      if (data?.status === "1") {
        this.deployer = data.result[0].contractCreator;
        this.txHash = data.result[0].txHash;
        return {
          deployer: this.deployer,
          txHash: this.txHash,
        };
      } else {
        console.log("Etherscan query error: ", data?.message);
      }
    } catch (error) {
      console.log("Failed to fetch token deployer", error);
    }
  }
}
