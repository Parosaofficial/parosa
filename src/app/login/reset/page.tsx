import type { Metadata } from "next";
import AuthScreen from "../AuthScreen";

export const metadata: Metadata = { title: "Reset your password" };
export default function Page() { return <AuthScreen />; }
