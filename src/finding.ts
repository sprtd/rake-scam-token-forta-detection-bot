


import BigNumber from "bignumber.js";
import { Finding, FindingSeverity, FindingType } from "forta-agent";
// import {getDeployerAndTxHash } from "./utils";
import { FetchTokenDeployer } from "./fetch.token.deployer";

export const createFinding = async (
  tokenAddress: string,
  pairAddress: string,
  from: string,
  feeOnTransferFunctionCalled: string,
  totalAmountTransferred: string,
  actualValueReceived: string,
  rakedFee: BigNumber,
  rakedFeePercentage: string,
  anomalyScore: string,
): Promise<Finding> => {
  let fetchTokenDeployer = new FetchTokenDeployer(tokenAddress)
  const deployerAndTxHash = await fetchTokenDeployer.fetchDeployerAndTxHash()
  console.log("deployer", deployerAndTxHash)
  return Finding.fromObject({
    name: "Rake Scam Token Detection Bot",
    description: `${feeOnTransferFunctionCalled} function detected on Uniswap Router to take additional swap fee`,
    alertId: "RAKE-TOKEN-CONTRACT-1",
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    protocol: "GitcoinForta",
    metadata: {
      tokenAddress,
      pairAddress,
      from,
      totalAmountTransferred,
      actualValueReceived,
      rakedFee: rakedFee.toString(),
      rakedFeePercentage,
      anomalyScore,
      rakeTokenDeployer: deployerAndTxHash?.deployer,
      rakeTokenDeployTxHash: deployerAndTxHash?.txHash

    },
  });
};
