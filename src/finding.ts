import BigNumber from "bignumber.js";
import { Finding, FindingSeverity, FindingType } from "forta-agent";

export const createFinding = (tokenAddress: string, pairAddress: string, from: string,  swapFeeFunctionCalled: string, totalAmountTransferred: string,
   actualValueReceived: string, rakedFee: BigNumber, rakedFeePercentage: string,): Finding => {
  return Finding.fromObject({
    name: "Rake Scam Token Detection Bot",
    description: "Detects rake scam token which significantly takes additional swap fee on Uniswap DEX",
    alertId: "GITCOIN-FORTA-1",
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    protocol: "GitcoinForta",
    metadata: {
     tokenAddress, 
     pairAddress,
     from,
     swapFeeFunctionCalled,
     totalAmountTransferred, 
     actualValueReceived,
     rakedFee: rakedFee.toString(),
     rakedFeePercentage
    },
  });
};