import{discoverCorpusSources}from'./source-discovery.js';
const root=process.argv.find(arg=>arg.startsWith('--root='))?.slice('--root='.length);if(!root)throw new Error('Usage: source-discovery-cli --root=<staged-papers-directory>');const result=await discoverCorpusSources(root);console.log(JSON.stringify(result,null,2));if(result.unpaired.length)process.exitCode=2;
