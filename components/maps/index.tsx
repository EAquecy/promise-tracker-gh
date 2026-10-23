"use client";
import dynamic from "next/dynamic";

const loading = () => <div className="h-full min-h-[240px] w-full animate-pulse bg-[#E8EEE9]" />;

export const AreaMap = dynamic(() => import("./AreaMapInner"), { ssr: false, loading });
export const ExploreMap = dynamic(() => import("./ExploreMapInner"), { ssr: false, loading });
