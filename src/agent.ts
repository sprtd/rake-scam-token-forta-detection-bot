import {
  Finding,
  HandleTransaction,
  TransactionEvent,  getEthersProvider,
  ethers,
} from "forta-agent";
import { TransactionDescription } from "forta-agent/dist/sdk/transaction.event";
import { filterFunctionAndEvent, getUniswapPairCreate2 } from "./utils";
import NetworkManager, { NETWORK_MAP } from "./network"
import NetworkData from "./network"

import {
  SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_ETH_FOR_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  UNISWAP_V2_SWAP_EVENT,
  TOKEN_TRANSFER_EVENT
} from './constants';


import BigNumber from "bignumber.js";
BigNumber.set({ DECIMAL_PLACES: 18 });

const networkManager = new NetworkManager(NETWORK_MAP)

export const provideInitialize = (provider: ethers.providers.Provider) => async () => {
  const { chainId } = await provider.getNetwork();
  networkManager.setNetwork(chainId);
 
};

export const provideHandleTransaction = (
  functionAbi: string[],
  networkManager: NetworkData,
  swapEvent: string,
  tokenTransferEvent: string,
): HandleTransaction => {
  return async (txEvent: TransactionEvent): Promise<Finding[]> => {
    const txFunction: TransactionDescription[] = txEvent.filterFunction(functionAbi, networkManager.router);
    const findings: Finding[] = [];
    if (!txFunction) return findings;
    const txTransferEventLog = txEvent.filterLog(tokenTransferEvent);
    const txSwapEventLog = txEvent.filterLog(swapEvent);
    txFunction.forEach((func) => {
      const { args } = func;
      const path: string[] = args.path;
      const to: string = args.to;
      const [tokenA, tokenB] = [path[path.length - 2], path[path.length - 1]];
      const token0: string = tokenA < tokenB ? tokenA : tokenB;
      const token1: string = tokenA < tokenB ? tokenB : tokenA;

      const pairAddress = getUniswapPairCreate2(networkManager.factory, token0, token1);
      findings.push(...filterFunctionAndEvent(func, txSwapEventLog, txTransferEventLog, pairAddress, txEvent.from));
     
    });
    return findings;
  };
};

export default {
  initialize: provideInitialize(getEthersProvider()) ,
  handleTransaction: provideHandleTransaction([SWAP_EXACT_ETH_FOR_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
    SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
    SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS],
    networkManager,
    UNISWAP_V2_SWAP_EVENT,
    TOKEN_TRANSFER_EVENT,
  )
};
