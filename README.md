# Rake Scam Token Detection Bot

## Description

This bot detects rake scam tokens that significantly take an additional swap fee on Uniswap DEX and transfer it to an EOA

## Supported Chains

- Ethereum
- Polygon
- Arbitrum
- Optimism
- Avalanche
- Fantom
- BNBChain

## Alerts

Describe each of the type of alerts fired by this agent

- RAKE-TOKEN-CONTRACT-1
  - Fired when a token takes significant percentage fee on Uniswap Router and transfers it to an EOA
  - Severity is always set to "low" 
  - Type is always set to "info"
  - Metadata contains the following fields: 
    - `rakeTokenAddress`: address of the rake scam token
    - `pairAddress`: address of the created uniswap tokens pair
    - `from`: address of the user initiating the swap transaction on Uniswap
    - `totalAmountTransferred`: total amount of scam tokens transferred to Uniswap Router contract
    - `actualAmountReceived`: amount received by the user executing the swap following the deduction of swap fee
    - `rakedFee`: total fee taken by scam token contract
    - `rakedFeePercentage`: percentage of the fee raked in by the scam token contract
    - `anomalyScore`: total finding count divided by total unique rake token addresses detected
    - `attackerRakeTokenDeployer`: address of the rake token contract deployer
    - `rakeTokenDeployTxHash`: transaction hash of the deployed rake token contract
    - `rakeFeeRecipient`: address to which the rake fee is transferred
    - `ethTransferredToRakeFeeRecipient`: ETH value transferred to rake fee recipient
  - Labels contain:
    - `entity`: rake token deployer 
    - `entityType`: type of the entity, always set to "Address"
    - `label`: type of the label, always set to "Attacker"
    - `confidence`: confidence level of the detected transaction, always set to `0.6`
    - `remove`: boolean indicating whether the label is removed. always set to `false`

## Test Data

The bot behaviour can be verified with the following transactions:
- [0x0347544563b3317f39e8086e0838dc23a8e59cd84440883729247ce42a3794a6](https://etherscan.io/tx/0x0347544563b3317f39e8086e0838dc23a8e59cd84440883729247ce42a3794a6) - 
`Ethereum Mainnet - swapExactTokensForEthSupportingFeeOnTransferTokens`
  > Raked Fee Percentage - 15%

- [0x4333196cf5658ae0b0f66ff29ec755258fad79434f3529966a79657d8eaa45b7](https://etherscan.io/tx/0x4333196cf5658ae0b0f66ff29ec755258fad79434f3529966a79657d8eaa45b7) -
`Ethereum Mainnet - swapExactETHForTokensSupportingFeeOnTransferTokens`
  > Raked Fee Percentage -  10%

- [0xcde33f74ec5704351da105e153e7012a6303815e6c82acab12bdf016e7da15c1](https://etherscan.io/tx/0xcde33f74ec5704351da105e153e7012a6303815e6c82acab12bdf016e7da15c1) -
`Ethereum Mainnet - swapExactTokensForTokensSupportingFeeOnTransferTokens`
  > Raked Fee Percentage -  5.75%


- This bot's default THRESHOLD_PERCENTAGEAGE is 3 and this can be changed by modifying the `THRESHOLD_PERCENTAGEAGE` variable in `src/constants.ts` - [L24](https://github.com/sprtd/rake-scam-token-forta-detection-bot/blob/main/src/constants.ts#L24)
