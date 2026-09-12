-- AURA V1.4 / LOT 2D — Tenant guards for core SECURITY DEFINER RPCs

create or replace function public.activity_enrollment_counts()
returns table(activity_id uuid, enrolled_count bigint)
language sql stable security definer set search_path=public
as $$ select e.activity_id,count(*) from public.activity_enrollments e where e.facility_id=public.current_facility_id() and public.current_role() is not null group by e.activity_id $$;

create or replace function public.clinical_message_contacts()
returns table(id uuid, full_name text, role public.app_role)
language sql stable security definer set search_path=public
as $$
 select p.id,p.full_name,fm.role
 from public.profiles p
 join public.facility_memberships fm on fm.user_id=p.id and fm.facility_id=public.current_facility_id() and fm.active=true
 where p.active=true and p.id<>auth.uid() and ((public.current_role()='doctor'::public.app_role and fm.role='nurse'::public.app_role) or (public.current_role()='nurse'::public.app_role and fm.role='doctor'::public.app_role))
 order by p.full_name
$$;

create or replace function public.create_appointment_checked(p_patient_id uuid,p_title text,p_starts_at timestamptz,p_ends_at timestamptz,p_location text default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_facility uuid:=public.current_facility_id();
begin
 if public.current_role() not in ('doctor'::public.app_role,'manager'::public.app_role,'psychologist'::public.app_role,'provider'::public.app_role) then raise exception 'Rôle non autorisé'; end if;
 if p_ends_at<=p_starts_at or nullif(trim(p_title),'') is null then raise exception 'Horaires ou intitulé invalides'; end if;
 if not exists(select 1 from public.facility_memberships fm join public.profiles p on p.id=fm.user_id where fm.facility_id=v_facility and fm.user_id=p_patient_id and fm.active=true and fm.role='patient'::public.app_role and p.active=true) then raise exception 'Patient actif introuvable dans cet établissement'; end if;
 perform pg_advisory_xact_lock(hashtext(v_facility::text||':'||p_patient_id::text));
 if exists(select 1 from public.appointments where facility_id=v_facility and patient_id=p_patient_id and cancelled_at is null and starts_at<p_ends_at and ends_at>p_starts_at) then raise exception 'Conflit : le patient a déjà un rendez-vous sur ce créneau'; end if;
 if exists(select 1 from public.permission_requests where facility_id=v_facility and patient_id=p_patient_id and status in ('approved'::public.permission_status,'departed'::public.permission_status) and departure_at<p_ends_at and return_at>p_starts_at) then raise exception 'Conflit : le patient est en permission sur ce créneau'; end if;
 if exists(select 1 from public.activity_enrollments e join public.activities a on a.id=e.activity_id and a.facility_id=e.facility_id where e.facility_id=v_facility and e.patient_id=p_patient_id and a.active=true and a.starts_at<p_ends_at and a.ends_at>p_starts_at) then raise exception 'Conflit : le patient est inscrit à une activité sur ce créneau'; end if;
 if exists(select 1 from public.appointments where facility_id=v_facility and creator_id=auth.uid() and cancelled_at is null and starts_at<p_ends_at and ends_at>p_starts_at) then raise exception 'Conflit : vous avez déjà un rendez-vous sur ce créneau'; end if;
 if public.current_role()='doctor'::public.app_role and exists(select 1 from public.doctor_schedule_blocks where facility_id=v_facility and doctor_id=auth.uid() and starts_at<p_ends_at and ends_at>p_starts_at) then raise exception 'Conflit : ce créneau est réservé par un rendez-vous externe'; end if;
 insert into public.appointments(facility_id,patient_id,creator_id,title,starts_at,ends_at,location,notes) values(v_facility,p_patient_id,auth.uid(),trim(p_title),p_starts_at,p_ends_at,nullif(trim(p_location),''),nullif(trim(p_notes),'')) returning id into v_id;
 perform public.write_audit('appointment_created','appointment',v_id,jsonb_build_object('patient_id',p_patient_id)); return v_id;
end $$;

create or replace function public.enroll_in_activity(p_activity_id uuid)
returns uuid language plpgsql security definer set search_path=public
as $$ declare a public.activities%rowtype; n integer; e uuid; v_facility uuid:=public.current_facility_id(); begin
 if public.current_role()<>'patient'::public.app_role then raise exception 'Action reservee au patient'; end if;
 select * into a from public.activities where id=p_activity_id and facility_id=v_facility for update;
 if not found then raise exception 'Activite indisponible'; end if;
 select count(*) into n from public.activity_enrollments where facility_id=v_facility and activity_id=p_activity_id;
 if not a.active or a.starts_at<=now() or n>=a.capacity then raise exception 'Activite indisponible'; end if;
 insert into public.activity_enrollments(facility_id,activity_id,patient_id) values(v_facility,p_activity_id,auth.uid()) returning id into e;
 perform public.audit('activity_enrolled','activity',p_activity_id); return e;
end $$;

create or replace function public.mark_activity_attendance(p_enrollment_id uuid,p_status public.attendance_status)
returns void language plpgsql security definer set search_path=public
as $$ declare v_enrollment public.activity_enrollments%rowtype; v_facility uuid:=public.current_facility_id(); begin
 if public.current_role() not in ('doctor'::public.app_role,'manager'::public.app_role,'psychologist'::public.app_role,'provider'::public.app_role,'governance'::public.app_role,'coach'::public.app_role,'admin'::public.app_role) then raise exception 'Rôle non autorisé'; end if;
 if p_status not in ('present'::public.attendance_status,'absent'::public.attendance_status) then raise exception 'Statut de présence invalide'; end if;
 select * into v_enrollment from public.activity_enrollments where id=p_enrollment_id and facility_id=v_facility for update;
 if not found then raise exception 'Inscription introuvable'; end if;
 update public.activity_enrollments set attendance_status=p_status,attendance_marked_at=now(),attendance_marked_by=auth.uid() where id=p_enrollment_id and facility_id=v_facility;
 perform public.write_audit('activity_attendance_marked','activity_enrollment',p_enrollment_id,jsonb_build_object('status',p_status));
end $$;

create or replace function public.mark_appointment_attendance(p_appointment_id uuid,p_status public.attendance_status)
returns void language plpgsql security definer set search_path=public
as $$ declare v_appointment public.appointments%rowtype; v_facility uuid:=public.current_facility_id(); begin
 if p_status not in ('present'::public.attendance_status,'absent'::public.attendance_status) then raise exception 'Statut de présence invalide'; end if;
 select * into v_appointment from public.appointments where id=p_appointment_id and facility_id=v_facility for update;
 if not found then raise exception 'Rendez-vous introuvable'; end if;
 if v_appointment.creator_id<>auth.uid() and public.current_role()<>'admin'::public.app_role then raise exception 'Seul l''intervenant ayant créé le rendez-vous peut enregistrer la présence'; end if;
 update public.appointments set attendance_status=p_status,attendance_marked_at=now(),attendance_marked_by=auth.uid() where id=p_appointment_id and facility_id=v_facility;
 perform public.write_audit('appointment_attendance_marked','appointment',p_appointment_id,jsonb_build_object('status',p_status));
end $$;

create or replace function public.mark_clinical_messages_read(p_sender_id uuid)
returns integer language plpgsql security definer set search_path=public
as $$ declare v_count integer; v_facility uuid:=public.current_facility_id(); begin
 if public.current_role() not in ('doctor'::public.app_role,'nurse'::public.app_role) then raise exception 'Rôle non autorisé'; end if;
 update public.clinical_messages set read_at=now() where facility_id=v_facility and recipient_id=auth.uid() and sender_id=p_sender_id and read_at is null;
 get diagnostics v_count=row_count; return v_count;
end $$;

create or replace function public.notification_recipients(p_patient_id uuid default null)
returns table(full_name text,email text)
language sql stable security definer set search_path=public
as $$
 select p.full_name,p.email from public.profiles p
 join public.facility_memberships fm on fm.user_id=p.id and fm.facility_id=public.current_facility_id() and fm.active=true and fm.role='patient'::public.app_role
 where p.active=true and p.email is not null and (p_patient_id is null or p.id=p_patient_id)
 and ((p_patient_id is not null and public.current_role() in ('doctor'::public.app_role,'manager'::public.app_role,'psychologist'::public.app_role,'provider'::public.app_role,'admin'::public.app_role)) or (p_patient_id is null and public.current_role() in ('governance'::public.app_role,'admin'::public.app_role)))
$$;

create or replace function public.send_clinical_message(p_recipient_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=public
as $$ declare v_sender_role public.app_role; v_recipient_role public.app_role; v_message_id uuid; v_facility uuid:=public.current_facility_id(); begin
 v_sender_role:=public.current_role();
 select fm.role into v_recipient_role from public.facility_memberships fm join public.profiles p on p.id=fm.user_id where fm.facility_id=v_facility and fm.user_id=p_recipient_id and fm.active=true and p.active=true;
 if not ((v_sender_role='doctor'::public.app_role and v_recipient_role='nurse'::public.app_role) or (v_sender_role='nurse'::public.app_role and v_recipient_role='doctor'::public.app_role)) then raise exception 'La messagerie est réservée aux échanges entre médecins et infirmiers'; end if;
 if nullif(trim(p_body),'') is null or char_length(trim(p_body))>2000 then raise exception 'Le message doit contenir entre 1 et 2 000 caractères'; end if;
 insert into public.clinical_messages(facility_id,sender_id,recipient_id,body) values(v_facility,auth.uid(),p_recipient_id,trim(p_body)) returning id into v_message_id;
 perform public.write_audit('clinical_message_sent','clinical_message',v_message_id,jsonb_build_object('recipient_id',p_recipient_id)); return v_message_id;
end $$;
