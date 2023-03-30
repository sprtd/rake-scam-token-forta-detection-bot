require("dotenv").config();
const { MAINNET_API_KEY, POLYGON_API_KEY, ARBISCAN_API_KEY, OPTIMISM_API_KEY, AVALANCHE_API_KEY, FANTOM_API_KEY, BNB_CHAIN_KEY } = process.env;

export const etherscanUrlConfig = (chainId: number) => {
  let etherscanApi: any;
  switch (chainId) {
    case 1:
      etherscanApi = {
        apiKey: `${MAINNET_API_KEY}`,
        getDeployerUrl: "https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.etherscan.io/api?module=account&action=txlistinternal&txhash=",
      };
      break;

    case 137:
      etherscanApi = {
        apiKey: `${POLYGON_API_KEY}`,
        getDeployerUrl: "https://api.polygonscan.com/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.polygonscan.com/api?module=account&action=txlistinternal&txhash=",
      };
      break;

    case 42161:
      etherscanApi = {
        apiKey: `${ARBISCAN_API_KEY}`,
        getDeployerUrl: "https://api.arbiscan.io/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.arbiscan.io/api?module=account&action=txlistinternal&txhash=",
      };
      break;

    case 10:
      etherscanApi = {
        apiKey: `${OPTIMISM_API_KEY}`,
        getDeployerUrl:
          "https://api-optimistic.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api-optimistic.etherscan.io/api?module=account&action=txlistinternal&txhash=",
      };
      break;

    case 43114:
      etherscanApi = {
        apiKey: `${AVALANCHE_API_KEY}`,
        getDeployerUrl: "https://api.snowtrace.io/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.snowtrace.io/api?module=account&action=txlistinternal&txhash=",
      };
      break;

    case 250:
      etherscanApi = {
        apiKey: `${FANTOM_API_KEY}`,
        getDeployerUrl: "https://api.ftmscan.com/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.ftmscan.com/api?module=account&action=txlistinternal&txhash=",
      };
      break;

    case 56:
      etherscanApi = {
        apiKey: `${BNB_CHAIN_KEY}`,
        getDeployerUrl: "https://api.bscscan.com/api?module=contract&action=getcontractcreation&contractaddresses=",
        getInternalTxnUrl: "https://api.bscscan.com/api?module=account&action=txlistinternal&txhash=",
      };
      break;
  }

  return etherscanApi;
};
