import{pool}from'../database/client.js';import{config}from'../config.js';import{ClaudeIngestionClient}from'../lib/ai/claude.js';import{JobRunner}from'./runner.js';import{createExportPdfProcessor}from'./processors/export-pdf.js';
import{createIngestionProcessors}from'./processors/ingestion.js';import{createAiExtractionHandlers}from'./processors/ai-ingestion.js';
if(!pool)throw Error('DATABASE_URL is required');
const aiHandlers=config.ANTHROPIC_API_KEY?createAiExtractionHandlers(pool,new ClaudeIngestionClient({apiKey:config.ANTHROPIC_API_KEY,model:config.ANTHROPIC_MODEL})):{};
const runner=new JobRunner(pool,{'export-pdf':createExportPdfProcessor(pool),...createIngestionProcessors(pool,aiHandlers)});process.on('SIGTERM',()=>runner.stop());process.on('SIGINT',()=>runner.stop());await runner.start();
