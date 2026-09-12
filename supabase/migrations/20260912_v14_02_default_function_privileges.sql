-- AURA V1.4 / LOT 1 P0 future-proofing
-- Prevent newly created public functions from becoming callable by API roles by default.
-- Every future RPC must be granted explicitly in its own migration after review.

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
