'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { mainnet } from 'wagmi/chains'
import { SignTransaction } from './components/SignTransaction'
import { SendTransaction } from './components/SendTransaction'

// USDT合约地址（Ethereum主网）
const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'

// USDT ERC20 ABI
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [],
    type: 'function'
  }
] as const

export default function Home() {
  const [status, setStatus] = useState('')

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })

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

  const handleSendUSDT = async () => {
    if (!address) {
      setStatus('请先连接钱包！')
      return
    }

    try {
      setStatus('准备发送交易...')

      // 转账0.1 USDT（USDT有6位小数）
      const amount = parseUnits('0.1', 6)

      writeContract({
        address: USDT_ADDRESS,
        abi: USDT_ABI,
        functionName: 'transfer',
        args: [address, amount],
        chainId: mainnet.id,
      })

      setStatus('请在钱包中确认交易...')
    } catch (err: any) {
      console.error('发送交易失败:', err)
      setStatus(`发送失败: ${err.message}`)
    }
  }

  // 监听交易状态变化
  useEffect(() => {
    if (isPending) {
      setStatus('交易已提交，等待确认...')
    } else if (isConfirming) {
      setStatus('交易确认中...')
    } else if (isConfirmed) {
      setStatus('交易成功！')
    } else if (error) {
      setStatus(`交易失败: ${error.message}`)
    }
  }, [isPending, isConfirming, isConfirmed, error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          USDT DApp
        </h1>

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

              <button
                onClick={handleSendUSDT}
                disabled={isPending || isConfirming}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isPending || isConfirming ? '处理中...' : '转账 0.1 USDT 给自己'}
              </button>

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

          {hash && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-xs text-purple-700 mb-1 font-medium">交易哈希:</p>
              <a
                href={`https://etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:text-purple-800 underline break-all"
              >
                {hash}
              </a>
              {isConfirming && (
                <p className="text-xs text-purple-600 mt-2">等待区块确认...</p>
              )}
              {isConfirmed && (
                <p className="text-xs text-green-600 mt-2">✅ 交易已确认</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
