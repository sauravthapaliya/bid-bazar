"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Eye, Loader2, Save, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query-keys";

type Condition = "new" | "like_new" | "excellent" | "good" | "fair" | "poor";
type DurationUnit = "minutes" | "hours" | "days" | "months";
type CategoryOption =
  | "smartphones"
  | "laptops"
  | "tablets"
  | "cameras"
  | "audio"
  | "gaming"
  | "home_appliances"
  | "fashion"
  | "collectibles"
  | "other";

type MyAuctionItem = {
  auctionId: string;
  productId: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  conditionAgeDays: number | null;
  status: string;
  startPrice: number;
  currentPrice: number;
  bidIncrement: number;
  totalBids: number;
  createdAt: string | null;
  endsAt: string | null;
  imageUrl: string | null;
};

type EditFormState = {
  title: string;
  description: string;
  categoryOption: CategoryOption | "";
  customCategory: string;
  condition: Condition;
  conditionAgeDays: string;
  bidIncrement: string;
  startPrice: string;
  durationValue: string;
  durationUnit: DurationUnit;
};

const CONDITIONS: Condition[] = ["new", "like_new", "excellent", "good", "fair", "poor"];
const CATEGORY_OPTIONS: CategoryOption[] = [
  "smartphones",
  "laptops",
  "tablets",
  "cameras",
  "audio",
  "gaming",
  "home_appliances",
  "fashion",
  "collectibles",
  "other",
];
const DURATION_UNITS: DurationUnit[] = ["minutes", "hours", "days", "months"];

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function formatConditionWithAge(condition: string, conditionAgeDays: number | null) {
  const base = formatLabel(condition);
  const shouldShowAge =
    (condition === "new" || condition === "like_new") &&
    typeof conditionAgeDays === "number";
  return shouldShowAge ? `${base} • ${conditionAgeDays} days used` : base;
}

function toDurationHours(value: number, unit: DurationUnit) {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  if (unit === "minutes") return Math.max(1, Math.ceil(value / 60));
  if (unit === "days") return Math.round(value * 24);
  if (unit === "months") return Math.round(value * 24 * 30);
  return Math.round(value);
}

async function fetchMyAuctions(): Promise<MyAuctionItem[]> {
  const res = await fetch("/api/auctions/mine");
  const json = (await res.json()) as {
    ok?: boolean;
    items?: MyAuctionItem[];
    message?: string;
  };
  if (!res.ok || !json.ok || !json.items) {
    throw new Error(json.message ?? "Unable to load auctions.");
  }
  return json.items;
}

export default function MyAuctionsPage() {
  const queryClient = useQueryClient();
  const myAuctionsQuery = useQuery({
    queryKey: queryKeys.myAuctions(),
    queryFn: fetchMyAuctions,
  });

  const items = myAuctionsQuery.data ?? [];
  const isLoading = myAuctionsQuery.isLoading;
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreviewUrl, setNewImagePreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("en-NP", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 0,
      }),
    []
  );

  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  useEffect(() => {
    return () => {
      if (newImagePreviewUrl) URL.revokeObjectURL(newImagePreviewUrl);
    };
  }, [newImagePreviewUrl]);

  function applyNewImage(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setNewImageFile(file);
    setNewImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearNewImage() {
    setNewImageFile(null);
    setNewImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function startEdit(item: MyAuctionItem) {
    const matchedCategory = CATEGORY_OPTIONS.includes(item.category as CategoryOption)
      ? (item.category as CategoryOption)
      : "other";
    setEditingId(item.auctionId);
    setForm({
      title: item.title,
      description: item.description,
      categoryOption: matchedCategory,
      customCategory: matchedCategory === "other" ? item.category : "",
      condition: (CONDITIONS.includes(item.condition as Condition) ? item.condition : "good") as Condition,
      conditionAgeDays: item.conditionAgeDays == null ? "" : String(item.conditionAgeDays),
      bidIncrement: String(item.bidIncrement),
      startPrice: String(item.startPrice),
      durationValue: "",
      durationUnit: "hours",
    });
    clearNewImage();
  }

  function stopEdit() {
    setEditingId(null);
    setForm(null);
    clearNewImage();
  }

  async function saveEdit(auctionId: string) {
    if (!form || isSaving) return;
    const category = form.categoryOption === "other" ? form.customCategory.trim() : form.categoryOption.trim();
    if (!category) return;

    const durationRaw = Number(form.durationValue);
    const durationHours =
      form.durationValue.trim().length > 0
        ? toDurationHours(durationRaw, form.durationUnit)
        : undefined;

    const isNewish = form.condition === "new" || form.condition === "like_new";
    const conditionAgeDays =
      isNewish && form.conditionAgeDays.trim().length > 0
        ? Number(form.conditionAgeDays)
        : null;

    setIsSaving(true);
    try {
      let uploadedFileId: string | undefined = undefined;
      if (newImageFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", newImageFile);
        const uploadRes = await fetch("/api/uploads", { method: "POST", body: uploadForm });
        const uploadJson = (await uploadRes.json()) as { ok?: boolean; fileId?: string; message?: string };
        if (!uploadRes.ok || !uploadJson.ok || !uploadJson.fileId) {
          setError(uploadJson.message ?? "Unable to upload image.");
          return;
        }
        uploadedFileId = uploadJson.fileId;
      }

      const res = await fetch(`/api/auctions/${auctionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          category,
          condition: form.condition,
          conditionAgeDays: isNewish ? conditionAgeDays : null,
          bidIncrement: Number(form.bidIncrement),
          startPrice: Number(form.startPrice),
          durationHours,
          fileId: uploadedFileId,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Unable to update auction.");
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myAuctions() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.liveAuctions() }),
      ]);
      stopEdit();
    } catch {
      setError("Unable to update auction.");
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelAuction(auctionId: string) {
    if (isCancellingId) return;

    setIsCancellingId(auctionId);
    try {
      const res = await fetch(`/api/auctions/${auctionId}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Unable to cancel auction.");
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myAuctions() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.liveAuctions() }),
      ]);
      if (editingId === auctionId) stopEdit();
      setConfirmCancelId(null);
    } catch {
      setError("Unable to cancel auction.");
    } finally {
      setIsCancellingId(null);
    }
  }

  const statusVariant = (status: string): "success" | "warning" | "secondary" | "outline" => {
    if (status === "live") return "success";
    if (status === "expired") return "warning";
    if (status === "ended" || status === "cancelled") return "secondary";
    return "outline";
  };

  return (
    <main className="min-h-screen bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Auctions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Update, track, and control all auctions you created.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard#new">Create New</Link>
          </Button>
        </div>

        {(error || myAuctionsQuery.error) ? (
          <Card className="mb-6 border-destructive/30">
            <CardContent className="p-4 text-sm text-destructive">
              {error ??
                (myAuctionsQuery.error instanceof Error
                  ? myAuctionsQuery.error.message
                  : "Unable to load auctions.")}
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading your auctions...
          </div>
        ) : items.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground">
              No auctions yet. Create your first listing from Dashboard.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {items.map((item) => (
              <Card key={item.auctionId} className="border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{item.title}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Created {item.createdAt ? dateTime.format(new Date(item.createdAt)) : "Unknown"} • Ends{" "}
                        {item.endsAt ? dateTime.format(new Date(item.endsAt)) : "Unknown"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(item.status)}>
                        {item.status}
                      </Badge>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/auctions/${item.auctionId}`}>
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => (editingId === item.auctionId ? stopEdit() : startEdit(item))}
                      >
                        {editingId === item.auctionId ? (
                          <>
                            <X className="mr-1 h-4 w-4" />
                            Close
                          </>
                        ) : (
                          <>
                            <Edit3 className="mr-1 h-4 w-4" />
                            Edit
                          </>
                        )}
                      </Button>
                      <AlertDialog
                        open={confirmCancelId === item.auctionId}
                        onOpenChange={(open) =>
                          setConfirmCancelId(open ? item.auctionId : null)
                        }
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isCancellingId === item.auctionId || item.status === "cancelled"}
                          >
                            {isCancellingId === item.auctionId ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1 h-4 w-4" />
                            )}
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel this auction?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the listing from live market view. You can&apos;t undo this action.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Auction</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => cancelAuction(item.auctionId)}>
                              Yes, Cancel Auction
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {item.description || "No description"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{formatLabel(item.category)}</Badge>
                    <Badge variant="outline">
                      {formatConditionWithAge(item.condition, item.conditionAgeDays)}
                    </Badge>
                    <Badge variant="secondary">{item.totalBids} bids</Badge>
                    <Badge variant="outline">Current {money.format(item.currentPrice)}</Badge>
                  </div>

                  {editingId === item.auctionId && form ? (
                    <div className="overflow-hidden rounded-xl border">
                      <div className="border-b bg-muted/5 px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">Edit Auction</p>
                        <p className="text-xs text-muted-foreground">
                          Update details below and save changes.
                        </p>
                      </div>
                      <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                          <div className="space-y-6 lg:col-span-2">
                            <div className="grid gap-6 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Product Name</Label>
                                <Input
                                  value={form.title}
                                  onChange={(e) => setForm((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                                  minLength={4}
                                  placeholder="e.g., iPhone 15 Pro - Titanium"
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Category</Label>
                                <div className={`grid gap-3 ${form.categoryOption === "other" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                                  <Select
                                    value={form.categoryOption}
                                    onValueChange={(value) =>
                                      setForm((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              categoryOption: value as CategoryOption,
                                              customCategory: value === "other" ? prev.customCategory : "",
                                            }
                                          : prev
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CATEGORY_OPTIONS.map((entry) => (
                                        <SelectItem key={entry} value={entry}>
                                          {entry === "other" ? "Other" : formatLabel(entry)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {form.categoryOption === "other" ? (
                                    <Input
                                      value={form.customCategory}
                                      onChange={(e) =>
                                        setForm((prev) =>
                                          prev ? { ...prev, customCategory: e.target.value } : prev
                                        )
                                      }
                                      placeholder="Type your category"
                                      required
                                    />
                                  ) : null}
                                </div>
                              </div>

                              <div className="space-y-2 sm:col-span-2">
                                <Label>Item Description</Label>
                                <textarea
                                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                                  rows={4}
                                  value={form.description}
                                  onChange={(e) =>
                                    setForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                                  }
                                  placeholder="Provide details about condition, accessories, and any defects..."
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Condition</Label>
                                <div className={`grid gap-3 ${form.condition === "new" || form.condition === "like_new" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                                  <Select
                                    value={form.condition}
                                    onValueChange={(value) =>
                                      setForm((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              condition: value as Condition,
                                              conditionAgeDays:
                                                value === "new" || value === "like_new" ? prev.conditionAgeDays : "",
                                            }
                                          : prev
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select condition" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CONDITIONS.map((entry) => (
                                        <SelectItem key={entry} value={entry}>
                                          {formatLabel(entry)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {form.condition === "new" || form.condition === "like_new" ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      placeholder="Days used"
                                      value={form.conditionAgeDays}
                                      onChange={(e) =>
                                        setForm((prev) =>
                                          prev ? { ...prev, conditionAgeDays: e.target.value } : prev
                                        )
                                      }
                                    />
                                  ) : null}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Extend / Reset Duration (optional)</Label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    placeholder="24"
                                    value={form.durationValue}
                                    onChange={(e) =>
                                      setForm((prev) => (prev ? { ...prev, durationValue: e.target.value } : prev))
                                    }
                                  />
                                  <Select
                                    value={form.durationUnit}
                                    onValueChange={(value) =>
                                      setForm((prev) => (prev ? { ...prev, durationUnit: value as DurationUnit } : prev))
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DURATION_UNITS.map((unit) => (
                                        <SelectItem key={unit} value={unit}>
                                          {formatLabel(unit)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Starting Price (NPR)</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={form.startPrice}
                                  onChange={(e) =>
                                    setForm((prev) => (prev ? { ...prev, startPrice: e.target.value } : prev))
                                  }
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  Start price updates only apply before any bids.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label>Bid Increment (NPR)</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={form.bidIncrement}
                                  onChange={(e) =>
                                    setForm((prev) => (prev ? { ...prev, bidIncrement: e.target.value } : prev))
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-4 lg:col-span-1">
                            <Label className="font-semibold">Gallery Image</Label>
                            {newImagePreviewUrl || item.imageUrl ? (
                              <div className="relative h-[320px] overflow-hidden rounded-xl border bg-slate-50 shadow-sm dark:bg-slate-900">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={newImagePreviewUrl ?? item.imageUrl ?? ""}
                                  alt={form.title}
                                  className="h-full w-full object-contain"
                                />
                                {newImageFile ? (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute right-3 top-3 h-8 w-8 rounded-full shadow-lg"
                                    onClick={clearNewImage}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            ) : (
                              <label
                                className={`flex h-[320px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/10 hover:bg-muted/20"}`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDragOver(true);
                                }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOver(false);
                                  applyNewImage(e.dataTransfer.files?.[0] || null);
                                }}
                              >
                                <div className="p-4 text-center">
                                  <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                                  <p className="text-sm font-medium">Upload Item Photo</p>
                                  <p className="mt-2 text-xs text-muted-foreground">JPG, PNG or WebP</p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => applyNewImage(e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                            <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent">
                              <Upload className="h-4 w-4" />
                              Replace Image
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => applyNewImage(e.target.files?.[0] || null)}
                              />
                            </label>
                            <p className="truncate text-[11px] italic text-muted-foreground">
                              File: {newImageFile ? newImageFile.name : "Current image will be kept"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t pt-6">
                          <p className="text-xs text-muted-foreground">
                            Double-check pricing and duration before saving.
                          </p>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={stopEdit}>
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="lg"
                              className="px-8 font-bold shadow-md"
                              disabled={isSaving}
                              onClick={() => saveEdit(item.auctionId)}
                            >
                              {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
