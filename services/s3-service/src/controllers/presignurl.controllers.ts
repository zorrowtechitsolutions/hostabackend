import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import axios from "axios";

import { S3 } from "../lib/S3Client";

dotenv.config();

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const VALID_ROLES = ["hospital", "user", "doctor", "staff", "ad", "documents", "labresults", "category", "speciality"] as const;

const SERVICE_CONFIG: Record<
  string,
  {
    baseUrl: string | undefined;
    endpoint: string;
  }
> = {
  hospital: {
    baseUrl: process.env.HOSPITAL_SERVICE_URL,
    endpoint: "hospital",
  },
  user: {
    baseUrl: process.env.USER_SERVICE_URL,
    endpoint: "users",
  },
  doctor: {
    baseUrl: process.env.DOCTOR_SERVICE_URL,
    endpoint: "doctor",
  },
  staff: {
    baseUrl: process.env.STAFF_SERVICE_URL,
    endpoint: "staff",
  },
  ad: {
    baseUrl: process.env.ADS_SERVICE_URL,
    endpoint: "ads",
  },
   speciality: {
    baseUrl: process.env.SPECIALITY_SERVICE_URL,
    endpoint: "speciality",
  },
    documents: {
    baseUrl: process.env.USER_SERVICE_URL,
    endpoint: "documents",
  },
    category: {
    baseUrl: process.env.SPECIALITY_SERVICE_URL,
    endpoint: "category",
  },
    labresults: {
    baseUrl: process.env.USER_SERVICE_URL,
    endpoint: "lab-results",
  },
};

/* -------------------------------------------------------------------------- */
/*                               HELPER FUNCTION                              */
/* -------------------------------------------------------------------------- */

const updateImageUrl = async (
  role: string,
  id: string | number,
  imageUrl: string | null,
  authorization?: string
) => {
  const service = SERVICE_CONFIG[role];

  if (!service || !service.baseUrl) {
    throw new Error("Invalid role or missing service URL");
  }

  const url = `${service.baseUrl}/${service.endpoint}/${id}`;

  await axios.put(
    url,
    { imageUrl },
    {
      headers: {
        Authorization: authorization || "",
      },
    }
  );
};

/* -------------------------------------------------------------------------- */
/*                            CREATE PRESIGNED URL                            */
/* -------------------------------------------------------------------------- */

export const createPresignurl = asyncHandler(
  async (req: Request, res: Response) : Promise<void> => {
    try {
      const { filename, contentType, size, role, id } = req.body;

      /* ------------------------------ VALIDATION ----------------------------- */

      if (!filename || !contentType || !size || !role || !id) {
         res.status(400).json({
          success: false,
          message:
            "filename, contentType, size, role and id are required",
        });
        return;
      }

      if (!VALID_ROLES.includes(role)) {
         res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      /* ----------------------------- GENERATE KEY ---------------------------- */

      const uniqueKey = `${uuidv4()}-${filename.replace(/\s/g, "-")}`;

      /* ------------------------------- S3 COMMAND ---------------------------- */

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: uniqueKey,
        ContentType: contentType,
        ContentLength: Number(size),
      });

      /* --------------------------- PRESIGNED URL ----------------------------- */

      const presignedUrl = await getSignedUrl(S3, command, {
        expiresIn: 360,
      });

      /* --------------------------- UPDATE SERVICE ---------------------------- */

      await updateImageUrl(
        role,
        id,
        uniqueKey,
        req.headers.authorization
      );

      /* ------------------------------- RESPONSE ------------------------------ */

     res.status(200).json({
        success: true,
        presignedUrl,
        key: uniqueKey,
      });
    } catch (err: any) {
      console.error("createPresignurl Error:", err);

      if (err.response) {
         res.status(err.response.status).json({
          success: false,
          message:
            err.response.data?.message ||
            "Microservice request failed",
          error: err.response.data,
        });
        return;
      }

       res.status(500).json({
        success: false,
        message: "Failed to generate upload URL",
      });
      return;
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                             EDIT PRESIGNED URL                             */
/* -------------------------------------------------------------------------- */

export const editAPresignurl = asyncHandler(
  async (req: Request, res: Response) : Promise<void> => {
    try {
      const { filename, contentType, key, role, id } = req.body;

      /* ------------------------------ VALIDATION ----------------------------- */

      if (!filename || !contentType || !role || !id) {
         res.status(400).json({
          success: false,
          message:
            "filename, contentType, role and id are required",
        });
        return;
      }

      if (!VALID_ROLES.includes(role)) {
         res.status(400).json({
          success: false,
          message: "Invalid role",
        });
        return;
      }

      /* ------------------------------- OBJECT KEY ---------------------------- */

      const objectKey =
        key || `${Date.now()}-${filename.replace(/\s/g, "-")}`;

      /* ------------------------------- S3 COMMAND ---------------------------- */

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: objectKey,
        ContentType: contentType,
      });

      /* --------------------------- PRESIGNED URL ----------------------------- */

      const presignedUrl = await getSignedUrl(S3, command, {
        expiresIn: 60 * 5,
      });

      /* --------------------------- UPDATE SERVICE ---------------------------- */

      await updateImageUrl(
        role,
        id,
        objectKey,
        req.headers.authorization
      );

      /* ------------------------------- RESPONSE ------------------------------ */

       res.status(200).json({
        success: true,
        presignedUrl,
        key: objectKey,
      });
      return;
    } catch (err: any) {
      console.error("editAPresignurl Error:", err);

      if (err.response) {
         res.status(err.response.status).json({
          success: false,
          message:
            err.response.data?.message ||
            "Microservice request failed",
          error: err.response.data,
        });
        return;
      }

       res.status(500).json({
        success: false,
        message: "Failed to create edit URL",
      });
      return;
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                           DELETE PRESIGNED URL                             */
/* -------------------------------------------------------------------------- */

export const deleteAPresignurl = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { key, role, id } = req.body;

      /* ------------------------------ VALIDATION ----------------------------- */

      if (!key || typeof key !== "string") {
         res.status(400).json({
          success: false,
          message: "Missing or invalid object key",
        });
        return;
      }

      if (!role || !id) {
        res.status(400).json({
          success: false,
          message: "role and id are required",
        });
        return;
      }

      if (!VALID_ROLES.includes(role)) {
        res.status(400).json({
          success: false,
          message: "Invalid role",
        });
        return;
      }

      /* ------------------------------- DELETE S3 ----------------------------- */

      const command = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      });

      await S3.send(command);

      /* --------------------------- UPDATE SERVICE ---------------------------- */

      await updateImageUrl(
        role,
        id,
        null,
        req.headers.authorization
      );

      /* ------------------------------- RESPONSE ------------------------------ */

       res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
      return;
    } catch (err: any) {
      console.error("deleteAPresignurl Error:", err);

      if (err.response) {
         res.status(err.response.status).json({
          success: false,
          message:
            err.response.data?.message ||
            "Microservice request failed",
          error: err.response.data,
        });
        return;
      }

       res.status(500).json({
        success: false,
        message: "Failed to delete file",
      });
      return;
    }
  }
);