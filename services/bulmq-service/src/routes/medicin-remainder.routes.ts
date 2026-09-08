import { Router } from "express";
import {
  assignTaskMedicin,
} from "../controllers/medicin-remainder.controllers";
import { authenticate } from "../middleware/authenticate";

const router = Router();




// CRUD

router.post(
  "/medicin-task",
  authenticate,
 assignTaskMedicin
);

export default router;