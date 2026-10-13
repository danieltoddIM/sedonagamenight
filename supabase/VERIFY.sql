-- Run AFTER INSTALL.sql, in a staging Supabase project's SQL Editor.
-- This is a regression smoke test, not a concurrency/load test.
-- All changes are rolled back; no SMS consent is requested and no provider is called.
begin;
do $$
declare
 e uuid; soft_event uuid; base jsonb; one jsonb; two jsonb; three jsonb; edited jsonb;
 one_token text; two_token text; three_token text; result text; held int;
begin
 insert into public.events(date,start_time,end_time,capacity,status)
 values ((now() at time zone 'America/Phoenix')::date+7,'18:30','21:00',2,'open') returning id into e;
 base:=jsonb_build_object('event_id',e,'name','Staging Test Only','adults',1,'kids',0,
  'gluten_free',0,'bringing','nothing','sms_consent',false,'game_preferences',jsonb_build_array('Clue'),
  'learn_games',true,'can_teach',false);
 one:=public.sgn_rsvp(base||jsonb_build_object('phone','+19285550101'),null,false,24,3);
 two:=public.sgn_rsvp(base||jsonb_build_object('phone','+19285550102'),null,false,24,3);
 three:=public.sgn_rsvp(base||jsonb_build_object('phone','+19285550103'),null,false,24,3);
 if one->'signup'->>'status'<>'confirmed' or two->'signup'->>'status'<>'confirmed' or three->'signup'->>'status'<>'waitlist' then
  raise exception 'FAIL: strict-cap allocation';end if;
 one_token:=one->'signup'->>'token';two_token:=two->'signup'->>'token';three_token:=three->'signup'->>'token';
 if length(one_token)<>32 then raise exception 'FAIL: token format';end if;
 select coalesce(sum(adults+kids),0) into held from public.signups where event_id=e and status in('confirmed','offered');
 if held<>2 then raise exception 'FAIL: held-seat accounting';end if;

 -- Knowing an existing phone must not return/overwrite the owner's reservation.
 begin
  perform public.sgn_rsvp(base||jsonb_build_object('phone','+19285550101'),null,false,24,3);
  raise exception 'FAIL: duplicate phone did not require private link';
 exception when others then
  if position('PRIVATE_LINK_REQUIRED' in sqlerrm)=0 then raise;end if;
 end;
 begin
  perform public.sgn_rsvp(base||jsonb_build_object('phone','+19285550102'),one_token,false,24,3);
  raise exception 'FAIL: wrong token accepted';
 exception when others then
  if position('PRIVATE_LINK_REQUIRED' in sqlerrm)=0 then raise;end if;
 end;

 result:=public.sgn_signup_action(one_token,'cancel',null,false,24,3);
 if result<>'cancelled' then raise exception 'FAIL: cancellation';end if;
 if (select status from public.signups where token=three_token)<>'offered' then raise exception 'FAIL: FIFO offer';end if;
 result:=public.sgn_signup_action(three_token,'claim',null,false,24,3);
 if result<>'confirmed' then raise exception 'FAIL: offer claim';end if;
 result:=public.sgn_signup_action(three_token,'reconfirm',null,false,24,3);
 if (select reconfirmed_at from public.signups where token=three_token) is null then raise exception 'FAIL: reconfirmation';end if;

 edited:=public.sgn_rsvp(base||jsonb_build_object('phone','+19285550102','game_preferences',jsonb_build_array('Clue','Scrabble')),two_token,false,24,3);
 if edited->>'outcome'<>'updated' or jsonb_array_length(edited->'signup'->'game_preferences')<>2 then raise exception 'FAIL: private editing';end if;
 begin
  perform public.sgn_rsvp(base||jsonb_build_object('phone','+19285550102','adults',2),two_token,false,24,3);
  raise exception 'FAIL: strict-cap group expansion accepted';
 exception when others then
  if position('GROUP_TOO_LARGE' in sqlerrm)=0 then raise;end if;
 end;

 -- The explicitly configured family-friendly soft cap is intentionally different.
 insert into public.events(date,start_time,end_time,capacity,status)
 values ((now() at time zone 'America/Phoenix')::date+8,'18:30','21:00',1,'open') returning id into soft_event;
 edited:=public.sgn_rsvp(base||jsonb_build_object('event_id',soft_event,'phone','+19285550104','adults',2),null,true,24,3);
 if edited->'signup'->>'status'<>'confirmed' then raise exception 'FAIL: configured soft cap';end if;

 if not public.sgn_rate_limit('staging-'||e,1,600) or public.sgn_rate_limit('staging-'||e,1,600) then raise exception 'FAIL: rate-limit counter';end if;
 if has_function_privilege('anon','public.sgn_rsvp(jsonb,text,boolean,integer,integer)','execute')
 or has_function_privilege('authenticated','public.sgn_signup_action(text,text,uuid,boolean,integer,integer)','execute') then
  raise exception 'FAIL: RPC is exposed to a browser role';end if;
 raise notice 'PASS: staged SQL invariants. The transaction will be rolled back.';
end $$;
rollback;
