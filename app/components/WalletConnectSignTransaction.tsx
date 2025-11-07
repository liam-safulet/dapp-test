'use client'

import { useState } from 'react'
import EthereumProvider from '@walletconnect/ethereum-provider'

// 你需要从 WalletConnect Cloud 获取项目ID: https://cloud.walletconnect.com/
const WALLET_CONNECT_PROJECT_ID = '8c855367d83029d691f5db3aa866d00c' // 替换为你的项目ID

export function WalletConnectSignTransaction() {
  const [provider, setProvider] = useState<any>(null)
  const [address, setAddress] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState('')
  const [signedTx, setSignedTx] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [txHash, setTxHash] = useState<string>('')

  // 固定发送 0.001 BNB
  const amount = '0.001'
  // 接收地址使用当前连接的地址（给自己转账）
  const recipient = address || ''

  const handleConnect = async () => {
    try {
      setIsLoading(true)
      setStatus('初始化 WalletConnect...')

      // 创建 WalletConnect Provider
      const ethereumProvider = await EthereumProvider.init({
        projectId: WALLET_CONNECT_PROJECT_ID,
        chains: [56], // BSC 主网
        showQrModal: true, // 显示二维码模态框
        metadata: {
          name: 'DApp Test',
          description: 'eth_signTransaction 测试',
          url: typeof window !== 'undefined' ? window.location.origin : '',
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      })

      // 连接钱包
      setStatus('等待钱包连接...')
      const accounts = await ethereumProvider.enable()

      console.log('✅ WalletConnect 已连接:', accounts)
      setProvider(ethereumProvider)
      setAddress(accounts[0])
      setIsConnected(true)
      setStatus('✅ WalletConnect 连接成功！')

      // 监听断开连接事件
      ethereumProvider.on('disconnect', () => {
        console.log('WalletConnect 已断开')
        setProvider(null)
        setAddress('')
        setIsConnected(false)
        setStatus('WalletConnect 已断开')
      })

      // 监听账户变化
      ethereumProvider.on('accountsChanged', (accounts: string[]) => {
        console.log('账户已变化:', accounts)
        if (accounts.length > 0) {
          setAddress(accounts[0])
        } else {
          setAddress('')
          setIsConnected(false)
        }
      })

    } catch (err: any) {
      console.error('❌ WalletConnect 连接失败:', err)
      setStatus(`连接失败: ${err.message || err.toString()}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (provider) {
      await provider.disconnect()
      setProvider(null)
      setAddress('')
      setIsConnected(false)
      setStatus('已断开连接')
    }
  }

  const handleSignTransaction = async () => {
    console.log('=== 开始 WalletConnect 签名流程 ===')
    console.log('address:', address)
    console.log('recipient:', recipient)
    console.log('amount:', amount)

    if (!address || !provider) {
      setStatus('请先连接 WalletConnect！')
      return
    }

    try {
      setIsLoading(true)
      setStatus('准备交易...')
      setSignedTx('')

      // 强制切换到 BSC 主网
      const bscChainId = '0x38' // BSC 主网 (56)
      console.log('切换到 BSC 主网...')
      setStatus('切换到 BSC 主网...')

      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: bscChainId }],
        })
        console.log('✅ 已切换到 BSC 主网')
      } catch (switchError: any) {
        // 如果 BSC 网络不存在，添加它
        if (switchError.code === 4902) {
          console.log('BSC 网络不存在，添加中...')
          setStatus('添加 BSC 网络...')
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: bscChainId,
                chainName: 'BNB Smart Chain',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18,
                },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com'],
              },
            ],
          })
          console.log('✅ BSC 网络已添加')
        } else {
          throw switchError
        }
      }

      // 重新获取当前账户地址（切换网络后地址可能需要刷新）
      console.log('获取当前账户...')
      const accounts = await provider.request({
        method: 'eth_accounts'
      })
      const currentAddress = accounts[0]
      console.log('当前地址:', currentAddress)

      if (!currentAddress) {
        throw new Error('无法获取账户地址')
      }

      // 将 BNB 金额转为 wei (hex)
      const valueInWei = BigInt(parseFloat(amount) * 1e18)
      const valueHex = '0x' + valueInWei.toString(16)

      // 获取账户的 nonce
      console.log('获取 nonce...')
      const nonce = await provider.request({
        method: 'eth_getTransactionCount',
        params: [currentAddress, 'latest']
      })
      console.log('nonce:', nonce)

      // 构建交易对象（与 SignTransaction.tsx 保持完全一致）
      const tx = {
        from: currentAddress,  // 发送地址
        to: currentAddress,    // 给自己转账
        value: valueHex,
        gas: '0x5208',         // 21000
        chainId: bscChainId,   // BSC 主网 (56)
        gasPrice: '0x2FAF080', // 50000000 wei
        nonce: nonce,          // 从区块链获取的交易序号
      }

      console.log('准备签名交易:', tx)
      console.log('交易对象完整内容:', JSON.stringify(tx, null, 2))
      setStatus('请在钱包中签名交易（只签名，不广播）...')

      // 调用 eth_signTransaction - 只签名不广播！
      const signed = await provider.request({
        method: 'eth_signTransaction',
        params: [tx]
      })

      console.log('✅ 签名成功:', signed)
      setSignedTx(signed.signedTx || signed)
      setStatus('✅ 交易已签名（未广播）')
    } catch (err: any) {
      console.error('❌ 签名失败:', err)
      console.error('错误详情:', JSON.stringify(err, null, 2))

      if (err.code === 4001) {
        setStatus('用户拒绝签名')
      } else if (err.code === -32601) {
        setStatus('⚠️ 钱包不支持 eth_signTransaction 方法（错误码: -32601）')
      } else if (err.code === -32603) {
        setStatus('⚠️ 钱包内部错误：大多数钱包不支持 eth_signTransaction')
      } else if (err.message?.includes('not support')) {
        setStatus('⚠️ 当前钱包不支持 eth_signTransaction 方法')
      } else {
        setStatus(`签名失败: ${err.message || err.toString()}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendTransaction = async () => {
    console.log('=== 开始 WalletConnect eth_sendTransaction 流程 ===')
    console.log('address:', address)
    console.log('amount:', amount)

    if (!address || !provider) {
      setStatus('请先连接 WalletConnect！')
      return
    }

    try {
      setIsLoading(true)
      setStatus('准备交易...')
      setTxHash('')

      // 强制切换到 BSC 主网
      const bscChainId = '0x38' // BSC 主网 (56)
      console.log('切换到 BSC 主网...')
      setStatus('切换到 BSC 主网...')

      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: bscChainId }],
        })
        console.log('✅ 已切换到 BSC 主网')
      } catch (switchError: any) {
        // 如果 BSC 网络不存在，添加它
        if (switchError.code === 4902) {
          console.log('BSC 网络不存在，添加中...')
          setStatus('添加 BSC 网络...')
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: bscChainId,
                chainName: 'BNB Smart Chain',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18,
                },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com'],
              },
            ],
          })
          console.log('✅ BSC 网络已添加')
        } else {
          throw switchError
        }
      }

      // 重新获取当前账户地址
      console.log('获取当前账户...')
      const accounts = await provider.request({
        method: 'eth_accounts'
      })
      const currentAddress = accounts[0]
      console.log('当前地址:', currentAddress)

      if (!currentAddress) {
        throw new Error('无法获取账户地址')
      }

      // 将 BNB 金额转为 wei (hex)
      const valueInWei = BigInt(parseFloat(amount) * 1e18)
      const valueHex = '0x' + valueInWei.toString(16)

      // 构建交易对象（eth_sendTransaction 会自动获取 nonce）
      const tx = {
        from: currentAddress,  // 发送地址
        to: currentAddress,    // 给自己转账
        value: valueHex,
        gas: '0x5208',         // 21000
        gasPrice: '0x2FAF080', // 50000000 wei
      }

      console.log('准备发送交易:', tx)
      setStatus('请在钱包中确认交易...')

      // 调用 eth_sendTransaction - 直接发送交易！
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [tx]
      })

      console.log('交易已发送，Hash:', hash)
      setTxHash(hash)
      setStatus(`✅ 交易已发送！Hash: ${hash}`)
    } catch (err: any) {
      console.error('❌ 发送失败:', err)
      console.error('错误详情:', JSON.stringify(err, null, 2))

      if (err.code === 4001) {
        setStatus('用户拒绝交易')
      } else {
        setStatus(`发送失败: ${err.message || err.toString()}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBroadcastTransaction = async () => {
    if (!signedTx || !provider) {
      setStatus('没有已签名的交易！')
      return
    }

    try {
      setIsLoading(true)
      setStatus('广播交易到网络...')

      // 使用 eth_sendRawTransaction 广播已签名的交易
      const hash = await provider.request({
        method: 'eth_sendRawTransaction',
        params: [signedTx]
      })

      console.log('广播成功:', hash)
      setTxHash(hash)
      setStatus(`✅ 交易已广播！Hash: ${hash}`)

      // 清空已签名的交易
      setTimeout(() => {
        setSignedTx('')
      }, 2000)
    } catch (err: any) {
      console.error('广播失败:', err)
      setStatus(`广播失败: ${err.message || err.toString()}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
        <h2 className="text-xl font-bold text-blue-900 mb-2">
          🌐 WalletConnect - eth_signTransaction 演示
        </h2>

        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              使用 WalletConnect 扫码连接移动端钱包
            </p>

            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              {isLoading ? '连接中...' : '🌐 连接 WalletConnect'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 连接信息 */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-600 mb-1">已连接地址</p>
                  <p className="text-sm font-mono text-green-800 break-all">
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  断开
                </button>
              </div>
            </div>

            {/* 接收地址（固定为自己） */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">接收地址</p>
              <p className="text-sm font-mono text-blue-600 break-all">{address}</p>
              <p className="text-xs text-gray-500 mt-1">给自己转账演示</p>
            </div>

            {/* 转账金额（固定） */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">转账金额</p>
              <p className="text-2xl font-bold text-blue-600">0.001 BNB</p>
              <p className="text-xs text-gray-500 mt-1">固定金额，用于演示（BSC 主网）</p>
            </div>

            {/* 钱包信息 */}
            <div className="p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-gray-600">
                使用 WalletConnect 协议调用
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ 部分钱包可能不支持 eth_signTransaction
              </p>
            </div>

            {/* 签名按钮 - eth_signTransaction */}
            <button
              onClick={handleSignTransaction}
              disabled={isLoading || !recipient}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              {isLoading && !signedTx && !txHash ? '签名中...' : '🔐 eth_signTransaction（只签名）'}
            </button>

            {/* 发送按钮 - eth_sendTransaction */}
            <button
              onClick={handleSendTransaction}
              disabled={isLoading || !recipient}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              {isLoading && !signedTx && !txHash ? '发送中...' : '📤 eth_sendTransaction（直接发送）'}
            </button>

            {/* 已签名交易显示 */}
            {signedTx && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-green-800">
                  ✅ 交易已签名（未广播）
                </p>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">签名后的交易数据:</p>
                  <p className="text-xs font-mono text-gray-800 break-all">
                    {signedTx.slice(0, 100)}...
                  </p>
                </div>

                {/* 广播按钮 */}
                <button
                  onClick={handleBroadcastTransaction}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                >
                  {isLoading ? '广播中...' : '📡 广播交易到网络'}
                </button>
              </div>
            )}

            {/* 交易hash显示 */}
            {txHash && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-purple-800">
                  ✅ 交易已发送到网络
                </p>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">交易Hash:</p>
                  <p className="text-xs font-mono text-purple-800 break-all">
                    {txHash}
                  </p>
                </div>
                <a
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  🔍 在 BSCScan 查看交易
                </a>
              </div>
            )}

            {/* 状态显示 */}
            {status && (
              <div className={`p-4 rounded-xl border ${
                status.includes('✅')
                  ? 'bg-green-50 border-green-200'
                  : status.includes('⚠️') || status.includes('失败')
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm ${
                  status.includes('✅')
                    ? 'text-green-800'
                    : status.includes('⚠️') || status.includes('失败')
                    ? 'text-red-800'
                    : 'text-blue-800'
                }`}>
                  {status}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
