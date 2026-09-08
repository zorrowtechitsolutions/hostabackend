import { Router } from "express";
import {
createRole,
getRole,
getanRole,
roleDelete,
updateData
 
} from "../controllers/role.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();




// CRUD

router.post("/role", authenticate ,  createRole);
router.get("/role", authenticate,  getRole);
router.get("/role/:id", authenticate, checkPermission("role", "view"),  getanRole);
router.put("/role/:id", authenticate, checkPermission("role", "edit"),  updateData);
router.delete("/role/:id", authenticate, checkPermission("role", "delete"),  roleDelete);

export default router;




