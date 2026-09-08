import { Router } from "express";

import { 
Registeration,
getPrescription,
getPrescriptionById,
prescriptionDelete,
updatePrescription
} from "../controllers/prescription.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";



const router = Router();

// CRUD

router.post("/prescription-template", authenticate, checkPermission("prescription-template", "create"),  Registeration);
router.get("/prescription-template", authenticate, checkPermission("prescription-template", "view"),  getPrescription);
router.get("/prescription-template/:id", authenticate, checkPermission("prescription-template", "view"),   getPrescriptionById);
router.put("/prescription-template/:id", authenticate, checkPermission("prescription-template", "edit"),  updatePrescription);
router.delete("/prescription-template/:id", authenticate, checkPermission("prescription-template", "delete"),   prescriptionDelete);

export default router;


