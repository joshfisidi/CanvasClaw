"use client";

import dynamic from "next/dynamic";
import { TopNavBar } from "@/components/ui/top-nav-bar";
import { HUD } from "@/components/ui/hud";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });
const BottomMenu = dynamic(() => import("@/components/ui/bottom-menu").then((mod) => mod.BottomMenu), {
  ssr: false,
});
const ZyndrelChatbox = dynamic(() => import("@/components/ui/zyndrel-chatbox").then((mod) => mod.ZyndrelChatbox), {
  ssr: false,
});

export default function Page() {
  return (
    <>
      <GameCanvas />
      <TopNavBar />
      <HUD />
      <ZyndrelChatbox />
      <BottomMenu />
    </>
  );
}
