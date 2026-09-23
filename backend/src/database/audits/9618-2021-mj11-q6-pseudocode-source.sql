-- Q6 pseudocode source-text guard for 9618/11/M/J/21.
-- These three elements are already represented as code rather than flattened
-- prose. Zero rows means exact Cambridge pseudocode text and indentation remain.

with expected(question_id,expected_code) as (
 values
 ('1a333460-5dc3-418e-9bc3-f78bc155aaaa'::uuid,E'INPUT x\n\nIF x < 0 OR x > 10 THEN\n\n  OUTPUT "Invalid"\n\nENDIF'),
 ('072658a1-dd3b-4c0c-a50a-6eb06d12bc0c'::uuid,E'INPUT x\n\nIF x = "" THEN\n\n  OUTPUT "Invalid"\n\nENDIF'),
 ('836764e0-fd17-4cbb-ad84-99a1c61efc9e'::uuid,E'INPUT x\n\nIF NOT(x = "Red" OR x = "Yellow" OR x = "Blue") THEN\n\n  OUTPUT "Invalid"\n\nENDIF')
)
select e.question_id,'vf_q6_pseudocode_source_text_regressed' finding
from expected e
where not exists (
  select 1 from questions q
  cross join lateral jsonb_array_elements(q.content_json->'blocks') b
  where q.id=e.question_id
    and b->>'type'='code'
    and b->>'language'='pseudocode'
    and b->>'text'=e.expected_code
    and (b->'source'->>'page')::int=14
);