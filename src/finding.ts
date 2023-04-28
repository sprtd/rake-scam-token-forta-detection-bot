import BigNumber from "bignumber.js";
import { EntityType, ethers, Finding, FindingSeverity, FindingType, Label } from "forta-agent";
import { FetchTokenDeployer } from "./fetch.token.deployer";
import { returnMatchingEthTransferredToRecipients } from "./utils";

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
  let ethTransferredAfterRake: any[] = [];
  if (fetchedRakeFeeRecipient)
    ethTransferredAfterRake = returnMatchingEthTransferredToRecipients(fetchedRakeFeeRecipient, rakeTokenAddress);

  let metadata: any = {
    rakeTokenAddress,
    pairAddress,
    from,
    totalAmountTransferred,
    actualValueReceived,
    rakedFee: rakedFee.toString(),
    rakedFeePercentage,
    feeRecipient: rakeTokenAddress,
    attackerRakeTokenDeployer: deployerAndTxHash?.deployer,
    rakeTokenDeployTxHash: deployerAndTxHash?.deployTxHash,
    anomalyScore,
  };

  if (ethTransferredAfterRake?.length) {
    let ethRecipient = ethTransferredAfterRake.map((feeRecipient) => ({
      amount: ethers.utils.formatEther(feeRecipient.value),
      EOA: feeRecipient.to,
    }));
    const ethTransferredAfterRakeMetadata = JSON.stringify(ethRecipient);
    metadata = { ...metadata, ethTransferredAfterRakeMetadata };
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
