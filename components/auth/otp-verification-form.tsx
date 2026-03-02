"use client";

import type { FormEvent } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type OtpVerificationFormProps = {
  email: string;
  otpCode: string;
  isVerifyingOtp: boolean;
  isResendingOtp: boolean;
  onOtpChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
};

export function OtpVerificationForm({
  email,
  otpCode,
  isVerifyingOtp,
  isResendingOtp,
  onOtpChange,
  onSubmit,
  onResend,
}: OtpVerificationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>

        <div className="space-y-2">
          <Label
            htmlFor="otp-code"
            className="text-xs uppercase tracking-widest text-muted-foreground font-medium"
          >
            6-digit Code
          </Label>

          <div className="flex justify-center">
            <InputOTP
              id="otp-code"
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={otpCode}
              onChange={onOtpChange}
              containerClassName="justify-center"
              autoComplete="one-time-code"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 text-lg font-semibold rounded-l-xl" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg font-semibold" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg font-semibold rounded-r-xl" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} className="h-12 w-12 text-lg font-semibold rounded-l-xl" />
                <InputOTPSlot index={4} className="h-12 w-12 text-lg font-semibold" />
                <InputOTPSlot index={5} className="h-12 w-12 text-lg font-semibold rounded-r-xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isVerifyingOtp || otpCode.length !== 6}
        className="w-full h-12 rounded-xl text-sm font-bold tracking-tight bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isVerifyingOtp ? "Verifying..." : "Verify OTP and Login"}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full h-12 rounded-xl"
        onClick={onResend}
        disabled={isResendingOtp}
      >
        {isResendingOtp ? "Sending..." : "Resend OTP code"}
      </Button>
    </form>
  );
}
