"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/query-keys";

type AuctionContactRequestFormProps = {
  auctionId: string;
  auctionTitle: string;
  counterpartyLabel: string;
  existingSentAt?: string | null;
  buttonLabel?: string;
};

type AuctionContactRequestResponse = {
  ok?: boolean;
  contactRequest?: {
    auctionId: string;
    sentAt: string | null;
  } | null;
  message?: string;
};

async function fetchAuctionContactRequest(auctionId: string) {
  const res = await fetch(
    `/api/auction-contacts?auctionId=${encodeURIComponent(auctionId)}`
  );
  const json = (await res.json()) as AuctionContactRequestResponse;
  if (!res.ok || !json.ok) {
    throw new Error(json.message ?? "Unable to load contact status.");
  }
  return json.contactRequest ?? null;
}

export function AuctionContactRequestForm({
  auctionId,
  auctionTitle,
  counterpartyLabel,
  existingSentAt,
  buttonLabel,
}: AuctionContactRequestFormProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [preferredContactTime, setPreferredContactTime] = useState("");
  const [note, setNote] = useState("");
  const [sentAt, setSentAt] = useState<string | null>(existingSentAt ?? null);

  const statusQuery = useQuery({
    queryKey: queryKeys.auctionContactRequest(auctionId),
    queryFn: () => fetchAuctionContactRequest(auctionId),
    enabled: existingSentAt == null,
  });

  useEffect(() => {
    if (!senderName.trim() && session?.user?.name) {
      setSenderName(session.user.name);
    }
  }, [senderName, session?.user?.name]);

  useEffect(() => {
    setSentAt(existingSentAt ?? statusQuery.data?.sentAt ?? null);
  }, [existingSentAt, statusQuery.data?.sentAt]);

  const sentLabel = useMemo(() => {
    if (!sentAt) return null;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(sentAt));
  }, [sentAt]);

  const primaryActionLabel = sentAt
    ? buttonLabel
      ? `${buttonLabel} (Resend)`
      : "Share details (Resend)"
    : buttonLabel ?? "Share details";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auction-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auctionId,
          senderName,
          senderPhone,
          meetingLocation,
          preferredContactTime,
          note,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        contactRequest?: { sentAt?: string | null };
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Unable to email contact details.");
      }

      const nextSentAt = json.contactRequest?.sentAt ?? new Date().toISOString();
      setSentAt(nextSentAt);
      setIsOpen(false);
      toast.success("Contact details emailed successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myBids() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myAuctions() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auctionContactRequest(auctionId) }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to email contact details.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border bg-muted/20">
      <CardContent className="p-4">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-foreground">Email contact details</p>
            <Button
              type="button"
              variant={sentAt ? "outline" : "default"}
              size="sm"
              onClick={() => setIsOpen((prev) => !prev)}
            >
              <Mail className="mr-2 h-4 w-4" />
              {isOpen ? "Close form" : primaryActionLabel}
            </Button>
          </div>

          <div className="mt-3">
            <p className="text-xs leading-6 text-muted-foreground">
              Share your phone and meetup details with {counterpartyLabel} for {auctionTitle}.
            </p>
            {sentLabel ? (
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                Last emailed on {sentLabel}.
              </p>
            ) : null}
          </div>
        </div>

        {isOpen ? (
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`contact-name-${auctionId}`}>Your name</Label>
                <Input
                  id={`contact-name-${auctionId}`}
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                  placeholder="Full name"
                  minLength={2}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`contact-phone-${auctionId}`}>Phone number</Label>
                <Input
                  id={`contact-phone-${auctionId}`}
                  value={senderPhone}
                  onChange={(event) => setSenderPhone(event.target.value)}
                  placeholder="98XXXXXXXX"
                  minLength={7}
                  maxLength={30}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`contact-location-${auctionId}`}>Pickup or delivery location</Label>
              <Input
                id={`contact-location-${auctionId}`}
                value={meetingLocation}
                onChange={(event) => setMeetingLocation(event.target.value)}
                placeholder="Kalanki, Kathmandu"
                minLength={3}
                maxLength={240}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`contact-time-${auctionId}`}>Preferred contact time</Label>
              <Input
                id={`contact-time-${auctionId}`}
                value={preferredContactTime}
                onChange={(event) => setPreferredContactTime(event.target.value)}
                placeholder="Weekdays after 6 PM"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`contact-note-${auctionId}`}>Note</Label>
              <Textarea
                id={`contact-note-${auctionId}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Any extra handover or delivery instructions"
                maxLength={1000}
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                The other party will receive this by email and can reply directly.
              </p>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {sentAt ? "Resend email" : "Send email"}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
