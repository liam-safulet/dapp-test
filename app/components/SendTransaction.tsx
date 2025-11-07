'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

// 声明 window.ethereum 类型
declare global {
  interface Window {
    ethereum?: any
  }
}

export function SendTransaction() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState('')
  const [txHash, setTxHash] = useState<string>('')
  const [recipient, setRecipient] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasEthereum, setHasEthereum] = useState(false)

  // 固定发送 0.001 ETH
  const amount = '0.001'

  useEffect(() => {
    setHasEthereum(typeof window !== 'undefined' && !!window.ethereum)
  }, [])

  const handleSendTransaction = async () => {
    if (!address || !window.ethereum) {
      setStatus('请先连接钱包！')
      return
    }

    if (!recipient || !recipient.startsWith('0x')) {
      setStatus('请输入有效的接收地址！')
      return
    }

    try {
      setIsLoading(true)
      setStatus('准备交易...')
      setTxHash('')

      // 将 ETH 金额转为 wei (hex)
      const valueInWei = BigInt(parseFloat(amount) * 1e18)
      const valueHex = '0x' + valueInWei.toString(16)

      // 构建交易对象
      const tx = {
        from: address,
        to: recipient,
        value: valueHex,
      }

      console.log('准备发送交易:', tx)
      setStatus('请在钱包中确认交易（签名并广播）...')

      // 调用 eth_sendTransaction - 签名并立即广播！
      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [tx]
      })

      console.log('交易已发送:', hash)
      setTxHash(hash)
      setStatus('✅ 交易已发送到网络，等待确认...')

      // 清空输入
      setTimeout(() => {
        setRecipient('')
      }, 2000)
    } catch (err: any) {
      console.error('发送失败:', err)
      if (err.code === 4001) {
        setStatus('用户拒绝交易')
      } else if (err.code === -32603) {
        setStatus('⚠️ 交易失败：可能是余额不足或 gas 费用过高')
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
          请先连接钱包才能使用发送功能
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
      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
        <h2 className="text-xl font-bold text-green-900 mb-4">
          📤 eth_sendTransaction 演示
        </h2>

        <div className="space-y-4">
          {/* 接收地址输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              接收地址
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* 转账金额（固定） */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">转账金额</p>
            <p className="text-2xl font-bold text-green-600">0.001 ETH</p>
            <p className="text-xs text-gray-500 mt-1">固定金额，用于演示</p>
          </div>

          {/* 方法说明 */}
          <div className="p-3 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">
              使用 window.ethereum 直接调用
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ✅ 所有钱包都支持 eth_sendTransaction
            </p>
          </div>

          {/* 发送按钮 */}
          <button
            onClick={handleSendTransaction}
            disabled={isLoading || !recipient}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {isLoading ? '发送中...' : '📤 发送 0.001 ETH（签名并广播）'}
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
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-green-600 hover:text-green-800 underline break-all"
                >
                  {txHash}
                </a>
              </div>
              <p className="text-xs text-gray-600">
                💡 可在 Etherscan 查看交易状态
              </p>
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

      {/* 说明文档 */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className="text-lg mr-2">📖</span>
          eth_sendTransaction 说明
        </h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start">
            <span className="mr-2">🔐</span>
            <span>eth_sendTransaction 会签名交易并立即广播到网络</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">⚡</span>
            <span>这是最常用的发送交易方式，一步完成签名和广播</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✅</span>
            <span>所有主流钱包（MetaMask、Trust Wallet 等）都支持此方法</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">💡</span>
            <span>返回交易哈希，可用于追踪交易状态</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
