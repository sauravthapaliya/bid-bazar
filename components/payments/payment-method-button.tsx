import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaymentMethod = "esewa" | "khalti";

const METHOD_CONFIG: Record<
  PaymentMethod,
  {
    label: string;
    logoSrc: string;
    defaultClassName: string;
    outlineClassName: string;
  }
> = {
  esewa: {
    label: "eSewa",
    logoSrc: "/brands/esewa.svg",
    defaultClassName:
      "border border-[#5DAE3A] bg-[#60BB46] text-white hover:bg-[#4FA634]",
    outlineClassName:
      "border border-[#B9DDAA] bg-[#ECF8E7] text-[#2F6E1F] hover:bg-[#DDF2D3]",
  },
  khalti: {
    label: "Khalti",
    logoSrc: "/brands/khalti.svg",
    defaultClassName:
      "border border-[#522A80] bg-[#5C2D91] text-white hover:bg-[#4D2478]",
    outlineClassName:
      "border border-[#D7C8E9] bg-[#F3EFFA] text-[#4A207B] hover:bg-[#E8DDF5]",
  },
};

type PaymentMethodButtonProps = {
  method: PaymentMethod;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: "default" | "sm";
  emphasis?: "solid" | "soft";
  loadingText?: string;
};

export function PaymentMethodButton({
  method,
  onClick,
  disabled,
  loading = false,
  className,
  size = "sm",
  emphasis = "solid",
  loadingText = "Opening...",
}: PaymentMethodButtonProps) {
  const config = METHOD_CONFIG[method];
  const styleClass =
    emphasis === "solid" ? config.defaultClassName : config.outlineClassName;

  return (
    <Button
      type="button"
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn("font-semibold", styleClass, className)}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          <Image
            src={config.logoSrc}
            alt={`${config.label} logo`}
            width={16}
            height={16}
            className="h-4 w-4 rounded-[2px] bg-white p-[1px]"
          />
          {config.label}
        </>
      )}
    </Button>
  );
}
