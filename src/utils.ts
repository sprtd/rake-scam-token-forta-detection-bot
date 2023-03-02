import { utils, BigNumberish } from "ethers";
import { getCreate2Address } from "@ethersproject/address";
import { THRESHOLD_PERCENT, UNISWAP_PAIR_INIT_CODE_HASH, UNISWAP_V2_FACTORY, UNISWAP_V2_ROUTER } from "./constants";
import { LogDescription, Finding } from "forta-agent";
import { TransactionDescription } from "forta-agent/dist/sdk/transaction.event";
import BigNumber from "bignumber.js";
import { createFinding } from "./finding";
BigNumber.set({ DECIMAL_PLACES: 18 });

const toBn = (ethersBn: BigNumberish) => new BigNumber(ethersBn.toString());

const lCase = (address: string): string => address.toLowerCase()

const uniCreate2 = (t0: string, t1: string, factory: string = UNISWAP_V2_FACTORY): string => {
    const tokenA = lCase(t0);
    const tokenB = lCase(t1);
    const token0: string = tokenA < tokenB ? tokenA : tokenB;
    const token1: string = tokenA < tokenB ? tokenB : tokenA;
    let salt = utils.solidityKeccak256(["address", "address"], [token0, token1]);
    console.log(getCreate2Address(factory, salt, UNISWAP_PAIR_INIT_CODE_HASH))
    return lCase(getCreate2Address(factory, salt, UNISWAP_PAIR_INIT_CODE_HASH));

}

// generate new pair address
export const getUniswapPairCreate2 = (factory: string, token0: string, token1: string)
    : string => {
    let salt = utils.solidityKeccak256(["address", "address"], [token0, token1]);
    return lCase(getCreate2Address(factory, salt, UNISWAP_PAIR_INIT_CODE_HASH));
};

const parseTransferEvents = (transferEvents: LogDescription[], eventFrom: string, eventTo: string): any[] => {
    let from: string, to: string;
    let tokenAddress: string = "", actualValue: BigNumber = toBn(0);
    transferEvents.forEach(event => {
        from = lCase(event.args.from);
        to = lCase(event.args.to);
        let value: BigNumber = toBn(event.args.value);
        if (from === lCase(eventFrom) && to === lCase(eventTo)) {
            actualValue = toBn(value.toString());
            tokenAddress = lCase(event.address);
        }

    });
    return [tokenAddress, actualValue]
}

const parseSwapEvents = (swapEvents: LogDescription[], swapRecipient: string, emitingAddr: string): any[] => {
    let initialAmountOut: BigNumber = toBn(0), actualAmountIn: BigNumber = toBn(0);
    swapEvents.forEach(event => {
        if (lCase(event.args.to) === lCase(swapRecipient) && lCase(event.address) === lCase(emitingAddr)) {
            const amount0In = toBn(event.args.amount0In);
            const amount1In = toBn(event.args.amount1In);
            const amount0Out = toBn(event.args.amount0Out);
            const amount1Out = toBn(event.args.amount1Out);
            initialAmountOut = amount0Out.eq(toBn(0)) ? amount1Out : amount0Out;
            actualAmountIn = amount0In.eq(toBn(0)) ? amount1In : amount0In;
        };
    });
    return [initialAmountOut, actualAmountIn];
}


/** 
[
    "0x3788888" ---- zora, initialAmountIn -- tx.args, actualAmount --emittedTransferEvent(txFrom,pair(path0, 
        path1))


    "0x378TRD" ---- usdt, initialAmountIn --- amountOut of swapEvent(emiting addr == pair(path0, 
        path1), to of SwapEvent == pair(path1, path2) ),   actualAmountIn == value of transferEvent(pair(path0, 
        path1, pair(path1, path2))
    "0x378TRD" ---- screenTop, initialAmountIn == amountOut of swapEvent(emiting addr == pair(path1, 
        path2), to of SwapEvent == pair(path2, path3) ), actualAmountIn == value of transferEvent(pair(path1, 
        path2, pair(path2, path3))
    "0x45353 --- weth"
]
*/
const executeExactTokenForEthSupportingFeeOnTransferTokens = (txDescription: TransactionDescription, transferEvents: LogDescription[],
    swapEvents: LogDescription[], txFrom: string, finding: Finding[]) => {
    let actualAmountIn: BigNumber, initialAmountIn: BigNumber, tokenAddress: string = "", to: string,
        rakedInPercentage: BigNumber, pairAddress: string;
    initialAmountIn = toBn(txDescription.args.amountIn);
    actualAmountIn = initialAmountIn;
    const path: string[] = txDescription.args.path;

    let tokenSender: string = lCase(txFrom);
    for (let i = 0; i < path.length - 1; i++) {
        pairAddress = uniCreate2(path[i], path[i + 1]);
        to = i < path.length - 2 ? uniCreate2(path[i + 1], path[i + 2]) : UNISWAP_V2_ROUTER;
        [tokenAddress, actualAmountIn] = parseTransferEvents(transferEvents, tokenSender, pairAddress);

        rakedInPercentage = initialAmountIn.minus(actualAmountIn).div(initialAmountIn).multipliedBy(100);
        if (rakedInPercentage.gte(THRESHOLD_PERCENT))
            finding.push(createFinding(tokenAddress, pairAddress, txFrom, txDescription.name,
                initialAmountIn.toString(), actualAmountIn.toString(), initialAmountIn.minus(actualAmountIn), rakedInPercentage.toFixed(2)));
        [initialAmountIn,] = parseSwapEvents(swapEvents, to, pairAddress);
        tokenSender = pairAddress;

    };
};


/** 
[
    "0x3788888" ---- weth, initialAmountIn -- tx.args, actualAmount --emittedTransferEvent(txFrom,pair(path0, 
        path1))


    "0x378TRD" ---- usdt, initialAmountIn --- amountOut of swapEvent(emiting addr == pair(path0, 
        path1), to of SwapEvent == pair(path1, path2) ),   actualAmountIn == amountIn of swapEvent(
            emiting addr == pair(path1, path2), to of SwapEvent == pair(path2, path3) )
    "0x378TRD" ---- screenTop, initialAmountIn == amountOut of swapEvent(emiting addr == pair(path1, 
        path2), to of SwapEvent == pair(path2, path3) ), actualAmountIn == amountOut of swapEvent(emiting 
            addr == pair(path2, path3), to = txDescription.args.to)
    "0x45353 --- zora" initialAmountIn == amountOut of swapEvent(emiting addr == pair(path2, 
        path3), to of SwapEvent == txDescription.args.to ), actualAmountIn == value of transferEvent(pair(path2, path3),
        txDescription.args.to)
]
*/
const executeExactETHForTokensSupportingFeeOnTransferTokens = (txDescription: TransactionDescription, transferEvents: LogDescription[],
    swapEvents: LogDescription[], txFrom: string, finding: Finding[]) => {
    let initialAmountIn: BigNumber = new BigNumber(0), actualAmountIn: BigNumber = new BigNumber(0),
        tokenAddress: string = "", swapRecipient: string, pairAddress, prevPairAddress: string;
    const path: string[] = txDescription.args.path;
    for (let i = 1; i < path.length; i++) {
        swapRecipient = i < path.length - 2 ? uniCreate2(path[i + 1], path[i + 2]) : txDescription.args.to;
        prevPairAddress = uniCreate2(path[i - 1], path[i]);
        if (i === path.length - 1) {
            [initialAmountIn,] = parseSwapEvents(swapEvents, swapRecipient, prevPairAddress);
            [, actualAmountIn] = parseTransferEvents(transferEvents, prevPairAddress, swapRecipient);
        } else {
            pairAddress = uniCreate2(lCase(path[i]), lCase(path[i + 1]));
            [initialAmountIn,] = parseSwapEvents(swapEvents, pairAddress, prevPairAddress);
            [, actualAmountIn] = parseSwapEvents(swapEvents, swapRecipient, pairAddress);
        };
        const rakedInPercentage = initialAmountIn.minus(actualAmountIn).div(initialAmountIn).multipliedBy(100);
        if (rakedInPercentage.gte(THRESHOLD_PERCENT)) finding.push(createFinding(tokenAddress, prevPairAddress,
            txFrom, txDescription.name, initialAmountIn.toString(), actualAmountIn.toString(),
            initialAmountIn.minus(actualAmountIn), rakedInPercentage.toFixed(2)))
    }


};






export const filterFunctionAndEvent = (txDescription: TransactionDescription, swapEvents: LogDescription[],
    transferEvents: LogDescription[], pairAddress: string, txFrom: string): Finding[] => {
    let findings: Finding[] = [];
    let functionName = txDescription.name
    let path = txDescription.args.path

    if (functionName === "swapExactTokensForETHSupportingFeeOnTransferTokens") {
        executeExactTokenForEthSupportingFeeOnTransferTokens(txDescription, transferEvents, swapEvents, txFrom, findings)
    } else if (functionName === "swapExactETHForTokensSupportingFeeOnTransferTokens") {
        executeExactETHForTokensSupportingFeeOnTransferTokens(txDescription, transferEvents, swapEvents, txFrom, findings)
    }
    

    return findings;



}