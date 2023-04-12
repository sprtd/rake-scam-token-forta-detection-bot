import dotenv from "dotenv";
dotenv.config();
import { LogDescription, Finding, ethers } from "forta-agent";
import { BigNumberish } from "ethers";
import { getCreate2Address } from "@ethersproject/address";
import { THRESHOLD_PERCENT, RAKE_TOKENS } from "./constants";
import { TransactionDescription } from "forta-agent/dist/sdk/transaction.event";
import BigNumber from "bignumber.js";
import { createFinding } from "./finding";
import { TOTAL_TOKEN_ADDRESSES } from "./agent";
import { etherscanUrlConfig } from "./etherscan.url.config";
import { NetworkData } from "./network";

BigNumber.set({ DECIMAL_PLACES: 18 });

export const toBn = (ethersBn: BigNumberish) => new BigNumber(ethersBn.toString());

export const lCase = (address: string): string => address.toLowerCase();
let TOTAL_FINDINGS = 0;

// generate new pair address
export const uniCreate2 = (t0: string, t1: string, factory: string, initCodeHash: string): string => {
  const tokenA = lCase(t0);
  const tokenB = lCase(t1);
  const token0: string = tokenA < tokenB ? tokenA : tokenB;
  const token1: string = tokenA < tokenB ? tokenB : tokenA;
  let salt = ethers.utils.solidityKeccak256(["address", "address"], [token0, token1]);
  return lCase(getCreate2Address(factory, salt, initCodeHash));
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

export const etherscanContractCreationUrl = (tokenAddress: string, chainId: number): string => {
  const { apiKey, getDeployerUrl } = etherscanUrlConfig(chainId);
  return `${getDeployerUrl}${tokenAddress}&apikey=${apiKey}`;
};

export const etherscanInternalTxnUrl = (txHash: string, chainId: number): string => {
  const { apiKey, getInternalTxnUrl } = etherscanUrlConfig(chainId);
  return `${getInternalTxnUrl}${txHash}&apikey=${apiKey}`;
};

export const returnOnlyMatchingRakeFeeRecipient = (fetchedRakeFeeRecipient: any[], tokenAddress: string): any[] => {
  const filteredRakeFeeRecipients = fetchedRakeFeeRecipient.filter(
    (result: any) => result.from === tokenAddress && result.value > 0
  );
  return !filteredRakeFeeRecipients.length ? [] : filteredRakeFeeRecipients;
};

const checkForFinding = async (
  initialAmountIn: BigNumber,
  actualAmountIn: BigNumber,
  tokenAddress: string,
  pairAddress: string,
  txHash: string,
  txFrom: string,
  txName: string
): Promise<Finding[]> => {
  const rakedInPercentage = initialAmountIn.minus(actualAmountIn).div(initialAmountIn).multipliedBy(100);
  if (rakedInPercentage.gte(THRESHOLD_PERCENT)) {
    TOTAL_FINDINGS++;
    if (!RAKE_TOKENS.includes(tokenAddress)) {
      RAKE_TOKENS.push(tokenAddress);
    } else return [];
    let anomalyScore = TOTAL_FINDINGS / TOTAL_TOKEN_ADDRESSES;

    return [
      await createFinding(
        lCase(tokenAddress),
        pairAddress,
        txHash,
        txFrom,
        txName,
        initialAmountIn.toString(),
        actualAmountIn.toString(),
        initialAmountIn.minus(actualAmountIn),
        rakedInPercentage.toFixed(2),
        anomalyScore.toString()
      ),
    ];
  }
  return [];
};

const executeExactTokenForEthFeeOnTransfer = async (
  txDescription: TransactionDescription,
  transferEvents: LogDescription[],
  swapEvents: LogDescription[],
  txHash: string,
  txFrom: string,
  finding: Finding[],
  router: string,
  factory: string,
  initCodeHash: string
) => {
  let actualAmountIn: BigNumber, initialAmountIn: BigNumber, to: string, pairAddress: string;
  initialAmountIn = toBn(txDescription.args.amountIn);
  const path: string[] = txDescription.args.path;

  let tokenSender: string = lCase(txFrom);
  for (let i = 0; i < path.length - 1; i++) {
    pairAddress = uniCreate2(path[i], path[i + 1], factory, initCodeHash);
    to = i < path.length - 2 ? uniCreate2(path[i + 1], path[i + 2], factory, initCodeHash) : router;
    [actualAmountIn] = parseTransferEvents(transferEvents, tokenSender, pairAddress, path[i]);

    finding.push(
      ...(await checkForFinding(
        initialAmountIn,
        actualAmountIn,
        path[i],
        pairAddress,
        txHash,
        txFrom,
        txDescription.name
      ))
    );

    [initialAmountIn] = parseSwapEvents(swapEvents, to, pairAddress);
    tokenSender = pairAddress;
  }
};

const executeExactETHForTokensFeeOnTransfer = async (
  txDescription: TransactionDescription,
  transferEvents: LogDescription[],
  swapEvents: LogDescription[],
  txHash: string,
  txFrom: string,
  finding: Finding[],
  factory: string,
  initCodeHash: string
) => {
  let initialAmountIn: BigNumber,
    actualAmountIn: BigNumber,
    swapRecipient: string,
    pairAddress: string,
    prevPairAddress: string;
  const path: string[] = txDescription.args.path;
  for (let i = 1; i < path.length; i++) {
    swapRecipient =
      i < path.length - 2 ? uniCreate2(path[i + 1], path[i + 2], factory, initCodeHash) : txDescription.args.to;
    prevPairAddress = uniCreate2(path[i - 1], path[i], factory, initCodeHash);
    if (i === path.length - 1) {
      [initialAmountIn] = parseSwapEvents(swapEvents, swapRecipient, prevPairAddress);
      [actualAmountIn] = parseTransferEvents(transferEvents, prevPairAddress, swapRecipient, path[i]);
    } else {
      pairAddress = uniCreate2(path[i], path[i + 1], factory, initCodeHash);

      [initialAmountIn] = parseSwapEvents(swapEvents, pairAddress, prevPairAddress);
      [, actualAmountIn] = parseSwapEvents(swapEvents, swapRecipient, pairAddress);
    }
    finding.push(
      ...(await checkForFinding(
        initialAmountIn,
        actualAmountIn,
        path[i],
        prevPairAddress,
        txHash,
        txFrom,
        txDescription.name
      ))
    );
  }
};

const executeExactTokensForTokensFeeOnTransfer = async (
  txDescription: TransactionDescription,
  transferEvents: LogDescription[],
  swapEvents: LogDescription[],
  txFrom: string,
  txHash: string,
  finding: Finding[],
  factory: string,
  initCodeHash: string
) => {
  let initialAmountIn: BigNumber, actualAmountIn: BigNumber, swapRecipient: string, pairAddress: string;
  initialAmountIn = toBn(txDescription.args.amountIn);
  const path: string[] = txDescription.args.path;
  for (let i = 0; i < path.length; i++) {
    swapRecipient =
      i < path.length - 2 ? uniCreate2(path[i + 1], path[i + 2], factory, initCodeHash) : txDescription.args.to;
    if (i === path.length - 1) {
      pairAddress = uniCreate2(path[i - 1], path[i], factory, initCodeHash);
      [actualAmountIn] = parseTransferEvents(transferEvents, pairAddress, swapRecipient, path[i]);
    } else {
      pairAddress = uniCreate2(path[i], path[i + 1], factory, initCodeHash);
      [, actualAmountIn] = parseSwapEvents(swapEvents, swapRecipient, pairAddress);
    }
    finding.push(
      ...(await checkForFinding(
        initialAmountIn,
        actualAmountIn,
        path[i],
        pairAddress,
        txHash,
        txFrom,
        txDescription.name
      ))
    );
    [initialAmountIn] = parseSwapEvents(swapEvents, swapRecipient, pairAddress);
  }
};

export const filterFunctionAndEvent = async (
  txDescription: TransactionDescription,
  swapEvents: LogDescription[],
  transferEvents: LogDescription[],
  txFrom: string,
  txHash: string,
  networkManager: NetworkData
): Promise<Finding[]> => {
  let findings: Finding[] = [];
  switch (txDescription.name) {
    case "swapExactTokensForETHSupportingFeeOnTransferTokens": {
      await executeExactTokenForEthFeeOnTransfer(
        txDescription,
        transferEvents,
        swapEvents,
        txHash,
        txFrom,
        findings,
        networkManager.router,
        networkManager.factory,
        networkManager.pairInitCodeHash
      );
      break;
    }
    case "swapExactETHForTokensSupportingFeeOnTransferTokens": {
      await executeExactETHForTokensFeeOnTransfer(
        txDescription,
        transferEvents,
        swapEvents,
        txHash,
        txFrom,
        findings,
        networkManager.factory,
        networkManager.pairInitCodeHash
      );
      break;
    }
    case "swapExactTokensForTokensSupportingFeeOnTransferTokens": {
      await executeExactTokensForTokensFeeOnTransfer(
        txDescription,
        transferEvents,
        swapEvents,
        txFrom,
        txHash,
        findings,
        networkManager.factory,
        networkManager.pairInitCodeHash
      );
      break;
    }
  }

  return findings;
};
