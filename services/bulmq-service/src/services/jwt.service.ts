import jwt from "jsonwebtoken";

import { env } from "../config/env";

const JWT_SECRET = env.JWT_SECRET;

export const generateToken = (payload: any) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
  });
};


export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};
