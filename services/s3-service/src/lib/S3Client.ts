
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

export const S3 = new S3Client({
  region: process.env.AWS_REGIO,
  forcePathStyle: false,
});



