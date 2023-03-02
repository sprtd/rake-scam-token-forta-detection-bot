import BigNumber from "bignumber.js";
import { Finding, FindingSeverity, FindingType } from "forta-agent";

export const createFinding = (tokenAddress: string, pairAddress: string, from: string,  feeOnTransferFunctionCalled: string, totalAmountTransferred: string,
   actualValueReceived: string, rakedFee: BigNumber, rakedFeePercentage: string,): Finding => {
  return Finding.fromObject({
    name: "Rake Scam Token Detection Bot",
    description: `${feeOnTransferFunctionCalled} function detected on Uniswap Router to take additional swap fee`,
    alertId: "GITCOIN-FORTA-1",
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
     rakedFeePercentage
    },
  });
};