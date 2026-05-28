"use client";

import { useEffect } from "react";
import { initAnalytics } from "../lib/firebase";

export default function FirebaseAnalytics() {
    useEffect(() => {
        initAnalytics().then((analytics) => {
            if (analytics) {
                console.log("[Firebase] Analytics initialized successfully.");
            }
        }).catch(console.error);
    }, []);

    return null;
}