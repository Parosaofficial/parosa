import type { Metadata } from "next";
import SignupFlow from "../SignupFlow";

// /signup (create account) and /signup/details (address + logo) — one form, one URL per step.
export const metadata: Metadata = { title: "Create your account" };
export default function Page() { return <SignupFlow />; }
