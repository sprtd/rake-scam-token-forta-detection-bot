require("dotenv").config();
const { YOUR_API_KEY } = process.env;

export const etherscanUrlConfig = (chainId: number) => {
  let etherscanApi: any;
  switch (chainId) {
    case 1:
      etherscanApi = {
        apiKey: `${YOUR_API_KEY}`,
        getDeployerUrl: "https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.etherscan.io/api?module=account&action=txlistinternal&txhash=internal&txhash=",
      };
      break;

    case 137:
      etherscanApi = {
        apiKey: `${YOUR_API_KEY}`,
        getDeployerUrl: "https://api.polygonscan.com/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.polygonscan.com/api?module=account&action=txlistinternal&txhash=",
      };
      break;

    case 42161:
      etherscanApi = {
        apiKey: `${YOUR_API_KEY}`,
        getDeployerUrl: "https://api.arbiscan.io/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.arbiscan.io/api?module=account&action=txlistinternal&txhash=",
      };
      break;

    case 10:
      etherscanApi = {
        apiKey: `${YOUR_API_KEY}`,
        getDeployerUrl:
          "https://api-optimistic.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api-optimistic.etherscan.io/api?module=account&action=txlistinternal&txhash=",
      };
      break;

    case 43114:
      etherscanApi = {
        apiKey: `${YOUR_API_KEY}`,
        getDeployerUrl: "https://api.snowtrace.io/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.snowtrace.io/api?module=account&action=txlistinternal&txhash=",
      };

    case 250:
      etherscanApi = {
        apiKey: `${YOUR_API_KEY}`,
        getDeployerUrl: "https://api.ftmscan.com/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.ftmscan.com/api?module=account&action=txlistinternal&txhash=",
      };

    case 56:
      etherscanApi = {
        apiKey: `${YOUR_API_KEY}`,
        getDeployerUrl: "https://api.bscscan.com/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.bscscan.com/api?module=account&action=txlistinternal&txhash=",
      };
      break;
  }

  return etherscanApi;
};
