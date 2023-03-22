import fetch from "node-fetch";
import { getApiUrl, getInternalApiUrl } from "./utils";
export class FetchTokenDeployer {
  rakeTokenAddress: string;
  deployer: any;
  deployTxHash: any;
  feeRecipient: any;

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
        this.deployTxHash = data.result[0].txHash;
        return {
          deployer: this.deployer,
          deployTxHash: this.deployTxHash,
        };
      } else {
        console.log("Etherscan fetch deployer and txHash query error: ", data?.message);
      }
    } catch (error) {
      console.log("Failed to fetch token deployer: ", error);
    }
  }

  async fetchRakeFeeRecipient(hash: string) {
    try {
      const url: string = getInternalApiUrl(hash);
    
      const response = await fetch(url, {
        method: "GET",
      });

      const data = await response.json();
      if (data?.status === "1") {
        this.feeRecipient = data.result;
        return this.feeRecipient;
      } else {
        console.log("Etherscan fetch rake fee recipient query error: ", data?.message);
      }
    } catch (error) {
      console.log("Failed to fetch raked fee recipient: ", error);
    }
  }
}