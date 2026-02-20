function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getCommonPaymentEnv() {
  return {
    baseUrl: required("NEXT_PUBLIC_BASE_URL"),
  };
}

export function getEsewaEnv() {
  return {
    esewaMerchantCode: required("ESEWA_MERCHANT_CODE"),
    esewaSecretKey: required("ESEWA_SECRET_KEY"),
    esewaFormUrl: required("ESEWA_FORM_URL"),
    esewaVerifyUrl: required("ESEWA_VERIFY_URL"),
  };
}

export function getKhaltiEnv() {
  return {
    khaltiSecretKey: required("KHALTI_SECRET_KEY"),
    khaltiInitiateUrl: required("KHALTI_INITIATE_URL"),
    khaltiVerifyUrl: required("KHALTI_VERIFY_URL"),
  };
}
