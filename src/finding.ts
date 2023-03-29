import BigNumber from "bignumber.js";
import { EntityType, ethers, Finding, FindingSeverity, FindingType, Label } from "forta-agent";
import { FetchTokenDeployer } from "./fetch.token.deployer";
import { returnOnlyMatchingRakeFeeRecipient } from "./utils";

export const createFinding = async (
  rakeTokenAddress: string,
  pairAddress: string,
  txHash: string,
  from: string,
  feeOnTransferFunctionCalled: string,
  totalAmountTransferred: string,
  actualValueReceived: string,
  rakedFee: BigNumber,
  rakedFeePercentage: string,
  anomalyScore: string
): Promise<Finding> => {
  let fetchTokenDeployer = new FetchTokenDeployer(rakeTokenAddress);
  await new Promise(resolve => {
    setTimeout(resolve, 500); // 0.5s
  });
  const deployerAndTxHash = await fetchTokenDeployer.fetchDeployerAndTxHash();
  const fetchedRakeFeeRecipient = await fetchTokenDeployer.fetchRakeFeeRecipient(txHash);
  let matchingRakeFeeRecipient: any[] = [];
  if (fetchedRakeFeeRecipient)
    matchingRakeFeeRecipient = returnOnlyMatchingRakeFeeRecipient(fetchedRakeFeeRecipient, rakeTokenAddress);

  let metadata: any = {
    rakeTokenAddress,
    pairAddress,
    from,
    totalAmountTransferred,
    actualValueReceived,
    rakedFee: rakedFee.toString(),
    rakedFeePercentage,
    anomalyScore,
    attackerRakeTokenDeployer: deployerAndTxHash?.deployer,
    rakeTokenDeployTxHash: deployerAndTxHash?.deployTxHash,
  };

  let rakeFeeRecipient = "",
    ethTransferredToRakeFeeRecipient = "";

  if (matchingRakeFeeRecipient?.length) {
    rakeFeeRecipient = matchingRakeFeeRecipient[0];
    ethTransferredToRakeFeeRecipient = ethers.utils.formatEther(matchingRakeFeeRecipient[1]);
    metadata = { ...metadata, rakeFeeRecipient, ethTransferredToRakeFeeRecipient };
  }
  return Finding.fromObject({
    name: "Rake Scam Token Detection Bot",
    description: `${feeOnTransferFunctionCalled} function detected on Uniswap Router to take additional swap fee`,
    alertId: "RAKE-TOKEN-CONTRACT-1",
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    protocol: "GitcoinForta",
    metadata,
    labels: deployerAndTxHash?.deployer ? [
      Label.fromObject({
        entity: deployerAndTxHash?.deployer,
        entityType: EntityType.Address,
        label: "Attacker",
        confidence: 0.9,
        remove: false,
      }),
    ] : undefined
  });
};
