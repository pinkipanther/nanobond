"use client";

import { WagmiProvider, createConfig, createStorage, http } from "wagmi";
import { hederaTestnet, hedera } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

type HashPackWindow = Window & {
    hashpack?: { ethereum?: unknown };
    hashpackethereum?: unknown;
    hashPack?: { ethereum?: unknown };
    ethereum?: {
        providers?: Array<Record<string, unknown>>;
        [key: string]: unknown;
    };
};

function getHashPackProvider(): unknown {
    if (typeof window === "undefined") return undefined;
    const w = window as HashPackWindow;

    const fromDirectGlobal =
        w.hashpack?.ethereum ||
        w.hashPack?.ethereum ||
        w.hashpackethereum;

    if (fromDirectGlobal) return fromDirectGlobal;

    const providers = w.ethereum?.providers;

    const rootEth = w.ethereum as Record<string, unknown> | undefined;
    if (rootEth) {
        const rootLooksHashPack =
            rootEth.isHashPack === true ||
            rootEth.isHashpack === true ||
            (typeof rootEth.providerInfo === "object" &&
                rootEth.providerInfo !== null &&
                String((rootEth.providerInfo as Record<string, unknown>).name || "").toLowerCase().includes("hash"));
        if (rootLooksHashPack) return rootEth;
    }

    if (Array.isArray(providers)) {
        const hp = providers.find((p) => {
            const flags = p as Record<string, unknown>;
            return (
                flags.isHashPack === true ||
                flags.isHashpack === true ||
                typeof flags.providerInfo === "object" &&
                    flags.providerInfo !== null &&
                    String((flags.providerInfo as Record<string, unknown>).name || "").toLowerCase().includes("hash")
            );
        });
        if (hp) return hp;
    }

    return undefined;
}

// Hedera Testnet chain ID for explicit use in hooks
export const HEDERA_TESTNET_CHAIN_ID = hederaTestnet.id; // 296
const DEFAULT_WALLETCONNECT_PROJECT_ID = "c84af69e2c6988e104ee4bda8ecece7f";

const wagmiConfig = createConfig({
    chains: [hederaTestnet, hedera],
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
        const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || DEFAULT_WALLETCONNECT_PROJECT_ID;

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
            injected({
                target: () => {
                    const provider = getHashPackProvider();

                    if (!provider) return undefined;

                    return {
                        id: "hashpack",
                        name: "HashPack",
                        provider: provider as any,
                    };
                },
            }),
            ...walletConnectConnectors,
            injected({
                shimDisconnect: true,
            }),
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
