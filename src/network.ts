
import { UNISWAP_V2_ROUTER, UNISWAP_V2_FACTORY, UNISWAP_PAIR_INIT_CODE_HASH } from './constants'

export interface NetworkData {
    chainId: number;
    router: string;
    factory: string
    pairInitCodeHash: string;
}

const MAINNET_DATA: NetworkData = {
    chainId: 42,
    factory: UNISWAP_V2_FACTORY,
    router: UNISWAP_V2_ROUTER,
    pairInitCodeHash: UNISWAP_PAIR_INIT_CODE_HASH,
};

const POLYGON_MAINNET_DATA: NetworkData = {
    chainId: 137,
    factory: UNISWAP_V2_FACTORY,
    router: UNISWAP_V2_ROUTER,
    pairInitCodeHash: UNISWAP_PAIR_INIT_CODE_HASH,
};

const ARBITRUM_MAINNET_DATA: NetworkData = {
    chainId: 42161,
    factory: UNISWAP_V2_FACTORY,
    router: UNISWAP_V2_ROUTER,
    pairInitCodeHash: UNISWAP_PAIR_INIT_CODE_HASH,
};

const OPTIMISM_MAINNET_DATA: NetworkData = {
    chainId: 10,
    factory: UNISWAP_V2_FACTORY,
    router: UNISWAP_V2_ROUTER,
    pairInitCodeHash: UNISWAP_PAIR_INIT_CODE_HASH,
};

const CELO_MAINNET_DATA: NetworkData = {
    chainId: 42220,
    factory: UNISWAP_V2_FACTORY,
    router: UNISWAP_V2_ROUTER,
    pairInitCodeHash: UNISWAP_PAIR_INIT_CODE_HASH,
};


export const NETWORK_MAP: Record<number, NetworkData> = {
    1: MAINNET_DATA,
    137: POLYGON_MAINNET_DATA,
    42161: ARBITRUM_MAINNET_DATA,
    10: OPTIMISM_MAINNET_DATA,
    42220: CELO_MAINNET_DATA
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