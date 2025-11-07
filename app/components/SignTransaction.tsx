'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

// 声明 window.ethereum 类型
declare global {
  interface Window {
    ethereum?: any
  }
}

export function SignTransaction() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState('')
  const [signedTx, setSignedTx] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasEthereum, setHasEthereum] = useState(false)

  // 固定发送 0.001 BNB
  const amount = '0.001'
  // 接收地址直接使用当前连接的地址（给自己转账）
  const recipient = address || ''

  useEffect(() => {
    setHasEthereum(typeof window !== 'undefined' && !!window.ethereum)
  }, [])

  const handleSignTransaction = async () => {
    console.log('=== 开始签名流程 ===')
    console.log('address:', address)
    console.log('recipient:', recipient)
    console.log('amount:', amount)
    console.log('window.ethereum 存在:', !!window.ethereum)

    if (!address || !window.ethereum) {
      setStatus('请先连接钱包！')
      console.log('❌ 检查失败：address 或 window.ethereum 为空')
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
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: bscChainId }],
        })
        console.log('✅ 已切换到 BSC 主网')
      } catch (switchError: any) {
        // 如果 BSC 网络不存在，添加它
        if (switchError.code === 4902) {
          console.log('BSC 网络不存在，添加中...')
          setStatus('添加 BSC 网络...')
          await window.ethereum.request({
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

      // 将 BNB 金额转为 wei (hex)
      const valueInWei = BigInt(parseFloat(amount) * 1e18)
      const valueHex = '0x' + valueInWei.toString(16)

      // 获取账户的 nonce
      console.log('获取 nonce...')
      const nonce = await window.ethereum.request({
        method: 'eth_getTransactionCount',
        params: [address, 'latest']
      })
      console.log('nonce:', nonce)

      // 构建交易对象（固定 BSC 主网参数）
      const tx = {
        from: address,
        to: recipient,
        value: valueHex,
        gas: '0x5208',         // 21000
        chainId: bscChainId,   // BSC 主网 (56)
        gasPrice: '0x2FAF080', // 50000000 wei
        nonce: nonce,          // 从区块链获取的交易序号
      }

      console.log('准备签名交易:', tx)
      setStatus('请在钱包中签名交易（只签名，不广播）...')

      // 调用 eth_signTransaction - 只签名不广播！
      const signed = await window.ethereum.request({
        method: 'eth_signTransaction',
        params: [tx]
      })

      console.log('签名成功:', signed)
      setSignedTx(signed.signedTx)
      setStatus('✅ 交易已签名（未广播）')
    } catch (err: any) {
      console.error('❌ 签名失败:', err)
      console.error('错误详情:', JSON.stringify(err, null, 2))

      if (err.code === 4001) {
        setStatus('用户拒绝签名')
      } else if (err.code === -32601) {
        setStatus('⚠️ 钱包不支持 eth_signTransaction 方法（错误码: -32601）')
      } else if (err.code === -32603) {
        setStatus('⚠️ 钱包内部错误：大多数钱包（如 MetaMask）不支持 eth_signTransaction。请尝试使用 eth_sendTransaction 代替。')
      } else if (err.message?.includes('not support')) {
        setStatus('⚠️ 当前钱包不支持 eth_signTransaction 方法')
      } else {
        setStatus(`签名失败: ${err.message || err.toString()}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBroadcastTransaction = async () => {
    if (!signedTx || !window.ethereum) {
      setStatus('没有已签名的交易！')
      return
    }

    try {
      setIsLoading(true)
      setStatus('广播交易到网络...')

      // 使用 eth_sendRawTransaction 广播已签名的交易
      const txHash = await window.ethereum.request({
        method: 'eth_sendRawTransaction',
        params: [signedTx]
      })

      console.log('广播成功:', txHash)
      setStatus(`✅ 交易已广播！Hash: ${txHash}`)

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

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-sm text-yellow-800">
          请先连接钱包才能使用签名功能
        </p>
      </div>
    )
  }

  if (!hasEthereum) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-sm text-red-800">
          未检测到 window.ethereum，请安装 MetaMask 或其他钱包扩展
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
        <h2 className="text-xl font-bold text-indigo-900 mb-2">
          🔐 eth_signTransaction 演示
        </h2>

        <div className="space-y-4">
          {/* 接收地址（固定为自己） */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">接收地址</p>
            <p className="text-sm font-mono text-indigo-600 break-all">{address}</p>
            <p className="text-xs text-gray-500 mt-1">给自己转账演示</p>
          </div>

          {/* 转账金额（固定） */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">转账金额</p>
            <p className="text-2xl font-bold text-indigo-600">0.001 BNB</p>
            <p className="text-xs text-gray-500 mt-1">固定金额，用于演示（BSC 主网）</p>
          </div>

          {/* 钱包信息 */}
          <div className="p-3 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">
              使用 window.ethereum 直接调用
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ 大多数钱包不支持 eth_signTransaction，会返回错误
            </p>
          </div>

          {/* 签名按钮 */}
          <button
            onClick={handleSignTransaction}
            disabled={isLoading || !recipient}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {isLoading && !signedTx ? '签名中...' : '🔐 签名 0.001 BNB（不广播）'}
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
      </div>

    </div>
  )
}
