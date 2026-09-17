-- Controlled auxiliary source inventory for Cambridge 9618.
--
-- These rows are source-document metadata only. QP/MS scoring content remains
-- canonical in questions / mark_schemes. Inserts (IN) are paper-level and map
-- to Paper 2 variants; grade thresholds (GT) and examiner reports (ER) are
-- series-level documents supported by migration 0163.

WITH src(kind, year, series, variant, storage_path, sha256, page_count, source_url) AS (
  VALUES
  ('ER',2022,'MJ',NULL,'remote/9618/2022/MJ/9618_s22_er.pdf','961db39dbf770b9646fef158a48eef4e909f46f4f43e85e7ed8c968399184905',43,'https://drive.google.com/file/d/15K2ZPq-PeqhQuR65OKzvUYiN-BNTaeVC/view?usp=drivesdk'),
  ('GT',2021,'MJ',NULL,'remote/9618/2021/MJ/9618_s21_gt.pdf','914923e5acac7898304aa920d3cfaa69a2b37cccfe20b704475c33822610a697',1,'https://drive.google.com/file/d/1_XrnGNx9NNLZrIJRNugIVIRZiouxo7qr/view?usp=drivesdk'),
  ('GT',2021,'ON',NULL,'remote/9618/2021/ON/9618_w21_gt.pdf','116ef7e175a1b72a74e8ab12d7ccacc51ef0181574eac6b6c906aec33b2ac219',2,'https://drive.google.com/file/d/1xbt7jFbnkLii8jlDD2SXzyQBMkCmKeOt/view?usp=drivesdk'),
  ('GT',2022,'MJ',NULL,'remote/9618/2022/MJ/9618_s22_gt.pdf','ddf427a08796b952d97d7ffc78c924f8dec01d39f5691ef4701675bc8a52f671',2,'https://drive.google.com/file/d/1KCVJAwPuYJhdhiOztmygk2Liyff57uJO/view?usp=drivesdk'),
  ('GT',2022,'ON',NULL,'remote/9618/2022/ON/9618_w22_gt.pdf','ecc9e9c054eecaf8e70126341733093c603f0ffc88832c5fc133927a214d9420',2,'https://drive.google.com/file/d/1WWLRDAzGaut3C8gLVwMFCetuUBEYUIui/view?usp=drivesdk'),
  ('GT',2023,'MJ',NULL,'remote/9618/2023/MJ/9618_s23_gt.pdf','e93d43787fa284f407a6145f67b52d410fabc49165a2fe74e1f0978797f46742',2,'https://drive.google.com/file/d/1x0aTzOymWOcvDBlw8-YOgAGR6yC75aB4/view?usp=drivesdk'),
  ('GT',2023,'ON',NULL,'remote/9618/2023/ON/9618_w23_gt.pdf','fa058b7a27680a50f583916fb079b0db8d65fd92ea12f451e70c3fa006cc5f59',2,'https://drive.google.com/file/d/1lYLyRenNGcS1veNvD6JP74LwUaJFokri/view?usp=drivesdk'),
  ('GT',2025,'MJ',NULL,'remote/9618/2025/MJ/9618_s25_gt.pdf','0355c81de5a9999c010ca8bcb18d6cd17d21a75f9d5b7f29758d5b596b31e6a4',2,'https://drive.google.com/file/d/1ZLBfc2x82nDUbjF8jZPzKl7EaPNQ4qGM/view?usp=drivesdk'),
  ('GT',2025,'ON',NULL,'remote/9618/2025/ON/9618_w25_gt.pdf','8a3498af1d995905d7a8603fa1fb0c579fcc10f0230338999af5d878f8edbb24',2,'https://drive.google.com/file/d/1rXQ430QjGS9WeWEPC--Rem6az_N1QFBw/view?usp=drivesdk'),
  ('GT',2026,'MJ',NULL,'remote/9618/2026/MJ/9618_s26_gt.pdf','61479bf67ae750c2a613187320c0703378dfef4ea709302c81429818b025cb79',2,'https://drive.google.com/file/d/1prFmb_caytn00J8B97fh1Tf6bMqmgekA/view?usp=drivesdk'),
  ('IN',2021,'MJ',1,'remote/9618/2021/MJ/9618_s21_in_21.pdf','c25072ccbe376adb2ce37c84f7b8ab4c35e4f8aea308c92f9be454df7cee2f45',4,'https://drive.google.com/file/d/10wCxENvCw-5ECzTP27UscIdvVqltL3LB/view?usp=drivesdk'),
  ('IN',2021,'MJ',2,'remote/9618/2021/MJ/9618_s21_in_22.pdf','6569d45677bbe8341948f4de97f15f8ba1e05ffe2f9bf6721baf0982659b077a',4,'https://drive.google.com/file/d/1KAYtVh2mOPKs79kFzRGxB6VCkKvVyYzG/view?usp=drivesdk'),
  ('IN',2021,'MJ',3,'remote/9618/2021/MJ/9618_s21_in_23.pdf','e7c70b8a511c116dbde5699c343399e75c4dfd5916a53db13b5e2997cd78f694',4,'https://drive.google.com/file/d/1iOpbWwdOiICwe5dA5xcr35RVGCVS3dDc/view?usp=drivesdk'),
  ('IN',2021,'ON',1,'remote/9618/2021/ON/9618_w21_in_21.pdf','8030a545c21a6e7a1049cbb70f357164c1ec9994a53906336fb14135c8c121a1',4,'https://drive.google.com/file/d/1MUMJXVflsUnASl63IJY-D2LvdKR8T3Ss/view?usp=drivesdk'),
  ('IN',2021,'ON',2,'remote/9618/2021/ON/9618_w21_in_22.pdf','3f1a695c995a97f9cef0304c3aaa7210c837cd278a101c28e80c071cf421ff9b',4,'https://drive.google.com/file/d/1ffRf7uhoW9sq4NiAH_e1BLSOfg4woWBw/view?usp=drivesdk'),
  ('IN',2021,'ON',3,'remote/9618/2021/ON/9618_w21_in_23.pdf','34ce717e16e55e2ea1fe93c118a80685cd5556b743833c8fa6ff84be203c37e4',4,'https://drive.google.com/file/d/1bNMd-i7sQtHKuxMK_T_PSpxaMkFMmxDm/view?usp=drivesdk'),
  ('IN',2022,'MJ',1,'remote/9618/2022/MJ/9618_s22_in_21.pdf','4da924e6205b602706c7fd5e55150aee2e27a93bc17c09cdef957de447a43ec2',4,'https://drive.google.com/file/d/1p5G-TfgPW0__FTvDoJO59sowLHPS7XIW/view?usp=drivesdk'),
  ('IN',2022,'MJ',2,'remote/9618/2022/MJ/9618_s22_in_22.pdf','63fbcfab1f2e2e24e3164530a9506b2486b7ec0e33b9fa9b7e42918f457652c4',4,'https://drive.google.com/file/d/10iJkgXE18GL2wiNieoOoTCO1rNal5WSG/view?usp=drivesdk'),
  ('IN',2022,'MJ',3,'remote/9618/2022/MJ/9618_s22_in_23.pdf','80051834305015da6934dbf76e9535ea1706251d005f372b8cbdc8b0fecedece',4,'https://drive.google.com/file/d/1ZosxpoKDXG5Zo02ZWsh0Jo-gT-ZwM_t8/view?usp=drivesdk'),
  ('IN',2022,'ON',1,'remote/9618/2022/ON/9618_w22_in_21.pdf','10fe158f4e9d4f661048909eb1848f9ff675ccf09fde9a28ed204424de44be66',4,'https://drive.google.com/file/d/1iQd0baG_4EPN6WQlpnFWr60YgRbmBlQd/view?usp=drivesdk'),
  ('IN',2022,'ON',2,'remote/9618/2022/ON/9618_w22_in_22.pdf','0751cada3747dfe44a90c99ce2e33568a105da20c1454b96e5102cb51be22754',4,'https://drive.google.com/file/d/1OByxVInPmLt62JdRHfbwSkKx8uVqmvlI/view?usp=drivesdk'),
  ('IN',2022,'ON',3,'remote/9618/2022/ON/9618_w22_in_23.pdf','7e186e356b4419d08fb63f586f06f946d8f078835e2ffacbd48ef38a2d0c7868',4,'https://drive.google.com/file/d/1sfLBkSn1TvWSA9QXGu0nzg6WnGJ38GTo/view?usp=drivesdk'),
  ('IN',2023,'MJ',1,'remote/9618/2023/MJ/9618_s23_in_21.pdf','5a979a2fb7d2efd4afb3cc4439f2ea8820861b573f4261270d11405bd8954199',4,'https://drive.google.com/file/d/1fRG5BVz8hyqyJ1Xyz_jrpA-3OPSMnmKt/view?usp=drivesdk'),
  ('IN',2023,'MJ',2,'remote/9618/2023/MJ/9618_s23_in_22.pdf','c60f040e5705d1286cac6c329fe3d4dbe971682ac2afd509c99269790ba15665',4,'https://drive.google.com/file/d/1uQ-NVTX3L5_7hlItLrlHsCcK-SMH9c-Q/view?usp=drivesdk'),
  ('IN',2023,'MJ',3,'remote/9618/2023/MJ/9618_s23_in_23.pdf','3efe4a08c453c74aae599b11085d7d60ff8df7a7cd215eb3478fc4e2995f09a3',4,'https://drive.google.com/file/d/1_h419Lc_davbN9Ma0489x65y_QD_jas_/view?usp=drivesdk'),
  ('IN',2023,'ON',1,'remote/9618/2023/ON/9618_w23_in_21.pdf','41190f4139a02f42bb11d286f119daeee35237d62c16bbc436083b310c71e3ef',4,'https://drive.google.com/file/d/1pe4c2CZz_SaiaggEY65WZ0aDFnS4AtJ3/view?usp=drivesdk'),
  ('IN',2023,'ON',2,'remote/9618/2023/ON/9618_w23_in_22.pdf','5a11f293a6e0cf6efcaceb2eff67244c8349a90f99404454e24b0b929d99e838',4,'https://drive.google.com/file/d/1tTDzCa6ywNGdWnlpI5oOVmqUT0xzBHM5/view?usp=drivesdk'),
  ('IN',2023,'ON',3,'remote/9618/2023/ON/9618_w23_in_23.pdf','124dc562283f5a034398f9e10bf66cedc867cce481ba85b086a2a0ab3590446c',4,'https://drive.google.com/file/d/1yeY-dkifPgnYZKhf5Sk2Qh3okX1r_W4_/view?usp=drivesdk'),
  ('IN',2024,'MJ',1,'remote/9618/2024/MJ/9618_s24_in_21.pdf','7356fb3ff8b6a5ec1bc9a3170f58972bff7ad86a6110c76ef841dfc24bd4a4d2',4,'https://drive.google.com/file/d/1tr0hOohImgECf-fq-gb7b5njJy11ne1B/view?usp=drivesdk'),
  ('IN',2024,'MJ',2,'remote/9618/2024/MJ/9618_s24_in_22.pdf','6dc00819a760d2f178c5a8c0b8cd4cbf6bc644447fcbb002adb9fc8303e17ef3',4,'https://drive.google.com/file/d/1opYsA-R1zgDV8J9isuV2I-72ERjf6Xba/view?usp=drivesdk'),
  ('IN',2024,'MJ',3,'remote/9618/2024/MJ/9618_s24_in_23.pdf','690f0f9529cd63add45012f72712ae5de5b43e6ced648d54751f83675b41994c',4,'https://drive.google.com/file/d/1iC9eIZ-p1aaS64LLZ2Ur8TxO0IK-CFBX/view?usp=drivesdk'),
  ('IN',2024,'ON',1,'remote/9618/2024/ON/9618_w24_in_21.pdf','19ff4de16c4942fb87bbbf47d56eca5fb41058c6106414a68488a3a161f018b7',4,'https://drive.google.com/file/d/1e3a9y5YD0QxxsneyaqmXBAI4Gd6YrAp1/view?usp=drivesdk'),
  ('IN',2024,'ON',2,'remote/9618/2024/ON/9618_w24_in_22.pdf','b790b98addc95904058bba9f5dc532636d8fd5d76e71c302c9d06f21846d5d12',4,'https://drive.google.com/file/d/1RL8UlegEH_cK04tFTy2HUpBCSglRScsR/view?usp=drivesdk'),
  ('IN',2024,'ON',3,'remote/9618/2024/ON/9618_w24_in_23.pdf','ca8ff30cd58fd6567b260e4b683bf4d1f56e7cb1584186f62fc8b27ff1b555e8',4,'https://drive.google.com/file/d/10PX1WQODFVWoIGhMA-kuycY3nJWI-N_k/view?usp=drivesdk'),
  ('IN',2025,'MJ',1,'remote/9618/2025/MJ/9618_s25_in_21.pdf','9cdddef3569351a65ebe90f4d28825329cbf7c0171a99d2d881b69b96471ea69',4,'https://drive.google.com/file/d/15eSLcZTRh2si0UOcZ2F8kZ8EqE5owEQc/view?usp=drivesdk'),
  ('IN',2025,'MJ',2,'remote/9618/2025/MJ/9618_s25_in_22.pdf','d23df37d1155085f9d15335fce839aac65add7a8d992d2c4bde54027296e50ba',4,'https://drive.google.com/file/d/1SEfJLa9FjnW3r1K-E4jCIvLroy5aNWYO/view?usp=drivesdk'),
  ('IN',2025,'MJ',3,'remote/9618/2025/MJ/9618_s25_in_23.pdf','2fb14a8a58ebb2d101982efcc8d3943e251dc6e382571024fcf0654df0269eb5',4,'https://drive.google.com/file/d/1oJaSwuvalY1mFfGr26fMcVcrn6-arEYB/view?usp=drivesdk'),
  ('IN',2025,'ON',1,'remote/9618/2025/ON/9618_w25_in_21.pdf','8b594b67fc088a0186163cfa5e5b0bd2aadc1a287a5241e4b86f538a3061594c',4,'https://drive.google.com/file/d/1p8rXKOnZSKVkfXAbHilgNS5qHZ0odWEh/view?usp=drivesdk'),
  ('IN',2025,'ON',2,'remote/9618/2025/ON/9618_w25_in_22.pdf','6a80eadc88d53a81b214eb92e15a51edde0e69e7c85cda1f2c9d386882f5b744',4,'https://drive.google.com/file/d/16expyg6UPAF1kD9kfBDDpXJwmm1-t3xK/view?usp=drivesdk'),
  ('IN',2025,'ON',3,'remote/9618/2025/ON/9618_w25_in_23.pdf','ae1ca7aee325fa696ca422d98230bfb7b29c5b902c3170f98f583d6b81e7defb',4,'https://drive.google.com/file/d/1AeVw8gLJH0HoZULIqtRfUzu1pTezNLQo/view?usp=drivesdk'),
  ('IN',2026,'MJ',1,'remote/9618/2026/MJ/9618_s26_in_21.pdf','094a116cf286e8d1a7a7dc9edd76321c54b537be18cb0f2ac6f963c7401afaf6',4,'https://drive.google.com/file/d/1j1guDsiy7_Aoy3ghJW7WruEEwNRgKvWE/view?usp=drivesdk'),
  ('IN',2026,'MJ',2,'remote/9618/2026/MJ/9618_s26_in_22.pdf','0c0dccad23450211ce8078937c270f0baa490d5ba1322846b017109eb5be912c',4,'https://drive.google.com/file/d/1AnoWojssOFq_Z7he0GrQZB6EUB99IH8f/view?usp=drivesdk'),
  ('IN',2026,'MJ',3,'remote/9618/2026/MJ/9618_s26_in_23.pdf','e5190832a91eb0ef852e3b91947cd99965f1725f125478b625129470c38537fa',4,'https://drive.google.com/file/d/1Qi053hC1yD17SxaQmrf9yKYW5H31f4zn/view?usp=drivesdk')
), resolved AS (
  SELECT src.*,
         sy.id AS syllabus_id,
         CASE WHEN src.kind='IN' THEN c.id ELSE NULL END AS component_id
  FROM src
  JOIN public.syllabi sy
    ON sy.code='9618'
   AND src.year BETWEEN sy.valid_from AND sy.valid_to
  LEFT JOIN public.components c
    ON c.syllabus_id=sy.id
   AND c.number=2
)
INSERT INTO public.source_papers(
  syllabus_id,component_id,year,series,variant,kind,
  storage_path,sha256,page_count,source_url
)
SELECT syllabus_id,component_id,year,series::public.exam_series,variant,kind::public.paper_kind,
       storage_path,sha256,page_count,source_url
FROM resolved
WHERE kind<>'IN' OR component_id IS NOT NULL
ON CONFLICT (sha256) DO NOTHING;
