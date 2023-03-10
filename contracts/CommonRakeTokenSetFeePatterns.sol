    // These are the common patterns noticed with the scam token contracts
/**
    i) for the two scam tokens i've seen so far, they are both ownable and
     transfer all the totalsupply to owner during deployment
    ii) Uses updateFees to set the fees.
 */
// 1) National basketball inu is ownable and has these funcs
contract CommonRakeTokenSetFeePatterns { 

    address public marketingWallet;
    mapping (address => bool) private _isExcludedFromFees;
 function excludeFromFees(address account, bool excluded) public onlyOwner {
            _isExcludedFromFees[account] = excluded;
            emit ExcludeFromFees(account, excluded);
        }

function updateFees(uint256 _buyMarketingFee, uint256 _buyLiquidityFee, uint256 _buyBurnFee, uint256 _sellMarketingFee, 
        uint256 _sellLiquidityFee, uint256 _sellBurnFee) external onlyOwner {
            buyMarketingFee = _buyMarketingFee;
            buyLiquidityFee = _buyLiquidityFee;
            buyBurnFee = _buyBurnFee;
            buyTotalFees = buyMarketingFee + buyLiquidityFee + buyBurnFee;
            sellMarketingFee = _sellMarketingFee;
            sellLiquidityFee = _sellLiquidityFee;
            sellBurnFee = _sellBurnFee;
            sellTotalFees = sellMarketingFee + sellLiquidityFee + sellBurnFee;
            require(sellTotalFees <= 45, "Must keep sell fees at 45% or less");
            require(buyTotalFees <= 15, "Must keep buy fees at 15% or less");
        }

    constructor() ERC20("National Basketball Inu", "NBI") {
// BLESSINGnonseMICHAEL
// 2) CryptodonLOL
    }
function excludeMultipleAccountsFromFees(address[] calldata accounts, bool excluded) public onlyOwner {
        for(uint256 i = 0; i < accounts.length; i++) {
            _isExcludedFromFee[accounts[i]] = excluded;
        }
    }

function setFee(uint256 redisFeeOnBuy, uint256 redisFeeOnSell, uint256 taxFeeOnBuy, uint256 taxFeeOnSell) public onlyOwner {
        require(redisFeeOnBuy >= 0 && redisFeeOnBuy <= 0, "Buy rewards must be between 0% and 0%");
        require(taxFeeOnBuy >= 0 && taxFeeOnBuy <= 99, "Buy tax must be between 0% and 99%");
        require(redisFeeOnSell >= 0 && redisFeeOnSell <= 0, "Sell rewards must be between 0% and 0%");
        require(taxFeeOnSell >= 0 && taxFeeOnSell <= 99, "Sell tax must be between 0% and 99%");

        _redisFeeOnBuy = redisFeeOnBuy;
        _redisFeeOnSell = redisFeeOnSell;
        _taxFeeOnBuy = taxFeeOnBuy;
        _taxFeeOnSell = taxFeeOnSell;

    }

constructor() {}

//3) 0x482f17E35fbc09253cc6A66566cF9922f3E5F16D(AntiRAID) also has set fee
function setFee(uint256 _liquidityFee, uint256 _marketingFee, uint256 _developerFee, uint256 _feeDenominator) external authorized {
         liquidityFee = _liquidityFee; 
         marketingFee = _marketingFee;
         developerFee = _developerFee;
         feeDenominator = _feeDenominator;
         totalFee = liquidityFee + marketingFee + developerFee;
         require(totalFee < feeDenominator / 8 );
    } 

mapping (address => bool) isFeeExempt;

//4) 0xb5EA3378429930Fab5405864E609C7c3E43D7b72(BOX) implements reduceFee
function reduceFee(uint256 _newFee) external{
      require(_msgSender()==_taxWallet);
      require(_newFee<=_finalBuyTax && _newFee<=_finalSellTax);
      _finalBuyTax=_newFee;
      _finalSellTax=_newFee;
    }
_isExcludedFromFee[to]
}

//5) 0x5D3efE633EF68f5d50f7Efa7b9FD9120c9263a7B(AlmBullish)

function setFee(uint256 _liquidityFee, uint256 _marketingFee) external onlyOwner {
         liquidityFee = _liquidityFee; 
         marketingFee = _marketingFee;
         totalFee = liquidityFee + marketingFee;
    } 

mapping (address => bool) isFeeExempt;

//6) 0xa3c01F68Ec8ce0788247A65990AC3daeBA3B5920(ZOKER)
function setFee(uint256 redisFeeOnBuy, uint256 redisFeeOnSell, uint256 taxFeeOnBuy, uint256 taxFeeOnSell) public onlyOwner {
        require(redisFeeOnBuy >= 0 && redisFeeOnBuy <= 4, "Buy rewards must be between 0% and 4%");
        require(taxFeeOnBuy >= 0 && taxFeeOnBuy <= 98, "Buy tax must be between 0% and 98%");
        require(redisFeeOnSell >= 0 && redisFeeOnSell <= 4, "Sell rewards must be between 0% and 4%");
        require(taxFeeOnSell >= 0 && taxFeeOnSell <= 98, "Sell tax must be between 0% and 98%");

        _redisFeeOnBuy = redisFeeOnBuy;
        _redisFeeOnSell = redisFeeOnSell;
        _taxFeeOnBuy = taxFeeOnBuy;
        _taxFeeOnSell = taxFeeOnSell;

    }

function excludeMultipleAccountsFromFees(address[] calldata accounts, bool excluded) public onlyOwner {
        for(uint256 i = 0; i < accounts.length; i++) {
            _isExcludedFromFee[accounts[i]] = excluded;
        }
    }

//7) 0xce70BCF79AEEcAB863FC127DA2B2C8CA2Ba7Ad3D(The Maker)
function setFee(uint256 redisFeeOnBuy, uint256 redisFeeOnSell, uint256 taxFeeOnBuy, uint256 taxFeeOnSell) public onlyOwner {
        require(redisFeeOnBuy >= 0 && redisFeeOnBuy <= 0, "Buy rewards must be between 0% and 0%");
        require(taxFeeOnBuy >= 0 && taxFeeOnBuy <= 99, "Buy tax must be between 0% and 99%");
        require(redisFeeOnSell >= 0 && redisFeeOnSell <= 0, "Sell rewards must be between 0% and 0%");
        require(taxFeeOnSell >= 0 && taxFeeOnSell <= 99, "Sell tax must be between 0% and 99%");

        _redisFeeOnBuy = redisFeeOnBuy;
        _redisFeeOnSell = redisFeeOnSell;
        _taxFeeOnBuy = taxFeeOnBuy;
        _taxFeeOnSell = taxFeeOnSell;

    }
function excludeMultipleAccountsFromFees(address[] calldata accounts, bool excluded) public onlyOwner {
        for(uint256 i = 0; i < accounts.length; i++) {
            _isExcludedFromFee[accounts[i]] = excluded;
        }
    }

//8) 0x25d4e7fe624FcC6E7F0b52D142F40c9ACEcF039a(kennel)
function excludeFromFees(address account, bool excluded) public onlyOwner {
        _isExcludedFromFees[account] = excluded;
        emit ExcludeFromFees(account, excluded);
    }
function updateBuyFees(
        uint256 _devfee,
        uint256 _liquidityFee
    ) external onlyOwner {
        buydevfee = _devfee;
        buyLiquidityFee = _liquidityFee;
        buyTotalFees = buydevfee + buyLiquidityFee;
        require(buyTotalFees <= 30, "Must keep fees at 10% or less");
    }

    function updateSellFees(
        uint256 _devfee,
        uint256 _liquidityFee
    ) external onlyOwner {
        selldevfee = _devfee;
        sellLiquidityFee = _liquidityFee;
        sellTotalFees = selldevfee + sellLiquidityFee;
        require(sellTotalFees <= 50, "Must keep fees at 10% or less");
    }
//9) 0xCDcfa960c4825ecEB18686751D2c1cb3C2Bc0c68 (Flokarium)

function setStructure(uint256 _liquidity, uint256 _marketing, uint256 _burn, uint256 _rewards, uint256 _development, uint256 _total, uint256 _sell, uint256 _trans) external onlyOwner {
        liquidityFee = _liquidity;
        marketingFee = _marketing;
        burnFee = _burn;
        rewardsFee = _rewards;
        developmentFee = _development;
        totalFee = _total;
        sellFee = _sell;
        transferFee = _trans;
        require(totalFee <= denominator.div(5) && sellFee <= denominator.div(5) && transferFee <= denominator.div(5), "totalFee and sellFee cannot be more than 20%");
    }

     function setisExempt(address _address, bool _enabled) external onlyOwner {isFeeExempt[_address] = _enabled;}

}