require('dotenv').config()
const express = require("express")
const app = express()
const ethers = require('ethers')
const { BigNumber, utils } = ethers
const PORT = process.env.PORT || 3000

// console.log(process.env.INFURA_ID);
// const provider = new ethers.providers.WebSocketProvider(
//   `wss://eth-mainnet.g.alchemy.com/v2/${process.env.INFURA_ID}`,
//   "mainnet"
// )
// https://neat-distinguished-wish.discover.quiknode.pro/03e08f653d98d46226c616a865c97087603f7b1a/

const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_ID}`)
const depositWallet = new ethers.Wallet(
  process.env.DEPOSIT_WALLET_PRIVATE_KEY,
  provider,
)
// wss://eth-mainnet.g.alchemy.com/v2/pJUz2zpdk4pIPZHXCRgA--cczEV1z_pg
const main = async () => {
  const depositWalletAddress = await depositWallet.getAddress()
  console.log(`Watching for incoming tx to ${depositWalletAddress}…`)

  provider.on('pending', (txHash) => {
    // console.log(txHash);
    try {
      provider.getTransaction(txHash).then((tx) => {
        if (tx === null) return

        const { from, to, value } = tx

        if (to === depositWalletAddress) {
          console.log(`Receiving ${utils.formatEther(value)} ETH from ${from}…`)

          console.log(
            `Waiting for ${process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL} confirmations…`,
          )

          tx.wait(process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL).then(
            async (_receipt) => {
              const currentBalance = await depositWallet.getBalance('latest')
              const gasPrice = await provider.getGasPrice()
              const gasLimit = 21000
              const maxGasFee = BigNumber.from(gasLimit).mul(gasPrice)

              const tx = {
                to: process.env.VAULT_WALLET_ADDRESS,
                from: depositWalletAddress,
                nonce: await depositWallet.getTransactionCount(),
                value: currentBalance.sub(maxGasFee),
                chainId:  1,
                gasPrice: gasPrice,
                gasLimit: gasLimit,
              }

              depositWallet.sendTransaction(tx).then(
                (_receipt) => {
                  console.log(
                    `Withdrew ${utils.formatEther(
                      currentBalance.sub(maxGasFee),
                    )} ETH to VAULT ${process.env.VAULT_WALLET_ADDRESS} ✅`,
                  )
                },
                (reason) => {
                  console.error('Withdrawal failed', reason)
                },
              )
            },
            (reason) => {
              console.error('Receival failed', reason)
            },
          )
        }
      })
    } catch (err) {
      console.error(err)
    }
  })
}

if (require.main === module) {
  main()
}
app.get("/", (req, res)=>{
  res.send("<h1>App working</h1>")
})

app.listen(PORT, ()=>{
  console.log(`server started on port ${PORT}`);
})