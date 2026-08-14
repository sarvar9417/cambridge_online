import{pool}from'../database/client.js';import{JobRunner}from'./runner.js';import{createExportPdfProcessor}from'./processors/export-pdf.js';
import{createIngestionProcessors}from'./processors/ingestion.js';
if(!pool)throw Error('DATABASE_URL is required');
const runner=new JobRunner(pool,{'export-pdf':createExportPdfProcessor(pool),...createIngestionProcessors(pool)});process.on('SIGTERM',()=>runner.stop());process.on('SIGINT',()=>runner.stop());await runner.start();
