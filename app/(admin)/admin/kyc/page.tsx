"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Search,
  X,
  Clock,
  FileCheck,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type KycItem = {
  userId: string;
  name: string;
  email: string;
  role: "user" | "seller" | "admin";
  isSellerVerified: boolean;
  kycStatus: "not_submitted" | "pending" | "approved" | "rejected";
  submission: {
    id: string;
    phone: string;
    address: string;
    panNumber: string;
    citizenshipNumber: string;
    documentType: "pan" | "citizenship";
    documentFileId: string;
    status: "pending" | "approved" | "rejected";
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string | null;
  } | null;
};

async function fetchAdminKyc(): Promise<KycItem[]> {
  const res = await fetch("/api/admin/kyc");
  const json = (await res.json()) as {
    ok?: boolean;
    items?: KycItem[];
    message?: string;
  };
  if (!res.ok || !json.ok || !json.items) {
    throw new Error(json.message ?? "Unable to load KYC queue.");
  }
  return json.items;
}

const STATUS_CONFIG = {
  not_submitted: {
    label: "Not Submitted",
    icon: AlertCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400",
  },
  approved: {
    label: "Approved",
    icon: FileCheck,
    className:
      "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
} as const;

const ROLE_CONFIG = {
  admin: "bg-primary/10 text-primary border-primary/20",
  seller: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  user: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: KycItem["kycStatus"] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 text-xs font-medium px-2 py-0.5 ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function KycDetailRow({
  item,
  isSavingId,
  reviewNote,
  onNoteChange,
  onReview,
}: {
  item: KycItem;
  isSavingId: string | null;
  reviewNote: Record<string, string>;
  onNoteChange: (id: string, value: string) => void;
  onReview: (id: string, action: "approve" | "reject") => void;
}) {
  const [open, setOpen] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const sub = item.submission;
  const isSaving = sub ? isSavingId === sub.id : false;

  const getIdentityValue = (label: string, value: string) => {
    if (!value) return "-";
    if (showIdentity) return value;
    if (label === "PAN Number" || label === "Citizenship No.") {
      return "*".repeat(Math.max(6, value.length));
    }
    return value;
  };

  return (
    <>
      <TableRow
        className="hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={() => setOpen((prev) => !prev)}
      >
          {/* Expand trigger */}
          <TableCell className="w-10 pl-4">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((prev) => !prev);
              }}
              aria-label={open ? "Collapse row" : "Expand row"}
            >
              {open ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </TableCell>

          {/* User */}
          <TableCell className="py-3">
            <div className="text-left w-full">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {item.name || "Unnamed user"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.email}
              </p>
            </div>
          </TableCell>

          {/* User ID */}
          <TableCell className="py-3">
            <div className="text-left">
              <span className="font-mono text-xs text-muted-foreground">
                {item.userId.slice(0, 8)}...
              </span>
            </div>
          </TableCell>

          {/* Role */}
          <TableCell className="py-3">
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 capitalize ${ROLE_CONFIG[item.role]}`}
            >
              {item.role}
            </Badge>
          </TableCell>

          {/* KYC Status */}
          <TableCell className="py-3">
            <StatusBadge status={item.kycStatus} />
          </TableCell>

          {/* Submitted */}
          <TableCell className="py-3 text-xs text-muted-foreground">
            {sub?.createdAt
              ? new Date(sub.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "-"}
          </TableCell>

          {/* Quick actions */}
          <TableCell className="py-3 text-xs text-muted-foreground max-w-[16rem] truncate">
            {sub?.reviewNote?.trim() ? sub.reviewNote : "-"}
          </TableCell>

          {/* Approved date */}
          <TableCell className="py-3 pr-4 text-xs text-muted-foreground">
            {sub?.status === "approved" && sub.reviewedAt
              ? new Date(sub.reviewedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "-"}
          </TableCell>
        </TableRow>

      {/* Expanded detail row */}
      {open && (
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableCell colSpan={8} className="px-6 py-4">
              {sub ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Contact & Identity */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Identity Details
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowIdentity((prev) => !prev)}
                        aria-label={
                          showIdentity
                            ? "Hide identity numbers"
                            : "Show identity numbers"
                        }
                      >
                        {showIdentity ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        {showIdentity ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "Phone", value: sub.phone },
                        { label: "PAN Number", value: sub.panNumber },
                        {
                          label: "Citizenship No.",
                          value: sub.citizenshipNumber,
                        },
                        {
                          label: "Document Type",
                          value: sub.documentType.toUpperCase(),
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-4"
                        >
                          <span className="text-xs text-muted-foreground shrink-0">
                            {label}
                          </span>
                          <span className="text-xs font-medium text-foreground text-right">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Address & Document */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Address & Document
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Address
                        </p>
                        <p className="text-xs font-medium text-foreground">
                          {sub.address || "-"}
                        </p>
                      </div>
                      <Separator className="my-2" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Uploaded Document
                        </p>
                        <a
                          href={`/api/kyc/document/${sub.documentFileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View {sub.documentType.toUpperCase()} document
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Review actions */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Review
                    </p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Review Note (optional)
                        </p>
                        <Textarea
                          rows={3}
                          placeholder="Add a note for the applicant..."
                          value={reviewNote[sub.id] ?? sub.reviewNote ?? ""}
                          onChange={(e) => onNoteChange(sub.id, e.target.value)}
                          disabled={isSaving || sub.status !== "pending"}
                          className="text-xs resize-none bg-background"
                        />
                      </div>

                      {sub.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => onReview(sub.id, "approve")}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 h-8 text-xs gap-1.5"
                            onClick={() => onReview(sub.id, "reject")}
                            disabled={isSaving}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                          <StatusBadge status={sub.status} />
                          <span className="text-xs text-muted-foreground">
                            {sub.reviewNote
                              ? `"${sub.reviewNote}"`
                              : "No note added"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No KYC submission on record.
                </p>
              )}
            </TableCell>
          </TableRow>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: KycItem["kycStatus"];
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${config.className}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function AdminKycPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<
    KycItem["kycStatus"] | "all"
  >("all");

  const query = useQuery({ queryKey: ["admin-kyc"], queryFn: fetchAdminKyc });

  const allItems = query.data ?? [];

  const stats = useMemo(
    () => ({
      pending: allItems.filter((i) => i.kycStatus === "pending").length,
      approved: allItems.filter((i) => i.kycStatus === "approved").length,
      rejected: allItems.filter((i) => i.kycStatus === "rejected").length,
      not_submitted: allItems.filter((i) => i.kycStatus === "not_submitted")
        .length,
    }),
    [allItems],
  );

  const items = useMemo(() => {
    let filtered = allItems;
    if (statusFilter !== "all") {
      filtered = filtered.filter((i) => i.kycStatus === statusFilter);
    }
    const term = search.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((item) =>
        `${item.name} ${item.email} ${item.userId}`
          .toLowerCase()
          .includes(term),
      );
    }
    return filtered;
  }, [allItems, search, statusFilter]);

  async function review(submissionId: string, action: "approve" | "reject") {
    setIsSavingId(submissionId);
    try {
      const res = await fetch(`/api/admin/kyc/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNote: reviewNote[submissionId] || undefined,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok)
        throw new Error(json.message ?? "Unable to save review.");
      await queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    } finally {
      setIsSavingId(null);
    }
  }

  const filterTabs: { label: string; value: KycItem["kycStatus"] | "all" }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Not Submitted", value: "not_submitted" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          KYC Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve identity verification submissions.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Pending Review"
          value={stats.pending}
          status="pending"
        />
        <StatCard label="Approved" value={stats.approved} status="approved" />
        <StatCard label="Rejected" value={stats.rejected} status="rejected" />
        <StatCard
          label="Not Submitted"
          value={stats.not_submitted}
          status="not_submitted"
        />
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 flex-wrap">
            {filterTabs.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
                {value !== "all" && (
                  <span
                    className={`ml-1.5 ${statusFilter === value ? "opacity-70" : "opacity-50"}`}
                  >
                    {stats[value] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
              placeholder="Search name, email, ID..."
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-10 pl-4" />
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">
                  User
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ID
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  KYC Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Submitted
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-4">
                  Review Note
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-4">
                  Approved Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading KYC data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : query.error ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {(query.error as Error).message}
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    No records match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <KycDetailRow
                    key={item.userId}
                    item={item}
                    isSavingId={isSavingId}
                    reviewNote={reviewNote}
                    onNoteChange={(id, val) =>
                      setReviewNote((prev) => ({ ...prev, [id]: val }))
                    }
                    onReview={review}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {items.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {allItems.length}
              </span>{" "}
              records
            </p>
          </div>
        )}
      </div>
    </div>
  );
}



