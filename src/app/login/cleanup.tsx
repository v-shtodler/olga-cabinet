"use client";
import { useEffect } from "react";
import { clearCaches } from "@/lib/outbox";

/* On the login screen nobody is signed in: drop cached screens of the previous session (the outbox is kept — it belongs to the owner and is sent after login). */
export function LoginCleanup() { useEffect(() => { clearCaches(); }, []); return null; }
