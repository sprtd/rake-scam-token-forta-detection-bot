import { utils, BigNumberish } from "ethers";
import { getCreate2Address } from "@ethersproject/address";
import { THRESHOLD_PERCENT, UNISWAP_PAIR_INIT_CODE } from "./constants";
import { LogDescription, Finding } from "forta-agent";
import { TransactionDescription } from "forta-agent/dist/sdk/transaction.event";
import BigNumber from "bignumber.js";
import { createFinding } from "./finding";
BigNumber.set({ DECIMAL_PLACES: 18 });


const toBn = (ethersBn: BigNumberish) => new BigNumber(ethersBn.toString());

// generate new pair address
export const getUniswapPairCreate2 = (factory: string, token0: string, token1: string, initCode: string)
    : string => {
    let salt = utils.solidityKeccak256(["address", "address"], [token0, token1]);
    return getCreate2Address(factory, salt, UNISWAP_PAIR_INIT_CODE).toLowerCase();
};

export const filterFunctionAndEvent = (func: TransactionDescription, swapEvents: LogDescription[],
    transferEvents: LogDescription[], pairAddress: string, txFrom: string): Finding[] => {
    let findings: Finding[] = [];
    let functionName = func.name
    if (functionName === "swapExactTokensForETHSupportingFeeOnTransferTokens") {
        console.log("pair___", pairAddress)
        let actualValueSent: BigNumber, initialAmountIn: BigNumber, tokenAddress: string = "";
        initialAmountIn = toBn(func.args.amountIn);
        actualValueSent = initialAmountIn;
        transferEvents.forEach(event => {
            // const { from, to, value } = event.args;
            let from: string = event.args.from;
            let to: string = event.args.to;
            let value: BigNumber = toBn(event.args.value);
            // console.log(from, to, value)
            // console.log(from === txFrom, from, txFrom)
            if (from.toLowerCase() === txFrom && to.toLowerCase() === pairAddress) {
                console.log("pair 2 logged___", pairAddress)
                console.log("token address__", event.address)

                console.log(value)
                actualValueSent = toBn(value.toString());
                tokenAddress = event.address;
            }

        });
        console.log(initialAmountIn.toString(), actualValueSent.toString())
        const rakedInPercentage = initialAmountIn.minus(actualValueSent).div(initialAmountIn).multipliedBy(100);
        console.log(rakedInPercentage.toString())
        console.log("token address_", tokenAddress)
        if (rakedInPercentage.gte(THRESHOLD_PERCENT))
            return [createFinding(tokenAddress, pairAddress, functionName, initialAmountIn.toString(), actualValueSent.toString(), initialAmountIn.minus(actualValueSent), rakedInPercentage.toFixed(2))]


    }
    else if (functionName === "swapExactETHForTokensSupportingFeeOnTransferTokens") {
        const to = func.args.to
        let actualValueReceived: BigNumber = new BigNumber(0), initialAmountOut: BigNumber = new BigNumber(0), tokenAddress: string = "";

        swapEvents.forEach(event => {
            if (event.args.to === to) {
                const [amount0Out, amount1Out] = event.args
                initialAmountOut = amount0Out === 0 ? amount1Out : amount0Out
            }
        })

        transferEvents.forEach(event => {
            const { sender, recipient, value } = event.args;
            if (sender === pairAddress && recipient === to) {
                actualValueReceived = value;
                tokenAddress = event.address;
            }
        });

        const rakedInPercentage = initialAmountOut.minus(actualValueReceived).div(initialAmountOut).multipliedBy(100);
        if (rakedInPercentage.gte(THRESHOLD_PERCENT)) return [createFinding(tokenAddress, pairAddress, functionName, initialAmountOut.toString(), actualValueReceived.toString(), initialAmountOut.minus(actualValueReceived), rakedInPercentage.toString())]
    }



    // console.log(findings)
    return findings;



}