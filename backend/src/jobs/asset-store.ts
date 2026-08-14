export interface StoredAsset{storagePath:string;objectPath:string;sizeBytes:number;contentHash:string}
export interface AssetStore{checkReady():Promise<void>;putPng(input:{objectPath:string;bytes:Uint8Array;contentHash:string}):Promise<StoredAsset>}
type FetchLike=typeof fetch;

export class SupabaseAssetStore implements AssetStore{
 private readonly baseUrl:string;private readonly secret:string;private readonly bucket:string;private readonly fetchImpl:FetchLike;
 constructor(input:{url:string;secretKey:string;bucket:string;fetchImpl?:FetchLike}){this.baseUrl=normalizeUrl(input.url);this.secret=validateStorageSecret(input.secretKey);this.bucket=validateBucket(input.bucket);this.fetchImpl=input.fetchImpl??fetch}
 async checkReady(){const response=await this.fetchImpl(`${this.baseUrl}/storage/v1/bucket/${encodeURIComponent(this.bucket)}`,{method:'HEAD',headers:this.authHeaders()});if(!response.ok)throw new Error(`asset_storage_bucket_unavailable:${response.status}:${await safeText(response)}`)}
 async putPng(input:{objectPath:string;bytes:Uint8Array;contentHash:string}):Promise<StoredAsset>{const objectPath=validateObjectPath(input.objectPath),url=`${this.baseUrl}/storage/v1/object/${encodeURIComponent(this.bucket)}/${encodeObjectPath(objectPath)}`;const response=await this.fetchImpl(url,{method:'POST',headers:{...this.authHeaders(),'content-type':'image/png','cache-control':'max-age=31536000','x-upsert':'true'},body:input.bytes as BodyInit});if(!response.ok)throw new Error(`asset_storage_upload_failed:${response.status}:${await safeText(response)}`);return{storagePath:`supabase://${this.bucket}/${objectPath}`,objectPath,sizeBytes:input.bytes.byteLength,contentHash:input.contentHash}}
 private authHeaders(){return{apikey:this.secret,authorization:`Bearer ${this.secret}`}}
}

export function validateStorageSecret(secret:string){const value=secret.trim();if(!value)throw new Error('asset_storage_secret_missing');if(value.startsWith('sb_publishable_')||value.startsWith('sbp_'))throw new Error('asset_storage_secret_not_server_secret');if(value.startsWith('sb_secret_'))return value;if(value.split('.').length===3){try{const payload=JSON.parse(Buffer.from(value.split('.')[1]!,'base64url').toString('utf8'))as{role?:unknown};if(payload.role==='service_role')return value}catch{}}throw new Error('asset_storage_secret_not_server_secret')}
function normalizeUrl(value:string){const url=new URL(value);if(url.protocol!=='https:'&&url.hostname!=='localhost'&&url.hostname!=='127.0.0.1')throw new Error('asset_storage_url_must_be_https');return url.toString().replace(/\/$/,'')}
function validateBucket(value:string){const bucket=value.trim();if(!bucket||bucket.includes('/')||bucket==='.'||bucket==='..')throw new Error('asset_storage_bucket_invalid');return bucket}
function validateObjectPath(value:string){const path=value.trim().replace(/^\/+/, '');if(!path||path.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('asset_storage_object_path_invalid');return path}
function encodeObjectPath(path:string){return path.split('/').map(encodeURIComponent).join('/')}
async function safeText(response:Response){try{return(await response.text()).slice(0,500)}catch{return''}}
