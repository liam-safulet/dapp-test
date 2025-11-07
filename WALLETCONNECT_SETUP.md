# WalletConnect 配置说明

## 1. 获取 WalletConnect Project ID

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 注册/登录账号
3. 创建新项目
4. 复制项目的 **Project ID**

## 2. 配置 Project ID

打开文件 `app/components/WalletConnectSignTransaction.tsx`，找到第 7 行：

```typescript
const WALLET_CONNECT_PROJECT_ID = 'YOUR_PROJECT_ID' // 替换为你的项目ID
```

将 `YOUR_PROJECT_ID` 替换为你从 WalletConnect Cloud 获取的实际 Project ID。

## 3. 使用说明

### 连接钱包
1. 点击 "连接 WalletConnect" 按钮
2. 会弹出二维码模态框
3. 使用支持 WalletConnect 的移动端钱包（如 Trust Wallet、MetaMask Mobile、OKX Wallet 等）扫描二维码
4. 在钱包中确认连接

### 签名交易
1. 连接成功后，点击 "签名 0.001 BNB（不广播）" 按钮
2. 系统会自动切换到 BSC 主网（如果钱包不在 BSC 网络）
3. 在移动端钱包中确认签名请求
4. 签名成功后会显示签名后的交易数据

### 广播交易
1. 签名成功后，可以点击 "广播交易到网络" 按钮
2. 交易会被发送到 BSC 主网

## 4. 功能特性

- ✅ 自动切换到 BSC 主网
- ✅ 如果 BSC 网络不存在，自动添加
- ✅ 支持 eth_signTransaction（只签名不广播）
- ✅ 支持 eth_sendRawTransaction（广播已签名交易）
- ✅ 固定交易参数：
  - gas: 0x5208 (21000)
  - chainId: 0x38 (BSC 主网)
  - gasPrice: 0x2FAF080 (50000000 wei)
  - 动态获取 nonce

## 5. 注意事项

⚠️ **重要**：
- 部分移动端钱包可能不支持 `eth_signTransaction` 方法
- 如果钱包不支持，会返回错误提示
- 确保钱包中有足够的 BNB 来支付 gas 费用
- 这是在 **BSC 主网** 上的真实交易，请谨慎操作

## 6. 支持的钱包

理论上支持所有兼容 WalletConnect v2 的钱包，包括但不限于：
- Trust Wallet
- MetaMask Mobile
- OKX Wallet Mobile
- Rainbow Wallet
- Coinbase Wallet
- 等等...

## 7. 故障排除

### 问题：二维码无法显示
- 确保已正确配置 Project ID
- 检查浏览器控制台是否有错误信息

### 问题：钱包连接后立即断开
- 检查网络连接
- 尝试重新扫描二维码

### 问题：签名失败
- 确保钱包支持 eth_signTransaction 方法
- 检查钱包是否在 BSC 主网上
- 确保账户中有足够的 BNB
