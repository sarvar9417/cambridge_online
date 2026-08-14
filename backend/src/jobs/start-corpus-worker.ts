import{pool}from'../database/client.js';import{config}from'../config.js';import{ClaudeIngestionClient}from'../lib/ai/claude.js';import{loadCorpusReadiness}from'./corpus-readiness.js';import{JobRunner}from'./runner.js';import{createExportPdfProcessor}from'./processors/export-pdf.js';import{createIngestionProcessors}from'./processors/ingestion.js';import{createAiIngestionHandlers}from'./processors/ai-ingestion.js';import{createAiClassifyV2Handler}from'./processors/ai-classify-v2.js';import{createAiCrossCheckHandler}from'./processors/ai-crosscheck.js';import{validateAssetMetadataStage}from'./processors/asset-metadata.js';import{matchLeafMarkSchemesStage}from'./processors/match-leaves.js';import{createPersistPaperHandler}from'./processors/persist-paper.js';

if(!pool)throw new Error('DATABASE_URL is required');
const readiness=await loadCorpusReadiness(pool);if(!readiness.ready){console.error(JSON.stringify(readiness,null,2));await pool.end();throw new Error(`Corpus worker readiness blocked by ${readiness.blocked} check(s).`)}
if(!config.ANTHROPIC_API_KEY)throw new Error('ANTHROPIC_API_KEY is required for corpus ingestion');
const ai=new ClaudeIngestionClient({apiKey:config.ANTHROPIC_API_KEY,model:config.ANTHROPIC_MODEL});
const aiStages=createAiIngestionHandlers(pool,ai);
const handlers={
 ...aiStages,
 match:matchLeafMarkSchemesStage,
 assets:validateAssetMetadataStage,
 classify:createAiClassifyV2Handler(pool,ai),
 crosscheck:createAiCrossCheckHandler(pool,ai),
 persist:createPersistPaperHandler(pool),
};
const runner=new JobRunner(pool,{'export-pdf':createExportPdfProcessor(pool),...createIngestionProcessors(pool,handlers)});
process.on('SIGTERM',()=>runner.stop());process.on('SIGINT',()=>runner.stop());await runner.start();
