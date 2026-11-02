"use client";
import { useEffect } from "react";
import { setReaderInfo, type ReaderInfo } from "@/lib/client/reader-store";

export default function ReaderRegister({ info }: { info: NonNullable<ReaderInfo> }) {
  const key = JSON.stringify(info);
  useEffect(() => {
    setReaderInfo(JSON.parse(key));
    return () => setReaderInfo(null);
  }, [key]);
  return null;
}
