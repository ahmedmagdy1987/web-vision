-- Security hardening for the single-Malahi access model. Closes two confirmed
-- authorization gaps found in the final audit. Idempotent; changes no data.
--
-- NOTE ON APPLICATION: this repo's Supabase CLI login does not have access to the
-- live Malahi project, so this migration is committed for correctness and must be
-- applied by an owner via `supabase db push` (or the dashboard SQL editor). The
-- live production risk before applying is low (single org; only trusted owner
-- accounts exist; ordinary users are editors and are already blocked by RLS from
-- changing memberships).

-- 1) No self-service organization creation. The single-Malahi model never lets a
--    user create another org, but create_organization() was still executable from
--    the browser, so any signed-in user could call it and become owner of a new
--    orphan org. `CREATE FUNCTION` grants EXECUTE to PUBLIC by default, and the
--    grants migration also granted it to `authenticated` — so revoking from
--    `authenticated` alone is NOT enough (PUBLIC still confers EXECUTE). Revoke
--    from PUBLIC, anon and authenticated, then restore it ONLY to service_role
--    (trusted server / migrations).
revoke execute on function public.create_organization(text, text) from public;
revoke execute on function public.create_organization(text, text) from anon;
revoke execute on function public.create_organization(text, text) from authenticated;
grant  execute on function public.create_organization(text, text) to service_role;

-- 2) Membership role-escalation + last-owner protection. The members_update /
--    members_delete RLS policies only check the CALLER's role (owner|admin), not
--    the target row or the new role value — so an `admin` could self-promote to
--    `owner` or remove the real owner. RLS cannot compare OLD/NEW, so enforce the
--    invariants in a BEFORE trigger. Service-role / SECURITY-DEFINER paths (signup
--    trigger, ensure-membership fallback, bootstrap, backfill) have no auth.uid()
--    and are intentionally exempt (trusted server provisioning).
create or replace function public.enforce_member_role_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_role public.membership_role;
  owner_count int;
  affected_org uuid := coalesce(new.organization_id, old.organization_id);
begin
  -- Trusted server contexts (service_role, SECURITY DEFINER bootstrap) bypass.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  select role into caller_role
  from public.organization_members
  where organization_id = affected_org and user_id = auth.uid() and status = 'active';

  if tg_op in ('INSERT', 'UPDATE') then
    -- Only an owner may grant / assign the owner role.
    if new.role = 'owner' and coalesce(caller_role, 'viewer') <> 'owner' then
      raise exception 'Only an owner can grant the owner role';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    -- Only an owner may modify an existing owner's membership.
    if old.role = 'owner' and coalesce(caller_role, 'viewer') <> 'owner' then
      raise exception 'Only an owner can modify an owner membership';
    end if;
    -- Never demote the last remaining active owner.
    if old.role = 'owner' and new.role <> 'owner' then
      select count(*) into owner_count
      from public.organization_members
      where organization_id = old.organization_id and role = 'owner' and status = 'active';
      if owner_count <= 1 then
        raise exception 'Cannot demote the last owner';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' and old.role = 'owner' then
    if coalesce(caller_role, 'viewer') <> 'owner' then
      raise exception 'Only an owner can remove an owner membership';
    end if;
    select count(*) into owner_count
    from public.organization_members
    where organization_id = old.organization_id and role = 'owner' and status = 'active';
    if owner_count <= 1 then
      raise exception 'Cannot remove the last owner';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_member_role_rules on public.organization_members;
create trigger trg_member_role_rules
  before insert or update or delete on public.organization_members
  for each row execute function public.enforce_member_role_rules();
