import { FindingType, FindingSeverity, Finding, HandleTransaction, ethers, EntityType, Label } from "forta-agent";
import { createAddress } from "forta-agent-tools/lib/utils";
import { TestTransactionEvent } from "forta-agent-tools/lib/test";
import { keccak256 } from "forta-agent/dist/sdk/utils";
import fetch, { Response } from "node-fetch";
import BigNumber from "bignumber.js";
BigNumber.set({ DECIMAL_PLACES: 18 });
import { provideHandleTransaction, TOTAL_TOKEN_ADDRESSES as MOCK_TOTAL_TOKEN_ADDRESSES } from "./agent";
import { uniCreate2, toBn } from "./utils";
import { FetchTokenDeployer } from "./fetch.token.deployer";
import {
  SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  UNISWAP_V2_SWAP_EVENT,
  TOKEN_TRANSFER_EVENT,
  SWAP_ETH_FOR_EXACT_TOKENS_NO_FEE_ON_TRANSFER_TOKENS,
} from "./constants";
import NetworkData from "./network";

jest.mock("node-fetch");

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

let MOCK_TOTAL_FINDINGS = 0;

const createSwapEvent = (
  pairAddress: string,
  to: string,
  amount0In: string,
  amount1Out: string
): [ethers.utils.EventFragment, string, any[]] => {
  return [
    MOCK_IFACE_EVENTS.getEvent("Swap"),
    pairAddress,
    [mockNetworkManager.router, amount0In, 0, 0, amount1Out, to],
  ];
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
  SCAM_TOKEN_3: createAddress("0xaacc88"),
  SCAM_TOKEN_4: createAddress("0xaadd99"),
  SCAM_TOKEN_5: createAddress("0xeeff00"),
  SCAM_TOKEN_6: createAddress("0xeeaa99"),
  SCAM_TOKEN_7: createAddress("0xbbcc33"),
  SCAM_TOKEN_8: createAddress("0xff11bb"),
  SCAM_TOKEN_9: createAddress("0xab11cd"),
  SCAM_TOKEN_10: createAddress("0xcd22ef"),
  SCAM_TOKEN_11: createAddress("0xef33ab"),
  SCAM_TOKEN_12: createAddress("0xac44df"),
  SCAM_TOKEN_13: createAddress("0xbd55ea"),
  SCAM_TOKEN_14: createAddress("0xda66fb"),
  SCAM_TOKEN_15: createAddress("0xfe77dc"),
  SCAM_TOKEN_16: createAddress("0xaf88be"),
  SWAP_RECIPIENT: createAddress("0xccdd88"),
};
const mockRakeTokenDeployer = createAddress("0xdede");
const mockRakeTokenDeployTx = keccak256(createAddress("0x999e"));
let mockFetchTokenDeployer: FetchTokenDeployer;

const mockData = {
  status: "1",
  result: [
    {
      contractCreator: mockRakeTokenDeployer,
      txHash: mockRakeTokenDeployTx,
    },
  ],
};

const mockResponse: Response = {
  json: jest.fn().mockResolvedValue(mockData),
} as any as Response;

const mockNetworkManager: NetworkData = {
  chainId: 444,
  factory: MOCK_FACTORY,
  router: MOCK_ROUTER,
  pairInitCodeHash: MOCK_INIT_CODE_HASH,
  networkMap: {},
  setNetwork: jest.fn(),
};

let mockCreateFinding = (
  rakeTokenAddress: string,
  pairAddress: string,
  from: string,
  feeOnTransferFunctionCalled: string,
  totalAmountTransferred: string,
  actualValueReceived: string,
  rakedFee: BigNumber,
  rakedFeePercentage: string,
  rakeTokenDeployer: string,
  rakeTokenDeployTxHash: string,
  metadataParam?: any
): Finding => {
  MOCK_TOTAL_FINDINGS++;
  let anomalyScore = MOCK_TOTAL_FINDINGS / MOCK_TOTAL_TOKEN_ADDRESSES;

  let mockMetadata: any = {
    rakeTokenAddress,
    pairAddress,
    from,
    totalAmountTransferred,
    actualValueReceived,
    rakedFee: rakedFee.toString(),
    rakedFeePercentage,
    anomalyScore: anomalyScore.toString(),
    attackerRakeTokenDeployer: rakeTokenDeployer,
    rakeTokenDeployTxHash,
  };

  let rakeRecipient = [];
  if (metadataParam && metadataParam?.length) {
    rakeRecipient = metadataParam?.map((feeRecipient: any) => ({
      ethTransferredToRakeFeeRecipient: ethers.utils.formatEther(feeRecipient.value),
      rakeFeeRecipient: feeRecipient.to,
    }));
    mockMetadata = { ...mockMetadata, rakeRecipient };
  }

  return Finding.fromObject({
    name: "Rake Scam Token Detection Bot",
    description: `${feeOnTransferFunctionCalled} function detected on Uniswap Router to take additional swap fee`,
    alertId: "RAKE-TOKEN-CONTRACT-1",
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    protocol: "GitcoinForta",
    metadata: mockMetadata,
    labels: mockRakeTokenDeployer
      ? [
          Label.fromObject({
            entity: mockRakeTokenDeployer,
            entityType: EntityType.Address,
            label: "Attacker",
            confidence: 0.6,
            remove: false,
          }),
        ]
      : undefined,
  });
};

describe("Rake Scam Token Test Suite", () => {
  let handleTransaction: HandleTransaction;
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = jest.mocked(fetch, true);
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
  });

  it("should return empty finding in empty transaction", async () => {
    const txEvent = new TestTransactionEvent();
    let findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("should ignore non fee on transfer function call on Uniswap's Router contract", async () => {
    const pair = uniCreate2(
      TEST_CASES.WETH,
      TEST_CASES.SCAM_TOKEN_1,
      mockNetworkManager.factory,
      mockNetworkManager.pairInitCodeHash
    );
    const [amount0In, amount1Out] = ["5000000", "3000"];

    const txEvent = new TestTransactionEvent()
      .setTo(mockNetworkManager.router)
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
    const pair = uniCreate2(
      TEST_CASES.WETH,
      TEST_CASES.SCAM_TOKEN_1,
      mockNetworkManager.factory,
      mockNetworkManager.pairInitCodeHash
    );
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
    it("should return correct finding when swapExactETHForTokensSupportingFeeOnTransferTokens function is called on Uniswap's Router contract", async () => {
      const pair = uniCreate2(
        TEST_CASES.WETH,
        TEST_CASES.SCAM_TOKEN_1,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const rakedFeePercentage = 3;
      const actualAmount = takeFee(toBn(amount1Out), toBn(rakedFeePercentage));

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_1);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      let txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
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
          mockTokenDeployerResult?.deployTxHash
        ),
      ]);
    });

    it("should return correct finding when swapExactETHForTokensSupportingFeeOnTransferTokens function is called on Uniswap's Router contract and raked fee is transferred to an EOA", async () => {
      const pair = uniCreate2(
        TEST_CASES.WETH,
        TEST_CASES.SCAM_TOKEN_2,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const rakedFeePercentage = 4;
      const actualAmount = takeFee(toBn(amount1Out), toBn(rakedFeePercentage));

      const mockData = {
        status: "1",
        result: [
          {
            contractCreator: mockRakeTokenDeployer,
            txHash: mockRakeTokenDeployTx,
            to: mockRakeTokenDeployer,
            from: TEST_CASES.SCAM_TOKEN_2,
            value: "30021829252661332",
          },
        ],
      };
      const mockResponse: Response = {
        json: jest.fn().mockResolvedValue(mockData),
      } as any as Response;

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_2);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            0,
            [TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_2],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)

        .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, amount0In, amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.WETH, mockNetworkManager.router, pair, amount0In))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_2, pair, TEST_CASES.SWAP_RECIPIENT, `${actualAmount}`)
        );
      const mockRakeFeeRecipient = await mockFetchTokenDeployer.fetchRakeFeeRecipient(txEvent.hash);
      const findings = await handleTransaction(txEvent);
      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_2,
          pair,
          TEST_CASES.SWAP_RECIPIENT,
          "swapExactETHForTokensSupportingFeeOnTransferTokens",
          amount1Out,
          actualAmount.toString(),
          toBn(amount1Out).minus(actualAmount),
          rakedFeePercentage.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash,
          [
            {
              to: mockRakeFeeRecipient[0].to,
              value: mockRakeFeeRecipient[0].value,
            },
          ]
        ),
      ]);
    });

    it("should return findings when swapExactETHForTokensSupportingFeeOnTransferTokens function with more than 2 paths is called on Uniswap's Router contract", async () => {
      const pair1 = uniCreate2(
        TEST_CASES.WETH,
        TEST_CASES.SCAM_TOKEN_3,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair2 = uniCreate2(
        TEST_CASES.SCAM_TOKEN_3,
        TEST_CASES.TOKEN_2,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair3 = uniCreate2(
        TEST_CASES.TOKEN_2,
        TEST_CASES.SCAM_TOKEN_4,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
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

      const functionName = "swapExactETHForTokensSupportingFeeOnTransferTokens";
      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      const mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_3);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction("swapExactETHForTokensSupportingFeeOnTransferTokens"),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            0,
            [TEST_CASES.WETH, TEST_CASES.SCAM_TOKEN_3, TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_4],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: pair1Amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(...createSwapEvent(pair1, pair2, pair1Amount0In, pair1Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_3, pair1, pair2, pair2Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair2, pair3, pair2Amount0In.toString(), pair2Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_2, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, TEST_CASES.SWAP_RECIPIENT, pair3Amount0In.toString(), pair3Amount1Out))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_4, pair3, TEST_CASES.SWAP_RECIPIENT, actualPair3AmountSent)
        );

      const findings = await handleTransaction(txEvent);
      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_3,
          pair1,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair1Amount1Out,
          pair2Amount0In.toString(),
          toBn(pair1Amount1Out).minus(pair2Amount0In),
          scam1RakedPercent.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_4,
          pair3,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair3Amount1Out,
          actualPair3AmountSent,
          toBn(pair3Amount1Out).minus(actualPair3AmountSent),
          scam2RakedPercent.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
      ]);
    });

    it("should ignore swapExactETHForTokensSupportingFeeOnTransferTokens function calls on Uniswap's Router contract with  insignificant raked fee percentage", async () => {
      const pair = uniCreate2(
        TEST_CASES.WETH,
        TEST_CASES.SCAM_TOKEN_1,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const actualAmount = takeFee(toBn(amount1Out), toBn(2.9)); // insignificant fee - 2.9%

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
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
      const pair1 = uniCreate2(
        TEST_CASES.WETH,
        TEST_CASES.TOKEN_1,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair2 = uniCreate2(
        TEST_CASES.TOKEN_1,
        TEST_CASES.TOKEN_2,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair3 = uniCreate2(
        TEST_CASES.TOKEN_2,
        TEST_CASES.TOKEN_3,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair4 = uniCreate2(
        TEST_CASES.TOKEN_3,
        TEST_CASES.SCAM_TOKEN_5,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair5 = uniCreate2(
        TEST_CASES.SCAM_TOKEN_5,
        TEST_CASES.TOKEN_4,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );

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

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_5);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
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
              TEST_CASES.SCAM_TOKEN_5,
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
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_5, pair4, pair5, pair5Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount0In.toString(), pair5Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_4, pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount1Out));

      const functionName = "swapExactETHForTokensSupportingFeeOnTransferTokens";
      const findings = await handleTransaction(txEvent);
      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_5,
          pair4,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair4Amount1Out,
          pair5Amount0In.toString(),
          toBn(pair4Amount1Out).minus(pair5Amount0In),
          rakePercent.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
      ]);
    });
  });

  describe("SwapExactTokensForETHSupportingFeeOnTransferTokens", () => {
    it("should return finding when swapExactTokensForETHSupportingFeeOnTransferTokens function is called on Uniswap's Router contract", async () => {
      const functionName = "swapExactTokensForETHSupportingFeeOnTransferTokens";
      const pair = uniCreate2(
        TEST_CASES.SCAM_TOKEN_6,
        TEST_CASES.WETH,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const rakedFeePercentage = 10;
      const actualAmount = takeFee(toBn(amount0In), toBn(rakedFeePercentage));

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_6);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            amount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_6, TEST_CASES.WETH],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)

        .addEventLog(...createSwapEvent(pair, mockNetworkManager.router, amount0In, amount1Out))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_6, TEST_CASES.SWAP_RECIPIENT, pair, `${actualAmount}`)
        );

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_6,
          pair,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          amount0In,
          actualAmount.toString(),
          toBn(amount0In).minus(actualAmount),
          rakedFeePercentage.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
      ]);
    });

    it("should return finding when swapExactTokensForETHSupportingFeeOnTransferTokens function is called on Uniswap's Router contract and raked fee is transferred to an EOA", async () => {
      const functionName = "swapExactTokensForETHSupportingFeeOnTransferTokens";
      const pair = uniCreate2(
        TEST_CASES.SCAM_TOKEN_7,
        TEST_CASES.WETH,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const rakedFeePercentage = 10;
      const actualAmount = takeFee(toBn(amount0In), toBn(rakedFeePercentage));

      const mockData = {
        status: "1",
        result: [
          {
            contractCreator: mockRakeTokenDeployer,
            txHash: mockRakeTokenDeployTx,
            to: mockRakeTokenDeployer,
            from: TEST_CASES.SCAM_TOKEN_7,
            value: "19721829252661332",
          },
        ],
      };
      const mockResponse: Response = {
        json: jest.fn().mockResolvedValue(mockData),
      } as any as Response;

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_7);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            amount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_7, TEST_CASES.WETH],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)

        .addEventLog(...createSwapEvent(pair, mockNetworkManager.router, amount0In, amount1Out))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_7, TEST_CASES.SWAP_RECIPIENT, pair, `${actualAmount}`)
        );

      const mockRakeFeeRecipient = await mockFetchTokenDeployer.fetchRakeFeeRecipient(txEvent.hash);
      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_7,
          pair,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          amount0In,
          actualAmount.toString(),
          toBn(amount0In).minus(actualAmount),
          rakedFeePercentage.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash,
          [
            {
              to: mockRakeFeeRecipient[0].to,
              value: mockRakeFeeRecipient[0].value,
            },
          ]
        ),
      ]);
    });

    it("should ignore swapExactTokensForETHSupportingFeeOnTransferTokens function calls on Uniswap's Router contract with  insignificant raked fee percentage", async () => {
      const functionName = "swapExactTokensForETHSupportingFeeOnTransferTokens";
      const pair = uniCreate2(
        TEST_CASES.SCAM_TOKEN_8,
        TEST_CASES.WETH,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const [amount0In, amount1Out] = ["5000000", "3000"];
      const rakedFeePercentage = 2; // low rakedFeePercentage
      const actualAmount = takeFee(toBn(amount0In), toBn(rakedFeePercentage));

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            amount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_8, TEST_CASES.WETH],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1679791157),
          ],
          value: amount0In,
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)

        .addEventLog(...createSwapEvent(pair, mockNetworkManager.router, amount0In, amount1Out))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_8, TEST_CASES.SWAP_RECIPIENT, pair, `${actualAmount}`)
        );

      const findings = await handleTransaction(txEvent);
      expect(findings).toStrictEqual([]);
    });

    it("should return findings when swapExactTokensForETHSupportingFeeOnTransferTokens function with more than 2 path addresses is called on Uniswap's Router contract", async () => {
      const pair1 = uniCreate2(
        TEST_CASES.TOKEN_1,
        TEST_CASES.TOKEN_2,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair2 = uniCreate2(
        TEST_CASES.TOKEN_2,
        TEST_CASES.SCAM_TOKEN_9,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair3 = uniCreate2(
        TEST_CASES.SCAM_TOKEN_9,
        TEST_CASES.WETH,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
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

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_9);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            pair1Amount0In,
            0,
            [TEST_CASES.TOKEN_1, TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_9, TEST_CASES.WETH],
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
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_9, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, mockNetworkManager.router, pair3Amount0In.toString(), pair3Amount1Out));

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_9,
          pair3,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair2Amount1Out,
          pair3Amount0In.toString(),
          toBn(pair2Amount1Out).minus(pair3Amount0In),
          rakedFeePercentage.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
      ]);
    });

    it("should return multiple findings when swapExactETHForTokensSupportingFeeOnTransferTokens function with multiple path addresses is called on Uniswap's Router contract", async () => {
      const pair1 = uniCreate2(
        TEST_CASES.WETH,
        TEST_CASES.TOKEN_1,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair2 = uniCreate2(
        TEST_CASES.TOKEN_1,
        TEST_CASES.TOKEN_2,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair3 = uniCreate2(
        TEST_CASES.TOKEN_2,
        TEST_CASES.TOKEN_3,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair4 = uniCreate2(
        TEST_CASES.TOKEN_3,
        TEST_CASES.SCAM_TOKEN_10,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair5 = uniCreate2(
        TEST_CASES.SCAM_TOKEN_10,
        TEST_CASES.TOKEN_4,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );

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

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_10);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();
      const functionName = "swapExactETHForTokensSupportingFeeOnTransferTokens";

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
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
              TEST_CASES.SCAM_TOKEN_10,
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
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_10, pair4, pair5, pair5Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount0In.toString(), pair5Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_4, pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount1Out));

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_10,
          pair4,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair4Amount1Out,
          pair5Amount0In.toString(),
          toBn(pair4Amount1Out).minus(pair5Amount0In),
          rakePercent.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
      ]);
    });
  });

  describe("SwapExactTokensForTokensSupportingFeeOnTransferTokens", () => {
    it("should return correct finding when swapExactTokensForTokensSupportingFeeOnTransferTokens function is called on Uniswap's Router contract", async () => {
      const functionName = "swapExactTokensForTokensSupportingFeeOnTransferTokens";
      const pair = uniCreate2(
        TEST_CASES.SCAM_TOKEN_11,
        TEST_CASES.TOKEN_1,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const rakedFeePercentage = 7;
      const [initialAmount0In, actualAmount0In, initialAmount1Out, actualAmount1Out] = [
        "9000000",
        takeFee(toBn("9000000"), toBn(rakedFeePercentage)),
        "72000",
        "72000",
      ];

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_11);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            initialAmount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_11, TEST_CASES.TOKEN_1],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1777791157),
          ],
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_11, TEST_CASES.SWAP_RECIPIENT, pair, actualAmount0In.toString())
        )
        .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, actualAmount0In.toString(), initialAmount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, actualAmount1Out));

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_11,
          pair,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          initialAmount0In,
          actualAmount0In.toString(),
          toBn(initialAmount0In).minus(actualAmount0In),
          rakedFeePercentage.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
      ]);
    });

    it("should return correct finding when swapExactTokensForTokensSupportingFeeOnTransferTokens function is called on Uniswap's Router contract and raked fee is transferred to an EOA", async () => {
      const functionName = "swapExactTokensForTokensSupportingFeeOnTransferTokens";
      const pair = uniCreate2(
        TEST_CASES.SCAM_TOKEN_12,
        TEST_CASES.TOKEN_1,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const rakedFeePercentage = 7;
      const [initialAmount0In, actualAmount0In, initialAmount1Out, actualAmount1Out] = [
        "9000000",
        takeFee(toBn("9000000"), toBn(rakedFeePercentage)),
        "72000",
        "72000",
      ];

      const mockData = {
        status: "1",
        result: [
          {
            contractCreator: mockRakeTokenDeployer,
            txHash: mockRakeTokenDeployTx,
            to: mockRakeTokenDeployer,
            from: TEST_CASES.SCAM_TOKEN_12,
            value: "500721829252661777",
          },
        ],
      };
      const mockResponse: Response = {
        json: jest.fn().mockResolvedValue(mockData),
      } as any as Response;

      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_12);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            initialAmount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_12, TEST_CASES.TOKEN_1],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1777791157),
          ],
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_12, TEST_CASES.SWAP_RECIPIENT, pair, actualAmount0In.toString())
        )
        .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, actualAmount0In.toString(), initialAmount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, actualAmount1Out));
      const mockRakeFeeRecipient = await mockFetchTokenDeployer.fetchRakeFeeRecipient(txEvent.hash);

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_12,
          pair,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          initialAmount0In,
          actualAmount0In.toString(),
          toBn(initialAmount0In).minus(actualAmount0In),
          rakedFeePercentage.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash,
          [
            {
              to: mockRakeFeeRecipient[0].to,
              value: mockRakeFeeRecipient[0].value,
            },
          ]
        ),
      ]);
    });

    it("should ignore insignificant rakedFeePercentage for swapExactTokensForTokensSupportingFeeOnTransferTokens function calls on Uniswap's Router contract", async () => {
      const functionName = "swapExactTokensForTokensSupportingFeeOnTransferTokens";
      const pair = uniCreate2(
        TEST_CASES.SCAM_TOKEN_13,
        TEST_CASES.TOKEN_1,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const rakedFeePercentage = 2.9; // insignificant rakedFeePercentage
      const [initialAmount0In, actualAmount0In, initialAmount1Out, actualAmount1Out] = [
        "9000000",
        takeFee(toBn("9000000"), toBn(rakedFeePercentage)),
        "72000",
        "72000",
      ];

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            initialAmount0In,
            0,
            [TEST_CASES.SCAM_TOKEN_13, TEST_CASES.TOKEN_1],
            TEST_CASES.SWAP_RECIPIENT,
            ethers.BigNumber.from(1777791157),
          ],
        })
        .setFrom(TEST_CASES.SWAP_RECIPIENT)
        .addEventLog(
          ...createTransferEvent(TEST_CASES.SCAM_TOKEN_13, TEST_CASES.SWAP_RECIPIENT, pair, actualAmount0In.toString())
        )
        .addEventLog(...createSwapEvent(pair, TEST_CASES.SWAP_RECIPIENT, actualAmount0In.toString(), initialAmount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_1, pair, TEST_CASES.SWAP_RECIPIENT, actualAmount1Out));

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([]);
    });

    it("should return findings when swapExactTokensForTokensSupportingFeeOnTransferTokens function with more than 2 path addresses is called on Uniswap's Router contract", async () => {
      const pair1 = uniCreate2(
        TEST_CASES.TOKEN_1,
        TEST_CASES.TOKEN_2,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair2 = uniCreate2(
        TEST_CASES.TOKEN_2,
        TEST_CASES.SCAM_TOKEN_14,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair3 = uniCreate2(
        TEST_CASES.SCAM_TOKEN_14,
        TEST_CASES.TOKEN_3,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
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
      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_14);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
        .addTraces({
          to: mockNetworkManager.router,
          function: MOCK_IFACE_FUNCTIONS.getFunction(functionName),
          from: TEST_CASES.SWAP_RECIPIENT,
          arguments: [
            pair1Amount0In,
            0,
            [TEST_CASES.TOKEN_1, TEST_CASES.TOKEN_2, TEST_CASES.SCAM_TOKEN_14, TEST_CASES.TOKEN_3],
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
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_14, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, TEST_CASES.SWAP_RECIPIENT, pair3Amount0In.toString(), pair3Amount1Out))
        .addEventLog(
          ...createTransferEvent(TEST_CASES.TOKEN_3, pair3, TEST_CASES.SWAP_RECIPIENT, actualPair3Amount1Out)
        );

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_14,
          pair3,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair2Amount1Out,
          pair3Amount0In.toString(),
          toBn(pair2Amount1Out).minus(pair3Amount0In),
          rakedFeePercentage.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
      ]);
    });

    it("should return multiple findings when swapExactTokensForTokensSupportingFeeOnTransferTokens function is called on Uniswap's Router contract with multiple scam token addresses in path", async () => {
      const pair1 = uniCreate2(
        TEST_CASES.TOKEN_1,
        TEST_CASES.TOKEN_2,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair2 = uniCreate2(
        TEST_CASES.TOKEN_2,
        TEST_CASES.SCAM_TOKEN_15,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair3 = uniCreate2(
        TEST_CASES.SCAM_TOKEN_15,
        TEST_CASES.TOKEN_3,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair4 = uniCreate2(
        TEST_CASES.TOKEN_3,
        TEST_CASES.TOKEN_4,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
      const pair5 = uniCreate2(
        TEST_CASES.TOKEN_4,
        TEST_CASES.SCAM_TOKEN_16,
        mockNetworkManager.factory,
        mockNetworkManager.pairInitCodeHash
      );
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
      mockFetch.mockResolvedValue(Promise.resolve(mockResponse));
      mockFetchTokenDeployer = new FetchTokenDeployer(TEST_CASES.SCAM_TOKEN_15);
      const mockTokenDeployerResult = await mockFetchTokenDeployer.fetchDeployerAndTxHash();

      const txEvent = new TestTransactionEvent()
        .setTo(mockNetworkManager.router)
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
              TEST_CASES.SCAM_TOKEN_15,
              TEST_CASES.TOKEN_3,
              TEST_CASES.TOKEN_4,
              TEST_CASES.SCAM_TOKEN_16,
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
        .addEventLog(...createTransferEvent(TEST_CASES.SCAM_TOKEN_15, pair2, pair3, pair3Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair3, pair4, pair3Amount0In.toString(), pair3Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_3, pair3, pair4, pair4Amount0In.toString()))
        .addEventLog(...createSwapEvent(pair4, pair5, pair4Amount0In.toString(), pair4Amount1Out))
        .addEventLog(...createTransferEvent(TEST_CASES.TOKEN_4, pair4, pair5, pair5Amount0In))
        .addEventLog(...createSwapEvent(pair5, TEST_CASES.SWAP_RECIPIENT, pair5Amount0In, pair5Amount1Out))
        .addEventLog(
          ...createTransferEvent(
            TEST_CASES.SCAM_TOKEN_16,
            pair5,
            TEST_CASES.SWAP_RECIPIENT,
            actualPair5Amount1Out.toString()
          )
        );
      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_15,
          pair3,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair2Amount1Out,
          pair3Amount0In.toString(),
          toBn(pair2Amount1Out).minus(pair3Amount0In),
          rakedFeePercentage1.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
        mockCreateFinding(
          TEST_CASES.SCAM_TOKEN_16,
          pair5,
          TEST_CASES.SWAP_RECIPIENT,
          functionName,
          pair5Amount1Out,
          actualPair5Amount1Out.toString(),
          toBn(pair5Amount1Out).minus(actualPair5Amount1Out),
          rakedFeePercentage2.toFixed(2),
          mockTokenDeployerResult?.deployer,
          mockTokenDeployerResult?.deployTxHash
        ),
      ]);
    });
  });
});
