const SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS: string =
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin,address[] calldata path, address to, uint deadline)";

const SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS: string =
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin,address[] calldata path,address to,uint deadline)";

const SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS: string =
  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin,address[] calldata path, address to, uint deadline)";

const SWAP_ETH_FOR_EXACT_TOKENS_NO_FEE_ON_TRANSFER_TOKENS =
  "function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)";

const UNISWAP_V2_ROUTER: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const UNISWAP_V2_SWAP_EVENT: string =
  "event Swap(address indexed sender,uint amount0In,uint amount1In,uint amount0Out,uint amount1Out,address indexed to)";

const TOKEN_TRANSFER_EVENT: string = "event Transfer(address indexed from, address indexed to, uint256 value)";

const UNISWAP_PAIR_INIT_CODE_HASH = "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f";

const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

const THRESHOLD_PERCENT = 3;

export {
  SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  SWAP_ETH_FOR_EXACT_TOKENS_NO_FEE_ON_TRANSFER_TOKENS,
  SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS,
  UNISWAP_PAIR_INIT_CODE_HASH,
  UNISWAP_V2_FACTORY,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_SWAP_EVENT,
  TOKEN_TRANSFER_EVENT,
  THRESHOLD_PERCENT,
};
