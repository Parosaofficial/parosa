import type { Metadata } from "next";
import AuthScreen from "./AuthScreen";

export const metadata: Metadata = { title: "Sign in" };
export default function Page() { return <AuthScreen />; }
