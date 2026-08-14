import{pool}from'../database/client.js';import{loadCorpusReadiness}from'./corpus-readiness.js';
if(!pool)throw new Error('DATABASE_URL is required');
const result=await loadCorpusReadiness(pool);console.log(JSON.stringify(result,null,2));await pool.end();if(!result.ready)process.exitCode=2;
