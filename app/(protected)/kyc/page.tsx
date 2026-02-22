"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Upload,
  User,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  X,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type KycResponse = {
  ok: boolean;
  profile: {
    name: string;
    email: string;
    role: "user" | "seller" | "admin";
    isSellerVerified: boolean;
    kycStatus: "not_submitted" | "pending" | "approved" | "rejected";
  };
  submission: {
    name: string;
    phone: string;
    address: string;
    panNumber: string;
    citizenshipNumber: string;
    documentType: "pan" | "citizenship";
    documentFileId: string;
    status: "pending" | "approved" | "rejected";
    reviewNote: string | null;
  } | null;
};

async function loadKyc(): Promise<KycResponse> {
  const res = await fetch("/api/kyc");
  const json = (await res.json()) as KycResponse & { message?: string };
  if (!res.ok || !json.ok)
    throw new Error(json.message ?? "Unable to load KYC data.");
  return json;
}

// ── Status banner ───────────────────────────────────────────────────────────
const STATUS_BANNERS = {
  pending: {
    icon: Clock3,
    title: "KYC Under Review",
    description:
      "Your submission is being reviewed by our team. We'll notify you once a decision is made.",
    className:
      "border-yellow-500/30 bg-yellow-500/8 [&_svg]:text-yellow-600 dark:[&_svg]:text-yellow-400",
    titleClass: "text-yellow-700 dark:text-yellow-400",
    descClass: "text-yellow-700/80 dark:text-yellow-400/70",
  },
  approved: {
    icon: CheckCircle2,
    title: "KYC Approved",
    description:
      "Your identity has been verified. You can now sell in the BIDBZAR marketplace.",
    className:
      "border-green-500/30 bg-green-500/8 [&_svg]:text-green-600 dark:[&_svg]:text-green-400",
    titleClass: "text-green-700 dark:text-green-400",
    descClass: "text-green-700/80 dark:text-green-400/70",
  },
  rejected: {
    icon: AlertCircle,
    title: "KYC Rejected",
    description: null, // injected from reviewNote
    className:
      "border-destructive/30 bg-destructive/8 [&_svg]:text-destructive",
    titleClass: "text-destructive",
    descClass: "text-destructive/80",
  },
} as const;

// ── Step / section wrapper ──────────────────────────────────────────────────
function FormSection({
  step,
  title,
  icon: Icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
      {/* Left label */}
      <div className="flex items-start gap-3 sm:flex-col sm:gap-2 pt-0.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Step {step}
          </p>
          <p className="text-sm font-semibold text-foreground leading-tight">
            {title}
          </p>
        </div>
      </div>
      {/* Right fields */}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ── Field wrapper ───────────────────────────────────────────────────────────
function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function KycPage() {
  const queryClient = useQueryClient();
  const kycQuery = useQuery({ queryKey: ["kyc-profile"], queryFn: loadKyc });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [citizenshipNumber, setCitizenshipNumber] = useState("");
  const [documentType, setDocumentType] = useState<"pan" | "citizenship">(
    "pan",
  );
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const profile = kycQuery.data?.profile;
    const submission = kycQuery.data?.submission;
    if (!profile) return;
    setName(profile.name ?? "");
    setEmail(profile.email ?? "");
    setPhone(submission?.phone ?? "");
    setAddress(submission?.address ?? "");
    setPanNumber(submission?.panNumber ?? "");
    setCitizenshipNumber(submission?.citizenshipNumber ?? "");
    setDocumentType(submission?.documentType ?? "pan");
  }, [kycQuery.data]);

  const status = kycQuery.data?.profile.kycStatus ?? "not_submitted";
  const canSubmit = status === "not_submitted" || status === "rejected";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!documentFile) {
      setError("Please upload a PNG or JPG/JPEG document.");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", documentFile);
      const uploadRes = await fetch("/api/kyc/upload", {
        method: "POST",
        body: uploadData,
      });
      const uploadJson = (await uploadRes.json()) as {
        ok?: boolean;
        fileId?: string;
        message?: string;
      };
      if (!uploadRes.ok || !uploadJson.ok || !uploadJson.fileId) {
        throw new Error(uploadJson.message ?? "Unable to upload KYC document.");
      }

      const submitRes = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          panNumber,
          citizenshipNumber,
          documentType,
          documentFileId: uploadJson.fileId,
        }),
      });
      const submitJson = (await submitRes.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!submitRes.ok || !submitJson.ok)
        throw new Error(submitJson.message ?? "Unable to submit KYC.");

      setSuccess(submitJson.message ?? "KYC submitted successfully.");
      setDocumentFile(null);
      await queryClient.invalidateQueries({ queryKey: ["kyc-profile"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit KYC.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusBanner =
    status !== "not_submitted" ? STATUS_BANNERS[status] : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Identity Verification
          </h1>
        </div>
        <p className="text-sm text-muted-foreground pl-[2.625rem]">
          Complete your KYC to unlock verified seller access on BIDBZAR.
        </p>
      </div>

      {/* Status banner */}
      {statusBanner && (
        <Alert className={`rounded-xl border ${statusBanner.className}`}>
          <statusBanner.icon className="h-4 w-4" />
          <AlertTitle className={`font-semibold ${statusBanner.titleClass}`}>
            {statusBanner.title}
          </AlertTitle>
          <AlertDescription className={statusBanner.descClass}>
            {status === "rejected"
              ? kycQuery.data?.submission?.reviewNote ||
                "Please update your details and resubmit."
              : statusBanner.description}
          </AlertDescription>
        </Alert>
      )}

      {/* Success / error feedback */}
      {success && (
        <Alert className="rounded-xl border-green-500/30 bg-green-500/8">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-700 dark:text-green-400 font-semibold">
            Submitted!
          </AlertTitle>
          <AlertDescription className="text-green-700/80 dark:text-green-400/70">
            {success}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert
          variant="destructive"
          className="rounded-xl border-destructive/30 bg-destructive/8"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Submission failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">KYC Form</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All fields are required unless noted
            </p>
          </div>
          {/* Status pill */}
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              status === "approved"
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                : status === "pending"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  : status === "rejected"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "approved"
                  ? "bg-green-500"
                  : status === "pending"
                    ? "bg-yellow-500"
                    : status === "rejected"
                      ? "bg-destructive"
                      : "bg-muted-foreground"
              }`}
            />
            {
              {
                not_submitted: "Not Submitted",
                pending: "Under Review",
                approved: "Approved",
                rejected: "Rejected",
              }[status]
            }
          </div>
        </div>

        <form onSubmit={handleSubmit} className="divide-y divide-border">
          {/* Section 1 — Personal Info */}
          <div className="px-6 py-6">
            <FormSection step={1} title="Personal Info" icon={User}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" htmlFor="kyc-name">
                  <Input
                    id="kyc-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={!canSubmit || isSubmitting}
                    placeholder="Your legal full name"
                    className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50"
                  />
                </Field>
                <Field label="Email" htmlFor="kyc-email">
                  <Input
                    id="kyc-email"
                    value={email}
                    disabled
                    readOnly
                    className="h-11 rounded-xl bg-muted/50 border-border text-muted-foreground cursor-not-allowed"
                  />
                </Field>
              </div>
              <Field label="Phone Number" htmlFor="kyc-phone">
                <Input
                  id="kyc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={!canSubmit || isSubmitting}
                  placeholder="Enter your phone number"
                  className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50"
                />
              </Field>
            </FormSection>
          </div>

          {/* Section 2 — Address */}
          <div className="px-6 py-6">
            <FormSection step={2} title="Address" icon={MapPin}>
              <Field label="Full Address" htmlFor="kyc-address">
                <Textarea
                  id="kyc-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  disabled={!canSubmit || isSubmitting}
                  placeholder="Street, City, District, Province"
                  rows={3}
                  className="rounded-xl bg-background border-border focus-visible:ring-primary/50 resize-none"
                />
              </Field>
            </FormSection>
          </div>

          {/* Section 3 — Identity Numbers */}
          <div className="px-6 py-6">
            <FormSection step={3} title="Identity Numbers" icon={CreditCard}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="PAN Number" htmlFor="kyc-pan">
                  <Input
                    id="kyc-pan"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value)}
                    required
                    disabled={!canSubmit || isSubmitting}
                    placeholder="e.g. ABCDE1234F"
                    className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50 font-mono"
                  />
                </Field>
                <Field label="Citizenship Number" htmlFor="kyc-citizenship">
                  <Input
                    id="kyc-citizenship"
                    value={citizenshipNumber}
                    onChange={(e) => setCitizenshipNumber(e.target.value)}
                    required
                    disabled={!canSubmit || isSubmitting}
                    placeholder="e.g. 01-01-00-00000"
                    className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50 font-mono"
                  />
                </Field>
              </div>
            </FormSection>
          </div>

          {/* Section 4 — Document Upload */}
          <div className="px-6 py-6">
            <FormSection step={4} title="Document Upload" icon={FileText}>
              <Field label="Document Type">
                <Select
                  value={documentType}
                  onValueChange={(v) =>
                    setDocumentType(v as "pan" | "citizenship")
                  }
                  disabled={!canSubmit || isSubmitting}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-background border-border focus:ring-primary/50">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pan">PAN Card</SelectItem>
                    <SelectItem value="citizenship">
                      Citizenship Certificate
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Upload Document"
                htmlFor="kyc-doc"
                hint="Accepted formats: PNG, JPG, JPEG. Max size: 5MB."
              >
                {documentFile ? (
                  /* File selected preview */
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Upload className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {documentFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(documentFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDocumentFile(null)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Drop zone */
                  <label
                    htmlFor="kyc-doc"
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer ${!canSubmit || isSubmitting ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Click to upload document
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        PNG, JPG or JPEG
                      </p>
                    </div>
                    <input
                      id="kyc-doc"
                      type="file"
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      className="sr-only"
                      onChange={(e) =>
                        setDocumentFile(e.target.files?.[0] ?? null)
                      }
                      disabled={!canSubmit || isSubmitting}
                    />
                  </label>
                )}
              </Field>
            </FormSection>
          </div>

          {/* Submit footer */}
          <div className="flex items-center justify-between gap-4 bg-muted/30 px-6 py-4">
            <p className="text-xs text-muted-foreground max-w-xs">
              By submitting, you confirm that all information provided is
              accurate and authentic.
            </p>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="h-11 px-8 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </span>
              ) : status === "rejected" ? (
                "Resubmit KYC"
              ) : (
                "Submit KYC →"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
