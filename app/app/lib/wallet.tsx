"use client";

import { WagmiProvider, createConfig, createStorage, http } from "wagmi";
import { hederaTestnet, hedera } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { dedicatedWalletConnector } from "@magiclabs/wagmi-connector";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// Hedera chain ID for explicit use in hooks
export const HEDERA_CHAIN_ID = hedera.id; // 295

const wagmiConfig = createConfig({
    chains: [hedera, hederaTestnet],
    multiInjectedProviderDiscovery: true,
    storage: createStorage({
        key: "nanobond-wagmi-v2",
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
    }),
    transports: {
        [hedera.id]: http("https://mainnet.hashio.io/api"),
        [hederaTestnet.id]: http("https://testnet.hashio.io/api"),
    },
    connectors: (() => {
        const isBrowser = typeof window !== "undefined";
        const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
        const magicApiKey = process.env.NEXT_PUBLIC_MAGIC_API_KEY || "pk_live_0000000000000000"; // Fallback to avoid crash if not set

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

        const magicConnector = isBrowser
            ? [
                dedicatedWalletConnector({
                    chains: [hedera, hederaTestnet],
                    options: {
                        apiKey: magicApiKey,
                        isDarkMode: true,
                        magicSdkConfiguration: {
                            network: {
                                rpcUrl: "https://hedera.publicnode.com",
                                chainId: hedera.id,
                            }
                        }
                    },
                }),
            ]
            : [];

        return [
            injected({ shimDisconnect: true }),
            ...walletConnectConnectors,
            ...magicConnector,
        ] as any;
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
