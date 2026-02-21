"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

export default function AdminKycPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const query = useQuery({ queryKey: ["admin-kyc"], queryFn: fetchAdminKyc });

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return query.data ?? [];
    return (query.data ?? []).filter((item) => {
      const haystack = `${item.name} ${item.email} ${item.userId}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [query.data, search]);

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
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Unable to save review.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    } finally {
      setIsSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>KYC Queue</CardTitle>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            placeholder="Search by name, email, or user id"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? <p className="text-sm text-muted-foreground">Loading KYC data...</p> : null}
        {query.error ? (
          <p className="text-sm text-destructive">
            {(query.error as Error).message || "Unable to load KYC data."}
          </p>
        ) : null}
        {items.map((item) => {
          const submission = item.submission;
          return (
            <div key={item.userId} className="rounded-lg border p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="font-semibold">{item.name || "Unnamed user"}</p>
                <Badge variant="outline">{item.kycStatus}</Badge>
                <Badge variant="outline">{item.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.email}</p>
              <p className="font-mono text-xs text-muted-foreground">{item.userId}</p>

              {submission ? (
                <div className="mt-4 grid gap-2 text-sm">
                  <p><strong>Phone:</strong> {submission.phone}</p>
                  <p><strong>Address:</strong> {submission.address}</p>
                  <p><strong>PAN:</strong> {submission.panNumber}</p>
                  <p><strong>Citizenship:</strong> {submission.citizenshipNumber}</p>
                  <p><strong>Doc type:</strong> {submission.documentType}</p>
                  <p>
                    <strong>Document:</strong>{" "}
                    <a
                      href={`/api/kyc/document/${submission.documentFileId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      View file
                    </a>
                  </p>
                  <Input
                    placeholder="Optional review note"
                    value={reviewNote[submission.id] ?? submission.reviewNote ?? ""}
                    onChange={(e) =>
                      setReviewNote((prev) => ({ ...prev, [submission.id]: e.target.value }))
                    }
                    disabled={isSavingId === submission.id}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => review(submission.id, "approve")}
                      disabled={isSavingId === submission.id || submission.status === "approved"}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => review(submission.id, "reject")}
                      disabled={isSavingId === submission.id || submission.status === "rejected"}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No KYC submission yet.</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
