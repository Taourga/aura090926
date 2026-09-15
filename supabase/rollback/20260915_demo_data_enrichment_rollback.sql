-- AURA Demo Clinic — rollback du seul enrichissement de démonstration du 15/09/2026.
-- Ne touche pas aux données qui existaient avant cette passe.
-- À exécuter uniquement si l'on revient aussi à la branche backup-demo-data-before-enrichment-20260915.

begin;

-- Messages ajoutés pendant la passe.
delete from public.clinical_messages where id in (
'80b2e8f0-f1eb-484a-a6ca-d400925ef635','208d0fbc-0ee5-4b04-a569-24a216d9fe31','5b8908bf-d405-4fef-899e-6e0fca7c81f0','3272152a-28ff-401d-b660-823ddc4bcda4','4d8f50b5-4468-414b-b3c4-3cb8f8481306','5c70c84a-8633-42bc-bff9-12c24c9a6bb8','90367204-86a6-47ed-b30c-7315aa5855c9','c1e6294e-3f93-4e33-8f97-dd14354856db','15f579dc-ecac-4aa4-875e-42b0c9540f29','69de2cae-abae-4ca4-8575-842d7675973f','ba30893a-5dff-4bda-89fe-0def077d20d5','25e0f994-9509-48cd-8d3d-fbbbdff828fc'
);

-- Visites ajoutées.
delete from public.visit_notifications where id in (
'2e272ec6-d2d4-4240-aa18-29971eb5f39b','b138de23-a478-435d-bb80-064677ba191d','887c64ba-52f8-4b47-a21e-337a13289235','36948d18-9f24-4a32-baf0-2f8270b3cc18','8d432773-efc3-404f-bb9a-8314fb40fd46','785c5d1f-bbe4-4d69-b0e3-f8ac36a1c9d7','cfb4f5f6-29a8-4bd0-ba50-71e8b4612eeb','dd8bde25-0ac7-4f17-bafb-9ca53560d7bf'
);

-- Permissions ajoutées.
delete from public.permission_requests where id in (
'24157fd8-3995-401e-a838-b9fe04a70f0c','050be95e-6230-41c1-a5ad-f501ec0043dd','ce395ab8-eede-45ad-b0c5-09c8f9eda925'
);

-- Rendez-vous ajoutés.
delete from public.appointments where id in (
'd941623b-050b-4868-b597-19af557df733','cf731805-ada1-4afe-8ace-229aa8be0dad','059baa45-7fdf-455c-b295-bb66dc8683b3','1c3a27e6-c32d-430b-914a-6ac54338b876','47fedf7b-73d3-4fb4-9de9-0a93c07f864f','a44cff7c-ddb3-4f5f-a898-69411afcfe1f','64a82a07-96f6-48d2-bfc1-a2bc56586dae','ff16d710-9ffd-4551-bfc5-39a6fe133652','d782f07b-59c3-4097-b86d-508788a66e21','030f0bf9-d04b-4413-a086-ede09e36615f','772de0e1-8ca8-4dd4-ae2f-e681d8adf8c7','2f8f06c5-8848-473a-bf1e-29b7416c1641'
);

-- Les inscriptions sont supprimées en cascade avec les activités.
delete from public.activities where id in (
'a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000006'
);

-- Retrait des scénarios de contexte.
delete from public.demo_patient_scenarios;

-- Restitution des libellés d'origine du roster.
update public.clinic_patient_roster r set display_name=v.display_name
from (values
('204bc764-06ee-4627-aaab-dfa2a7bc27af','Patient démo 009'),('afdc5a42-8802-41a0-a336-2b05ce46995e','Patient démo 021'),('f4f070bb-2a30-4855-a495-00f3ab6ec2bd','Patient démo 033'),('f3ead54a-6867-4291-9d3f-d9083a44097e','Patient démo 045'),('41907d6b-c647-40ba-b706-8aafac70f008','Patient démo 006'),('bfddb4e1-581a-4327-b479-6c166c71e6e4','Patient démo 018'),('31a90135-0944-437f-932d-683933d31b78','Patient démo 030'),('eb7df524-daac-43cf-bde5-c103c623156c','Patient démo 015'),('dffaad69-0779-46fa-beeb-988b601f3f54','Patient démo 027'),('36a39077-911f-4269-b422-15b00bf1ae74','Patient démo 039'),('e4bec024-55e1-4507-ada3-ebe73d405386','Patient démo 012'),('f50c15db-bcc1-483f-888b-eec486d50e69','Patient démo 024'),('76b419ff-8cda-4b4f-bf4a-7506bace92d3','Patient démo 036'),('ed86fc9d-5734-4492-b489-bbdbd5f56f76','Patient démo 005'),('0f04283b-21ac-43f3-b854-a282e6d602ab','Patient démo 014'),('77376d76-f8d5-40a1-9898-13b6728dd067','Patient démo 011'),('305f54d4-57ec-4c90-aa19-49950e131f24','Patient démo 008'),('70cccafb-e556-4b3e-8e48-a82d150f5092','Patient démo 013'),('a9e5afc9-ab50-46f0-9d0f-7c33392e806d','Patient démo 010'),('0bc68af4-6f0d-486d-abbe-3fd854fb4dcf','Patient démo 007'),('098022c1-f40a-4b46-8980-e74e54630b90','Patient démo 016')
) as v(id,display_name)
where r.id=v.id::uuid;

commit;

-- Optionnel, uniquement après retour du code à la sauvegarde précédente :
-- drop table public.demo_patient_scenarios;
