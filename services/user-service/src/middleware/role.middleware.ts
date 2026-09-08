import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export const checkPermission =
  (module: string, action: string) =>
  async (req: any, res: any, next: any) => {

    try {

      const roleId = req.user.roleId;      
      
      console.log(`[ROLE DEBUG] User token decoded:`, req.user);
      console.log(`[ROLE DEBUG] Checking permission for module: ${module}, action: ${action}, roleId: ${roleId}`);

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

      console.log(`[ROLE DEBUG] Role-service response:`, response.data);

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