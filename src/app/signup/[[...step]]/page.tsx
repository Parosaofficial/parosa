import type { Metadata } from "next";
import AuthScreen from "../../login/AuthScreen";

// /signup, /signup/details, /signup/licences, /signup/plan — one form, one URL per step.
export const metadata: Metadata = { title: "Create your restaurant" };
export default function Page() { return <AuthScreen />; }
