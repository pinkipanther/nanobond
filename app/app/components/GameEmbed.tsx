"use client";

import { useState } from "react";

interface GameEmbedProps {
    tokenSymbol: string;
}

const GAMES = [
    {
        id: "snake",
        name: "Neon Snake",
        icon: "🐍",
        color: "var(--acid)",
        description: "Classic snake with neon vibes",
    },
    {
        id: "pong",
        name: "Cyber Pong",
        icon: "🏓",
        color: "var(--cyan)",
        description: "Retro pong in cyberspace",
    },
    {
        id: "memory",
        name: "Asset Match",
        icon: "🧠",
        color: "var(--magenta)",
        description: "Match crypto symbols",
    },
    {
        id: "clicker",
        name: "HBAR Miner",
        icon: "⛏️",
        color: "var(--gold)",
        description: "Click to mine HBAR",
    },
];

function SnakeGame() {
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    return (
        <div
            style={{
                width: "100%",
                height: 320,
                background: "var(--void)",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                border: "1px solid var(--void-border)",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    right: 16,
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    color: "var(--acid)",
                }}
            >
                Score: {score}
            </div>
            <div
                style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 48,
                    marginBottom: 16,
                }}
            >
                🐍
            </div>
            <div
                style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    marginBottom: 16,
                }}
            >
                {gameOver ? "Game Over!" : "Use arrow keys to play"}
            </div>
            <button
                className="btn-primary"
                onClick={() => {
                    setScore(0);
                    setGameOver(false);
                    // Game logic would go here with canvas
                    setTimeout(() => {
                        setScore(Math.floor(Math.random() * 50) + 10);
                        setGameOver(true);
                    }, 2000);
                }}
                style={{ fontSize: 12, padding: "8px 20px" }}
            >
                {gameOver ? "Play Again" : "Start Game"}
            </button>
        </div>
    );
}

function ClickerGame() {
    const [hbar, setHbar] = useState(0);
    const [clickPower, setClickPower] = useState(1);

    return (
        <div
            style={{
                width: "100%",
                height: 320,
                background: "var(--void)",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                border: "1px solid var(--void-border)",
            }}
        >
            <div
                style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    color: "var(--gold)",
                    marginBottom: 8,
                }}
            >
                {hbar.toFixed(2)} ℏ Mined
            </div>
            <button
                onClick={() => setHbar((h) => h + clickPower * 0.001)}
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: "var(--gold)",
                    border: "3px solid var(--gold)",
                    cursor: "pointer",
                    fontSize: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.1s, box-shadow 0.1s",
                    boxShadow: "0 0 30px var(--gold-glow)",
                    marginBottom: 16,
                }}
                onMouseDown={(e) =>
                    ((e.target as HTMLElement).style.transform = "scale(0.9)")
                }
                onMouseUp={(e) =>
                    ((e.target as HTMLElement).style.transform = "scale(1)")
                }
            >
                ⛏️
            </button>
            <div style={{ display: "flex", gap: 8 }}>
                <button
                    className="btn-secondary"
                    onClick={() => {
                        if (hbar >= 0.1) {
                            setHbar((h) => h - 0.1);
                            setClickPower((p) => p + 1);
                        }
                    }}
                    style={{
                        fontSize: 11,
                        padding: "6px 14px",
                        opacity: hbar >= 0.1 ? 1 : 0.4,
                    }}
                >
                    Upgrade (0.1 ℏ)
                </button>
                <div
                    style={{
                        padding: "6px 14px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--text-dim)",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    Power: {clickPower}x
                </div>
            </div>
        </div>
    );
}

function MemoryGame() {
    const symbols = ["₿", "Ξ", "ℏ", "◎", "₿", "Ξ", "ℏ", "◎"];
    const [cards, setCards] = useState(() =>
        symbols.sort(() => Math.random() - 0.5).map((s, i) => ({
            id: i,
            symbol: s,
            flipped: false,
            matched: false,
        }))
    );
    const [selected, setSelected] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);

    const handleClick = (id: number) => {
        if (selected.length === 2) return;
        if (cards[id].flipped || cards[id].matched) return;

        const newCards = [...cards];
        newCards[id].flipped = true;
        setCards(newCards);

        const newSelected = [...selected, id];
        setSelected(newSelected);

        if (newSelected.length === 2) {
            setMoves((m) => m + 1);
            const [a, b] = newSelected;
            if (newCards[a].symbol === newCards[b].symbol) {
                newCards[a].matched = true;
                newCards[b].matched = true;
                setCards(newCards);
                setSelected([]);
            } else {
                setTimeout(() => {
                    newCards[a].flipped = false;
                    newCards[b].flipped = false;
                    setCards([...newCards]);
                    setSelected([]);
                }, 800);
            }
        }
    };

    return (
        <div
            style={{
                width: "100%",
                height: 320,
                background: "var(--void)",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--void-border)",
                padding: 20,
            }}
        >
            <div
                style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--magenta)",
                    marginBottom: 16,
                }}
            >
                Moves: {moves} |{" "}
                {cards.filter((c) => c.matched).length === cards.length
                    ? "🎉 You Win!"
                    : "Match the pairs"}
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                    width: "100%",
                    maxWidth: 280,
                }}
            >
                {cards.map((card) => (
                    <button
                        key={card.id}
                        onClick={() => handleClick(card.id)}
                        style={{
                            aspectRatio: "1",
                            borderRadius: 8,
                            border: `1px solid ${card.matched
                                ? "var(--acid)"
                                : card.flipped
                                    ? "var(--magenta)"
                                    : "var(--void-border)"
                                }`,
                            background: card.flipped || card.matched
                                ? "var(--void-surface)"
                                : "var(--void-elevated)",
                            cursor: "pointer",
                            fontSize: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.3s",
                            color: card.matched ? "var(--acid)" : "var(--text-primary)",
                        }}
                    >
                        {card.flipped || card.matched ? card.symbol : "?"}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function GameEmbed({ tokenSymbol }: GameEmbedProps) {
    const [activeGame, setActiveGame] = useState("clicker");

    const renderGame = () => {
        switch (activeGame) {
            case "snake":
                return <SnakeGame />;
            case "clicker":
                return <ClickerGame />;
            case "memory":
                return <MemoryGame />;
            default:
                return <ClickerGame />;
        }
    };

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                }}
            >
                <div
                    style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 16,
                        color: "var(--text-primary)",
                    }}
                >
                    🎮 Mini Games
                </div>
                <div
                    style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--text-dim)",
                    }}
                >
                    Earn while you wait
                </div>
            </div>

            {/* Game selector */}
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    overflowX: "auto",
                    paddingBottom: 4,
                }}
            >
                {GAMES.filter((g) => g.id !== "pong").map((game) => (
                    <button
                        key={game.id}
                        onClick={() => setActiveGame(game.id)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: `1px solid ${activeGame === game.id ? game.color : "var(--void-border)"
                                }`,
                            background:
                                activeGame === game.id ? "var(--void-surface)" : "transparent",
                            color:
                                activeGame === game.id ? game.color : "var(--text-secondary)",
                            cursor: "pointer",
                            fontFamily: "var(--font-body)",
                            fontSize: 12,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            whiteSpace: "nowrap",
                            transition: "all 0.2s",
                        }}
                    >
                        <span>{game.icon}</span>
                        {game.name}
                    </button>
                ))}
            </div>

            {renderGame()}
        </div>
    );
}
