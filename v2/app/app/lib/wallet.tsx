"use client";

import {
  AccountId,
  Hbar,
  Transaction,
  TransactionId,
} from "@hashgraph/sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { HEDERA_CHAIN_ID, HEDERA_JSON_RPC_URL, HEDERA_MIRROR_NODE_URL, HEDERA_NETWORK } from "./contracts";
import type UniversalProvider from "@walletconnect/universal-provider";
import {
  HederaProvider,
  HederaAdapter,
  HederaChainDefinition,
  hederaNamespace,
  transactionToBase64String,
} from "@hashgraph/hedera-wallet-connect";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit";
import { sendTransaction as wagmiSendTransaction } from "@wagmi/core";
import type { Config as WagmiConfig } from "@wagmi/core";

type WalletStatus =
  | "idle"
  | "initializing"
  | "pairing"
  | "connected"
  | "wrong-network"
  | "error";

type AccountMirrorResponse = {
  account?: string;
  evm_address?: string | null;
  balance?: {
    balance?: number;
  };
};

type SendTxOptions = {
  description?: string;
};

type SendTxResult = {
  response: unknown;
  transactionId: string;
};

type SendEvmTxOptions = {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
  description?: string;
};

type HederaSignAndExecuteProvider = {
  hedera_getNodeAddresses: () => Promise<{ nodes?: string[] }>;
  hedera_signAndExecuteTransaction: (args: {
    signerAccountId: string;
    transactionList: string;
  }) => Promise<{ transactionId?: string }>;
};

type AppKitInstance = {
  open: (options?: { namespace?: string }) => Promise<void>;
  disconnect: () => Promise<void>;
  subscribeAccount: (
    callback: (account: { address?: string; type?: string }) => void,
    namespace?: string,
  ) => () => void;
  subscribeCaipNetworkChange: (callback: (network?: { caipNetworkId?: string }) => void) => void;
};



type WalletContextValue = {
  status: WalletStatus;
  network: "testnet" | "mainnet";
  accountId: string | null;
  evmAddress: `0x${string}` | null;
  balanceTinybar: bigint | null;
  isConnected: boolean;
  isPairing: boolean;
  pendingTx: string | null;
  lastTxId: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendTx: (transaction: Transaction, options?: SendTxOptions) => Promise<SendTxResult>;
  sendEvmTx: (options: SendEvmTxOptions) => Promise<SendTxResult>;
  clearError: () => void;
};

const queryClient = new QueryClient();
const WalletContext = createContext<WalletContextValue | null>(null);

const metadata = {
  name: "NanoBond V2",
  description: "NanoBond testnet dashboard on Hedera",
  icons: ["https://avatars.githubusercontent.com/u/31002956"],
  url: typeof window === "undefined" ? "https://nanobond.app" : window.location.origin,
};

function getProjectId() {
  return (
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    process.env.NEXT_PUBLIC_HASHCONNECT_PROJECT_ID ??
    ""
  );
}

function normalizeEvmAddress(value?: string | null): `0x${string}` | null {
  if (!value) return null;
  const withPrefix = value.startsWith("0x") ? value : `0x${value}`;
  return /^0x[a-fA-F0-9]{40}$/.test(withPrefix) ? (withPrefix as `0x${string}`) : null;
}

async function loadAccount(accountId: string) {
  const response = await fetch(`${HEDERA_MIRROR_NODE_URL}/api/v1/accounts/${accountId}`);
  if (!response.ok) {
    throw new Error(`Mirror node account lookup failed: ${response.status}`);
  }
  const data = (await response.json()) as AccountMirrorResponse;
  return {
    accountId: data.account ?? accountId,
    evmAddress: normalizeEvmAddress(data.evm_address),
    balanceTinybar: BigInt(data.balance?.balance ?? 0),
  };
}

async function loadAccountByEvmAddress(evmAddress: `0x${string}`) {
  const response = await fetch(`${HEDERA_MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`);
  if (!response.ok) {
    throw new Error(`Mirror node EVM account lookup failed: ${response.status}`);
  }
  const data = (await response.json()) as AccountMirrorResponse;
  return {
    accountId: data.account ?? null,
    evmAddress: normalizeEvmAddress(data.evm_address) ?? evmAddress,
    balanceTinybar: BigInt(data.balance?.balance ?? 0),
  };
}

function extractNativeAccountId(provider: UniversalProvider | null) {
  const namespaces = provider?.session?.namespaces;
  const hederaAccounts = namespaces?.hedera?.accounts ?? [];
  const expectedPrefix = `hedera:${HEDERA_NETWORK}:`;
  const matchingAccount = hederaAccounts.find((account) => account.startsWith(expectedPrefix));
  const anyNativeAccount = matchingAccount ?? hederaAccounts[0];
  const accountId = anyNativeAccount?.split(":").at(-1);
  return accountId && /^0\.0\.\d+$/.test(accountId) ? accountId : null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [appKit, setAppKit] = useState<AppKitInstance | null>(null);
  const [universalProvider, setUniversalProvider] = useState<UniversalProvider | null>(null);
  const [wagmiConfig, setWagmiConfig] = useState<WagmiConfig | null>(null);


  const [status, setStatus] = useState<WalletStatus>("initializing");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [evmAddress, setEvmAddress] = useState<`0x${string}` | null>(null);
  const [balanceTinybar, setBalanceTinybar] = useState<bigint | null>(null);
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrateNativeAccount = useCallback(async (nativeAccountId: string) => {
    setAccountId(nativeAccountId);
    try {
      const info = await loadAccount(nativeAccountId);
      setAccountId(info.accountId);
      setEvmAddress(info.evmAddress);
      setBalanceTinybar(info.balanceTinybar);
      setStatus("connected");
      setError(null);
    } catch (err) {
      setStatus("connected");
      setError(err instanceof Error ? err.message : "Failed to load account");
    }
  }, []);

  const syncWalletAccount = useCallback(
    async (reportedAddress?: string | null, provider: UniversalProvider | null = null) => {
      const nativeAccountId = extractNativeAccountId(provider);
      if (nativeAccountId) {
        await hydrateNativeAccount(nativeAccountId);
        return;
      }

      if (!reportedAddress) {
        setAccountId(null);
        setEvmAddress(null);
        setBalanceTinybar(null);
        setStatus("idle");
        return;
      }

      const address = reportedAddress.includes(":")
        ? reportedAddress.split(":").at(-1) ?? reportedAddress
        : reportedAddress;

      if (/^0\.0\.\d+$/.test(address)) {
        await hydrateNativeAccount(address);
        return;
      }

      const normalizedEvmAddress = normalizeEvmAddress(address);
      if (normalizedEvmAddress) {
        setEvmAddress(normalizedEvmAddress);
        try {
          const info = await loadAccountByEvmAddress(normalizedEvmAddress);
          setAccountId(info.accountId);
          setEvmAddress(info.evmAddress);
          setBalanceTinybar(info.balanceTinybar);
        } catch {
          setAccountId(null);
          setBalanceTinybar(null);
        }
        setStatus("connected");
        setError(null);
      }
    },
    [hydrateNativeAccount],
  );

  useEffect(() => {
    let isMounted = true;
    async function initAppKit() {
      if (typeof window === "undefined") return;
      const projectId = getProjectId();
      if (!projectId) {
        if (isMounted) setStatus("idle");
        return;
      }

      try {
        const evmNetwork = HEDERA_NETWORK === "mainnet"
          ? HederaChainDefinition.EVM.Mainnet
          : HederaChainDefinition.EVM.Testnet;
        const nativeNetwork = HEDERA_NETWORK === "mainnet"
          ? HederaChainDefinition.Native.Mainnet
          : HederaChainDefinition.Native.Testnet;

        const evmAdapter = new WagmiAdapter({
          networks: [evmNetwork],
          projectId,
        });
        setWagmiConfig(evmAdapter.wagmiConfig);

        const hederaNativeAdapter = new HederaAdapter({
          projectId,
          networks: [nativeNetwork],
          namespace: hederaNamespace,
        });

        const provider = (await HederaProvider.init({
          projectId,
          metadata,
        })) as unknown as UniversalProvider;

        if (!isMounted) return;
        setUniversalProvider(provider);

        const kit = createAppKit({
          adapters: [evmAdapter, hederaNativeAdapter],
          // @ts-expect-error expected type mismatch
          universalProvider: provider,
          projectId,
          metadata,
          defaultNetwork: evmNetwork,
          networks: [evmNetwork, nativeNetwork],
        });

        const appKitInstance = kit as unknown as AppKitInstance;
        setAppKit(appKitInstance);
        setStatus("idle");

        appKitInstance.subscribeAccount((account: { address?: string; type?: string }) => {
          if (!isMounted) return;
          void syncWalletAccount(account?.address, provider);
        }, hederaNamespace);

        appKitInstance.subscribeAccount((account: { address?: string; type?: string }) => {
          if (!isMounted || !account?.address || account.address.includes(":")) return;
          void syncWalletAccount(account.address, provider);
        }, "eip155");

        appKitInstance.subscribeCaipNetworkChange((network?: { caipNetworkId?: string }) => {
          if (!isMounted) return;
          const isTestnet = network?.caipNetworkId?.includes("testnet") || network?.caipNetworkId?.includes("296");
          if ((HEDERA_NETWORK === "testnet" && !isTestnet) || (HEDERA_NETWORK === "mainnet" && isTestnet)) {
             setError(`Please switch your wallet network to Hedera ${HEDERA_NETWORK}.`);
          } else {
             setError(null);
          }
        });

      } catch (err) {
        if (isMounted) {
           setStatus("error");
           setError(err instanceof Error ? err.message : "Failed to initialize AppKit");
        }
      }
    }
    
    void initAppKit();
    return () => { isMounted = false; };
  }, [syncWalletAccount]);

  const connect = useCallback(async () => {
    try {
      setError(null);
      if (!appKit) throw new Error("AppKit is not initialized yet.");
      setStatus("pairing");
      await appKit.open();
      // subscribeAccount callbacks handle syncing wallet state after pairing
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Wallet connection failed");
    }
  }, [appKit]);

  const disconnect = useCallback(async () => {
    try {
      if (appKit) {
        await appKit.disconnect();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setAccountId(null);
      setEvmAddress(null);
      setBalanceTinybar(null);
      setStatus("idle");
      setPendingTx(null);
    }
  }, [appKit]);

  const refreshBalance = useCallback(async () => {
    if (!accountId && !evmAddress) return;
    const account = accountId
      ? await loadAccount(accountId)
      : await loadAccountByEvmAddress(evmAddress as `0x${string}`);
    setEvmAddress(account.evmAddress);
    setAccountId(account.accountId);
    setBalanceTinybar(account.balanceTinybar);
  }, [accountId, evmAddress]);

  const sendTx = useCallback(
    async (transaction: Transaction, options?: SendTxOptions) => {
      if (!accountId || !universalProvider) {
        throw new Error("Connect your wallet first.");
      }
      
      const transactionIdObj = TransactionId.generate(AccountId.fromString(accountId));
      transaction.setTransactionId(transactionIdObj);
      const transactionIdStr = transactionIdObj.toString();

      setPendingTx(options?.description ?? transactionIdStr);
      setError(null);

      try {
        const networkSegment = HEDERA_NETWORK === "mainnet" ? "mainnet" : "testnet";
        const hederaProvider = universalProvider as unknown as HederaSignAndExecuteProvider;
        const { nodes = [] } = await hederaProvider.hedera_getNodeAddresses();
        const nodeAccountIds = nodes.map((node) => AccountId.fromString(node));
        if (nodeAccountIds.length === 0) {
          throw new Error("Wallet did not return Hedera node account IDs.");
        }

        transaction.setNodeAccountIds(nodeAccountIds).freeze();

        const result = await hederaProvider.hedera_signAndExecuteTransaction({
          signerAccountId: `hedera:${networkSegment}:${accountId}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transactionList: transactionToBase64String(transaction as any),
        });

        setLastTxId(result.transactionId || transactionIdStr);
        await refreshBalance();
        return { response: result, transactionId: result.transactionId || transactionIdStr };
      } catch (err) {
        let message = err instanceof Error ? err.message : "Transaction rejected or failed";
        if (typeof err === "object" && err !== null && "message" in err) {
           message = String((err as { message?: string }).message);
        }
        setError(message);
        throw new Error(message);
      } finally {
        setPendingTx(null);
      }
    },
    [accountId, universalProvider, refreshBalance],
  );

  const sendEvmTx = useCallback(
    async (options: SendEvmTxOptions) => {
      if (!evmAddress) {
        throw new Error("Connect your wallet first.");
      }
      if (!wagmiConfig) {
        throw new Error("Wallet not initialized.");
      }

      setPendingTx(options.description ?? "Confirm transaction");
      setError(null);

      try {
        const txHash = await wagmiSendTransaction(wagmiConfig, {
          to: options.to,
          data: options.data,
          value: options.value ?? 0n,
        });

        setLastTxId(txHash);
        if (accountId) await refreshBalance();
        return { response: { hash: txHash }, transactionId: txHash };
      } catch (err) {
        let message = err instanceof Error ? err.message : "Transaction rejected or failed";
        if (typeof err === "object" && err !== null && "message" in err) {
          message = String((err as { message?: string }).message);
        }
        setError(message);
        throw new Error(message);
      } finally {
        setPendingTx(null);
      }
    },
    [accountId, evmAddress, wagmiConfig, refreshBalance],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      network: HEDERA_NETWORK,
      accountId,
      evmAddress,
      balanceTinybar,
      isConnected: !!accountId || !!evmAddress,
      isPairing: status === "pairing" || status === "initializing",
      pendingTx,
      lastTxId,
      error,
      connect,
      disconnect,
      refreshBalance,
      sendTx,
      sendEvmTx,
      clearError: () => setError(null),
    }),
    [
      status,
      accountId,
      evmAddress,
      balanceTinybar,
      pendingTx,
      lastTxId,
      error,
      connect,
      disconnect,
      refreshBalance,
      sendTx,
      sendEvmTx,
    ],
  );

  return (
    <WalletContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}

export function tinybarsToHbar(tinybars: bigint | null) {
  if (tinybars === null) return "0.00";
  const whole = tinybars / 100_000_000n;
  const fraction = tinybars % 100_000_000n;
  const fractionText = fraction.toString().padStart(8, "0").replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : `${whole}.00`;
}

export { Hbar };
