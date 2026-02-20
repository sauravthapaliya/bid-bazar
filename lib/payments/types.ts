export type PaymentMethod = "esewa" | "khalti";

export interface PaymentRequestData {
  method: PaymentMethod;
  transactionId: string;
  productName: string;
  amount: string;
}
