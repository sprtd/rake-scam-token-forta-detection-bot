# Rake Scam Token Detection Bot

## Description

This bot detects the rake scam token which takes additional swap fee on Uniswap DEX and transfers it to an EOA


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
    - swapFeeFunctionCalled: name of the triggered Uniswap swap fee function
    - totalAmountTransferred: total amount of scam tokens transferred to Uniswap Router contract
    - actualAmountReceived: amount received by the user executing the swap after the deduction of swap fee
    - rakedFee: total fee taken by scam token contract
    - rakedFeePercentage: percentage of the fee raked in by the scam token contract

## Test Data

The agent behaviour can be verified with the following transactions:

- Ethereum Mainnet
