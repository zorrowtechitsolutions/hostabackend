import { Router } from "express";
import {
  Registeration,
  getanReview,
  updateData,
  reviewDelete,
  getReview,
  getRating

} from "../controllers/review.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();




// CRUD

router.post("/review", authenticate, checkPermission("review", "create"), Registeration);
router.get("/review", authenticate, checkPermission("review", "view"),  getReview);
router.get("/review/rating", authenticate, checkPermission("review", "view"),  getRating);
router.get("/review/:id", authenticate, checkPermission("review", "view"),  getanReview);
router.put("/review/:id", authenticate, checkPermission("review", "edit"),  updateData);
router.delete("/review/:id", authenticate, checkPermission("review", "delete"),  reviewDelete);




export default router;