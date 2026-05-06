REVOKE EXECUTE ON FUNCTION public.has_active_subscription(UUID, TEXT, TEXT[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(UUID, TEXT, TEXT[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(UUID, TEXT, TEXT[]) FROM authenticated;