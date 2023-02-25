import {
  BlockEvent,
  Finding,
  Initialize,
  HandleBlock,
  HandleTransaction,
  HandleAlert,
  AlertEvent,
  TransactionEvent,
  FindingSeverity,
  FindingType,
} from "forta-agent";
import { TransactionDescription } from "forta-agent/dist/sdk/transaction.event";
import { createFinding } from "./finding";
import {filterFunctionAndEvent, getUniswapPairCreate2} from "./utils";
import {
  SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_ETH_FOR_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_SWAP_EVENT,
  UNISWAP_PAIR_INIT_CODE,
  UNISWAP_V2_FACTORY,
  TOKEN_TRANSFER_EVENT
} from './constants';

import BigNumber from "bignumber.js";
BigNumber.set({ DECIMAL_PLACES: 18 });

export const provideHandleTransaction = (
  functionAbi: string[],
  router: string,
  swapEvent: string,
  tokenTransferEvent: string,
  initCode: string,
  factoryAddress: string
): HandleTransaction => {
  return async (txEvent: TransactionEvent): Promise<Finding[]> => {
    const txFunction: TransactionDescription[] = txEvent.filterFunction(functionAbi, router);
    const findings: Finding[] = [];
    if (!txFunction) return findings;
    const txTransferEventLog = txEvent.filterLog(tokenTransferEvent);
    const txSwapEventLog = txEvent.filterLog(swapEvent);
    txFunction.forEach((func) => {
      const { args } = func;
      const path: string[] = args.path;
      const to: string = args.to;
      const [tokenA, tokenB]  =[path[path.length - 2], path[path.length - 1]];  
      const token0: string = tokenA < tokenB ? tokenA : tokenB;
      const token1: string = tokenA < tokenB ? tokenB : tokenA;
      const pairAddress = getUniswapPairCreate2(factoryAddress, token0, token1, initCode);
      findings.push(...filterFunctionAndEvent(func, txSwapEventLog, txTransferEventLog,pairAddress, txEvent.from)); 
    });
    return findings;
  };
};


export default {
  // initialize,
  handleTransaction: provideHandleTransaction([SWAP_EXACT_ETH_FOR_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
    SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
    SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS],
    UNISWAP_V2_ROUTER,
    UNISWAP_V2_SWAP_EVENT,
    TOKEN_TRANSFER_EVENT,
    UNISWAP_PAIR_INIT_CODE,
    UNISWAP_V2_FACTORY 
    )
};
