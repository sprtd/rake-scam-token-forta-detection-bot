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
  await new Promise((resolve) => {
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

  if (matchingRakeFeeRecipient?.length) {
    const rakeRecipient = matchingRakeFeeRecipient.map((feeRecipient) => ({
      ethTransferredToRakeFeeRecipient: ethers.utils.formatEther(feeRecipient.value),
      rakeFeeRecipient: feeRecipient.to,
    }));
    const rakeRecipientString = JSON.stringify(rakeRecipient);
    metadata = { ...metadata, rakeRecipientString };
  }

  return Finding.fromObject({
    name: "Rake Scam Token Detection Bot",
    description: `${feeOnTransferFunctionCalled} function detected on Uniswap Router to take additional swap fee`,
    alertId: "RAKE-TOKEN-CONTRACT-1",
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    protocol: "GitcoinForta",
    metadata,
    labels: deployerAndTxHash?.deployer
      ? [
        Label.fromObject({
          entity: deployerAndTxHash?.deployer,
          entityType: EntityType.Address,
          label: "Attacker",
          confidence: 0.6,
          remove: false,
        }),
      ]
      : undefined,
  });
};
