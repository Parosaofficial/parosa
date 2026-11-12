import type { Metadata } from "next";
import NewPassword from "./NewPassword";

export const metadata: Metadata = { title: "Set a new password" };
export default function Page() { return <NewPassword />; }
