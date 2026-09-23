-- 9618/31/M/J/21 Q1 floating-point visual fidelity.
-- The canonical assets existed but were not consumed by structured content;
-- the bit boxes were flattened into task prose. Rebuild crop-sized equal-cell
-- visuals and consume them explicitly.

DO $$
DECLARE
  v_paper uuid := '5861419d-e79b-4eb2-8070-d72fb07f62cb'::uuid;
  v_sha text := '82f001cd257ae2a2a57b5f47289b9a007b23b48db5496dda4a609c5ed2b5ab9e';
  v_qa uuid := '49b375c2-4379-495d-9cb6-e918c944f580'::uuid;
  v_aa uuid := '254fc26a-eea6-4003-93df-8e672059b652'::uuid;
  v_qb uuid := '54ed9dcb-f599-4552-90e3-b2e117e7ab3a'::uuid;
  v_ab uuid := '9971714f-54ba-4e1f-a867-f9c3b73078c7'::uuid;
  v_qc uuid := '0518d0c8-88b0-4581-8b38-826ddd84f45c'::uuid;
  v_ac uuid := 'ff6fde4e-566a-4d78-9127-18b4dfea1d9c'::uuid;
  v_sa text := $a$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 810 112" width="810" height="112" role="img" aria-label="Floating point mantissa and exponent boxes">
<rect width="810" height="112" fill="white"/>
<style>.h{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;fill:#222}.b{font-family:"Courier New",Courier,monospace;font-size:19px;fill:#222}.g{fill:white;stroke:#555;stroke-width:1.2}</style><text class="h" x="240" y="31" text-anchor="middle">Mantissa</text><text class="h" x="662" y="31" text-anchor="middle">Exponent</text><rect class="g" x="20" y="46" width="44" height="40"/><rect class="g" x="64" y="46" width="44" height="40"/><rect class="g" x="108" y="46" width="44" height="40"/><rect class="g" x="152" y="46" width="44" height="40"/><rect class="g" x="196" y="46" width="44" height="40"/><rect class="g" x="240" y="46" width="44" height="40"/><rect class="g" x="284" y="46" width="44" height="40"/><rect class="g" x="328" y="46" width="44" height="40"/><rect class="g" x="372" y="46" width="44" height="40"/><rect class="g" x="416" y="46" width="44" height="40"/><rect class="g" x="530" y="46" width="44" height="40"/><rect class="g" x="574" y="46" width="44" height="40"/><rect class="g" x="618" y="46" width="44" height="40"/><rect class="g" x="662" y="46" width="44" height="40"/><rect class="g" x="706" y="46" width="44" height="40"/><rect class="g" x="750" y="46" width="44" height="40"/></svg>$a$;
  v_sb text := $b$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 810 112" width="810" height="112" role="img" aria-label="Floating point mantissa and exponent boxes">
<rect width="810" height="112" fill="white"/>
<style>.h{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;fill:#222}.b{font-family:"Courier New",Courier,monospace;font-size:19px;fill:#222}.g{fill:white;stroke:#555;stroke-width:1.2}</style><text class="h" x="240" y="31" text-anchor="middle">Mantissa</text><text class="h" x="662" y="31" text-anchor="middle">Exponent</text><rect class="g" x="20" y="46" width="44" height="40"/><text class="b" x="42" y="73" text-anchor="middle">1</text><rect class="g" x="64" y="46" width="44" height="40"/><text class="b" x="86" y="73" text-anchor="middle">0</text><rect class="g" x="108" y="46" width="44" height="40"/><text class="b" x="130" y="73" text-anchor="middle">1</text><rect class="g" x="152" y="46" width="44" height="40"/><text class="b" x="174" y="73" text-anchor="middle">1</text><rect class="g" x="196" y="46" width="44" height="40"/><text class="b" x="218" y="73" text-anchor="middle">0</text><rect class="g" x="240" y="46" width="44" height="40"/><text class="b" x="262" y="73" text-anchor="middle">0</text><rect class="g" x="284" y="46" width="44" height="40"/><text class="b" x="306" y="73" text-anchor="middle">0</text><rect class="g" x="328" y="46" width="44" height="40"/><text class="b" x="350" y="73" text-anchor="middle">1</text><rect class="g" x="372" y="46" width="44" height="40"/><text class="b" x="394" y="73" text-anchor="middle">1</text><rect class="g" x="416" y="46" width="44" height="40"/><text class="b" x="438" y="73" text-anchor="middle">1</text><rect class="g" x="530" y="46" width="44" height="40"/><text class="b" x="552" y="73" text-anchor="middle">0</text><rect class="g" x="574" y="46" width="44" height="40"/><text class="b" x="596" y="73" text-anchor="middle">0</text><rect class="g" x="618" y="46" width="44" height="40"/><text class="b" x="640" y="73" text-anchor="middle">0</text><rect class="g" x="662" y="46" width="44" height="40"/><text class="b" x="684" y="73" text-anchor="middle">1</text><rect class="g" x="706" y="46" width="44" height="40"/><text class="b" x="728" y="73" text-anchor="middle">1</text><rect class="g" x="750" y="46" width="44" height="40"/><text class="b" x="772" y="73" text-anchor="middle">1</text></svg>$b$;
  v_sc text := $c$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 810 205" width="810" height="205" role="img" aria-label="Floating point mantissa and exponent boxes">
<rect width="810" height="205" fill="white"/>
<style>.h{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;fill:#222}.b{font-family:"Courier New",Courier,monospace;font-size:19px;fill:#222}.g{fill:white;stroke:#555;stroke-width:1.2}</style><text class="h" x="240" y="31" text-anchor="middle">Mantissa</text><text class="h" x="662" y="31" text-anchor="middle">Exponent</text><rect class="g" x="20" y="46" width="44" height="40"/><text class="b" x="42" y="73" text-anchor="middle">0</text><rect class="g" x="64" y="46" width="44" height="40"/><text class="b" x="86" y="73" text-anchor="middle">0</text><rect class="g" x="108" y="46" width="44" height="40"/><text class="b" x="130" y="73" text-anchor="middle">0</text><rect class="g" x="152" y="46" width="44" height="40"/><text class="b" x="174" y="73" text-anchor="middle">0</text><rect class="g" x="196" y="46" width="44" height="40"/><text class="b" x="218" y="73" text-anchor="middle">0</text><rect class="g" x="240" y="46" width="44" height="40"/><text class="b" x="262" y="73" text-anchor="middle">0</text><rect class="g" x="284" y="46" width="44" height="40"/><text class="b" x="306" y="73" text-anchor="middle">0</text><rect class="g" x="328" y="46" width="44" height="40"/><text class="b" x="350" y="73" text-anchor="middle">1</text><rect class="g" x="372" y="46" width="44" height="40"/><text class="b" x="394" y="73" text-anchor="middle">1</text><rect class="g" x="416" y="46" width="44" height="40"/><text class="b" x="438" y="73" text-anchor="middle">1</text><rect class="g" x="530" y="46" width="44" height="40"/><text class="b" x="552" y="73" text-anchor="middle">1</text><rect class="g" x="574" y="46" width="44" height="40"/><text class="b" x="596" y="73" text-anchor="middle">0</text><rect class="g" x="618" y="46" width="44" height="40"/><text class="b" x="640" y="73" text-anchor="middle">0</text><rect class="g" x="662" y="46" width="44" height="40"/><text class="b" x="684" y="73" text-anchor="middle">1</text><rect class="g" x="706" y="46" width="44" height="40"/><text class="b" x="728" y="73" text-anchor="middle">1</text><rect class="g" x="750" y="46" width="44" height="40"/><text class="b" x="772" y="73" text-anchor="middle">1</text><text class="h" x="240" y="123" text-anchor="middle">Mantissa</text><text class="h" x="662" y="123" text-anchor="middle">Exponent</text><rect class="g" x="20" y="138" width="44" height="40"/><rect class="g" x="64" y="138" width="44" height="40"/><rect class="g" x="108" y="138" width="44" height="40"/><rect class="g" x="152" y="138" width="44" height="40"/><rect class="g" x="196" y="138" width="44" height="40"/><rect class="g" x="240" y="138" width="44" height="40"/><rect class="g" x="284" y="138" width="44" height="40"/><rect class="g" x="328" y="138" width="44" height="40"/><rect class="g" x="372" y="138" width="44" height="40"/><rect class="g" x="416" y="138" width="44" height="40"/><rect class="g" x="530" y="138" width="44" height="40"/><rect class="g" x="574" y="138" width="44" height="40"/><rect class="g" x="618" y="138" width="44" height="40"/><rect class="g" x="662" y="138" width="44" height="40"/><rect class="g" x="706" y="138" width="44" height="40"/><rect class="g" x="750" y="138" width="44" height="40"/></svg>$c$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper AND sha256=v_sha AND page_count=12
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q1_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_aa AND question_id=v_qa AND source_page=2 AND content_hash='aa1586cea705e4f858de7079a9609b2baca26eb40e6e8c73ce658c5122eabccc')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_ab AND question_id=v_qb AND source_page=2 AND content_hash='580031cc60f91ee80be60b1ababf9c7427887ea4b16f266cfaf2efafba05802d')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_ac AND question_id=v_qc AND source_page=3 AND content_hash='fd68171c10341e288f8f12ed3593997837fe990f9e37cf48ba2e5e01321516e8')
  THEN RAISE EXCEPTION 'vf_mj21_31_q1_asset_provenance_mismatch'; END IF;

  UPDATE question_assets SET svg_markup=v_sa,size_bytes=octet_length(v_sa),
    content_hash=encode(digest(v_sa,'sha256'),'hex'),crop_status='not_needed',crop_error=NULL
  WHERE id=v_aa;
  UPDATE question_assets SET svg_markup=v_sb,size_bytes=octet_length(v_sb),
    content_hash=encode(digest(v_sb,'sha256'),'hex'),crop_status='not_needed',crop_error=NULL
  WHERE id=v_ab;
  UPDATE question_assets SET svg_markup=v_sc,size_bytes=octet_length(v_sc),
    content_hash=encode(digest(v_sc,'sha256'),'hex'),crop_status='not_needed',crop_error=NULL
  WHERE id=v_ac;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','Real numbers are stored in a computer system using floating-point representation with:','type','text','style','paragraph','source',jsonb_build_object('page',2)),
    jsonb_build_object('items',jsonb_build_array('10 bits for the mantissa','6 bits for the exponent','Two’s complement form for both the mantissa and the exponent.'),'type','list','source',jsonb_build_object('page',2)),
    jsonb_build_object('text','Calculate the normalised floating-point representation of –7.25 in this system. Show your working.','type','text','style','task','source',jsonb_build_object('page',2)),
    jsonb_build_object('type','asset','kind','table','assetId',v_aa::text,'altText','Blank 10-bit mantissa and 6-bit exponent boxes','source',jsonb_build_object('page',2)),
    jsonb_build_object('type','answer_area','kind','lines','lines',6,'source',jsonb_build_object('page',2))
  ),false),updated_at=now() WHERE id=v_qa;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','Real numbers are stored in a computer system using floating-point representation with:','type','text','style','paragraph','source',jsonb_build_object('page',2)),
    jsonb_build_object('items',jsonb_build_array('10 bits for the mantissa','6 bits for the exponent','Two’s complement form for both the mantissa and the exponent.'),'type','list','source',jsonb_build_object('page',2)),
    jsonb_build_object('text','Calculate the denary value of the given binary floating-point number. Show your working.','type','text','style','task','source',jsonb_build_object('page',2)),
    jsonb_build_object('type','asset','kind','table','assetId',v_ab::text,'altText','Given 10-bit mantissa and 6-bit exponent','source',jsonb_build_object('page',2)),
    jsonb_build_object('type','answer_area','kind','lines','lines',5,'source',jsonb_build_object('page',2))
  ),false),updated_at=now() WHERE id=v_qb;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','Real numbers are stored in a computer system using floating-point representation with:','type','text','style','paragraph','source',jsonb_build_object('page',2)),
    jsonb_build_object('items',jsonb_build_array('10 bits for the mantissa','6 bits for the exponent','Two’s complement form for both the mantissa and the exponent.'),'type','list','source',jsonb_build_object('page',2)),
    jsonb_build_object('text','The given binary floating-point number is not normalised. Normalise the floating-point number. Show your working.','type','text','style','task','source',jsonb_build_object('page',3)),
    jsonb_build_object('type','asset','kind','table','assetId',v_ac::text,'altText','Unnormalised floating-point value and blank normalised answer boxes','source',jsonb_build_object('page',3)),
    jsonb_build_object('type','answer_area','kind','lines','lines',5,'source',jsonb_build_object('page',3))
  ),false),updated_at=now() WHERE id=v_qc;

  IF (
    SELECT count(*) FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_qa,v_qb,v_qc) AND b->>'type'='asset'
  ) <> 3 THEN RAISE EXCEPTION 'vf_mj21_31_q1_asset_consumption_postcondition_failed'; END IF;
END $$;