import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export const checkPermission =
  (module: string, action: string) =>
  async (req: any, res: any, next: any) => {

    try {

      const roleId = req.user.roleId;
      
      

      const response = await axios.post(
        `${process.env.ROLE_SERVICE_URL}/check-permission`,
        {
          roleId,
          module,
          action,
        },
         {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );

      if (!response.data.allowed) {

        return res.status(403).json({
          message: "Permission denied",
        });

      }

      next();

    } catch (error: any) {

  console.error("🔥 Permission middleware error:", {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
  });

  return res.status(error.response?.status || 500).json({
    message: "Permission check failed",
    error: error.response?.data || error.message,
  });

}

  };