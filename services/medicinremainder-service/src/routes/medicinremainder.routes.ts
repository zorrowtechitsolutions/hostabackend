import { Router } from "express";
import {
  Registeration,
  getanMedicinremainder,
  updateData,
  medicinremainderDelete,
  getMedicinremainder,
 
} from "../controllers/medicinremainder.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.post("/medicinremainder",  Registeration);


// CRUD

router.get("/medicinremainder", getMedicinremainder);
router.get("/medicinremainder/:id", getMedicinremainder);
router.put("/medicinremainder/:id", updateData);
router.delete("/medicinremainder/:id", medicinremainderDelete);

export default router;





