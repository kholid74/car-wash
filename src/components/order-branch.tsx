"use client";

import type { ReactNode } from "react";
import { currentBranch, selectBranch, type WorkOrder } from "@/lib/domain";
import { useDemo } from "@/lib/store";
import { EmptyState, errorText } from "./ui";

export function OrderBranch({ order, children }: { order: WorkOrder; children: ReactNode }) {
  const { state, update, notify } = useDemo();
  if (order.branchId === state.activeBranchId) return children;
  const branch = currentBranch(state, order.branchId);
  return <EmptyState title={`Pesanan di ${branch.name}`} description="Pilih cabang pesanan untuk melanjutkan pengerjaan."><button className="button primary" onClick={() => { try { update(s => selectBranch(s, branch.id)); } catch (error) { notify(errorText(error)); } }}>Beralih ke {branch.name}</button></EmptyState>;
}
