import { Router } from "express";
import {
    checkPermissionService,
createPermission,
getPermission,
getanPermission,
permissionDelete,
updateData
 
} from "../controllers/permission.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();




// CRUD

router.post("/permission", authenticate, createPermission);
router.get("/permission", authenticate, checkPermission("permission", "view"), getPermission);
router.get("/permission/:id", authenticate, checkPermission("permission", "view"), getanPermission);
router.put("/permission/:id", authenticate, checkPermission("permission", "edit"), updateData);
router.delete("/permission/:id", authenticate, checkPermission("permission", "delete"), permissionDelete);
router.post("/check-permission",  checkPermissionService);


export default router;
