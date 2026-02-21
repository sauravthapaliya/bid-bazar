"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  if (!res.ok || !json.ok) {
    throw new Error(json.message ?? "Unable to load KYC data.");
  }
  return json;
}

export default function KycPage() {
  const queryClient = useQueryClient();
  const kycQuery = useQuery({ queryKey: ["kyc-profile"], queryFn: loadKyc });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [citizenshipNumber, setCitizenshipNumber] = useState("");
  const [documentType, setDocumentType] = useState<"pan" | "citizenship">("pan");
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
      const uploadRes = await fetch("/api/kyc/upload", { method: "POST", body: uploadData });
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
      const submitJson = (await submitRes.json()) as { ok?: boolean; message?: string };
      if (!submitRes.ok || !submitJson.ok) {
        throw new Error(submitJson.message ?? "Unable to submit KYC.");
      }

      setSuccess(submitJson.message ?? "KYC submitted.");
      setDocumentFile(null);
      await queryClient.invalidateQueries({ queryKey: ["kyc-profile"] });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit KYC.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Complete KYC</CardTitle>
          <CardDescription>
            Submit your details for manual review to unlock verified seller access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {status === "pending" ? (
            <Alert>
              <Clock3 className="h-4 w-4" />
              <AlertTitle>KYC under review</AlertTitle>
              <AlertDescription>
                Your submission is pending admin review. You cannot resubmit until reviewed.
              </AlertDescription>
            </Alert>
          ) : null}

          {status === "approved" ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>KYC approved</AlertTitle>
              <AlertDescription>You are verified and can now sell in the marketplace.</AlertDescription>
            </Alert>
          ) : null}

          {status === "rejected" ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>KYC rejected</AlertTitle>
              <AlertDescription>
                {kycQuery.data?.submission?.reviewNote || "Please update details and submit again."}
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Submission failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Submitted</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="kyc-name">Full name</Label>
              <Input id="kyc-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kyc-email">Email (locked)</Label>
              <Input id="kyc-email" value={email} disabled readOnly />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kyc-phone">Phone</Label>
              <Input id="kyc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kyc-address">Address</Label>
              <textarea
                id="kyc-address"
                className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="kyc-pan">PAN number</Label>
                <Input
                  id="kyc-pan"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kyc-citizenship">Citizenship number</Label>
                <Input
                  id="kyc-citizenship"
                  value={citizenshipNumber}
                  onChange={(e) => setCitizenshipNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Document type</Label>
              <Select
                value={documentType}
                onValueChange={(value) => setDocumentType(value as "pan" | "citizenship")}
                disabled={!canSubmit || isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pan">PAN</SelectItem>
                  <SelectItem value="citizenship">Citizenship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kyc-doc">Document upload (PNG/JPG/JPEG)</Label>
              <Input
                id="kyc-doc"
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                disabled={!canSubmit || isSubmitting}
              />
              {documentFile ? (
                <p className="text-xs text-muted-foreground">
                  <Upload className="mr-1 inline h-3.5 w-3.5" />
                  {documentFile.name}
                </p>
              ) : null}
            </div>

            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit KYC"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
