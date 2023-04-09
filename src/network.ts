export interface NetworkData {
  chainId: number;
  router: string;
  factory: string;
  pairInitCodeHash: string;
}

const MAINNET_DATA: NetworkData = {
  chainId: 1,
  factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  router: "0x7a250d5630b4cf539739df2c5dacb4c659F2488d",
  pairInitCodeHash: "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f",
};

const POLYGON_MAINNET_DATA: NetworkData = {
  chainId: 137,
  factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  router: "0x7a250d5630b4cf539739df2c5dacb4c659F2488d",
  pairInitCodeHash: "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f",
};

const ARBITRUM_MAINNET_DATA: NetworkData = {
  chainId: 42161,
  factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  router: "0x7a250d5630b4cf539739df2c5dacb4c659F2488d",
  pairInitCodeHash: "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f",
};

const OPTIMISM_MAINNET_DATA: NetworkData = {
  chainId: 10,
  factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  router: "0x7a250d5630b4cf539739df2c5dacb4c659F2488d",
  pairInitCodeHash: "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f",
};

const AVALANCHE_DATA: NetworkData = {
  chainId: 43114,
  factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  router: "0x7a250d5630b4cf539739df2c5dacb4c659F2488d",
  pairInitCodeHash: "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f",
};

const FANTOM_DATA: NetworkData = {
  chainId: 250,
  factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  router: "0x7a250d5630b4cf539739df2c5dacb4c659F2488d",
  pairInitCodeHash: "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f",
};

const BNBCHAIN_DATA: NetworkData = {
  chainId: 56,
  factory: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
  router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  pairInitCodeHash: "0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5",
};

export const NETWORK_MAP: Record<number, NetworkData> = {
  1: MAINNET_DATA,
  137: POLYGON_MAINNET_DATA,
  42161: ARBITRUM_MAINNET_DATA,
  10: OPTIMISM_MAINNET_DATA,
  43114: AVALANCHE_DATA,
  250: FANTOM_DATA,
  56: BNBCHAIN_DATA,
};

export default class NetworkManager implements NetworkData {
  public chainId: number;
  public factory: string;
  public router: string;
  public pairInitCodeHash: string;
  networkMap: Record<number, NetworkData>;

  constructor(networkMap: Record<number, NetworkData> = NETWORK_MAP) {
    this.chainId = 0;
    this.factory = "0x0000000000000000000000000000000000000000";
    this.router = "0x0000000000000000000000000000000000000000";
    this.pairInitCodeHash = "";
    this.networkMap = networkMap;
  }

  public setNetwork(networkId: number) {
    try {
      const { chainId, router, pairInitCodeHash, factory } = this.networkMap[networkId];
      this.chainId = chainId;
      this.factory = factory;
      this.router = router;
      this.pairInitCodeHash = pairInitCodeHash;
    } catch {
      // The bot is run in a network not defined in the networkMap.
      // There's no contract deployed in that network.
      throw new Error("You are running the bot in an unsupported network");
    }
  }
}
