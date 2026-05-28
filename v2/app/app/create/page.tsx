"use client";

import { useRouter } from "next/navigation";
import CreateBond from "../components/CreateBond";

export default function CreatePage() {
    const router = useRouter();

    return (
        <div
            style={{
                maxWidth: 1400,
                margin: "0 auto",
                padding: "96px 24px 80px",
            }}
        >
            <CreateBond
                onClose={() => router.push("/")}
                onSuccess={() => router.push("/")}
            />
        </div>
    );
}
