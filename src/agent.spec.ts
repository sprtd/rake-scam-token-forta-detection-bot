import { FindingType, FindingSeverity, Finding, HandleTransaction, TransactionEvent, ethers } from "forta-agent";
import {  createAddress } from "forta-agent-tools/lib/utils"
import { TestTransactionEvent } from "forta-agent-tools/lib/test"
// import { createAddress, MockEthersProvider } from "forta-agent-tools/lib/utils";
import { keccak256 } from "forta-agent/dist/sdk/utils";
import { utils } from "ethers";
import { getCreate2Address } from "@ethersproject/address";
import BigNumber from "bignumber.js";
BigNumber.set({ DECIMAL_PLACES: 18 });
import { provideHandleTransaction } from "./agent";
import { lCase, uniCreate2 } from './utils'
import { UNISWAP_V2_FACTORY, SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS, SWAP_EXACT_ETH_FOR_SUPPORTING_FEE_ON_TRANSFER_TOKENS, SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS, UNISWAP_V2_SWAP_EVENT, TOKEN_TRANSFER_EVENT } from "./constants"
import NetworkData from "./network"


const MOCK_OTHER_FUNCTION: string = "function _swap(uint[] memory amounts, address[] memory path, address _to)";
const MOCK_FACTORY: string = createAddress("0xaaa0000")
const MOCK_ROUTER: string = createAddress("0xbbbb9999")
const MOCK_SWAP_EXACT_TOKENS_FOR_TOKENS = "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)"
const MOCK_INIT_CODE_HASH: string = keccak256(MOCK_FACTORY);
const MOCK_IFACE: ethers.utils.Interface = new ethers.utils.Interface([MOCK_SWAP_EXACT_TOKENS_FOR_TOKENS, MOCK_OTHER_FUNCTION]);

const TEST_CASES: string[] = [
    createAddress("0xaa1111"),
    createAddress("0xbb2222"),
    createAddress("0xcc3333"),
    createAddress("0xdd4444"),
    createAddress("0xee5555"),
    createAddress("0xff6666"),
    createAddress("0xaabb77"),
    createAddress("0xccdd88"),
];


const mockCreateFinding = (tokenAddress: string, pairAddress: string, from: string, swapFeeFunctionCalled: string, totalAmountTransferred: string,
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

// generate new pair address
// const uniCreate2 = (t0: string, t1: string, factory: string = UNISWAP_V2_FACTORY): string => {
//     const tokenA = lCase(t0);
//     const tokenB = lCase(t1);
//     const token0: string = tokenA < tokenB ? tokenA : tokenB;
//     const token1: string = tokenA < tokenB ? tokenB : tokenA;
//     let salt = utils.solidityKeccak256(["address", "address"], [token0, token1]);
//     console.log(getCreate2Address(factory, salt, UNISWAP_PAIR_INIT_CODE_HASH))
//     return lCase(getCreate2Address(factory, salt, UNISWAP_PAIR_INIT_CODE_HASH));

// }

const mockNetworkManager: NetworkData = {
    chainId: 444,
    factory: MOCK_FACTORY,
    router: MOCK_ROUTER,
    pairInitCodeHash: MOCK_INIT_CODE_HASH,
    networkMap: {},
    setNetwork: jest.fn(),
};

describe("Rake Scam Token Test Suite", () => {
    let txEvent: TransactionEvent;
    let handleTransaction: HandleTransaction;

    beforeAll(() => {
        handleTransaction = provideHandleTransaction(
            [
                SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
                SWAP_EXACT_ETH_FOR_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
                SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS
            ],
            mockNetworkManager,
            UNISWAP_V2_SWAP_EVENT,
            TOKEN_TRANSFER_EVENT
        );
    });

    it("should return empty finding in empty transaction", async () => {
        txEvent = new TestTransactionEvent();
        let findings: Finding[] = await handleTransaction(txEvent);
        expect(findings).toStrictEqual([]);
    });

    //     txEvent = new TestTransactionEvent().addTraces({
    //         to: MOCK_FACTORY,
    //         input: MOCK_IFACE.encodeFunctionData("setFeeToSetter", [TEST_CASES[0]]), // different function - setFeeToSetter
    //     });

    //     findings = await handleTransaction(txEvent);
    //     expect(findings).toStrictEqual([]);
    // });

    // it("should ignore createPair function call on a non-Pancakeswap Factory contract", async () => {
    //     txEvent = new TestTransactionEvent().addTraces({
    //         to: createAddress("0x567"), // different contract
    //         input: MOCK_IFACE.encodeFunctionData("createPair", [TEST_CASES[0], TEST_CASES[1]]),
    //     });
    //     findings = await handleTransaction(txEvent);
    //     expect(findings).toStrictEqual([]);
    // });

    // it("should return finding when createPair function is called on Pancakeswap's Factory contract", async () => {
    //     txEvent = new TestTransactionEvent().addTraces({
    //         to: MOCK_FACTORY,
    //         input: MOCK_IFACE.encodeFunctionData("createPair", [TEST_CASES[0], TEST_CASES[1]]),
    //     });
    //     findings = await handleTransaction(txEvent);
    //     expect(findings).toStrictEqual([
    //         mockCreateFinding(TEST_CASES[0], TEST_CASES[1], mockCreatePair(MOCK_FACTORY, TEST_CASES[0], TEST_CASES[1])),
    //     ]);
    // });

    // it("should return multiple findings when createPair function is called more than once on Pancakeswap's Factory contract", async () => {
    //     txEvent = new TestTransactionEvent().addTraces(
    //         {
    //             to: MOCK_FACTORY,
    //             input: MOCK_IFACE.encodeFunctionData("createPair", [TEST_CASES[0], TEST_CASES[1]]),
    //         },
    //         {
    //             to: MOCK_FACTORY,
    //             input: MOCK_IFACE.encodeFunctionData("createPair", [TEST_CASES[2], TEST_CASES[3]]),
    //         },
    //         {
    //             to: MOCK_FACTORY,
    //             input: MOCK_IFACE.encodeFunctionData("createPair", [TEST_CASES[4], TEST_CASES[5]]),
    //         },
    //         {
    //             to: MOCK_FACTORY,
    //             input: MOCK_IFACE.encodeFunctionData("createPair", [TEST_CASES[6], TEST_CASES[7]]),
    //         }
    //     );

    //     findings = await handleTransaction(txEvent);
    //     expect(findings).toStrictEqual([
    //         mockCreateFinding(TEST_CASES[0], TEST_CASES[1], mockCreatePair(MOCK_FACTORY, TEST_CASES[0], TEST_CASES[1])),
    //         mockCreateFinding(TEST_CASES[2], TEST_CASES[3], mockCreatePair(MOCK_FACTORY, TEST_CASES[2], TEST_CASES[3])),
    //         mockCreateFinding(TEST_CASES[4], TEST_CASES[5], mockCreatePair(MOCK_FACTORY, TEST_CASES[4], TEST_CASES[5])),
    //         mockCreateFinding(TEST_CASES[6], TEST_CASES[7], mockCreatePair(MOCK_FACTORY, TEST_CASES[6], TEST_CASES[7])),
    //     ]);
    // });
});