import{pool}from'../database/client.js';import{loadCorpusPreflight}from'./corpus-preflight.js';
if(!pool)throw new Error('DATABASE_URL is required');
const yearFrom=Number(process.argv[2]??2021),yearTo=Number(process.argv[3]??2025),report=await loadCorpusPreflight(pool,{yearFrom,yearTo,syllabusCode:'9618'});
console.log(JSON.stringify({generatedAt:new Date().toISOString(),yearFrom,yearTo,total:report.total,complete:report.complete,ready:report.ready,sourceMissing:report.sourceMissing,knownMinimumExtractionCalls:report.knownMinimumExtractionCalls,rows:report.rows},null,2));
await pool.end();
