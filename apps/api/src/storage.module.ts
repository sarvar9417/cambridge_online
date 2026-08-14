import { Global, Module } from '@nestjs/common';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { ApiConfig } from './config.js';

export const S3_CLIENT = Symbol('CAMPATH_S3');

/** The slice of S3 the API uses. Uploads and downloads go through presigned URLs. */
export interface S3Like {
  headBucket(): Promise<unknown>;
}

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ApiConfig],
      useFactory: (config: ApiConfig): S3Like => {
        const bucket = config.s3.bucket;
        if (!bucket || !config.s3.accessKeyId || !config.s3.secretAccessKey) {
          // Readiness must say "down" rather than crash the process, so an
          // unconfigured environment is diagnosable from /ready.
          return { headBucket: () => Promise.reject(new Error('s3_not_configured')) };
        }

        const client = new S3Client({
          endpoint: config.s3.endpoint,
          region: config.s3.region,
          // MinIO serves path-style URLs; virtual-host style needs DNS per bucket.
          forcePathStyle: true,
          credentials: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
          },
        });

        return { headBucket: () => client.send(new HeadBucketCommand({ Bucket: bucket })) };
      },
    },
  ],
  exports: [S3_CLIENT],
})
export class StorageModule {}
