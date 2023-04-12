export const SWAP_EXACT_TOKEN_FOR_ETH_SUPPORTING_FEE_ON_TRANSFER_TOKENS: string =
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin,address[] calldata path, address to, uint deadline)";

export const SWAP_EXACT_ETH_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS: string =
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin,address[] calldata path,address to,uint deadline)";

export const SWAP_EXACT_TOKEN_FOR_TOKENS_SUPPORTING_FEE_ON_TRANSFER_TOKENS: string =
  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin,address[] calldata path, address to, uint deadline)";

export const SWAP_ETH_FOR_EXACT_TOKENS_NO_FEE_ON_TRANSFER_TOKENS =
  "function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)";

export const UNISWAP_V2_ROUTER: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

export const UNISWAP_V2_SWAP_EVENT: string =
  "event Swap(address indexed sender,uint amount0In,uint amount1In,uint amount0Out,uint amount1Out,address indexed to)";

export const TOKEN_TRANSFER_EVENT: string = "event Transfer(address indexed from, address indexed to, uint256 value)";

export const THRESHOLD_PERCENT = 3;

export const RAKE_TOKENS: string[] = [];
