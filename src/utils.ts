import * as dotenv from 'dotenv' ;
dotenv.config();
import { ethers } from "forta-agent";
import fetch from "node-fetch"
import { BigNumberish } from "ethers";
import { getCreate2Address } from "@ethersproject/address";
import { THRESHOLD_PERCENT, UNISWAP_PAIR_INIT_CODE_HASH, UNISWAP_V2_FACTORY, UNISWAP_V2_ROUTER } from "./constants";
import { LogDescription, Finding } from "forta-agent";
import { TransactionDescription } from "forta-agent/dist/sdk/transaction.event";
import BigNumber from "bignumber.js";
import { createFinding } from "./finding";


const { GET_DEPLOYER_ENDPOINT, API_KEY } = process.env

BigNumber.set({ DECIMAL_PLACES: 18 });

export const toBn = (ethersBn: BigNumberish) => new BigNumber(ethersBn.toString());

export const lCase = (address: string): string => address.toLowerCase();
export let TOTAL_FINDINGS = 0
export let RAKE_TOKEN_ADDRESSES: string[] = []



// generate new pair address
export const uniCreate2 = (t0: string, t1: string, factory: string = UNISWAP_V2_FACTORY): string => {
  const tokenA = lCase(t0);
  const tokenB = lCase(t1);
  const token0: string = tokenA < tokenB ? tokenA : tokenB;
  const token1: string = tokenA < tokenB ? tokenB : tokenA;
  let salt = ethers.utils.solidityKeccak256(["address", "address"], [token0, token1]);
  return lCase(getCreate2Address(factory, salt, UNISWAP_PAIR_INIT_CODE_HASH));
};

const parseTransferEvents = (
  transferEvents: LogDescription[],
  eventFrom: string,
  eventTo: string,
  emitingAddr: string
): any[] => {
  let from: string, to: string;
  let actualValue: BigNumber = toBn(0);
  transferEvents.forEach((event) => {
    from = lCase(event.args.from);
    to = lCase(event.args.to);
    let value: BigNumber = toBn(event.args.value);
    if (from === lCase(eventFrom) && to === lCase(eventTo) && lCase(event.address) === lCase(emitingAddr)) {
      actualValue = toBn(value.toString());
    }
  });
  return [actualValue];
};

const parseSwapEvents = (swapEvents: LogDescription[], swapRecipient: string, emitingAddr: string): any[] => {
  let initialAmountOut: BigNumber = toBn(0),
    actualAmountIn: BigNumber = toBn(0);
  swapEvents.forEach((event) => {
    if (lCase(event.args.to) === lCase(swapRecipient) && lCase(event.address) === lCase(emitingAddr)) {
      const amount0In = toBn(event.args.amount0In);
      const amount1In = toBn(event.args.amount1In);
      const amount0Out = toBn(event.args.amount0Out);
      const amount1Out = toBn(event.args.amount1Out);
      initialAmountOut = amount0Out.eq(toBn(0)) ? amount1Out : amount0Out;
      actualAmountIn = amount0In.eq(toBn(0)) ? amount1In : amount0In;
    }
  });
  return [initialAmountOut, actualAmountIn];
};

export const getApiUrl = (tokenAddress: string): string =>
  `${GET_DEPLOYER_ENDPOINT}${tokenAddress}&apikey=${API_KEY}`
  

const checkForFinding = async (
  initialAmountIn: BigNumber,
  actualAmountIn: BigNumber,
  tokenAddress: string,
  pairAddress: string,
  txFrom: string,
  txName: string
): Promise<Finding[]> => {
  const rakedInPercentage = initialAmountIn.minus(actualAmountIn).div(initialAmountIn).multipliedBy(100);
  if (rakedInPercentage.gte(THRESHOLD_PERCENT)) {
    TOTAL_FINDINGS++;
    if (!RAKE_TOKEN_ADDRESSES.includes(tokenAddress)) {
      RAKE_TOKEN_ADDRESSES.push(tokenAddress);
    }
    let anomalyScore = TOTAL_FINDINGS / RAKE_TOKEN_ADDRESSES.length;
    console.log("anomaly score__", anomalyScore)

    return [
      await createFinding(
        tokenAddress,
        pairAddress,
        txFrom,
        txName,
        initialAmountIn.toString(),
        actualAmountIn.toString(),
        initialAmountIn.minus(actualAmountIn),
        rakedInPercentage.toFixed(2),
        anomalyScore.toString(),

      ),
    ];
  }
  return [];

};

const executeExactTokenForEthFeeOnTransfer = async (
  txDescription: TransactionDescription,
  transferEvents: LogDescription[],
  swapEvents: LogDescription[],
  txFrom: string,
  finding: Finding[],
  router: string
) => {
  let actualAmountIn: BigNumber, initialAmountIn: BigNumber, to: string, pairAddress: string;
  initialAmountIn = toBn(txDescription.args.amountIn);
  const path: string[] = txDescription.args.path;

  let tokenSender: string = lCase(txFrom);
  for (let i = 0; i < path.length - 1; i++) {
    pairAddress = uniCreate2(path[i], path[i + 1]);
    to = i < path.length - 2 ? uniCreate2(path[i + 1], path[i + 2]) : router;
    [actualAmountIn] = parseTransferEvents(transferEvents, tokenSender, pairAddress, path[i]);


    finding.push(...await checkForFinding(initialAmountIn, actualAmountIn, path[i], pairAddress, txFrom, txDescription.name));

    [initialAmountIn] = parseSwapEvents(swapEvents, to, pairAddress);
    tokenSender = pairAddress;
  }
};

const executeExactETHForTokensFeeOnTransfer = async (
  txDescription: TransactionDescription,
  transferEvents: LogDescription[],
  swapEvents: LogDescription[],
  txFrom: string,
  finding: Finding[]
) => {
  let initialAmountIn: BigNumber,
    actualAmountIn: BigNumber,
    swapRecipient: string,
    pairAddress: string,
    prevPairAddress: string;
  const path: string[] = txDescription.args.path;
  for (let i = 1; i < path.length; i++) {
    swapRecipient = i < path.length - 2 ? uniCreate2(path[i + 1], path[i + 2]) : txDescription.args.to;
    prevPairAddress = uniCreate2(path[i - 1], path[i]);
    if (i === path.length - 1) {
      [initialAmountIn] = parseSwapEvents(swapEvents, swapRecipient, prevPairAddress);
      [actualAmountIn] = parseTransferEvents(transferEvents, prevPairAddress, swapRecipient, path[i]);
    } else {
      pairAddress = uniCreate2(path[i], path[i + 1]);
      [initialAmountIn] = parseSwapEvents(swapEvents, pairAddress, prevPairAddress);
      [, actualAmountIn] = parseSwapEvents(swapEvents, swapRecipient, pairAddress);
    }
    finding.push(
      ...await checkForFinding(initialAmountIn, actualAmountIn, path[i], prevPairAddress, txFrom, txDescription.name)
    );
  }
};

const executeExactTokensForTokensFeeOnTransfer = async(
  txDescription: TransactionDescription,
  transferEvents: LogDescription[],
  swapEvents: LogDescription[],
  txFrom: string,
  finding: Finding[]
) => {
  let initialAmountIn: BigNumber, actualAmountIn: BigNumber, swapRecipient: string, pairAddress: string;
  initialAmountIn = toBn(txDescription.args.amountIn);
  const path: string[] = txDescription.args.path;
  for (let i = 0; i < path.length; i++) {
    swapRecipient = i < path.length - 2 ? uniCreate2(path[i + 1], path[i + 2]) : txDescription.args.to;
    if (i === path.length - 1) {
      pairAddress = uniCreate2(path[i - 1], path[i]);
      [actualAmountIn] = parseTransferEvents(transferEvents, pairAddress, swapRecipient, path[i]);
    } else {
      pairAddress = uniCreate2(path[i], path[i + 1]);
      [, actualAmountIn] = parseSwapEvents(swapEvents, swapRecipient, pairAddress);
    }
    finding.push(...await checkForFinding(initialAmountIn, actualAmountIn, path[i], pairAddress, txFrom, txDescription.name));
    [initialAmountIn] = parseSwapEvents(swapEvents, swapRecipient, pairAddress);
  }
};

export const filterFunctionAndEvent = async (
  txDescription: TransactionDescription,
  swapEvents: LogDescription[],
  transferEvents: LogDescription[],
  txFrom: string,
  router: string
): Promise<Finding[]> => {
  let findings: Finding[] = [];
  switch (txDescription.name) {
    case "swapExactTokensForETHSupportingFeeOnTransferTokens": {
      await executeExactTokenForEthFeeOnTransfer(txDescription, transferEvents, swapEvents, txFrom, findings, router);
      break;
    }
    case "swapExactETHForTokensSupportingFeeOnTransferTokens": {
      await executeExactETHForTokensFeeOnTransfer(txDescription, transferEvents, swapEvents, txFrom, findings);
      break;
    }
    case "swapExactTokensForTokensSupportingFeeOnTransferTokens": {
      await executeExactTokensForTokensFeeOnTransfer(txDescription, transferEvents, swapEvents, txFrom, findings);
      break;
    }
  }

  return findings;
};
