import BigNumber from "bignumber.js";
import { EntityType, Finding, FindingSeverity, FindingType, Label } from "forta-agent";
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
  anomalyScore: string
): Promise<Finding> => {
  let fetchTokenDeployer = new FetchTokenDeployer(tokenAddress);
  const deployerAndTxHash = await fetchTokenDeployer.fetchDeployerAndTxHash();
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
      attackerRakeTokenDeployer: deployerAndTxHash?.deployer,
      rakeTokenDeployTxHash: deployerAndTxHash?.txHash,
    },
    labels: deployerAndTxHash?.deployer
      ? [
          {
            entityType: EntityType.Address,
            entity: deployerAndTxHash?.deployer,
            label: "attacker",
            confidence: 0.9,
            remove: false,
          },
        ]
      : undefined,
  });
};
//
