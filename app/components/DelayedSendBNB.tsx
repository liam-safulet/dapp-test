'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

// BSC 主网配置
const BSC_CHAIN_ID = '0x38' // 56 in hex
const BSC_CHAIN_CONFIG = {
  chainId: BSC_CHAIN_ID,
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/'],
}

export function DelayedSendBNB() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState('')
  const [txHash, setTxHash] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [hasEthereum, setHasEthereum] = useState(false)

  // 固定发送 0.001 BNB
  const amount = '0.001'
  const recipient = address || ''

  useEffect(() => {
    setHasEthereum(typeof window !== 'undefined' && !!window.ethereum)
  }, [])

  // 切换到BSC网络
  const switchToBSC = async () => {
    if (!window.ethereum) return false

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CHAIN_ID }],
      })
      return true
    } catch (switchError: any) {
      // 如果链不存在，尝试添加
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_CHAIN_CONFIG],
          })
          return true
        } catch (addError) {
          console.error('添加BSC网络失败:', addError)
          return false
        }
      }
      console.error('切换网络失败:', switchError)
      return false
    }
  }

  const handleDelayedSend = async () => {
    if (!address || !window.ethereum) {
      setStatus('请先连接钱包！')
      return
    }

    setIsLoading(true)
    setStatus('准备延迟发送...')
    setTxHash('')

    // 开始5秒倒计时
    for (let i = 5; i > 0; i--) {
      setCountdown(i)
      setStatus(`⏰ ${i} 秒后发送交易...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setCountdown(null)

    try {
      setStatus('正在切换到 BSC 网络...')

      // 切换到BSC网络
      const switched = await switchToBSC()
      if (!switched) {
        setStatus('⚠️ 切换到BSC网络失败，请手动切换')
        setIsLoading(false)
        return
      }

      // 将 BNB 金额转为 wei (hex)
      const valueInWei = BigInt(parseFloat(amount) * 1e18)
      const valueHex = '0x' + valueInWei.toString(16)

      // 构建交易对象
      const tx = {
        from: address,
        to: recipient,
        value: valueHex,
      }

      console.log('准备发送BNB交易:', tx)
      setStatus('请在钱包中确认交易...')

      // 调用 eth_sendTransaction
      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [tx]
      })

      console.log('交易已发送:', hash)
      setTxHash(hash)
      setStatus('✅ BNB 交易已发送到 BSC 网络！')

    } catch (err: any) {
      console.error('发送失败:', err)
      if (err.code === 4001) {
        setStatus('用户拒绝交易')
      } else if (err.code === -32603) {
        setStatus('⚠️ 交易失败：可能是 BNB 余额不足')
      } else {
        setStatus(`发送失败: ${err.message || err.toString()}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-sm text-yellow-800">
          请先连接钱包才能使用延迟发送功能
        </p>
      </div>
    )
  }

  if (!hasEthereum) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-sm text-red-800">
          未检测到 window.ethereum，请安装钱包扩展
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
        <h2 className="text-xl font-bold text-yellow-900 mb-4">
          ⏱️ 延迟发送 BNB (BSC)
        </h2>

        <div className="space-y-4">
          {/* 接收地址 */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">接收地址</p>
            <p className="text-sm font-mono text-yellow-600 break-all">{address}</p>
            <p className="text-xs text-gray-500 mt-1">给自己转账演示</p>
          </div>

          {/* 转账金额 */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">转账金额</p>
            <p className="text-2xl font-bold text-yellow-600">0.001 BNB</p>
            <p className="text-xs text-gray-500 mt-1">点击后延迟 5 秒发送</p>
          </div>

          {/* 说明 */}
          <div className="p-3 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">
              点击按钮后将延迟 5 秒，然后切换到 BSC 网络并发送交易
            </p>
          </div>

          {/* 倒计时显示 */}
          {countdown !== null && (
            <div className="p-4 bg-orange-100 border border-orange-300 rounded-xl text-center">
              <p className="text-4xl font-bold text-orange-600">{countdown}</p>
              <p className="text-sm text-orange-700">秒后发送</p>
            </div>
          )}

          {/* 发送按钮 */}
          <button
            onClick={handleDelayedSend}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {isLoading
              ? (countdown !== null ? `${countdown} 秒后发送...` : '发送中...')
              : '⏱️ 延迟 5 秒发送 0.001 BNB'}
          </button>

          {/* 交易哈希显示 */}
          {txHash && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-green-800">
                ✅ 交易已发送
              </p>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">交易哈希:</p>
                <a
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-green-600 hover:text-green-800 underline break-all"
                >
                  {txHash}
                </a>
              </div>
              <p className="text-xs text-gray-600">
                💡 可在 BscScan 查看交易状态
              </p>
            </div>
          )}

          {/* 状态显示 */}
          {status && !countdown && (
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
