import { FindingType, FindingSeverity, Finding, HandleTransaction, ethers } from "forta-agent";
import { createAddress } from "forta-agent-tools/lib/utils";
import { TestTransactionEvent } from "forta-agent-tools/lib/test";
import { keccak256 } from "forta-agent/dist/sdk/utils";
import fetch, { Response } from "node-fetch";
jest.mock("node-fetch");

import BigNumber from "bignumber.js";
BigNumber.set({ DECIMAL_PLACES: 18 });
import { provideHandleTransaction } from "./agent";
import { uniCreate2, toBn } from "./utils";
import { FetchTokenDeployer } from "./fetch.token.deployer"
import {
  SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  UNISWAP_V2_SWAP_EVENT,
  TOKEN_TRANSFER_EVENT,
  SWAP_ETH_FOR_EXACT_TOKENS_NO_FEE_ON_TRANSFER_TOKENS,
} from "./constants";
import NetworkData from "./network";


const mockData = {
  status: '1',
  result: [{ contractCreator: createAddress("0xddd"), txHash: keccak256(createAddress("0x999e")) }]
};



const MOCK_OTHER_FUNCTION: string = "function _swap(uint[] memory amounts, address[] memory path, address _to)";
const MOCK_FACTORY: string = createAddress("0xaaa0000");
const MOCK_INIT_CODE_HASH: string = keccak256(MOCK_FACTORY);
const MOCK_ROUTER: string = createAddress("0xbebe111000");
const MOCK_SWAP_EXACT_TOKENS_FOR_TOKENS =
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)";
const MOCK_IFACE_FUNCTIONS: ethers.utils.Interface = new ethers.utils.Interface([
  SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  MOCK_OTHER_FUNCTION,
  MOCK_SWAP_EXACT_TOKENS_FOR_TOKENS,
  SWAP_ETH_FOR_EXACT_TOKENS_NO_FEE_ON_TRANSFER_TOKENS,
]);

const MOCK_IFACE_EVENTS: ethers.utils.Interface = new ethers.utils.Interface([
  UNISWAP_V2_SWAP_EVENT,
  TOKEN_TRANSFER_EVENT,
]);

let MOCK_RAKE_TOKEN_ADDRESSES: string[] = []
let MOCK_TOTAL_FINDINGS: number = 0



const createSwapEvent = (
  pairAddress: string,
  to: string,
  amount0In: string,
  amount1Out: string
): [ethers.utils.EventFragment, string, any[]] => {
  return [MOCK_IFACE_EVENTS.getEvent("Swap"), pairAddress, [mockNetworkManager.router, amount0In, 0, 0, amount1Out, to]];
};

const createTransferEvent = (
  emittingAddress: string,
  from: string,
  to: string,
  value: string
): [ethers.utils.EventFragment, string, any[]] => [
    MOCK_IFACE_EVENTS.getEvent("Transfer"),
    emittingAddress,
    [from, to, value],
  ];

const takeFee = (amount: BigNumber, percentage: BigNumber) =>
  amount.minus(percentage.dividedBy(100).multipliedBy(amount));

const TEST_CASES = {
  WETH: createAddress("0xaa1111"),
  TOKEN_1: createAddress("0xbb2222"),
  TOKEN_2: createAddress("0xcc3333"),
  TOKEN_3: createAddress("0xdd4444"),
  TOKEN_4: createAddress("0xee5555"),
  SCAM_TOKEN_1: createAddress("0xff6666"),
  SCAM_TOKEN_2: createAddress("0xaabb77"),
  SWAP_RECIPIENT: createAddress("0xccdd88"),
};


export const mockCreateFinding = (
  tokenAddress: string,
  pairAddress: string,
  from: string,
  feeOnTransferFunctionCalled: string,
  totalAmountTransferred: string,
  actualValueReceived: string,
  rakedFee: BigNumber,
  rakedFeePercentage: string,
  rakeTokenDeployer: string,
  rakeTokenDeployTxHash: string
): Finding => {
  MOCK_TOTAL_FINDINGS++;
  if (!MOCK_RAKE_TOKEN_ADDRESSES.includes(tokenAddress)) {
    MOCK_RAKE_TOKEN_ADDRESSES.push(tokenAddress)
  }
  let anomalyScore = MOCK_TOTAL_FINDINGS / MOCK_RAKE_TOKEN_ADDRESSES.length;

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
      anomalyScore: anomalyScore.toString(),
      rakeTokenDeployer,
      rakeTokenDeployTxHash
    },
  });
};

const mockNetworkManager: NetworkData = {
  chainId: 444,
  factory: MOCK_FACTORY,
  router: MOCK_ROUTER,
  pairInitCodeHash: MOCK_INIT_CODE_HASH,
  networkMap: {},
  setNetwork: jest.fn(),
};



const mockResponse = {
  status: '1',
  result: [{ contractCreator: createAddress("0xddd"), txHash: keccak256(createAddress("0x999e")) }]
};


describe("Rake Scam Token Test Suite", () => {
  let handleTransaction: HandleTransaction;
  let mockFetch: any
  const mockRakeTokenDeployer = createAddress("0xdede")
  const mockRakeTokenDeployTx = keccak256(createAddress("0x999e"))
  let mockFetchTokenDeployer: FetchTokenDeployer
  const mockData = {
    status: '1',
    result: [{ contractCreator: mockRakeTokenDeployer, txHash: mockRakeTokenDeployTx }]
  };

  const mockFetchResponse: Response = {
    json: jest.fn().mockResolvedValue(mockData),
  } as any as Response;


  beforeAll(() => {
    handleTransaction = provideHandleTransaction(
      [
        SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
        SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
        SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
      ],
      mockNetworkManager,
      UNISWAP_V2_SWAP_EVENT,
      TOKEN_TRANSFER_EVENT
    );
    mockFetch = jest.mocked(fetch, true);
  });

  it("should return empty finding in empty transaction", async () => {
    const txEvent = new TestTransactionEvent();
    let findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("should ignore non fee on transfer function call on Uniswap's Router contract", async () => {
    const pair = uniCreate2(TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1);
    const [amount0In, amount1Out] = ["5000000", "3000"];

    const txEvent = new TestTransactionEvent()
      .addTraces({
        to: mockNetworkManager.router,
        function: MOCK_IFACE_FUNCTIONS.getFunction("swapETHForExactTokens"), // different function - _swap
        from: TEST_CASES.SWAP_RECIPIENT,
        arguments: [1854, [TEST_CASES.WETH, TEST_CASES.TOKEN_1], TEST_CASES.SWAP_RECIPIENT, 1679791157],
        value: "100",
      })
      .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, amount0In, amount1Out))
      .addEventLog(...createTransferEvent(TEST_CASES.WETH, mockNetworkManager.router, pair, amount0In))
      .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, amount1Out));
    const findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("should ignore swapFeeOnTransferToken function call on a non-Uniswap Router contract", async () => {
    const pair = uniCreate2(TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1);
    const [amount0In, amount1Out] = ["5000000", "3000"];

    const txEvent = new TestTransactionEvent()
      .addTraces({
        to: createAddress("0xaa04"), // non-uniswap router contract
        function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
        from: TEST_CASES.SWAP_RECIPIENT,
        arguments: [
          0,
          [TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1],
          TEST_CASES.SWAP_RECIPIENT,
          ethers.BigNumber.from(1679791157),
        ],
        value: `${amount0In}`,
      })
      .setFrom(TEST_CASES.SWAP_RECIPIENT)
      .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, amount0In, amount1Out))
      .addEventLog(...createTransferEvent(TEST_CASES.WETH, mockNetworkManager.router, pair, amount0In))
      .addEventLog(
        ...createTransferEvent(
          TEST_CASES.SCAM_TOKEN_1,
          pair,
          TEST_CASES.SWAP_RECIPIENT,
          `${takeFee(toBn(amount1Out), toBn(3))}`
        )
      );

    const findings: Finding[] = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  describe("SwapExactETHForTokensSupportingFeeOnTransferTokens", () => {
    it.only("should correct return finding when swapExactETHForTokensSupportingFeeOnTransferTokens function is called on Uniswap's Router contract", async () => {
      const pair = uniCreate2(TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1);
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const rakedFeePercentage = 3;
      const actualAmount = takeFee(toBn(amount1Out), toBn(rakedFeePercentage));
      mockFetch.mockResolvedValue(Promise.resolve(mockFetchResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_1);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1)


      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            0,
            [TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, amount0In, amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.WETH, mockNetworkManager.router, pair, amount0In))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, `${actualAmount}`)
        );

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_1,
          pair,
          TEST_CASES.SWAP_RECIPIENT,
          "swapExactETHForTokensSupportingFeeOnTransferTokens",
          amount1Out,
          actualAmount.toString(),
          toBn(amount1Out).minus(actualAmount),
          rakedFeePercentage.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.txHash
        ),
      ]);
    });

    it.only("should return findings when swapExactETHForTokensSupportingFeeOnTransferTokens function with more than 2 paths is called on Uniswap's Router contract", async () => {
      const pair1 = uniCreate2(TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1);
      const pair2 = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_2);
      const pair3 = uniCreate2(TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_2);
      const [scam1RakedPercent, scam2RakedPercent] = [5, 10];
      const [
        pair1Amount0In,
        pair1Amount1Out,
        pair2Amount0In,
        pair2Amount1Out,
        pair3Amount0In,
        pair3Amount1Out,
        actualPair3AmountSent,
      ] = [
          "5000000",
          "143570000",
          takeFee(toBn(143570000), toBn(scam1RakedPercent)),
          "9070000",
          "9070000",
          "23980000",
          takeFee(toBn(23980000), toBn(scam2RakedPercent)).toString(),
        ];


      const mockData = {
        status: '1',
        result: [{ contractCreator: mockRakeTokenDeployer, txHash: mockRakeTokenDeployTx }]
      };

      const mockFetchResponse: Response = {
        json: jest.fn().mockResolvedValue(mockData),
      } as any as Response;


      mockFetch.mockResolvedValue(Promise.resolve(mockFetchResponse));
      // mockFetch.mockResolvedValue(Promise.resolve(mockFetchResponse));
      const mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_1);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1)

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            0,
            [TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_2],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: pair1Amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(...createSwapEvent(pair1, pair2, pair1Amount0In, pair1Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair1, pair2, pair2Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair2, pair3, pair2Amount0In.toString(), pair2Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_2, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, TEST_CASES.SWAP_RECIPIENT, pair3Amount0In.toString(), pair3Amount1Out))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_2, pair3, TEST_CASES.SWAP_RECIPIENT, actualPair3AmountSent)
        );


      const findings = await handleTransaction(txEvent);
      console.log("findings___", findings)
      const functionName = "swapExactETHForTokensSupportingFeeOnTransferTokens";

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_1,
          pair1,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair1Amount1Out,
          pair2Amount0In.toString(),
          toBn(pair1Amount1Out).minus(pair2Amount0In),
          scam1RakedPercent.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.txHash
        ),
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_2,
          pair3,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair3Amount1Out,
          actualPair3AmountSent,
          toBn(pair3Amount1Out).minus(actualPair3AmountSent),
          scam2RakedPercent.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.txHash
        ),
      ]);
    });

    it("should return empty finding when fee taken on transfer isn't significant", async () => {
      const pair = uniCreate2(TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1);
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const actualAmount = takeFee(toBn(amount1Out), toBn(2.5));

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            0,
            [TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_1],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, amount0In, amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.WETH, mockNetworkManager.router, pair, amount0In))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, `${actualAmount}`)
        );

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([]);
    });

    it("should return findings when  swapExactETHForTokensSupportingFeeOnTransferTokens function containing multiple paths is called on Uniswap's Router contract", async () => {
      const pair1 = uniCreate2(TEST_CASES.WETH, TEST_CASES.TOKEN_1);
      const pair2 = uniCreate2(TEST_CASES.TOKEN_1, TEST_CASES.TOKEN_2);
      const pair3 = uniCreate2(TEST_CASES.TOKEN_2, TEST_CASES.TOKEN_3);
      const pair4 = uniCreate2(TEST_CASES.TOKEN_3, TEST_CASES.SCAM_TOKEN_1);
      const pair5 = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_4);

      const rakePercent = 5;
      const [
        pair1Amount0In,
        pair1Amount1Out,
        pair2Amount0In,
        pair2Amount1Out,
        pair3Amount0In,
        pair3Amount1Out,
        pair4Amount0In,
        pair4Amount1Out,
        pair5Amount0In,
        pair5Amount1Out,
      ] = [
          "5000000",
          "143570000",
          "143570000",
          "570000",
          "570000",
          "77770",
          "77770",
          "1000000",
          takeFee(toBn(1000000), toBn(rakePercent)),
          "950000",
        ];

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            0,
            [
              TEST_CASES.WETH,
              TEST_CASES.TOKEN_1,
              TEST_CASES.TOKEN_2,
              TEST_CASES.TOKEN_3,
              TEST_CASES.SCAM_TOKEN_1,
              TEST_CASES.TOKEN_4,
            ],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: pair1Amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(...createSwapEvent(pair1, pair2, pair1Amount0In, pair1Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_1, pair1, pair2, pair2Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair2, pair3, pair2Amount0In.toString(), pair2Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_2, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, pair4, pair3Amount0In.toString(), pair3Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_3, pair3, pair4, pair4Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair4, pair5, pair4Amount0In.toString(), pair4Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair4, pair5, pair5Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount0In.toString(), pair5Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_4, pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount1Out));

      const functionName = "swapExactETHForTokensSupportingFeeOnTransferTokens";
      mockFetch.mockResolvedValueOnce(Promise.resolve(mockResponse));
      const findings = await handleTransaction(txEvent);
      const deployerMetadata = await mockFetchTokenDeployer.fetchDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);
      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_1,
          pair4,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair4Amount1Out,
          pair5Amount0In.toString(),
          toBn(pair4Amount1Out).minus(pair5Amount0In),
          rakePercent.toFixed(2),
          deployerMetadata?.deployer,
          deployerMetadata?.txHash
        ),
      ]);
    });

  });

  describe("SwapExactTokensForETHSupportingFeeOnTransferTokens", () => {
    it("should return finding when swapExactTokensForETHSupportingFeeOnTransferTokens function is called on Uniswap's Router contract", async () => {
      const functionName = "swapExactTokensForETHSupportingFeeOnTransferTokens";
      const pair = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.WETH);
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const rakedInPercentage = 10;
      const actualAmount = takeFee(toBn(amount0In), toBn(rakedInPercentage));

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            amount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_1, TEST_CASES.WETH],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)

        .addEventLog(...createSwapEvent(pair, mockNetworkManager.router, amount0In, amount1Out))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.SWAP_RECIPIENT, pair, `${actualAmount}`)
        );
      global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(mockResponse) });

      // const { contractCreator, txHash } = await getDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);
      const deployerMetadata = await mockFetchTokenDeployer.fetchDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_1,
          pair,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          amount0In,
          actualAmount.toString(),
          toBn(amount0In).minus(actualAmount),
          rakedInPercentage.toFixed(2),
          deployerMetadata?.deployer,
          deployerMetadata?.txHash
        ),
      ]);
    });

    it("should ignore insignificant rakedFeePercentage for swapExactTokensForETHSupportingFeeOnTransferTokens function calls on Uniswap's Router contract", async () => {
      const functionName = "swapExactTokensForETHSupportingFeeOnTransferTokens";
      const pair = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.WETH);
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const rakedInPercentage = 2; // low rakedFeePercentage
      const actualAmount = takeFee(toBn(amount0In), toBn(rakedInPercentage));

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            amount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_1, TEST_CASES.WETH],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)

        .addEventLog(...createSwapEvent(pair, mockNetworkManager.router, amount0In, amount1Out))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.SWAP_RECIPIENT, pair, `${actualAmount}`)
        );

      const findings = await handleTransaction(txEvent);
      expect(findings).toStrictEqual([]);
    });

    it("should return findings when swapExactTokensForETHSupportingFeeOnTransferTokens function with more than 2 path addresses is called on Uniswap's Router contract", async () => {
      const pair1 = uniCreate2(TEST_CASES.TOKEN_1, TEST_CASES.TOKEN_2);
      const pair2 = uniCreate2(TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_1);
      const pair3 = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.WETH);
      const rakedFeePercentage = 5;
      const [pair1Amount0In, pair1Amount1Out, pair2Amount0In, pair2Amount1Out, pair3Amount0In, pair3Amount1Out] = [
        "8000000",
        "143570000",
        "143570000",
        "9070000",
        takeFee(toBn(9070000), toBn(rakedFeePercentage)),
        "23980000",
      ];
      const functionName = "swapExactTokensForETHSupportingFeeOnTransferTokens";

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            pair1Amount0In,
            0,
            [TEST_CASES.TOKEN_1, TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_1, TEST_CASES.WETH],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(
          ...createTransferEvent(TEST_CASES.TOKEN_1, TEST_CASES.SWAP_RECIPIENT, pair1, pair1Amount0In.toString())
        )
        .addEventLog(...createSwapEvent(pair1, pair2, pair1Amount0In, pair1Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_2, pair1, pair2, pair2Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair2, pair3, pair2Amount0In.toString(), pair2Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, mockNetworkManager.router, pair3Amount0In.toString(), pair3Amount1Out));
      global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(mockResponse) });
      const deployerMetadata = await mockFetchTokenDeployer.fetchDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);


      // const { contractCreator, txHash } = await getDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);
      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_1,
          pair3,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair2Amount1Out,
          pair3Amount0In.toString(),
          toBn(pair2Amount1Out).minus(pair3Amount0In),
          rakedFeePercentage.toFixed(2),
          deployerMetadata?.deployer,
          deployerMetadata?.txHash
        ),
      ]);
    });

    it("should return multiple findings when  swapExactETHForTokensSupportingFeeOnTransferTokens function with multiple path addresses is called on Uniswap's Router contract", async () => {
      const pair1 = uniCreate2(TEST_CASES.WETH, TEST_CASES.TOKEN_1);
      const pair2 = uniCreate2(TEST_CASES.TOKEN_1, TEST_CASES.TOKEN_2);
      const pair3 = uniCreate2(TEST_CASES.TOKEN_2, TEST_CASES.TOKEN_3);
      const pair4 = uniCreate2(TEST_CASES.TOKEN_3, TEST_CASES.SCAM_TOKEN_1);
      const pair5 = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_4);

      const rakePercent = 5;
      const [
        pair1Amount0In,
        pair1Amount1Out,
        pair2Amount0In,
        pair2Amount1Out,
        pair3Amount0In,
        pair3Amount1Out,
        pair4Amount0In,
        pair4Amount1Out,
        pair5Amount0In,
        pair5Amount1Out,
      ] = [
          "5000000",
          "143570000",
          "143570000",
          "570000",
          "570000",
          "77770",
          "77770",
          "1000000",
          takeFee(toBn(1000000), toBn(rakePercent)),
          "950000",
        ];

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            0,
            [
              TEST_CASES.WETH,
              TEST_CASES.TOKEN_1,
              TEST_CASES.TOKEN_2,
              TEST_CASES.TOKEN_3,
              TEST_CASES.SCAM_TOKEN_1,
              TEST_CASES.TOKEN_4,
            ],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: pair1Amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(...createSwapEvent(pair1, pair2, pair1Amount0In, pair1Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_1, pair1, pair2, pair2Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair2, pair3, pair2Amount0In.toString(), pair2Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_2, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, pair4, pair3Amount0In.toString(), pair3Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_3, pair3, pair4, pair4Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair4, pair5, pair4Amount0In.toString(), pair4Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair4, pair5, pair5Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount0In.toString(), pair5Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_4, pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount1Out));

      const functionName = "swapExactETHForTokensSupportingFeeOnTransferTokens";

      global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(mockResponse) });
      const deployerMetadata = await mockFetchTokenDeployer.fetchDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);


      // const { contractCreator, txHash } = await getDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);
      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_1,
          pair4,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair4Amount1Out,
          pair5Amount0In.toString(),
          toBn(pair4Amount1Out).minus(pair5Amount0In),
          rakePercent.toFixed(2),
          deployerMetadata?.deployer,
          deployerMetadata?.txHash
        ),
      ]);
    });
  });

  describe("SwapExactTokensForTokensSupportingFeeOnTransferTokens", () => {
    it("should return finding when swapExactTokensForTokensSupportingFeeOnTransferTokens function is called on Uniswap's Router contract with two addresses in path", async () => {
      const functionName = "swapExactTokensForTokensSupportingFeeOnTransferTokens";
      const pair = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_1);
      const rakedInPercentage = 10;
      const [initialAmount0In, actualAmount0In, initialAmount1Out, actualAmount1Out] = [
        "9000000",
        takeFee(toBn("9000000"), toBn(rakedInPercentage)),
        "72000",
        "72000",
      ];

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            initialAmount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_1],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1777791157),
          ],
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.SWAP_RECIPIENT, pair, actualAmount0In.toString())
        )
        .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, actualAmount0In.toString(), initialAmount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, actualAmount1Out));

      const findings = await handleTransaction(txEvent);
      global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(mockResponse) });
      const deployerMetadata = await mockFetchTokenDeployer.fetchDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);


      // const { contractCreator, txHash } = await getDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_1,
          pair,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          initialAmount0In,
          actualAmount0In.toString(),
          toBn(initialAmount0In).minus(actualAmount0In),
          rakedInPercentage.toFixed(2),
          deployerMetadata?.deployer,
          deployerMetadata?.txHash
        ),
      ]);
    });

    it("should ignore insignificant rakedFeePercentage for swapExactTokensForTokensSupportingFeeOnTransferTokens function calls on Uniswap's Router contract", async () => {
      const functionName = "swapExactTokensForTokensSupportingFeeOnTransferTokens";
      const pair = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_1);
      const rakedInPercentage = 2.9; // insignificant rakedFeePercentage
      const [initialAmount0In, actualAmount0In, initialAmount1Out, actualAmount1Out] = [
        "9000000",
        takeFee(toBn("9000000"), toBn(rakedInPercentage)),
        "72000",
        "72000",
      ];

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            initialAmount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_1],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1777791157),
          ],
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.SWAP_RECIPIENT, pair, actualAmount0In.toString())
        )
        .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, actualAmount0In.toString(), initialAmount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, actualAmount1Out));

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([]);
    });

    it("should return findings when swapExactTokensForTokensSupportingFeeOnTransferTokens function with more than 2 path addresses is called on Uniswap's Router contract", async () => {
      const pair1 = uniCreate2(TEST_CASES.TOKEN_1, TEST_CASES.TOKEN_2);
      const pair2 = uniCreate2(TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_1);
      const pair3 = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_3);
      const rakedFeePercentage = 5;
      const [
        pair1Amount0In,
        pair1Amount1Out,
        pair2Amount0In,
        pair2Amount1Out,
        pair3Amount0In,
        pair3Amount1Out,
        actualPair3Amount1Out,
      ] = [
          "8000000",
          "143570000",
          "143570000",
          "9070000",
          takeFee(toBn(9070000), toBn(rakedFeePercentage)),
          "23980000",
          "23980000",
        ];
      const functionName = "swapExactTokensForTokensSupportingFeeOnTransferTokens";

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            pair1Amount0In,
            0,
            [TEST_CASES.TOKEN_1, TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_3],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1777791157),
          ],
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(
          ...createTransferEvent(TEST_CASES.TOKEN_1, TEST_CASES.SWAP_RECIPIENT, pair1, pair1Amount0In.toString())
        )
        .addEventLog(...createSwapEvent(pair1, pair2, pair1Amount0In, pair1Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_2, pair1, pair2, pair2Amount0In))
        .addEventLog(...createSwapEvent(pair2, pair3, pair2Amount0In, pair2Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, TEST_CASES.SWAP_RECIPIENT, pair3Amount0In.toString(), pair3Amount1Out))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.TOKEN_3, pair3, TEST_CASES.SWAP_RECIPIENT, actualPair3Amount1Out)
        );
      global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(mockResponse) });
      const deployerMetadata = await mockFetchTokenDeployer.fetchDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);


      // const { contractCreator, txHash } = await getDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_1,
          pair3,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair2Amount1Out,
          pair3Amount0In.toString(),
          toBn(pair2Amount1Out).minus(pair3Amount0In),
          rakedFeePercentage.toFixed(2),
          deployerMetadata?.deployer,
          deployerMetadata?.txHash
        ),
      ]);
    });

    it("should return multiple findings when swapExactTokensForTokensSupportingFeeOnTransferTokens function is called on Uniswap's Router contract with multiple scam token addresses in path", async () => {
      const pair1 = uniCreate2(TEST_CASES.TOKEN_1, TEST_CASES.TOKEN_2);
      const pair2 = uniCreate2(TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_1);
      const pair3 = uniCreate2(TEST_CASES.SCAM_TOKEN_1, TEST_CASES.TOKEN_3);
      const pair4 = uniCreate2(TEST_CASES.TOKEN_3, TEST_CASES.TOKEN_4);
      const pair5 = uniCreate2(TEST_CASES.TOKEN_4, TEST_CASES.SCAM_TOKEN_2);
      const [rakedFeePercentage1, rakedFeePercentage2] = [5, 9];

      const [
        pair1Amount0In,
        pair1Amount1Out,
        pair2Amount0In,
        pair2Amount1Out,
        pair3Amount0In,
        pair3Amount1Out,
        pair4Amount0In,
        pair4Amount1Out,
        pair5Amount0In,
        pair5Amount1Out,
        actualPair5Amount1Out,
      ] = [
          "8000000",
          "143570000",
          "143570000",
          "9070000",
          takeFee(toBn(9070000), toBn(rakedFeePercentage1)),
          "4874000000",
          "4874000000",
          "66900000",
          "66900000",
          "43000",
          takeFee(toBn(43000), toBn(rakedFeePercentage2)),
        ];
      const functionName = "swapExactTokensForTokensSupportingFeeOnTransferTokens";

      const txEvent = new TestTransactionEvent()
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            pair1Amount0In,
            0,
            [
              TEST_CASES.TOKEN_1,
              TEST_CASES.TOKEN_2,
              TEST_CASES.SCAM_TOKEN_1,
              TEST_CASES.TOKEN_3,
              TEST_CASES.TOKEN_4,
              TEST_CASES.SCAM_TOKEN_2,
            ],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1777791157),
          ],
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(
          ...createTransferEvent(TEST_CASES.TOKEN_1, TEST_CASES.SWAP_RECIPIENT, pair1, pair1Amount0In.toString())
        )
        .addEventLog(...createSwapEvent(pair1, pair2, pair1Amount0In, pair1Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_2, pair1, pair2, pair2Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair2, pair3, pair2Amount0In.toString(), pair2Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_1, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, pair4, pair3Amount0In.toString(), pair3Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_3, pair3, pair4, pair4Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair4, pair5, pair4Amount0In.toString(), pair4Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_4, pair4, pair5, pair5Amount0In))
        .addEventLog(...createSwapEvent(pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount0In, pair5Amount1Out))
        .addEventLog(
          ...createTransferEvent(
            TEST_CASES.SCAM_TOKEN_2,
            pair5,
            TEST_CASES.SWAP_RECIPIENT,
            actualPair5Amount1Out.toString()
          )
        );
      const findings = await handleTransaction(txEvent);


      global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(mockResponse) });
      const deployerMetadata = await mockFetchTokenDeployer.fetchDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);


      // const { contractCreator, txHash } = await getDeployerAndTxHash(TEST_CASES.SCAM_TOKEN_1);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_1,
          pair3,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair2Amount1Out,
          pair3Amount0In.toString(),
          toBn(pair2Amount1Out).minus(pair3Amount0In),
          rakedFeePercentage1.toFixed(2),
          deployerMetadata?.deployer,
          deployerMetadata?.txHash
        ),
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_2,
          pair5,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair5Amount1Out,
          actualPair5Amount1Out.toString(),
          toBn(pair5Amount1Out).minus(actualPair5Amount1Out),
          rakedFeePercentage2.toFixed(2),
          deployerMetadata?.deployer,
          deployerMetadata?.txHash
        ),
      ]);
    });
  });
});
