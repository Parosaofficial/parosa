import type { Metadata } from "next";
import AuthScreen from "../AuthScreen";

export const metadata: Metadata = { title: "Staff login" };
export default function Page() { return <AuthScreen />; }
