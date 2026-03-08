"use client";

import { WagmiProvider, createConfig, createStorage, http } from "wagmi";
import { hederaTestnet, hedera } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// Hedera Testnet chain ID for explicit use in hooks
export const HEDERA_TESTNET_CHAIN_ID = hederaTestnet.id; // 296

const wagmiConfig = createConfig({
    chains: [hederaTestnet, hedera],
    multiInjectedProviderDiscovery: true,
    storage: createStorage({
        key: "nanobond-wagmi-v2",
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
    }),
    transports: {
        [hederaTestnet.id]: http("https://testnet.hashio.io/api"),
        [hedera.id]: http("https://mainnet.hashio.io/api"),
    },
    connectors: (() => {
        const isBrowser = typeof window !== "undefined";
        const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

        const walletConnectConnectors = isBrowser && wcProjectId
            ? [
                walletConnect({
                    projectId: wcProjectId,
                    metadata: {
                        name: "NanoBond",
                        description: "NanoBond on Hedera",
                        url: "https://nanobond.app",
                        icons: ["https://avatars.githubusercontent.com/u/31002956"],
                    },
                    showQrModal: true,
                }),
            ]
            : [];

        return [
            injected({ shimDisconnect: true }),
            ...walletConnectConnectors,
        ];
    })(),
});

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
