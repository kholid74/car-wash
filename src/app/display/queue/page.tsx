"use client";

import { QueueDisplay } from "@/components/operations";
import { DemoProvider } from "@/lib/store";

export default function Page() {
  return <DemoProvider><QueueDisplay /></DemoProvider>;
}
