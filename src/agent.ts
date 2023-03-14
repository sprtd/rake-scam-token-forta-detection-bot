import { Finding, HandleTransaction, TransactionEvent, getEthersProvider, ethers } from "forta-agent";
import { TransactionDescription } from "forta-agent/dist/sdk/transaction.event";
import { filterFunctionAndEvent, TOTAL_FINDINGS, RAKE_TOKEN_ADDRESSES } from "./utils";
import NetworkManager, { NETWORK_MAP } from "./network";
import NetworkData from "./network";

import {
  SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  UNISWAP_V2_SWAP_EVENT,
  TOKEN_TRANSFER_EVENT,
} from "./constants";

import BigNumber from "bignumber.js";
BigNumber.set({ DECIMAL_PLACES: 18 });

const networkManager = new NetworkManager(NETWORK_MAP);

export const provideInitialize = (provider: ethers.providers.Provider) => async () => {
  const { chainId } = await provider.getNetwork();
  networkManager.setNetwork(chainId);
};

export const provideHandleTransaction = (
  functionAbi: string[],
  networkManager: NetworkData,
  swapEvent: string,
  tokenTransferEvent: string
): HandleTransaction => {
  return async (txEvent: TransactionEvent): Promise<Finding[]> => {
    const txDescriptions: TransactionDescription[] = txEvent.filterFunction(functionAbi, networkManager.router);
    const findings: Finding[] = [];
    if (!txDescriptions) return findings;
    const txTransferEventLogs = txEvent.filterLog(tokenTransferEvent);
    const txSwapEventLogs = txEvent.filterLog(swapEvent);
    for (let txDescription of txDescriptions) {
      findings.push(...await filterFunctionAndEvent(txDescription, txSwapEventLogs, txTransferEventLogs, txEvent.from, networkManager.router));
    }
    return findings;
  };
};


export default {
  initialize: provideInitialize(getEthersProvider()),
  handleTransaction: provideHandleTransaction(
    [
      SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
      SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
      SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
    ],
    networkManager,
    UNISWAP_V2_SWAP_EVENT,
    TOKEN_TRANSFER_EVENT
  ),
};
