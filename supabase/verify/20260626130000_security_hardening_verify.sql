-- READ-ONLY verification for migration 20260626130000_security_hardening.
-- Run AFTER applying the migration. Makes NO changes (catalog reads + SELECT only).
-- Expected result: all six `pass` columns are true.
with checks as (
  -- (1) create_organization NOT executable by normal users, STILL by service_role.
  --     anon + authenticated are members of PUBLIC, so if a PUBLIC grant lingered
  --     they would test true here — this fully captures the PUBLIC case. (Do NOT
  --     pass 'public' to has_function_privilege: it is a pseudo-role and errors.)
  --     The acl detail shows a leading "=X/..." entry if PUBLIC still has EXECUTE.
  select 1 as ord,
    'create_organization revoked from anon/authenticated (+PUBLIC); service_role keeps it' as check,
    format('anon=%s | authenticated=%s | service_role=%s | acl=%s',
      has_function_privilege('anon','public.create_organization(text, text)','EXECUTE'),
      has_function_privilege('authenticated','public.create_organization(text, text)','EXECUTE'),
      has_function_privilege('service_role','public.create_organization(text, text)','EXECUTE'),
      coalesce((select proacl::text from pg_proc
                where proname='create_organization' and pronamespace='public'::regnamespace),
               'DEFAULT (implies PUBLIC=EXECUTE)')) as detail,
    (has_function_privilege('anon','public.create_organization(text, text)','EXECUTE') = false
     and has_function_privilege('authenticated','public.create_organization(text, text)','EXECUTE') = false
     and has_function_privilege('service_role','public.create_organization(text, text)','EXECUTE') = true) as pass

  union all
  -- (2) Role-escalation enforcement function present + SECURITY DEFINER.
  select 2,
    'enforce_member_role_rules() exists + SECURITY DEFINER',
    coalesce((select 'prosecdef='||prosecdef::text from pg_proc
              where proname='enforce_member_role_rules' and pronamespace='public'::regnamespace),'MISSING'),
    exists(select 1 from pg_proc where proname='enforce_member_role_rules'
           and pronamespace='public'::regnamespace and prosecdef)

  union all
  -- (2b) BEFORE INSERT/UPDATE/DELETE trigger active on organization_members.
  select 3,
    'trg_member_role_rules active (BEFORE ins/upd/del)',
    coalesce((select format('tgenabled=%s, tgtype=%s', tgenabled, tgtype) from pg_trigger
              where tgrelid='public.organization_members'::regclass and tgname='trg_member_role_rules'),'MISSING'),
    exists(select 1 from pg_trigger where tgrelid='public.organization_members'::regclass
           and tgname='trg_member_role_rules' and tgenabled='O'
           and (tgtype & 2)=2 and (tgtype & 28)=28)   -- 2=BEFORE; 4+8+16=28 = INSERT+DELETE+UPDATE

  union all
  -- (3) Owner-escalation + last-owner guard clauses present in the function body.
  select 4,
    'owner-escalation + last-owner guards present in function',
    'function source must contain the 3 RAISE guards',
    coalesce((select pg_get_functiondef(oid) like '%Only an owner can grant the owner role%'
                  and pg_get_functiondef(oid) like '%Cannot demote the last owner%'
                  and pg_get_functiondef(oid) like '%Cannot remove the last owner%'
              from pg_proc where proname='enforce_member_role_rules'
                and pronamespace='public'::regnamespace), false)

  union all
  -- (4a) Exactly one organization, and it is Malahi (unchanged).
  select 5,
    'exactly one organization = Malahi',
    coalesce((select string_agg(slug, ',') from public.organizations),'none')
      || ' | count=' || (select count(*) from public.organizations)::text,
    ((select count(*) from public.organizations)=1
     and exists(select 1 from public.organizations
                where id='00000000-0000-4000-8000-000000000001' and slug='malahi'))

  union all
  -- (4b) Malahi still has exactly 2 active owners (unchanged).
  select 6,
    'Malahi has exactly 2 active owners (unchanged)',
    (select format('active_owners=%s, total_members=%s',
        count(*) filter (where role='owner' and status='active'), count(*))
     from public.organization_members
     where organization_id='00000000-0000-4000-8000-000000000001'),
    ((select count(*) from public.organization_members
      where organization_id='00000000-0000-4000-8000-000000000001'
        and role='owner' and status='active')=2)
)
select check, detail, pass from checks order by ord;
