-- P0 source-backed rendering repair for approved past-paper questions whose
-- canonical v1 content still flattened Cambridge geometry into OCR text or
-- referenced semantic table assets as if they were images.
--
-- The repairs below were reconstructed against the exact QP files recorded in
-- source_papers and are guarded by immutable question/source IDs plus SHA-256.
-- They do not alter marks, taxonomy, source identity or approval state.

DO $$
DECLARE
  v_count integer;
BEGIN
  -- 9618/11/M/J/25 Q8(a): instruction/memory tables and trace grid.
  SELECT count(*) INTO v_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE q.id='a066cfff-dd1e-4744-91da-c63060a1c648'::uuid
    AND q.display_ref='9618/11/M/J/25 Q8(a)'
    AND sp.id='cb472060-e895-450d-8238-a1742751ef3b'::uuid
    AND lower(sp.sha256)='bdf74d4f15c620bde7e6fe65f17828bc85c89490ebb9a1a337e2cd0596f4b39a';
  IF v_count<>1 THEN
    RAISE EXCEPTION '0122 source precondition failed for 9618/11/M/J/25 Q8(a): %',v_count;
  END IF;

  PERFORM public.set_question_structured_content_v1(
    'a066cfff-dd1e-4744-91da-c63060a1c648'::uuid,
    'cb472060-e895-450d-8238-a1742751ef3b'::uuid,
    'bdf74d4f15c620bde7e6fe65f17828bc85c89490ebb9a1a337e2cd0596f4b39a',
    $q8$
    {
      "version":1,
      "source":{"paperId":"cb472060-e895-450d-8238-a1742751ef3b","sha256":"bdf74d4f15c620bde7e6fe65f17828bc85c89490ebb9a1a337e2cd0596f4b39a"},
      "blocks":[
        {"type":"text","style":"paragraph","text":"The following table shows part of the instruction set for a processor. The processor has two registers: the Accumulator (ACC) and an Index Register (IX).","source":{"page":14}},
        {"type":"table","kind":"table","headers":["Opcode","Operand","Explanation"],"rows":[
          ["LDM","#n","Immediate addressing. Load the number n to ACC"],
          ["LDD","<address>","Direct addressing. Load the contents of the location at the given address to ACC"],
          ["LDI","<address>","Indirect addressing. The address to be used is at the given address. Load the contents of this second address to ACC"],
          ["INC","<register>","Add 1 to the contents of the register (ACC or IX)"],
          ["STO","<address>","Store the contents of ACC at the given address"],
          ["ADD","#n/Bn/&n","Add the number n to the ACC"],
          ["DEC","<register>","Subtract 1 from the contents of the register (ACC or IX)"],
          ["JMP","<address>","Jump to the given address"],
          ["CMP","<address>","Compare the contents of ACC with the contents of <address>"],
          ["JPE","<address>","Following a compare instruction, jump to <address> if the compare was True"],
          ["END","","Return control to the operating system"]
        ],"editableCells":[],"source":{"page":14}},
        {"type":"list","items":["ACC denotes Accumulator","<address> can be an absolute or a symbolic address","# denotes a denary number, e.g. #123","B denotes a binary number, e.g. B01001010","& denotes a hexadecimal number, e.g. &4A"],"source":{"page":14}},
        {"type":"text","style":"paragraph","text":"The current contents of memory are:","source":{"page":15}},
        {"type":"table","kind":"table","headers":["Address","Data / Instruction"],"rows":[
          ["80","10"],["81","8"],["82","80"],["83","81"],["…","…"],
          ["200","LDD 81"],["201","INC ACC"],["202","STO 83"],["203","LDI 82"],["204","CMP 83"],["205","JPE 209"],["206","LDD 83"],["207","ADD #10"],["208","JMP 210"],["209","DEC ACC"],["210","STO 81"],["211","END"]
        ],"editableCells":[],"source":{"page":15}},
        {"type":"text","style":"task","text":"Trace the program currently in memory using the following trace table.","source":{"page":15}},
        {"type":"table","kind":"trace_table","headers":["Instruction address","ACC","Memory 80","Memory 81","Memory 82","Memory 83"],"rows":[
          [null,null,"10","8","80","81"],
          [null,null,null,null,null,null],[null,null,null,null,null,null],[null,null,null,null,null,null],
          [null,null,null,null,null,null],[null,null,null,null,null,null],[null,null,null,null,null,null],
          [null,null,null,null,null,null],[null,null,null,null,null,null],[null,null,null,null,null,null],
          [null,null,null,null,null,null],[null,null,null,null,null,null]
        ],"editableCells":[
          [0,0],[0,1],
          [1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],
          [3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],
          [5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],
          [7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],
          [9,0],[9,1],[9,2],[9,3],[9,4],[9,5],[10,0],[10,1],[10,2],[10,3],[10,4],[10,5],
          [11,0],[11,1],[11,2],[11,3],[11,4],[11,5]
        ],"source":{"page":15}}
      ]
    }
    $q8$::jsonb
  );

  -- 9618/31/M/J/25 Q5(b)(i): printed truth table + exact 4x4 K-map.
  SELECT count(*) INTO v_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE q.id='d744b6c9-322c-4cde-a352-daa23660c1b7'::uuid
    AND q.display_ref='9618/31/M/J/25 Q5(b)(i)'
    AND sp.id='9b8b9320-b5b5-48e4-b145-a99565bfea8b'::uuid
    AND lower(sp.sha256)='68475c1640b44518f74a6756b7895f81f0e9557f87ab1d97cdea832e83eea5e4';
  IF v_count<>1 THEN
    RAISE EXCEPTION '0122 source precondition failed for 9618/31/M/J/25 Q5(b)(i): %',v_count;
  END IF;

  PERFORM public.set_question_structured_content_v1(
    'd744b6c9-322c-4cde-a352-daa23660c1b7'::uuid,
    '9b8b9320-b5b5-48e4-b145-a99565bfea8b'::uuid,
    '68475c1640b44518f74a6756b7895f81f0e9557f87ab1d97cdea832e83eea5e4',
    $k31$
    {
      "version":1,
      "source":{"paperId":"9b8b9320-b5b5-48e4-b145-a99565bfea8b","sha256":"68475c1640b44518f74a6756b7895f81f0e9557f87ab1d97cdea832e83eea5e4"},
      "blocks":[
        {"type":"text","style":"paragraph","text":"This truth table represents a logic circuit.","source":{"page":6}},
        {"type":"table","kind":"truth_table","headers":["A","B","C","D","Z"],"rows":[
          ["0","0","0","0","1"],["0","0","0","1","0"],["0","0","1","0","0"],["0","0","1","1","0"],
          ["0","1","0","0","0"],["0","1","0","1","1"],["0","1","1","0","0"],["0","1","1","1","1"],
          ["1","0","0","0","1"],["1","0","0","1","0"],["1","0","1","0","0"],["1","0","1","1","0"],
          ["1","1","0","0","0"],["1","1","0","1","1"],["1","1","1","0","0"],["1","1","1","1","1"]
        ],"editableCells":[],"source":{"page":6}},
        {"type":"text","style":"task","text":"Complete the Karnaugh map (K-map) for the given truth table.","source":{"page":7}},
        {"type":"table","kind":"k_map","headers":["","00","01","11","10"],"rows":[
          ["00",null,null,null,null],["01",null,null,null,null],["11",null,null,null,null],["10",null,null,null,null]
        ],"editableCells":[[0,1],[0,2],[0,3],[0,4],[1,1],[1,2],[1,3],[1,4],[2,1],[2,2],[2,3],[2,4],[3,1],[3,2],[3,3],[3,4]],"source":{"page":7}}
      ]
    }
    $k31$::jsonb
  );

  -- 9618/33/M/J/25 Q3(b)(i): printed truth table + exact 4x4 K-map.
  SELECT count(*) INTO v_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE q.id='db26e246-5f16-499c-afb8-3408877fcf58'::uuid
    AND q.display_ref='9618/33/M/J/25 Q3(b)(i)'
    AND sp.id='2e149d3b-5cf9-48e7-aee3-4d6b80e1eb1e'::uuid
    AND lower(sp.sha256)='137f265e230d601b039f2be2fa996b93b3ae703e8c6e23b6387b5400d0c3a086';
  IF v_count<>1 THEN
    RAISE EXCEPTION '0122 source precondition failed for 9618/33/M/J/25 Q3(b)(i): %',v_count;
  END IF;

  PERFORM public.set_question_structured_content_v1(
    'db26e246-5f16-499c-afb8-3408877fcf58'::uuid,
    '2e149d3b-5cf9-48e7-aee3-4d6b80e1eb1e'::uuid,
    '137f265e230d601b039f2be2fa996b93b3ae703e8c6e23b6387b5400d0c3a086',
    $k33$
    {
      "version":1,
      "source":{"paperId":"2e149d3b-5cf9-48e7-aee3-4d6b80e1eb1e","sha256":"137f265e230d601b039f2be2fa996b93b3ae703e8c6e23b6387b5400d0c3a086"},
      "blocks":[
        {"type":"text","style":"paragraph","text":"This truth table represents a logic circuit.","source":{"page":4}},
        {"type":"table","kind":"truth_table","headers":["A","B","C","D","Z"],"rows":[
          ["0","0","0","0","0"],["0","0","0","1","0"],["0","0","1","0","1"],["0","0","1","1","1"],
          ["0","1","0","0","1"],["0","1","0","1","0"],["0","1","1","0","0"],["0","1","1","1","0"],
          ["1","0","0","0","0"],["1","0","0","1","0"],["1","0","1","0","1"],["1","0","1","1","1"],
          ["1","1","0","0","1"],["1","1","0","1","0"],["1","1","1","0","0"],["1","1","1","1","0"]
        ],"editableCells":[],"source":{"page":4}},
        {"type":"text","style":"task","text":"Complete the Karnaugh map (K-map) for the given truth table.","source":{"page":5}},
        {"type":"table","kind":"k_map","headers":["","00","01","11","10"],"rows":[
          ["00",null,null,null,null],["01",null,null,null,null],["11",null,null,null,null],["10",null,null,null,null]
        ],"editableCells":[[0,1],[0,2],[0,3],[0,4],[1,1],[1,2],[1,3],[1,4],[2,1],[2,2],[2,3],[2,4],[3,1],[3,2],[3,3],[3,4]],"source":{"page":5}}
      ]
    }
    $k33$::jsonb
  );

  -- 9618/33/M/J/25 Q13: recursive pseudocode, initial array and trace grid.
  SELECT count(*) INTO v_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE q.id='1d8ad53b-4b67-4d5f-aaa1-f87299447fa5'::uuid
    AND q.display_ref='9618/33/M/J/25 Q13'
    AND sp.id='2e149d3b-5cf9-48e7-aee3-4d6b80e1eb1e'::uuid
    AND lower(sp.sha256)='137f265e230d601b039f2be2fa996b93b3ae703e8c6e23b6387b5400d0c3a086';
  IF v_count<>1 THEN
    RAISE EXCEPTION '0122 source precondition failed for 9618/33/M/J/25 Q13: %',v_count;
  END IF;

  PERFORM public.set_question_structured_content_v1(
    '1d8ad53b-4b67-4d5f-aaa1-f87299447fa5'::uuid,
    '2e149d3b-5cf9-48e7-aee3-4d6b80e1eb1e'::uuid,
    '137f265e230d601b039f2be2fa996b93b3ae703e8c6e23b6387b5400d0c3a086',
    $trace33$
    {
      "version":1,
      "source":{"paperId":"2e149d3b-5cf9-48e7-aee3-4d6b80e1eb1e","sha256":"137f265e230d601b039f2be2fa996b93b3ae703e8c6e23b6387b5400d0c3a086"},
      "blocks":[
        {"type":"text","style":"paragraph","text":"The recursive procedure Delete() is defined as follows:","source":{"page":16}},
        {"type":"code","language":"pseudocode","text":"PROCEDURE Delete(Index, Target)\n   IF Numbers[Index] > 0 THEN\n      IF Numbers[Index] >= Target THEN\n         Numbers[Index] ← Numbers[Index + 1]\n      ENDIF\n      Index ← Index + 1\n      CALL Delete(Index, Target)\n   ENDIF\nENDPROCEDURE","source":{"page":16}},
        {"type":"text","style":"paragraph","text":"An array Numbers is used to store a sorted data set of non-zero positive integers. Unused cells contain zero.","source":{"page":16}},
        {"type":"text","style":"paragraph","text":"The contents of the array at the start of the algorithm are:","source":{"page":16}},
        {"type":"table","kind":"table","headers":["[1]","[2]","[3]","[4]","[5]","[6]","[7]","[8]","[9]","[10]"],"rows":[["2","3","7","11","15","17","19","23","0","0"]],"editableCells":[],"source":{"page":16}},
        {"type":"text","style":"task","text":"Complete the trace table for the algorithm for the procedure call:","source":{"page":16}},
        {"type":"code","language":"pseudocode","text":"CALL Delete(1, 15)","source":{"page":16}},
        {"type":"table","kind":"trace_table","headers":["Index","Target","[1]","[2]","[3]","[4]","[5]","[6]","[7]","[8]","[9]","[10]"],"rows":[
          [null,null,"2","3","7","11","15","17","19","23","0","0"],
          [null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null]
        ],"editableCells":[
          [0,0],[0,1],
          [1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],[1,11],
          [2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[2,11],
          [3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8],[3,9],[3,10],[3,11],
          [4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8],[4,9],[4,10],[4,11],
          [5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],
          [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],[6,10],[6,11],
          [7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],[7,8],[7,9],[7,10],[7,11],
          [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[8,8],[8,9],[8,10],[8,11]
        ],"source":{"page":16}}
      ]
    }
    $trace33$::jsonb
  );

  -- 9618/32/M/J/25 Q7(a): keep the exact source circuit and replace OCR-flattened
  -- circuit/table text with a semantic 16-row truth table.
  SELECT count(*) INTO v_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE q.id='a6a66083-0873-4d6e-b8f1-e9eaa16cb7cb'::uuid
    AND q.display_ref='9618/32/M/J/25 Q7(a)'
    AND sp.id='195f8818-6edd-4a99-bf07-77bf3b1b5ffa'::uuid
    AND lower(sp.sha256)='647369ebfe2214f7b00ee4091d67d8ebe3f00c25dd73338e469d4184842e1be7';
  IF v_count<>1 THEN
    RAISE EXCEPTION '0122 source precondition failed for 9618/32/M/J/25 Q7(a): %',v_count;
  END IF;

  PERFORM public.set_question_structured_content_v1(
    'a6a66083-0873-4d6e-b8f1-e9eaa16cb7cb'::uuid,
    '195f8818-6edd-4a99-bf07-77bf3b1b5ffa'::uuid,
    '647369ebfe2214f7b00ee4091d67d8ebe3f00c25dd73338e469d4184842e1be7',
    $logic32$
    {
      "version":1,
      "source":{"paperId":"195f8818-6edd-4a99-bf07-77bf3b1b5ffa","sha256":"647369ebfe2214f7b00ee4091d67d8ebe3f00c25dd73338e469d4184842e1be7"},
      "blocks":[
        {"type":"text","style":"paragraph","text":"The diagram shows a logic circuit.","source":{"page":6}},
        {"type":"asset","kind":"logic_circuit","assetId":"10734b06-9a2d-4262-8a75-0daf3ed5bfa4","altText":"Original Cambridge logic circuit for 9618/32/M/J/25 Q7(a)","source":{"page":6}},
        {"type":"text","style":"task","text":"Complete the truth table for the given logic circuit.\nShow your working.","source":{"page":6}},
        {"type":"table","kind":"truth_table","headers":["A","B","C","D","P","Q","R","S","Z"],"rows":[
          ["0","0","0","0",null,null,null,null,null],["0","0","0","1",null,null,null,null,null],
          ["0","0","1","0",null,null,null,null,null],["0","0","1","1",null,null,null,null,null],
          ["0","1","0","0",null,null,null,null,null],["0","1","0","1",null,null,null,null,null],
          ["0","1","1","0",null,null,null,null,null],["0","1","1","1",null,null,null,null,null],
          ["1","0","0","0",null,null,null,null,null],["1","0","0","1",null,null,null,null,null],
          ["1","0","1","0",null,null,null,null,null],["1","0","1","1",null,null,null,null,null],
          ["1","1","0","0",null,null,null,null,null],["1","1","0","1",null,null,null,null,null],
          ["1","1","1","0",null,null,null,null,null],["1","1","1","1",null,null,null,null,null]
        ],"editableCells":[
          [0,4],[0,5],[0,6],[0,7],[0,8],[1,4],[1,5],[1,6],[1,7],[1,8],
          [2,4],[2,5],[2,6],[2,7],[2,8],[3,4],[3,5],[3,6],[3,7],[3,8],
          [4,4],[4,5],[4,6],[4,7],[4,8],[5,4],[5,5],[5,6],[5,7],[5,8],
          [6,4],[6,5],[6,6],[6,7],[6,8],[7,4],[7,5],[7,6],[7,7],[7,8],
          [8,4],[8,5],[8,6],[8,7],[8,8],[9,4],[9,5],[9,6],[9,7],[9,8],
          [10,4],[10,5],[10,6],[10,7],[10,8],[11,4],[11,5],[11,6],[11,7],[11,8],
          [12,4],[12,5],[12,6],[12,7],[12,8],[13,4],[13,5],[13,6],[13,7],[13,8],
          [14,4],[14,5],[14,6],[14,7],[14,8],[15,4],[15,5],[15,6],[15,7],[15,8]
        ],"source":{"page":6}}
      ]
    }
    $logic32$::jsonb
  );

  -- 9618/31/M/J/25 Q11(a): semantic attribute table plus the exact source class
  -- diagram crop; remove duplicated OCR geometry from the text block.
  SELECT count(*) INTO v_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE q.id='d7b62703-6cb2-4b7b-b3ed-77853d9c4da1'::uuid
    AND q.display_ref='9618/31/M/J/25 Q11(a)'
    AND sp.id='9b8b9320-b5b5-48e4-b145-a99565bfea8b'::uuid
    AND lower(sp.sha256)='68475c1640b44518f74a6756b7895f81f0e9557f87ab1d97cdea832e83eea5e4';
  IF v_count<>1 THEN
    RAISE EXCEPTION '0122 source precondition failed for 9618/31/M/J/25 Q11(a): %',v_count;
  END IF;

  PERFORM public.set_question_structured_content_v1(
    'd7b62703-6cb2-4b7b-b3ed-77853d9c4da1'::uuid,
    '9b8b9320-b5b5-48e4-b145-a99565bfea8b'::uuid,
    '68475c1640b44518f74a6756b7895f81f0e9557f87ab1d97cdea832e83eea5e4',
    $class31$
    {
      "version":1,
      "source":{"paperId":"9b8b9320-b5b5-48e4-b145-a99565bfea8b","sha256":"68475c1640b44518f74a6756b7895f81f0e9557f87ab1d97cdea832e83eea5e4"},
      "blocks":[
        {"type":"text","style":"paragraph","text":"A medical centre uses objects of the class Appointment to record treatments given and medication prescribed during each doctor’s appointment. Some of the attributes required in the class are listed in the table.","source":{"page":12}},
        {"type":"table","kind":"table","headers":["Attribute","Data type","Description"],"rows":[["DateSeen","DATE","date of treatment"],["Treatments","STRING","treatments given"],["Medications","STRING","medications prescribed"]],"editableCells":[],"source":{"page":12}},
        {"type":"text","style":"paragraph","text":"Patients are identified by a unique 8-digit number, beginning with the patient’s year of birth, for example, 20108989.\nDoctors are identified by their name, for example, A N Other.","source":{"page":12}},
        {"type":"asset","kind":"diagram","assetId":"0eab913a-1ae9-4fa0-8540-6fb041a45708","altText":"Original Cambridge source class diagram for Appointment","source":{"page":12,"bbox":[153,781,1542,2214]}},
        {"type":"answer_area","kind":"drawing","lines":null,"source":{"page":12}}
      ]
    }
    $class31$::jsonb
  );

  -- 9618/32/M/J/25 Q12(a): semantic attribute table plus the exact source class
  -- diagram crop; remove duplicated OCR geometry from the text block.
  SELECT count(*) INTO v_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE q.id='38511be7-0619-4c33-81e3-4a489fb68b53'::uuid
    AND q.display_ref='9618/32/M/J/25 Q12(a)'
    AND sp.id='195f8818-6edd-4a99-bf07-77bf3b1b5ffa'::uuid
    AND lower(sp.sha256)='647369ebfe2214f7b00ee4091d67d8ebe3f00c25dd73338e469d4184842e1be7';
  IF v_count<>1 THEN
    RAISE EXCEPTION '0122 source precondition failed for 9618/32/M/J/25 Q12(a): %',v_count;
  END IF;

  PERFORM public.set_question_structured_content_v1(
    '38511be7-0619-4c33-81e3-4a489fb68b53'::uuid,
    '195f8818-6edd-4a99-bf07-77bf3b1b5ffa'::uuid,
    '647369ebfe2214f7b00ee4091d67d8ebe3f00c25dd73338e469d4184842e1be7',
    $class32$
    {
      "version":1,
      "source":{"paperId":"195f8818-6edd-4a99-bf07-77bf3b1b5ffa","sha256":"647369ebfe2214f7b00ee4091d67d8ebe3f00c25dd73338e469d4184842e1be7"},
      "blocks":[
        {"type":"text","style":"paragraph","text":"A medical clinic uses objects of the class Patient to assign a priority and a doctor to a patient. Some of the attributes required in the class are listed in the table.","source":{"page":12}},
        {"type":"table","kind":"table","headers":["Attribute","Data type","Description"],"rows":[["PatientID","STRING","Unique identifier of the patient"],["Name","STRING","Patient’s full name, surname first"],["DoctorID","STRING","ID of doctor administering treatment"]],"editableCells":[],"source":{"page":12}},
        {"type":"text","style":"paragraph","text":"Treatment is prioritised with a numeric scale of 1 to 5.","source":{"page":12}},
        {"type":"asset","kind":"diagram","assetId":"06334358-4732-4696-9f7c-d54f1ce08aab","altText":"Original Cambridge source class diagram for Patient","source":{"page":12,"bbox":[153,693,1542,2214]}},
        {"type":"answer_area","kind":"drawing","lines":null,"source":{"page":12}}
      ]
    }
    $class32$::jsonb
  );
END $$;

-- The four approved rows that previously referenced non-renderable table assets
-- must now be semantic table/code structures. Future regressions should fail a
-- migration or audit rather than silently render an alt-text placeholder.
DO $$
DECLARE
  v_bad integer;
  v_kmaps integer;
  v_traces integer;
BEGIN
  SELECT count(*) INTO v_bad
  FROM public.questions q
  CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') block
  JOIN public.question_assets qa ON qa.id::text=block->>'assetId'
  WHERE q.status='approved'
    AND block->>'type'='asset'
    AND qa.kind='table'
    AND nullif(btrim(coalesce(qa.storage_path,'')),'') IS NULL
    AND coalesce(qa.content_md,'') !~* '^\s*<svg(?:\s|>)';
  IF v_bad<>0 THEN
    RAISE EXCEPTION '0122 approved questions still contain non-renderable table asset blocks: %',v_bad;
  END IF;

  SELECT count(*) INTO v_kmaps
  FROM public.questions q
  CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') block
  WHERE q.display_ref IN ('9618/31/M/J/25 Q5(b)(i)','9618/33/M/J/25 Q3(b)(i)')
    AND block->>'type'='table' AND block->>'kind'='k_map';
  IF v_kmaps<>2 THEN
    RAISE EXCEPTION '0122 K-map repair count mismatch: %',v_kmaps;
  END IF;

  SELECT count(*) INTO v_traces
  FROM public.questions q
  CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') block
  WHERE q.display_ref IN ('9618/11/M/J/25 Q8(a)','9618/33/M/J/25 Q13')
    AND block->>'type'='table' AND block->>'kind'='trace_table';
  IF v_traces<>2 THEN
    RAISE EXCEPTION '0122 trace-table repair count mismatch: %',v_traces;
  END IF;
END $$;
