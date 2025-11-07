'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { SignTransaction } from './components/SignTransaction'
import { SendTransaction } from './components/SendTransaction'

export default function Home() {
  const [status, setStatus] = useState('')

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const handleConnect = async () => {
    const injectedConnector = connectors.find(c => c.type === 'injected')
    if (injectedConnector) {
      try {
        setStatus('正在连接钱包...')
        await connect({ connector: injectedConnector })
        setStatus('') // 连接成功，清除状态
      } catch (err: any) {
        console.error('连接失败:', err)
        if (err.code === 4001) {
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

        <div className="space-y-4">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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

              {/* eth_sendTransaction 功能 */}
              <SendTransaction />

              {/* eth_signTransaction 功能 */}
              <SignTransaction />
            </>
          )}

          {status && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
