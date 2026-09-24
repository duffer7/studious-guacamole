import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = process.env.S3_BUCKET ?? 'messenger';
  private readonly client = new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'minio',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'minio12345',
    },
  });

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`created bucket ${this.bucket}`);
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async read(key: string): Promise<{ body: Buffer; contentType: string }> {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await object.Body?.transformToByteArray();
      if (!bytes) throw new NotFoundException('file not found');
      return {
        body: Buffer.from(bytes),
        contentType: object.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('file not found');
    }
  }
}
