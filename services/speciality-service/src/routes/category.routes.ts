import { Router } from "express";
import {
 Registeration,
 categoryDelete,
 getCategorys,
 getanCategory,
 updateData
} from "../controllers/category.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();



// CRUD

router.post("/category", authenticate, Registeration);
router.get("/category", getCategorys);
router.get("/category/:id",authenticate, checkPermission("category", "view"), getanCategory);
router.put("/category/:id",authenticate, checkPermission("category", "edit"), updateData);
router.delete("/category/:id",authenticate, checkPermission("category", "delete"), categoryDelete);


export default router;