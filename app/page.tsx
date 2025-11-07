'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { SignTransaction } from './components/SignTransaction'
import { SendTransaction } from './components/SendTransaction'
import { WalletConnectSignTransaction } from './components/WalletConnectSignTransaction'

export default function Home() {
  const [status, setStatus] = useState('')
  const [isWalletReady, setIsWalletReady] = useState(false)

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // 检测钱包扩展是否注入
  useEffect(() => {
    const checkWallet = () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = window.ethereum
        console.log('✅ 钱包已检测到:', {
          isMetaMask: provider.isMetaMask,
          isOkxWallet: provider.isOkxWallet,
          providers: provider.providers?.length || 1
        })
        setIsWalletReady(true)
        setStatus('')
        return true
      }
      return false
    }

    // 立即检查
    if (checkWallet()) return

    console.log('🔍 开始检测钱包扩展...')

    // 如果没检测到，监听各种可能的注入事件
    const handleEthereum = () => {
      console.log('📡 ethereum#initialized 事件触发')
      checkWallet()
    }

    const handleOkxWallet = () => {
      console.log('📡 okxwallet#initialized 事件触发')
      checkWallet()
    }

    const handleLoad = () => {
      console.log('📡 load 事件触发')
      checkWallet()
    }

    window.addEventListener('ethereum#initialized', handleEthereum, { once: true })
    window.addEventListener('okxwallet#initialized', handleOkxWallet, { once: true })
    window.addEventListener('load', handleLoad, { once: true })

    // 轮询检测（最多5秒，每100ms检测一次）
    let attempts = 0
    const maxAttempts = 50
    const interval = setInterval(() => {
      attempts++

      if (checkWallet()) {
        console.log(`✅ 在第 ${attempts} 次尝试时检测到钱包`)
        clearInterval(interval)
      } else if (attempts >= maxAttempts) {
        console.warn('⚠️ 未检测到钱包扩展')
        console.log('请确保：')
        console.log('1. 已安装 OKX Wallet 或 MetaMask 扩展')
        console.log('2. 扩展已启用')
        console.log('3. 尝试刷新页面')
        clearInterval(interval)
        setStatus('⚠️ 未检测到钱包扩展。请确保已安装 OKX/MetaMask 并刷新页面')
        setIsWalletReady(true) // 即使未检测到，也允许用户尝试连接
      }
    }, 100)

    return () => {
      window.removeEventListener('ethereum#initialized', handleEthereum)
      window.removeEventListener('okxwallet#initialized', handleOkxWallet)
      window.removeEventListener('load', handleLoad)
      clearInterval(interval)
    }
  }, [])

  const handleConnect = async () => {
    const injectedConnector = connectors.find(c => c.type === 'injected')
    if (injectedConnector) {
      try {
        setStatus('正在连接钱包...')
        await connect({ connector: injectedConnector })
        setStatus('') // 连接成功，清除状态
      } catch (err) {
        console.error('连接失败:', err)
        if (err && typeof err === 'object' && 'code' in err && err.code === 4001) {
          setStatus('用户拒绝连接')
        } else {
          setStatus('连接失败')
        }
        // 3秒后清除错误消息
        setTimeout(() => setStatus(''), 3000)
      }
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          ETH 交易演示
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          演示 eth_sendTransaction 和 eth_signTransaction
        </p>

        {/* 钱包检测状态 */}
        {!isWalletReady && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 text-center">
              正在检测钱包扩展...
            </p>
          </div>
        )}

        <div className="space-y-4">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={!isWalletReady}
              className={`w-full font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg ${
                isWalletReady
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white hover:shadow-xl transform hover:-translate-y-0.5'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              连接钱包
            </button>
          ) : (
            <>
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-green-800">
                    已连接: {address?.slice(0, 8)}...{address?.slice(-6)}
                  </p>
                  <button
                    onClick={() => disconnect()}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    断开
                  </button>
                </div>
              </div>
              {/* eth_signTransaction 功能 */}
              <SignTransaction />
              {/* eth_sendTransaction 功能 */}
              <SendTransaction />
            </>
          )}

          {status && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">{status}</p>
            </div>
          )}
        </div>

        {/* WalletConnect 独立模块 */}
        <div className="mt-8">
          <WalletConnectSignTransaction />
        </div>
      </div>
    </div>
  )
}
