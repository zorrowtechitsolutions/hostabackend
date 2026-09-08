import { Router } from "express";
import {
  Registeration,
  getanSpeciality,
  updateData,
  specialityDelete,
  getSpecialitys,
} from "../controllers/speciality.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();



// CRUD

router.post("/speciality", authenticate,Registeration);
router.get("/speciality", getSpecialitys);
router.get("/speciality/:id",authenticate, checkPermission("speciality", "view"), getanSpeciality);
router.put("/speciality/:id",authenticate, checkPermission("speciality", "edit"), updateData);
router.delete("/speciality/:id",authenticate, checkPermission("speciality", "delete"), specialityDelete);


export default router;




