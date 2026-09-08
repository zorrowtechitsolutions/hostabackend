import { Router } from "express";
import {
createRolepermission,
getRolepermission,
getanRolepermission,
rolepermissionAssgin,
rolepermissionDelete,
updateData
 
} from "../controllers/rolepermission.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();




// CRUD

router.post("/rolepermission",  authenticate,  createRolepermission);
router.get("/rolepermission",    getRolepermission);
router.get("/rolepermission/:id", authenticate, checkPermission("rolepermission", "view"),  getanRolepermission);
router.put("/rolepermission/:id", authenticate, checkPermission("rolepermission", "edit"),  updateData);
router.delete("/rolepermission/:id", authenticate, checkPermission("rolepermission", "delete"),  rolepermissionDelete);
router.patch("/rolepermission", authenticate,  rolepermissionAssgin)

export default router;  
