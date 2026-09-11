// Base PostgreSQL éphémère : aucune connexion ni modification Supabase.
// npm install --prefix .qa-runtime --no-save --package-lock=false @electric-sql/pglite
// node scripts/test-housekeeping.mjs
import { PGlite } from "../.qa-runtime/node_modules/@electric-sql/pglite/dist/index.js";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
await db.exec((await readFile("supabase/schema.sql", "utf8")).replace("create extension if not exists pgcrypto;", ""));
await db.exec(await readFile("supabase/migrations/20260911_v12_01_technical_role.sql", "utf8"));
await db.exec(await readFile("supabase/migrations/20260911_v12_02_housekeeping.sql", "utf8"));
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; console.log("✓ " + message); };
const first = async (sql, values = []) => (await db.query(sql, values)).rows[0];
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
async function as(n) { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id(n)]); await db.exec("set role authenticated"); }
async function owner() { await db.exec("reset role"); }
async function rejects(sql, values, message) { await assert.rejects(db.query(sql, values), undefined, message); checks++; console.log("✓ " + message); }
const today = (await first("select (now() at time zone 'Europe/Paris')::date::text d")).d;
const tomorrow = (await first("select ((now() at time zone 'Europe/Paris')::date+1)::text d")).d;
const yesterday = (await first("select ((now() at time zone 'Europe/Paris')::date-1)::text d")).d;
const roles = ["governance", "reception", "nurse", "patient", "patient", "admin", ...Array(10).fill("technical")];
for (let i=0;i<roles.length;i++) {
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)", [id(i+1), `test${i}@example.test`, JSON.stringify({full_name:`Fiction ${i+1}`})]);
  await db.query("update public.profiles set role=$2::public.app_role where id=$1",[id(i+1),roles[i]]);
}
const stay = (await first("insert into patient_stays(patient_id,room_number,started_at) values($1,'101',now()-interval '7 days') returning id",[id(4)])).id;
await db.query("insert into permission_requests(patient_id,stay_id,departure_at,return_at,status,departed_at,returned_at) values($1,$2,($3::date-1+time '09:00') at time zone 'Europe/Paris',($3::date+time '09:00') at time zone 'Europe/Paris','returned',($3::date-1+time '09:00') at time zone 'Europe/Paris',($3::date+time '09:00') at time zone 'Europe/Paris')", [id(4),stay,today]);
check(Number((await first("select count(*) c from clinic_rooms")).c)===100,"Référentiel : exactement 100 chambres");
await as(1);
const floors = Array.from({length:8},(_,i)=>id(i+7));
const lifts = [id(15),id(16),id(7)];
await db.query("select housekeeping_save_roster($1,$2,$3)",[today,floors,lifts]);
let dashboard = (await first("select housekeeping_dashboard($1) d",[today])).d;
check(dashboard.tasks.length===120,"99 chambres et 21 passages communs (retour 24 h exclu)");
check(!dashboard.tasks.some(t=>t.target==='101'),"La chambre du retour après 24 h est masquée");
check(dashboard.rooms.find(r=>r.number==='101').occupied,"Une permission ne libère pas la chambre");
check(JSON.stringify(dashboard.meals.map(m=>m.count))==='[0,1,1]',"Repas : patient absent à 8 h, présent à 12 h et 19 h");
check(!JSON.stringify(dashboard).includes(id(4)),"Aucun identifiant patient dans la réponse hôtelière");
await rejects("select housekeeping_save_roster($1,$2,$3)",[today,Array(8).fill(id(7)),lifts],"Refus des postes d’étage attribués plusieurs fois au même agent");
await rejects("select housekeeping_save_roster($1,$2,$3)",[yesterday,floors,lifts],"Historique des affectations protégé");
await rejects("select housekeeping_save_roster($1,$2,$3)",[today,[id(4),...floors.slice(1)],lifts],"Un patient ne peut pas être affecté comme agent");
await as(7);
const mine = (await first("select housekeeping_dashboard($1) d",[today])).d;
check(mine.rooms.length===0 && mine.meals.length===0,"Personnel technique : aucune donnée d’occupation ou repas");
check(mine.tasks.every(t=>['floor-0','lift-3'].includes(t.area)),"Un agent voit seulement ses zones, avec cumul étage/ascenseur");
const task = mine.tasks.find(t=>t.target==='001');
await db.query("select housekeeping_complete($1)",[task.id]);
await db.query("select housekeeping_complete($1)",[task.id]);
await owner();
const completed = await first("select * from housekeeping_tasks where id=$1",[task.id]);
check(!!completed.completed_at && completed.completed_by===id(7) && completed.completed_name==='Fiction 7',"Pointage horodaté avec identité de l’agent, double clic idempotent");
await as(7);
await rejects("select housekeeping_complete($1)",[dashboard.tasks.find(t=>t.target==='201').id],"Refus d’un pointage sur un autre étage");
await rejects("update housekeeping_tasks set completed_at=now() where id=$1",[task.id],"Impossible de falsifier directement un pointage");
await rejects("select housekeeping_save_roster($1,$2,$3)",[today,floors,lifts],"Un agent ne peut pas modifier les affectations");
check((await db.query("select * from patient_stays")).rows.length===0,"Les agents n’accèdent pas aux séjours patients");
await as(4);
await rejects("select housekeeping_dashboard($1)",[today],"Le patient ne peut pas ouvrir le tableau hôtelier");
await as(2);
await db.query("select plan_admission($1,'102',$2)",[id(5),`${tomorrow}T10:00`]);
await rejects("select plan_discharge($1,$2,false)",[stay,`${tomorrow}T11:00`],"Les admissions ne peuvent pas prévoir une sortie infirmière");
await as(3);
await rejects("select plan_admission($1,'103',$2)",[id(5),`${tomorrow}T10:00`],"L’infirmier ne peut pas saisir une première entrée");
await db.query("select plan_discharge($1,$2,false)",[stay,`${tomorrow}T11:00`]);
await as(1);
dashboard = (await first("select housekeeping_dashboard($1) d",[tomorrow])).d;
check(JSON.stringify(dashboard.meals.map(m=>m.count))==='[1,1,1]',"Prévisions du lendemain : entrée à 10 h et sortie à 11 h intégrées par service");
check(dashboard.rooms.find(r=>r.number==='102').entry && dashboard.rooms.find(r=>r.number==='101').exit,"Le gouvernant voit les premières entrées et sorties définitives prévues");
await owner();
await db.query("update patient_stays set planned_discharge_at=($1::date+time '23:59') at time zone 'Europe/Paris' where id=$2",[today,stay]);
await as(1);
dashboard = (await first("select housekeeping_dashboard($1) d",[today])).d;
check(dashboard.tasks.some(t=>t.target==='101'),"Une sortie définitive prioritaire rétablit le ménage malgré le retour 24 h");
check(dashboard.tasks.find(t=>t.id===task.id).completed_at,"Le pointage est conservé lors du recalcul");
await owner();
await db.query("update housekeeping_tasks set service_date=$1 where id=$2",[yesterday,task.id]);
await as(1);
check((await first("select housekeeping_dashboard($1) d",[yesterday])).d.tasks.some(t=>t.id===task.id && t.completed_at),"L’historique affiche les pointages des jours précédents");
await as(7);
await rejects("select housekeeping_complete($1)",[task.id],"Refus de pointer une tâche d’un jour passé");
await as(2);
const admission = (await first("select id from planned_admissions where patient_id=$1",[id(5)])).id;
await db.query("select manage_admission($1,'arrive')",[admission]);
await as(1);
check((await first("select housekeeping_dashboard($1) d",[today])).d.meals.every(m=>m.count<=2),"Admission confirmée : le patient n’est jamais compté deux fois");
await as(3);
await db.query("select plan_discharge($1,'',true)",[stay]);
await as(1);
check(!(await first("select housekeeping_dashboard($1) d",[today])).d.rooms.find(r=>r.number==='101').occupied,"La sortie réelle libère la chambre");
await owner();
await db.exec("set role anon");
await rejects("select housekeeping_dashboard($1)",[today],"Aucune exécution anonyme du module");
console.log(`\n${checks} contrôles PostgreSQL réussis.`);
await db.close();
