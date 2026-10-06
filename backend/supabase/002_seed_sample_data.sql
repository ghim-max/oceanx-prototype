-- 002_seed_sample_data.sql (v2, with impact fields)
-- Labelled SAMPLE data (is_sample = true) written backwards from the 6 test scenarios.
-- Run AFTER 001_schema.sql and 004_impact_fields.sql, in the Supabase SQL editor.
-- Safe to re-run: deletes previous sample rows first. Real rows (is_sample = false) are never touched.

delete from public.learner_responses where is_sample = true;
delete from public.learner_prechecks where is_sample = true;
delete from public.educator_responses where is_sample = true;

-- 34 pre-checks: 30 learners who finished + 4 who dropped off after the pre-check
insert into public.learner_prechecks
  (created_at, session_id, pre_q1, pre_q2, pre_q3, pre_q4, pre_q5, pre_score, confidence_pre, is_sample)
values
('2026-09-22 09:00:00+08', '25f28a98-ed1f-4d0c-975e-94131e03a0bf', true, true, true, false, false, 3, 3, true),
('2026-09-29 09:03:00+08', '93750ab0-d659-4b2d-abcb-8a154d65bd16', true, true, true, false, false, 3, 4, true),
('2026-10-01 09:06:00+08', 'e76b8fc9-2ea0-46b5-9467-4c7eb1c755c5', true, true, false, false, false, 2, 4, true),
('2026-09-22 09:09:00+08', '105a08cf-38ba-4fe9-9b1a-6fe68d950eae', true, true, false, false, false, 2, 3, true),
('2026-09-29 09:12:00+08', '28d211a4-3f70-4b7e-b057-215bca38debb', true, true, false, false, false, 2, 2, true),
('2026-10-01 09:15:00+08', '0bb55940-403a-4610-849e-26a0a2ae51af', true, false, false, false, true, 2, 2, true),
('2026-09-22 09:18:00+08', 'bae20466-220f-432c-a30d-5f460d2b1198', true, false, false, false, true, 2, 2, true),
('2026-09-29 09:21:00+08', '780cb052-48d8-4a95-83ec-4462b26e6ea1', true, false, false, false, true, 2, 2, true),
('2026-10-01 09:24:00+08', 'b4739714-4c96-405e-9e8a-8a81d874c064', true, false, false, false, true, 2, 1, true),
('2026-09-22 09:27:00+08', '27de84cf-acb4-4fb6-9bd5-3e9e9365f441', true, false, false, false, true, 2, 2, true),
('2026-09-29 09:30:00+08', 'f3637680-f109-45c4-a3c2-0e1ee5ce15cb', false, false, false, false, true, 1, 1, true),
('2026-10-01 09:33:00+08', 'e69a17b0-2300-439e-ba46-fa8c2fe20030', false, false, false, true, true, 2, 2, true),
('2026-09-22 09:36:00+08', 'ef8f3bc4-136c-49b6-b468-954305611479', false, false, false, true, true, 2, 2, true),
('2026-09-29 09:39:00+08', 'ed03d72d-9f66-411f-886b-2e5f3c2612ed', false, false, false, true, false, 1, 1, true),
('2026-10-01 09:42:00+08', 'ba0ccf0d-9d5c-4037-adb8-5f8522d4f620', false, false, false, true, false, 1, 1, true),
('2026-09-22 09:45:00+08', 'cbe9c11a-a4c6-4411-b2d5-1458a8eead8f', false, false, false, true, false, 1, 3, true),
('2026-09-29 09:48:00+08', '206b1a1c-af2c-45b6-ade5-c615871b4de0', false, false, false, true, false, 1, 2, true),
('2026-10-01 09:51:00+08', '69484bc5-e8c4-4f2a-8628-8c2bb4ced32f', false, false, true, true, false, 2, 2, true),
('2026-09-22 09:54:00+08', '228ef2d0-952b-4471-9dcb-ae1e0b2f0c89', false, false, true, true, false, 2, 4, true),
('2026-09-29 09:57:00+08', 'd37120cd-7db5-4bd0-8f12-e1f4f11289d1', false, false, true, true, false, 2, 3, true),
('2026-10-01 09:00:00+08', 'dee7a1b8-3035-47c5-bbfd-f16d77075f15', false, false, true, false, false, 1, 3, true),
('2026-09-22 09:03:00+08', '0b20df77-ed8d-4dc6-aed4-f0e47ec32953', false, false, true, false, false, 1, 2, true),
('2026-09-29 09:06:00+08', '0922b840-4ff8-4be8-ba3f-0b941d8c0687', false, false, true, false, false, 1, 2, true),
('2026-10-01 09:09:00+08', '0dbbe56b-7c92-4409-992c-57e749e52caa', false, true, true, false, false, 2, 3, true),
('2026-09-22 09:12:00+08', 'eb7eb021-e9ca-4066-91fd-4e90e9911d35', false, true, true, false, false, 2, 3, true),
('2026-09-29 09:15:00+08', 'ac1c5d0f-1bba-4675-b157-ef817d35a40b', false, true, true, false, false, 2, 1, true),
('2026-10-01 09:18:00+08', '2c11f478-49fb-4e42-8c42-cb001bd90a60', false, true, true, false, false, 2, 3, true),
('2026-09-22 09:21:00+08', '4ec5bfd9-6dbe-4992-adb9-3ef10ab00d8b', false, true, true, false, false, 2, 2, true),
('2026-09-29 09:24:00+08', '91d3911e-813a-4e24-be89-720cf6f9cd9b', false, true, true, false, false, 2, 3, true),
('2026-10-01 09:27:00+08', '62d60715-2c65-46a2-8fb7-f5774fc6e9db', false, true, true, false, false, 2, 3, true),
('2026-09-22 09:40:00+08', '759c9d4e-535e-44f0-9f09-65a057593cf0', false, true, false, true, false, 2, 3, true),
('2026-09-29 09:41:00+08', '5075d10f-47b1-4aa9-a941-d587f6708d4c', false, false, false, false, false, 0, 2, true),
('2026-10-01 09:42:00+08', 'a98bb7b3-509d-4d74-8bac-44a35b6d6cbb', false, true, true, false, false, 2, 2, true),
('2026-09-22 09:43:00+08', '2278dcb5-5c35-4b9c-85c7-dfec26739246', false, false, false, false, true, 1, 2, true);

insert into public.learner_responses
  (created_at, session_id, time_spent_seconds, completed,
   pre_q1, pre_q2, pre_q3, pre_q4, pre_q5,
   post_q1, post_q2, post_q3, post_q4, post_q5,
   pre_score, post_score, confidence_pre, confidence_post, did_pre_reading,
   short_answer, satisfaction, would_recommend, helped_most, least_useful, comment, is_sample)
values
('2026-09-22 11:00:00+08', '25f28a98-ed1f-4d0c-975e-94131e03a0bf', 5840, true, true, true, true, false, false, true, true, true, true, false, 3, 4, 3, 5, true, null, 4, true, 'video-changi-point', 'video-nada', 'Beautiful footage.', true),
('2026-09-29 12:07:00+08', '93750ab0-d659-4b2d-abcb-8a154d65bd16', 6123, true, true, true, true, false, false, true, true, true, true, false, 3, 4, 4, 5, false, null, 3, true, 'video-changi-point', 'learner-organiser', 'The UNEP reading was too dense, I did not read it before class.', true),
('2026-10-01 11:14:00+08', 'e76b8fc9-2ea0-46b5-9467-4c7eb1c755c5', 5938, true, true, true, false, false, false, true, true, true, true, false, 2, 4, 4, 5, false, 'Fast restoration with transplants costs more than slow natural recovery.', 4, true, 'video-changi-point', 'create-activity', 'Loved the video.', true),
('2026-09-22 12:21:00+08', '105a08cf-38ba-4fe9-9b1a-6fe68d950eae', 5768, true, true, true, false, false, false, true, true, true, true, false, 2, 4, 3, 5, true, 'Fast restoration with transplants costs more than slow natural recovery.', 5, true, 'game', 'learner-organiser', 'The game made the carbon numbers click.', true),
('2026-09-29 11:28:00+08', '28d211a4-3f70-4b7e-b057-215bca38debb', 6158, true, true, true, false, false, false, true, true, false, true, false, 2, 3, 2, 4, false, 'Fast restoration with transplants costs more than slow natural recovery.', 3, true, 'game', 'further-reading-unep', 'Best part of the seminar was the game.', true),
('2026-10-01 12:35:00+08', '0bb55940-403a-4610-849e-26a0a2ae51af', 5255, true, true, false, false, false, true, true, true, false, false, true, 2, 3, 2, 3, false, 'Restoring near ports stores carbon but clashes with shipping and development.', 2, false, 'video-nada', 'learner-organiser', 'Short and personal.', true),
('2026-09-22 11:42:00+08', 'bae20466-220f-432c-a30d-5f460d2b1198', 5618, true, true, false, false, false, true, true, true, false, false, true, 2, 3, 2, 4, false, null, 4, true, 'video-changi-point', 'learner-organiser', 'Skipped the pre-reading, it was too long.', true),
('2026-09-29 12:49:00+08', '780cb052-48d8-4a95-83ec-4462b26e6ea1', 6060, true, true, false, false, false, true, true, false, false, false, true, 2, 2, 2, 3, true, 'Restoring near ports stores carbon but clashes with shipping and development.', 5, true, 'video-nada', 'further-reading-unep', 'Nada made the science feel real.', true),
('2026-10-01 11:56:00+08', 'b4739714-4c96-405e-9e8a-8a81d874c064', 5223, true, true, false, false, false, true, true, false, false, false, true, 2, 2, 1, 3, false, 'Restoring near ports stores carbon but clashes with shipping and development.', 5, true, 'game', 'further-reading-unep', 'Did not use the organiser sheet, took my own notes.', true),
('2026-09-22 12:03:00+08', '27de84cf-acb4-4fb6-9bd5-3e9e9365f441', 5436, true, true, false, false, false, true, true, false, false, false, true, 2, 2, 2, 3, false, 'Managers must choose between protecting healthy meadows and fixing damaged ones with limited money.', 4, true, 'create-activity', 'learner-organiser', 'Map the chain was interesting but rushed at the end.', true),
('2026-09-29 11:10:00+08', 'f3637680-f109-45c4-a3c2-0e1ee5ce15cb', 5125, true, false, false, false, false, true, true, false, false, false, true, 1, 2, 1, 3, false, 'Fast restoration with transplants costs more than slow natural recovery.', 4, true, 'create-activity', 'further-reading-unep', 'Needed more time for the chain activity.', true),
('2026-10-01 12:17:00+08', 'e69a17b0-2300-439e-ba46-fa8c2fe20030', 5598, true, false, false, false, true, true, true, false, false, true, true, 2, 3, 2, 3, false, 'Fast restoration with transplants costs more than slow natural recovery.', 4, true, 'video-changi-point', 'create-activity', null, true),
('2026-09-22 11:24:00+08', 'ef8f3bc4-136c-49b6-b468-954305611479', 5714, true, false, false, false, true, true, true, false, false, true, true, 2, 3, 2, 4, false, 'Fast restoration with transplants costs more than slow natural recovery.', 5, true, 'video-nada', 'further-reading-unep', null, true),
('2026-09-29 12:31:00+08', 'ed03d72d-9f66-411f-886b-2e5f3c2612ed', 5333, true, false, false, false, true, false, true, false, false, true, true, 1, 3, 1, 2, false, null, 5, true, 'create-activity', 'learner-organiser', null, true),
('2026-10-01 11:38:00+08', 'ba0ccf0d-9d5c-4037-adb8-5f8522d4f620', 5796, true, false, false, false, true, false, true, false, false, true, true, 1, 3, 1, 2, false, 'Managers must choose between protecting healthy meadows and fixing damaged ones with limited money.', 4, true, 'video-changi-point', 'further-reading-unep', 'The Changi video was really nice to watch.', true),
('2026-09-22 12:45:00+08', 'cbe9c11a-a4c6-4411-b2d5-1458a8eead8f', 5093, true, false, false, false, true, false, true, false, false, true, true, 1, 3, 3, 4, false, 'Restoring near ports stores carbon but clashes with shipping and development.', 3, false, 'game', 'learner-organiser', 'Playing it was way more fun than reading slides.', true),
('2026-09-29 11:52:00+08', '206b1a1c-af2c-45b6-ade5-c615871b4de0', 5925, true, false, false, false, true, false, true, false, false, true, true, 1, 3, 2, 4, false, 'Fast restoration with transplants costs more than slow natural recovery.', 5, true, 'game', 'create-activity', null, true),
('2026-10-01 12:59:00+08', '69484bc5-e8c4-4f2a-8628-8c2bb4ced32f', 6110, true, false, false, true, true, false, true, false, true, true, true, 2, 4, 2, 4, true, 'Restoring near ports stores carbon but clashes with shipping and development.', 3, false, 'video-changi-point', 'learner-organiser', 'Nice shots of the meadow.', true),
('2026-09-22 11:06:00+08', '228ef2d0-952b-4471-9dcb-ae1e0b2f0c89', 6110, true, false, false, true, true, false, true, false, true, true, true, 2, 4, 4, 5, false, null, 2, false, 'video-nada', 'create-activity', null, true),
('2026-09-29 12:13:00+08', 'd37120cd-7db5-4bd0-8f12-e1f4f11289d1', 5598, true, false, false, true, true, false, true, false, true, true, true, 2, 4, 3, 4, false, 'Managers must choose between protecting healthy meadows and fixing damaged ones with limited money.', 5, true, 'game', 'further-reading-unep', null, true),
('2026-10-01 11:20:00+08', 'dee7a1b8-3035-47c5-bbfd-f16d77075f15', 5981, true, false, false, true, false, false, true, false, true, true, true, 1, 4, 3, 4, false, 'Fast restoration with transplants costs more than slow natural recovery.', 4, true, 'video-nada', 'further-reading-unep', null, true),
('2026-09-22 12:27:00+08', '0b20df77-ed8d-4dc6-aed4-f0e47ec32953', 5690, true, false, false, true, false, false, true, false, true, true, true, 1, 4, 2, 4, true, null, 4, true, 'game', 'learner-organiser', null, true),
('2026-09-29 11:34:00+08', '0922b840-4ff8-4be8-ba3f-0b941d8c0687', 5298, true, false, false, true, false, false, true, false, true, true, true, 1, 4, 2, 4, true, 'Restoring near ports stores carbon but clashes with shipping and development.', 3, true, 'game', 'video-changi-point', null, true),
('2026-10-01 12:41:00+08', '0dbbe56b-7c92-4409-992c-57e749e52caa', 5094, true, false, true, true, false, false, false, true, true, true, true, 2, 4, 3, 5, true, 'Restoring near ports stores carbon but clashes with shipping and development.', 4, true, 'game', 'video-changi-point', null, true),
('2026-09-22 11:48:00+08', 'eb7eb021-e9ca-4066-91fd-4e90e9911d35', 5470, true, false, true, true, false, false, false, true, true, true, true, 2, 4, 3, 4, false, 'Managers must choose between protecting healthy meadows and fixing damaged ones with limited money.', 4, true, 'game', 'video-nada', null, true),
('2026-09-29 12:55:00+08', 'ac1c5d0f-1bba-4675-b157-ef817d35a40b', 5428, true, false, true, true, false, false, false, true, true, true, true, 2, 4, 1, 2, true, null, 4, true, 'video-nada', 'further-reading-unep', null, true),
('2026-10-01 11:02:00+08', '2c11f478-49fb-4e42-8c42-cb001bd90a60', 5897, true, false, true, true, false, false, false, true, true, true, false, 2, 3, 3, 5, false, 'Managers must choose between protecting healthy meadows and fixing damaged ones with limited money.', 5, true, 'video-changi-point', 'further-reading-unep', null, true),
('2026-09-22 12:09:00+08', '4ec5bfd9-6dbe-4992-adb9-3ef10ab00d8b', 5653, true, false, true, true, false, false, false, true, true, true, false, 2, 3, 2, 3, false, null, 5, true, 'game', 'further-reading-unep', null, true),
('2026-09-29 11:16:00+08', '91d3911e-813a-4e24-be89-720cf6f9cd9b', 5915, true, false, true, true, false, false, false, true, true, true, false, 2, 3, 3, 5, true, 'Fast restoration with transplants costs more than slow natural recovery.', 3, false, 'create-activity', 'learner-organiser', null, true),
('2026-10-01 12:23:00+08', '62d60715-2c65-46a2-8fb7-f5774fc6e9db', 5921, true, false, true, true, false, false, false, true, true, true, false, 2, 3, 3, 4, false, 'Managers must choose between protecting healthy meadows and fixing damaged ones with limited money.', 4, true, 'game', 'create-activity', null, true);

-- rating = learning impact. Impact fields are null when the content was skipped.
insert into public.educator_responses
  (created_at, submission_id, component_id, usage, rating, engagement, time_fit, curriculum_fit, adaptation_helped, note, is_sample)
values
('2026-09-22 17:00:00+08', '11111111-1111-4111-8111-111111111111', 'game', 'kept', 5, 5, 'right', 5, null, 'Students were fully engaged the whole time.', true),
('2026-09-29 17:00:00+08', '22222222-2222-4222-8222-222222222222', 'game', 'kept', 5, 5, 'right', 4, null, 'Best part of the seminar.', true),
('2026-10-01 17:00:00+08', '33333333-3333-4333-8333-333333333333', 'game', 'kept', 4, 5, 'right', 5, null, null, true),
('2026-09-22 17:00:00+08', '11111111-1111-4111-8111-111111111111', 'create-activity', 'changed', 4, 3, 'too_short', 4, 4, 'Great idea but 15 min is not enough. Extended it to 25 min.', true),
('2026-09-29 17:00:00+08', '22222222-2222-4222-8222-222222222222', 'create-activity', 'changed', 4, 3, 'too_short', 4, 4, 'Cut other parts to give it more time.', true),
('2026-10-01 17:00:00+08', '33333333-3333-4333-8333-333333333333', 'create-activity', 'kept', 4, 3, 'too_short', 3, 3, 'Ran out of time, students rushed it.', true),
('2026-09-22 17:00:00+08', '11111111-1111-4111-8111-111111111111', 'further-reading-unep', 'kept', 2, 2, 'too_long', 3, null, 'Assigned it but few students read it.', true),
('2026-09-29 17:00:00+08', '22222222-2222-4222-8222-222222222222', 'further-reading-unep', 'skipped', null, null, null, 2, null, 'Too dense for pre-reading.', true),
('2026-10-01 17:00:00+08', '33333333-3333-4333-8333-333333333333', 'further-reading-unep', 'skipped', null, null, null, 2, null, 'Nobody read it before class.', true),
('2026-09-22 17:00:00+08', '11111111-1111-4111-8111-111111111111', 'video-changi-point', 'kept', 2, 5, 'right', 4, null, 'Students loved the footage, but did not connect it to the causes.', true),
('2026-09-29 17:00:00+08', '22222222-2222-4222-8222-222222222222', 'video-changi-point', 'kept', 3, 5, 'right', 3, null, null, true),
('2026-10-01 17:00:00+08', '33333333-3333-4333-8333-333333333333', 'video-changi-point', 'kept', 2, 4, 'right', 4, null, 'Great hook, but no discussion followed.', true),
('2026-09-22 17:00:00+08', '11111111-1111-4111-8111-111111111111', 'video-nada', 'kept', 5, 4, 'right', 5, null, 'Short and personal, works well as an opener.', true),
('2026-09-29 17:00:00+08', '22222222-2222-4222-8222-222222222222', 'video-nada', 'kept', 4, 4, 'right', 4, null, null, true),
('2026-10-01 17:00:00+08', '33333333-3333-4333-8333-333333333333', 'video-nada', 'kept', 5, 5, 'right', 4, null, 'Made the science feel real.', true),
('2026-09-22 17:00:00+08', '11111111-1111-4111-8111-111111111111', 'learner-organiser', 'skipped', null, null, null, 2, null, 'Students used their own notes.', true),
('2026-09-29 17:00:00+08', '22222222-2222-4222-8222-222222222222', 'learner-organiser', 'skipped', null, null, null, 1, null, 'Felt like school worksheets.', true),
('2026-10-01 17:00:00+08', '33333333-3333-4333-8333-333333333333', 'learner-organiser', 'skipped', null, null, null, 2, null, null, true);
