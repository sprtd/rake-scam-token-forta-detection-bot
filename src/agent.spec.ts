import { FindingType, FindingSeverity, Finding, HandleTransaction, TransactionEvent, ethers } from "forta-agent";
import { createAddress } from "forta-agent-tools/lib/utils"
import { TestTransactionEvent } from "forta-agent-tools/lib/test"
import { keccak256, } from "forta-agent/dist/sdk/utils";
// import { encodeParameter } from "forta-agent-tools/lib/utils";
import { getCreate2Address } from "@ethersproject/address";
import BigNumber from "bignumber.js";
BigNumber.set({ DECIMAL_PLACES: 18 });
import { provideHandleTransaction } from "./agent";
import { lCase, uniCreate2, toBn } from './utils'
import {
    UNISWAP_V2_FACTORY, SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
    SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
    SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
    UNISWAP_V2_SWAP_EVENT, TOKEN_TRANSFER_EVENT, UNISWAP_PAIR_INIT_CODE_HASH,
    SWAP_ETH_FOR_EXACT_TOKENS_NO_FEE_ON_TRANSFER_TOKENS,
    UNISWAP_V2_ROUTER
} from "./constants"
import NetworkData from "./network"


const MOCK_OTHER_FUNCTION: string = "function _swap(uint[] memory amounts, address[] memory path, address _to)";
const MOCK_FACTORY: string = createAddress("0xaaa0000")
const MOCK_ROUTER: string = UNISWAP_V2_ROUTER
const MOCK_SWAP_EXACT_TOKENS_FOR_TOKENS = "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)"
const MOCK_INIT_CODE_HASH: string = keccak256(MOCK_FACTORY);
const MOCK_IFACE_FUNCTIONS: ethers.utils.Interface = new ethers.utils.Interface([SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS, SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS, SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS, MOCK_OTHER_FUNCTION, MOCK_SWAP_EXACT_TOKENS_FOR_TOKENS, SWAP_ETH_FOR_EXACT_TOKENS_NO_FEE_ON_TRANSFER_TOKENS]);

const MOCK_IFACE_EVENTS: ethers.utils.Interface = new ethers.utils.Interface([UNISWAP_V2_SWAP_EVENT, TOKEN_TRANSFER_EVENT])


const createSwapEvent = (pairAddress: string, to: string, amount0In: string, amount1Out: string):
    [ethers.utils.EventFragment, string, any[]] =>
    [MOCK_IFACE_EVENTS.getEvent("Swap"), pairAddress, [MOCK_ROUTER, amount0In, 0, 0, amount1Out, to]];

const createTransferEvent = (emittingAddress: string, from: string, to: string, value: string):
    [ethers.utils.EventFragment, string, any[]] =>
    [MOCK_IFACE_EVENTS.getEvent("Transfer"), emittingAddress, [from, to, value]];

const takeFee = (amount: BigNumber, percentage: BigNumber) =>
    amount.minus(percentage.dividedBy(100).multipliedBy(amount))

const TEST_CASES = {
    WETH: createAddress("0xaa1111"),
    TOKEN_1: createAddress("0xbb2222"),
    TOKEN_2: createAddress("0xcc3333"),
    TOKEN_3: createAddress("0xdd4444"),
    TOKEN_4: createAddress("0xee5555"),
    SCAM_TOKEN_1: createAddress("0xff6666"),
    SCAM_TOKEN_2: createAddress("0xaabb77"),
    SWAP_RECIPIENT: createAddress("0xccdd88"),
}




export const mockCreateFinding = (tokenAddress: string, pairAddress: string, from: string, feeOnTransferFunctionCalled: string, totalAmountTransferred: string,
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


const mockNetworkManager: NetworkData = {
    chainId: 444,
    factory: UNISWAP_V2_FACTORY,
    router: MOCK_ROUTER,
    pairInitCodeHash: UNISWAP_PAIR_INIT_CODE_HASH,
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
                SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
                SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS
            ],
            mockNetworkManager,
            UNISWAP_V2_SWAP_EVENT,
            TOKEN_TRANSFER_EVENT
        );
    });

    it("should return empty finding in empty transaction", async () => {
        txEvent = new TestTransactionEvent();
        let findings = await handleTransaction(txEvent);
        expect(findings).toStrictEqual([]);
    });

    it("should ignore non fee on transfer function call on Uniswap's Router contract", async () => {
        const pair = uniCreate2(TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1)
        const [amount0In, amount1Out] = ["5000000", "3000"];

        txEvent = new TestTransactionEvent()
            .addTraces({
                to: MOCK_ROUTER,
                function: MOCK_IFACE_FUNCTIONS.getFunction("swapETHForExactTokens"),  // different function - _swap
                from: TEST_CASES.SWAP_RECIPIENT,
                arguments: [1854, [TEST_CASES.WETH, TEST_CASES.TOKEN_1], TEST_CASES.SWAP_RECIPIENT, 1777791157],
                value: "100"
            })
            .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, amount0In, amount1Out))
            .addEventLog(...createTransferEvent(TEST_CASES.WETH, MOCK_ROUTER, pair, amount0In))
            .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, amount1Out))
        const findings = await handleTransaction(txEvent);
        expect(findings).toStrictEqual([]);
    });

    it("should ignore swapFeeOnTransferToken function call on a non-Uniswap Router contract", async () => {
        txEvent = new TestTransactionEvent()
        const pair = uniCreate2(TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1)
        const [amount0In, amount1Out] = ["5000000", "3000"];

        txEvent = new TestTransactionEvent()
            .addTraces({
                to: createAddress("0xaa04"), // non-uniswap router contract
                function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
                from: TEST_CASES.SWAP_RECIPIENT,
                arguments: [0, [TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1], TEST_CASES.SWAP_RECIPIENT, ethers.BigNumber.from(1777791157)],
                value: `${amount0In}`
            }).setFrom(TEST_CASES.SWAP_RECIPIENT)
            .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, amount0In, amount1Out))
            .addEventLog(...createTransferEvent(TEST_CASES.WETH, MOCK_ROUTER, pair, amount0In))
            .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, `${takeFee(toBn(amount1Out), toBn(3))}`))

        const findings: Finding[] = await handleTransaction(txEvent);
        expect(findings).toStrictEqual([]);
    });


    it("should return finding when swapFeeOnTransferToken function is called on Uniswap's Router contract", async () => {

        const pair = uniCreate2(TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1)
        const [amount0In, amount1Out] = ["5000000", "3000"];
        // const swapFeeOnTransferToken = 
        const parseTakeFee = takeFee(toBn(amount1Out), toBn(3)).toString()
        console.log("parse__ fee__", parseTakeFee.toString())
        txEvent = new TestTransactionEvent()
            .addTraces({
                to: MOCK_ROUTER,
                function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
                from: TEST_CASES.SWAP_RECIPIENT,
                arguments: [0, [TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1], TEST_CASES.SWAP_RECIPIENT, ethers.BigNumber.from(1777791157)],
                value: `${amount0In}`
            }).setFrom(TEST_CASES.SWAP_RECIPIENT)
            .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, amount0In, amount1Out))
            .addEventLog(...createTransferEvent(TEST_CASES.WETH, MOCK_ROUTER, pair, amount0In))
            .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, parseTakeFee.toString()))

        const findings = await handleTransaction(txEvent);
        console.log("findings__", findings)

        expect(findings).toStrictEqual([
            mockCreateFinding(
                    TEST_CASES.SCAM_TOKEN_1,
                    pair,
                    TEST_CASES.SWAP_RECIPIENT,
                    "swapExactETHForTokensSupportingFeeOnTransferTokens",
                    amount1Out,
                    parseTakeFee,
                    toBn(amount1Out).minus(parseTakeFee),
                    "3.00"
                )
          ]);

    });


});