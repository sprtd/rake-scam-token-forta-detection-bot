# Rake Scam Token Detection Bot

## Description

This bot detects the deployment of tokens with malicious contract logic which significantly takes additional swap fee on Uniswap DEX and transfers it to an EOA

## Supported Chains

- Ethereum
- Polygon
- Arbitrum
- Optimism
- Celo


## Alerts

Describe each of the type of alerts fired by this agent

- GITCOIN-FORTA-1
  - Fired when a token is deployed with a malicious contract logic to take a significant percentage fee and transfer it to an EOA 
  - Severity is always set to "low" 
  - Type is always set to "info"
  - Metadata contains the following fields: 
    - tokenAddress: address of the deployed rake scam token
    - pairAddress: address of the created uniswap tokens pair
    - from: address of the user initiating the swap transaction on Uniswap
    - swapFeeFunctionCalled: name of the triggered Uniswap swap fee function
    - totalAmountTransferred: total amount of scam tokens transferred to Uniswap Router contract
    - actualAmountReceived: amount received by the user executing the swap following the deduction of swap fee
    - rakedFee: total fee taken by scam token contract
    - rakedFeePercentage: percentage of the fee raked in by the scam token contract

## Test Data

The bot behaviour can be verified with the following transactions:
- [0x300e0afc3b94b77b7310ad632a2377bafd017ff8078470f73dfb01f4917b5379](https://etherscan.io/tx/0x300e0afc3b94b77b7310ad632a2377bafd017ff8078470f73dfb01f4917b5379) - 
`Ethereum Mainnet` - swapExactTokensForEthSupportingFeeOnTransferTokens
  > Raked Fee Percentage - 5%



- [0x4ca490a9e8a84765dbffe7b56a04818be4947ab280b498104b166f12c2e312c5](https://etherscan.io/tx/0x4ca490a9e8a84765dbffe7b56a04818be4947ab280b498104b166f12c2e312c5) -
`Ethereum Mainnet` - swapExactETHForTokensSupportingFeeOnTransferTokens
  > Raked Fee Percentage -  5%
