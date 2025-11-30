import { Metadata } from "next";
import { ReactNode } from "react";

import "./global.css";

export const metadata: Metadata = {
    title: "F1GPT",
    description: "The place to go for all your Formula One questions!",
}

type RootLayoutProps = {
    children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}

export default RootLayout;
