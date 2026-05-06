const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full border-b border-warning/40 bg-warning/15 px-4 py-1.5 text-center text-[11px] font-medium text-warning">
      Test mode — use card 4242 4242 4242 4242 for the trial checkout.
    </div>
  );
}
